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
const UNIT = "u6-haloalkanes-haloarenes";
const VERSION = "0.1.3";
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
  return `You chose ${choiceText}. Recheck the C-X carbon, leaving group, reaction conditions, substitution mechanism, stereochemistry, or environmental clue before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        : "incorrect_cbse_class12_chemistry_haloalkanes_haloarenes_reasoning",
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
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_a_memorised_organic_reaction_without_matching_substrate_and_condition",
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
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_the_product_without_explaining_the_reaction_pathway_or_condition",
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
      description: `Completes part ${item.letter} with correct haloalkane or haloarene reasoning, conditions, stereochemistry, product, or environmental explanation as required.`,
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
    rubric: rubric(questionParts),
    commonErrors,
    workedSolution,
    ...(figure ? { figure } : {}),
  };
}

const sn2InversionFigure: ItemFigure = {
  type: "svg",
  title: "Substitution stereochemistry schematic",
  description:
    "A nucleophile approaches a carbon bearing a leaving group, with the substituent arrangement shown before and after substitution.",
  svg: `<svg viewBox="0 0 820 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="820" height="360" fill="#ffffff"/>
  <text x="410" y="34" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="#111827">Substitution stereochemistry schematic</text>
  <g font-family="Arial" font-size="18" fill="#0f172a" text-anchor="middle">
    <text x="86" y="178" fill="#166534">Nu&#8315;</text>
    <path d="M120 170 C160 170 194 170 230 170" fill="none" stroke="#16a34a" stroke-width="4" marker-end="url(#arrowGreen)"/>
    <circle cx="292" cy="170" r="22" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
    <text x="292" y="177" fill="#1e3a8a">C</text>
    <line x1="314" y1="170" x2="398" y2="170" stroke="#334155" stroke-width="4"/>
    <text x="430" y="177" fill="#991b1b">X</text>
    <path d="M442 170 C470 170 492 170 516 170" fill="none" stroke="#dc2626" stroke-width="4" marker-end="url(#arrowRed)"/>
    <text x="558" y="177" fill="#991b1b">X&#8315;</text>
    <line x1="278" y1="151" x2="240" y2="102" stroke="#64748b" stroke-width="3"/>
    <line x1="292" y1="193" x2="292" y2="256" stroke="#64748b" stroke-width="3"/>
    <line x1="307" y1="151" x2="347" y2="102" stroke="#64748b" stroke-width="3"/>
    <text x="230" y="92">A</text><text x="292" y="281">B</text><text x="360" y="92">C</text>
    <text x="292" y="316" font-size="15" fill="#475569">substrate</text>
    <circle cx="744" cy="170" r="22" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
    <text x="744" y="177" fill="#166534">C</text>
    <line x1="722" y1="170" x2="680" y2="170" stroke="#16a34a" stroke-width="4"/>
    <text x="650" y="177" fill="#166534">Nu</text>
    <line x1="730" y1="151" x2="694" y2="102" stroke="#64748b" stroke-width="3"/>
    <line x1="744" y1="193" x2="744" y2="256" stroke="#64748b" stroke-width="3"/>
    <line x1="759" y1="151" x2="798" y2="102" stroke="#64748b" stroke-width="3"/>
    <text x="684" y="92">C</text><text x="744" y="281">B</text><text x="804" y="92">A</text>
    <text x="744" y="316" font-size="15" fill="#475569">product</text>
  </g>
  <defs>
    <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#16a34a"/></marker>
    <marker id="arrowRed" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/></marker>
  </defs>
</svg>`,
};

const disubstitutedBenzeneFigure: ItemFigure = {
  type: "svg",
  title: "Three disubstituted benzene arrangements",
  description:
    "Three benzene rings show two identical substituents in adjacent, separated-by-one-carbon, and opposite positions.",
  svg: `<svg viewBox="0 0 840 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="840" height="390" fill="#ffffff"/>
  <text x="420" y="34" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="#111827">Disubstituted benzene arrangements</text>
  <g font-family="Arial" font-size="17" fill="#0f172a" text-anchor="middle" stroke="#334155" stroke-width="3" fill-rule="evenodd">
    <g transform="translate(160 180)">
      <polygon points="0,-70 61,-35 61,35 0,70 -61,35 -61,-35" fill="none"/>
      <circle cx="0" cy="0" r="38" fill="none" stroke="#cbd5e1" stroke-width="2"/>
      <line x1="0" y1="-70" x2="0" y2="-106"/><line x1="61" y1="-35" x2="94" y2="-54"/>
      <text x="0" y="-126" stroke="none" fill="#1d4ed8">Cl</text><text x="116" y="-57" stroke="none" fill="#1d4ed8">Cl</text>
      <text x="0" y="115" stroke="none" fill="#475569">I</text>
    </g>
    <g transform="translate(420 180)">
      <polygon points="0,-70 61,-35 61,35 0,70 -61,35 -61,-35" fill="none"/>
      <circle cx="0" cy="0" r="38" fill="none" stroke="#cbd5e1" stroke-width="2"/>
      <line x1="0" y1="-70" x2="0" y2="-106"/><line x1="61" y1="35" x2="94" y2="54"/>
      <text x="0" y="-126" stroke="none" fill="#1d4ed8">Cl</text><text x="116" y="63" stroke="none" fill="#1d4ed8">Cl</text>
      <text x="0" y="115" stroke="none" fill="#475569">II</text>
    </g>
    <g transform="translate(680 180)">
      <polygon points="0,-70 61,-35 61,35 0,70 -61,35 -61,-35" fill="none"/>
      <circle cx="0" cy="0" r="38" fill="none" stroke="#cbd5e1" stroke-width="2"/>
      <line x1="0" y1="-70" x2="0" y2="-106"/><line x1="0" y1="70" x2="0" y2="106"/>
      <text x="0" y="-126" stroke="none" fill="#1d4ed8">Cl</text><text x="0" y="136" stroke="none" fill="#1d4ed8">Cl</text>
      <text x="0" y="170" stroke="none" fill="#475569">III</text>
    </g>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "6.1",
    title: "Classification, Nomenclature and the C-X Bond",
    subtopic:
      "Classify haloalkanes and haloarenes, name them, and reason from the nature of the carbon-halogen bond.",
    mc: [
      mc(
        L`The compound $\mathrm{C_6H_5CH_2Cl}$ is best classified as`,
        2,
        ["classification", "benzylic_halide", "cx_carbon"],
        [
          L`an aryl halide`,
          L`a vinylic halide`,
          L`an allylic halide`,
          L`a benzylic halide`,
        ],
        "D",
        {
          A: L`In an aryl halide, chlorine is directly attached to the benzene ring. Here it is attached to the side-chain carbon.`,
          B: L`A vinylic halide has halogen directly attached to an alkene carbon.`,
          C: L`An allylic halide has halogen on an sp$^3$ carbon next to a C=C bond, not next to an aromatic ring.`,
        },
        [
          L`Locate the carbon bonded to chlorine.`,
          L`That carbon is $\mathrm{-CH_2-}$ attached to a benzene ring.`,
          L`A halogen on the side-chain carbon next to an aryl ring is benzylic.`,
        ],
        [
          {
            step: 1,
            explanation: L`In $\mathrm{C_6H_5CH_2Cl}$, chlorine is attached to an sp$^3$ side-chain carbon bonded to a benzene ring, so the compound is benzylic chloride.`,
          },
        ],
      ),
      mc(
        L`The correct IUPAC name of $\mathrm{CH_3CH(Br)CH_2CH_3}$ is`,
        2,
        ["iupac_nomenclature", "haloalkane"],
        [
          L`1-bromobutane`,
          L`2-bromobutane`,
          L`3-bromobutane`,
          L`butyl bromide`,
        ],
        "B",
        {
          A: L`The bromine is not on an end carbon; it is on the second carbon of the four-carbon chain.`,
          C: L`Numbering from the nearer end gives locant 2, not 3.`,
          D: L`Butyl bromide is a common-style name and does not specify the exact position here.`,
        },
        [
          L`Choose the longest carbon chain first.`,
          L`Number from the end nearer bromine.`,
          L`The parent is butane and the substituent is bromo at carbon 2.`,
        ],
        [
          {
            step: 1,
            explanation: L`The longest chain has four carbons and bromine gets the lower locant $2$.`,
            math: L`\mathrm{CH_3CH(Br)CH_2CH_3}= \text{2-bromobutane}`,
          },
        ],
      ),
      mc(
        L`A student says, "alkyl iodides generally undergo nucleophilic substitution faster than alkyl chlorides." The best reason is`,
        2,
        ["bond_strength", "leaving_group", "reactivity_order"],
        [
          L`the $\mathrm{C-I}$ bond is the weakest among common $\mathrm{C-X}$ bonds`,
          L`iodine is more electronegative than chlorine`,
          L`the $\mathrm{C-I}$ bond is shorter than the $\mathrm{C-Cl}$ bond`,
          L`alkyl iodides are always tertiary haloalkanes`,
        ],
        "A",
        {
          B: L`Iodine is less electronegative than chlorine; leaving ability is the key here.`,
          C: L`The $\mathrm{C-I}$ bond is longer, not shorter.`,
          D: L`The halogen identity does not decide whether the carbon skeleton is primary, secondary or tertiary.`,
        },
        [
          L`Substitution requires breaking the carbon-halogen bond.`,
          L`Compare bond strength down the halogen group.`,
          L`The weaker $\mathrm{C-I}$ bond makes iodide a better leaving group.`,
        ],
        [
          {
            step: 1,
            explanation: L`The general leaving-group order for alkyl halides follows $\mathrm{I^- > Br^- > Cl^- > F^-}$ because the $\mathrm{C-I}$ bond is weakest and easiest to break.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): Chlorobenzene is less reactive than chloroethane towards ordinary nucleophilic substitution. Reason (R): In chlorobenzene the $\mathrm{C-Cl}$ bond has partial double-bond character due to resonance and the carbon is sp$^2$ hybridised.`,
        3,
        ["assertion_reason", "haloarene_inertness", "resonance"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The reason directly explains the stronger, less reactive aryl $\mathrm{C-Cl}$ bond.`,
          C: L`The reason is true: resonance gives partial double-bond character and sp$^2$ carbon holds chlorine more strongly.`,
          D: L`The assertion is also true under ordinary substitution conditions.`,
        },
        [
          L`Compare aryl and alkyl $\mathrm{C-Cl}$ bonds.`,
          L`Resonance can shorten and strengthen the aryl $\mathrm{C-Cl}$ bond.`,
          L`A stronger bond makes nucleophilic substitution difficult.`,
        ],
        [
          {
            step: 1,
            explanation: L`Both statements are true, and the resonance-strengthened $\mathrm{C-Cl}$ bond in chlorobenzene explains its low reactivity towards ordinary nucleophilic substitution.`,
          },
        ],
      ),
      mc(
        L`How many structural isomers are possible for dichloropropane, $\mathrm{C_3H_6Cl_2}$?`,
        3,
        ["structural_isomerism", "dihaloalkane"],
        [L`2`, L`3`, L`4`, L`5`],
        "C",
        {
          A: L`This misses either the geminal or terminal vicinal possibilities.`,
          B: L`There are two geminal and two different vicinal/terminal placements.`,
          D: L`Five would double-count equivalent ends of propane.`,
        },
        [
          L`Use the propane skeleton only.`,
          L`Remember that carbons 1 and 3 are equivalent.`,
          L`List $\mathrm{1,1}$, $\mathrm{1,2}$, $\mathrm{1,3}$ and $\mathrm{2,2}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Distinct placements on propane are $\mathrm{1,1}$-, $\mathrm{1,2}$-, $\mathrm{1,3}$- and $\mathrm{2,2}$-dichloropropane.`,
            math: L`\text{number of structural isomers}=4`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Classify $\mathrm{CH_2=CHCH_2Br}$ and $\mathrm{CH_2=CHBr}$ as allylic, vinylic, benzylic or aryl halides.`,
        1,
        ["classification", "allylic_halide", "vinylic_halide"],
        parts([["a", L`Give the classification of both compounds.`, 1]]),
        [
          L`Check whether bromine is on the double-bond carbon or next to it.`,
          L`$\mathrm{CH_2=CHCH_2Br}$ has bromine on the carbon adjacent to C=C.`,
          L`$\mathrm{CH_2=CHBr}$ has bromine directly on the alkene carbon.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{CH_2=CHCH_2Br}$ is an allylic halide; $\mathrm{CH_2=CHBr}$ is a vinylic halide.`,
          },
        ],
        [
          L`Calling both vinylic just because both contain a double bond.`,
          L`Ignoring the exact carbon bonded to bromine.`,
        ],
      ),
      frq(
        "saq",
        L`Name the following compounds by IUPAC rules: $\mathrm{CH_3CH(Cl)CH(Br)CH_3}$ and $\mathrm{C_6H_4Cl_2}$ with chlorine atoms at positions $1$ and $3$.`,
        2,
        ["iupac_nomenclature", "dihalo_compounds"],
        parts([
          ["a", L`Name $\mathrm{CH_3CH(Cl)CH(Br)CH_3}$.`, 1],
          ["b", L`Name the $\mathrm{1,3}$-dichloro benzene derivative.`, 1],
        ]),
        [
          L`Use alphabetical order only after assigning the lowest set of locants.`,
          L`For the butane derivative, locants are $2$ and $3$ either way.`,
          L`When tied, assign the lower locant to the substituent that comes first alphabetically.`,
        ],
        [
          {
            part: "a",
            explanation: L`Bromo comes before chloro alphabetically, so bromine gets locant $2$ in the tied numbering.`,
            math: L`\mathrm{CH_3CH(Cl)CH(Br)CH_3}=\text{2-bromo-3-chlorobutane}`,
          },
          {
            part: "b",
            explanation: L`The benzene compound is $\text{1,3-dichlorobenzene}$, also commonly called meta-dichlorobenzene.`,
          },
        ],
        [
          L`Writing 3-bromo-2-chlorobutane after overlooking the alphabetical tie-break.`,
          L`Using only the common word meta without the IUPAC locants.`,
        ],
      ),
      frq(
        "saq",
        L`Haloalkanes are often more polar than the corresponding hydrocarbons, but many are only slightly soluble in water. Explain this using intermolecular forces.`,
        2,
        ["physical_properties", "solubility", "intermolecular_forces"],
        parts([
          [
            "a",
            L`Why are their boiling points generally higher than comparable hydrocarbons?`,
            1,
          ],
          ["b", L`Why is their solubility in water still limited?`, 1],
        ]),
        [
          L`A carbon-halogen bond is polar and heavier halogens are more polarisable.`,
          L`Higher intermolecular attractions raise boiling points.`,
          L`For water solubility, compare water-water hydrogen bonding with haloalkane-water attraction.`,
        ],
        [
          {
            part: "a",
            explanation: L`Haloalkanes have stronger dipole-dipole and dispersion forces than comparable hydrocarbons, so their boiling points are generally higher.`,
          },
          {
            part: "b",
            explanation: L`They do not form sufficiently strong hydrogen bonds with water to compensate for breaking water-water hydrogen bonds, so their water solubility is limited.`,
          },
        ],
        [
          L`Saying polarity alone guarantees high water solubility.`,
          L`Ignoring the energy cost of breaking hydrogen bonds between water molecules.`,
        ],
      ),
      frq(
        "laq",
        L`Three compounds are given: A = $\mathrm{CH_3CH_2CH_2CH_2Cl}$, B = $\mathrm{(CH_3)_3CCl}$ and C = $\mathrm{C_6H_5Cl}$. Classify each and compare their expected behaviour towards ordinary nucleophilic substitution.`,
        3,
        [
          "classification",
          "reactivity_comparison",
          "nucleophilic_substitution",
        ],
        parts([
          ["a", L`Classify A, B and C.`, 1],
          [
            "b",
            L`Which of A and B is more suitable for an $\mathrm{S_N2}$ pathway, and why?`,
            1,
          ],
          [
            "c",
            L`Why is C much less reactive than A under ordinary nucleophilic substitution conditions?`,
            1,
          ],
        ]),
        [
          L`A is a primary haloalkane and B is tertiary.`,
          L`$\mathrm{S_N2}$ needs low steric hindrance.`,
          L`C is a haloarene with a resonance-strengthened $\mathrm{C-Cl}$ bond.`,
        ],
        [
          {
            part: "a",
            explanation: L`A is a primary haloalkane, B is a tertiary haloalkane, and C is an aryl halide or haloarene.`,
          },
          {
            part: "b",
            explanation: L`A is more suitable for $\mathrm{S_N2}$ because the carbon bearing chlorine is primary and less sterically hindered. B is too crowded for backside attack.`,
          },
          {
            part: "c",
            explanation: L`C is less reactive because its aryl $\mathrm{C-Cl}$ bond has partial double-bond character from resonance and is bonded to an sp$^2$ carbon.`,
          },
        ],
        [
          L`Treating all three compounds as equally reactive alkyl chlorides.`,
          L`Using only carbocation stability when the part asks specifically about $\mathrm{S_N2}$.`,
        ],
      ),
      frq(
        "case",
        L`A stockroom has four old labels: ethyl chloride, benzyl chloride, vinyl chloride and chlorobenzene. The technician wants to sort them by the carbon atom directly bonded to chlorine before choosing reaction conditions.`,
        3,
        ["case_based", "classification", "cx_carbon"],
        parts([
          ["a", L`Which label represents a benzylic halide?`, 1],
          ["b", L`Which label represents a vinylic halide?`, 1],
          [
            "c",
            L`Which labelled compound is expected to resist ordinary nucleophilic substitution most strongly, and why?`,
            1,
          ],
        ]),
        [
          L`Benzylic means chlorine is on a side-chain carbon next to a benzene ring.`,
          L`Vinylic means chlorine is directly on an alkene carbon.`,
          L`Haloarenes have an aryl $\mathrm{C-Cl}$ bond.`,
        ],
        [
          {
            part: "a",
            explanation: L`Benzyl chloride, $\mathrm{C_6H_5CH_2Cl}$, is the benzylic halide.`,
          },
          {
            part: "b",
            explanation: L`Vinyl chloride, $\mathrm{CH_2=CHCl}$, is the vinylic halide.`,
          },
          {
            part: "c",
            explanation: L`Chlorobenzene resists ordinary nucleophilic substitution most strongly because the aryl $\mathrm{C-Cl}$ bond is resonance strengthened and attached to an sp$^2$ carbon.`,
          },
        ],
        [
          L`Calling benzyl chloride an aryl halide because a benzene ring is present.`,
          L`Confusing vinyl chloride with allyl chloride.`,
        ],
      ),
    ],
  },
  {
    topicCode: "6.2",
    title: "Preparation of Haloalkanes and Haloarenes",
    subtopic:
      "Select reagents and conditions for preparing haloalkanes and haloarenes without mixing up named reactions.",
    mc: [
      mc(
        L`For converting an alcohol into the corresponding alkyl chloride, $\mathrm{SOCl_2}$ with pyridine is often preferred because`,
        3,
        ["preparation", "alcohol_to_haloalkane", "thionyl_chloride"],
        [
          L`$\mathrm{SO_2}$ escapes and pyridine removes the acid by-product`,
          L`it gives only tertiary chlorides`,
          L`it first oxidises the alcohol to an aldehyde`,
          L`it forms a Grignard reagent directly`,
        ],
        "A",
        {
          B: L`The method is not restricted to tertiary alcohols.`,
          C: L`This is substitution of $\mathrm{-OH}$ by chlorine, not oxidation.`,
          D: L`Grignard reagents need magnesium in dry ether; they are not made directly by $\mathrm{SOCl_2}$.`,
        },
        [
          L`Think about purification of the product.`,
          L`Thionyl chloride gives sulphur dioxide and an acid by-product.`,
          L`$\mathrm{SO_2}$ escapes, while pyridine removes $\mathrm{HCl}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The reaction is useful because $\mathrm{SO_2}$ escapes and pyridine removes $\mathrm{HCl}$, so the alkyl chloride is obtained relatively cleanly.`,
          },
        ],
      ),
      mc(
        L`In the Finkelstein reaction, $\mathrm{R-Br}$ is converted to $\mathrm{R-I}$ by using $\mathrm{NaI}$ in dry acetone. The reaction is driven forward mainly because`,
        3,
        ["finkelstein_reaction", "preparation", "precipitation"],
        [
          L`$\mathrm{NaBr}$ is insoluble in acetone and precipitates`,
          L`iodine is oxidised to iodate`,
          L`acetone supplies the alkyl group`,
          L`$\mathrm{R-I}$ is less reactive than $\mathrm{R-Br}$`,
        ],
        "A",
        {
          B: L`There is no iodate formation in the usual Finkelstein substitution.`,
          C: L`Acetone is the solvent; it does not supply the alkyl group.`,
          D: L`Product reactivity is not what drives this equilibrium; precipitation of the sodium halide does.`,
        },
        [
          L`Look for the role of dry acetone.`,
          L`Sodium chloride and sodium bromide are poorly soluble in acetone.`,
          L`Removing a product salt shifts the reaction forward.`,
        ],
        [
          {
            step: 1,
            explanation: L`$\mathrm{NaBr}$ precipitates from acetone, removing a product and driving formation of the alkyl iodide.`,
            math: L`\mathrm{R-Br + NaI \rightarrow R-I + NaBr(s)}`,
          },
        ],
      ),
      mc(
        L`The Swarts reaction is used most directly to prepare`,
        2,
        ["swarts_reaction", "alkyl_fluoride"],
        [
          L`alkyl fluorides from alkyl chlorides or bromides`,
          L`aryl iodides from diazonium salts`,
          L`alkenes from alkyl halides`,
          L`alkyl nitriles from alkyl halides`,
        ],
        "A",
        {
          B: L`Diazonium salt replacement is Sandmeyer/Gattermann type chemistry, not Swarts.`,
          C: L`Elimination gives alkenes; Swarts is halogen exchange to fluoride.`,
          D: L`Cyanide substitution gives nitriles; it is not the Swarts reaction.`,
        },
        [
          L`Swarts is a halogen-exchange reaction.`,
          L`It introduces fluorine into an alkyl halide.`,
          L`Typical fluorinating agents include metallic fluorides such as $\mathrm{AgF}$ or $\mathrm{SbF_3}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Swarts reaction prepares alkyl fluorides by replacing chlorine or bromine in an alkyl halide with fluorine.`,
          },
        ],
      ),
      mc(
        L`The most suitable reagent pair for preparing chlorobenzene from benzene is`,
        2,
        ["haloarene_preparation", "electrophilic_substitution"],
        [
          L`$\mathrm{Cl_2}$ with anhydrous $\mathrm{FeCl_3}$`,
          L`$\mathrm{HCl}$ at room temperature`,
          L`$\mathrm{NaCl}$ in water`,
          L`$\mathrm{SOCl_2}$ in pyridine`,
        ],
        "A",
        {
          B: L`Benzene does not simply add or substitute with aqueous/gaseous HCl under these conditions.`,
          C: L`Chloride ion from aqueous sodium chloride does not chlorinate benzene.`,
          D: L`$\mathrm{SOCl_2}$ converts alcohols to alkyl chlorides; benzene has no alcohol group here.`,
        },
        [
          L`Benzene needs electrophilic aromatic substitution.`,
          L`A Lewis acid generates a stronger chlorinating electrophile.`,
          L`Use dry $\mathrm{FeCl_3}$ or $\mathrm{AlCl_3}$ with chlorine.`,
        ],
        [
          {
            step: 1,
            explanation: L`Chlorination of benzene is done with $\mathrm{Cl_2}$ in the presence of anhydrous $\mathrm{FeCl_3}$, which helps generate the electrophile.`,
          },
        ],
      ),
      mc(
        L`Propene is treated with $\mathrm{HBr}$ in the presence of peroxide. The major product is`,
        3,
        ["addition_to_alkene", "peroxide_effect", "anti_markovnikov"],
        [
          L`1-bromopropane`,
          L`2-bromopropane`,
          L`1,2-dibromopropane`,
          L`propan-1-ol`,
        ],
        "A",
        {
          B: L`That is the Markovnikov product formed without peroxide.`,
          C: L`Only one molecule of HBr is being added, not bromine across the double bond.`,
          D: L`No water or hydroboration-oxidation sequence is present.`,
        },
        [
          L`Peroxide changes the addition pattern of $\mathrm{HBr}$.`,
          L`The bromine ends up on the less substituted carbon.`,
          L`This is anti-Markovnikov addition of $\mathrm{HBr}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`In the peroxide effect, $\mathrm{HBr}$ adds anti-Markovnikov to propene, so bromine attaches to the terminal carbon.`,
            math: L`\mathrm{CH_3CH=CH_2 \xrightarrow[peroxide]{HBr} CH_3CH_2CH_2Br}`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Write the reagent and catalyst used to convert benzene into chlorobenzene.`,
        1,
        ["haloarene_preparation", "electrophilic_substitution"],
        parts([["a", L`Give the reagent and catalyst.`, 1]]),
        [
          L`This is chlorination of benzene.`,
          L`Benzene needs an electrophile, not chloride ion.`,
          L`Use chlorine with a Lewis acid.`,
        ],
        [
          {
            part: "a",
            explanation: L`Use $\mathrm{Cl_2}$ with anhydrous $\mathrm{FeCl_3}$ or $\mathrm{AlCl_3}$.`,
          },
        ],
        [
          L`Using aqueous $\mathrm{NaCl}$ or $\mathrm{HCl}$ as if benzene were an alcohol.`,
          L`Omitting the Lewis acid catalyst.`,
        ],
      ),
      frq(
        "saq",
        L`An alcohol $\mathrm{CH_3CH_2OH}$ has to be converted into $\mathrm{CH_3CH_2Br}$. Give one suitable reagent and explain why the reaction is a substitution.`,
        2,
        ["alcohol_to_haloalkane", "preparation", "substitution"],
        parts([
          ["a", L`Give one suitable reagent or reagent system.`, 1],
          ["b", L`Explain the substitution idea.`, 1],
        ]),
        [
          L`Common reagent choices include $\mathrm{PBr_3}$ or $\mathrm{HBr}$.`,
          L`The carbon skeleton stays the same.`,
          L`The $\mathrm{-OH}$ group is replaced by bromine.`,
        ],
        [
          {
            part: "a",
            explanation: L`One suitable reagent is $\mathrm{PBr_3}$. Concentrated $\mathrm{HBr}$ may also be used for this simple alcohol.`,
          },
          {
            part: "b",
            explanation: L`It is substitution because the $\mathrm{-OH}$ group of ethanol is replaced by $\mathrm{-Br}$ while the ethyl group remains unchanged.`,
          },
        ],
        [
          L`Writing bromination conditions for benzene.`,
          L`Calling the reaction addition because bromine appears in the product.`,
        ],
      ),
      frq(
        "saq",
        L`Starting from propene, state conditions to prepare separately $\mathrm{1}$-bromopropane and $\mathrm{2}$-bromopropane.`,
        2,
        ["alkene_addition", "markovnikov", "peroxide_effect"],
        parts([
          ["a", L`Condition for $\mathrm{1}$-bromopropane.`, 1],
          ["b", L`Condition for $\mathrm{2}$-bromopropane.`, 1],
        ]),
        [
          L`Both routes use $\mathrm{HBr}$, but one uses peroxide.`,
          L`Peroxide gives anti-Markovnikov addition for $\mathrm{HBr}$.`,
          L`Without peroxide, Markovnikov addition gives bromine on the more substituted carbon.`,
        ],
        [
          {
            part: "a",
            explanation: L`Treat propene with $\mathrm{HBr}$ in the presence of peroxide to obtain $\mathrm{1}$-bromopropane.`,
          },
          {
            part: "b",
            explanation: L`Treat propene with $\mathrm{HBr}$ in the absence of peroxide to obtain $\mathrm{2}$-bromopropane as the Markovnikov product.`,
          },
        ],
        [
          L`Applying peroxide effect to $\mathrm{HCl}$ or $\mathrm{HI}$ instead of $\mathrm{HBr}$.`,
          L`Reversing Markovnikov and anti-Markovnikov products.`,
        ],
      ),
      frq(
        "laq",
        L`Plan three preparations and name the key reaction idea in each: ethanol to chloroethane, bromoethane to iodoethane, and benzene to bromobenzene.`,
        3,
        [
          "preparation_routes",
          "finkelstein_reaction",
          "electrophilic_substitution",
        ],
        parts([
          ["a", L`Give a route for ethanol to chloroethane.`, 1],
          ["b", L`Give a route for bromoethane to iodoethane.`, 1],
          ["c", L`Give a route for benzene to bromobenzene.`, 1],
        ]),
        [
          L`Alcohol to alkyl chloride can use $\mathrm{SOCl_2}$.`,
          L`Bromoalkane to iodoalkane is Finkelstein reaction.`,
          L`Benzene to bromobenzene is electrophilic aromatic substitution.`,
        ],
        [
          {
            part: "a",
            explanation: L`Use $\mathrm{SOCl_2}$, preferably with pyridine, to replace $\mathrm{-OH}$ by chlorine.`,
            math: L`\mathrm{CH_3CH_2OH \xrightarrow{SOCl_2} CH_3CH_2Cl}`,
          },
          {
            part: "b",
            explanation: L`Use $\mathrm{NaI}$ in dry acetone; precipitation of $\mathrm{NaBr}$ drives the Finkelstein reaction.`,
            math: L`\mathrm{CH_3CH_2Br + NaI \rightarrow CH_3CH_2I + NaBr(s)}`,
          },
          {
            part: "c",
            explanation: L`Use $\mathrm{Br_2}$ with anhydrous $\mathrm{FeBr_3}$ or $\mathrm{AlBr_3}$ for electrophilic substitution on benzene.`,
          },
        ],
        [
          L`Using aqueous halide salts for aromatic substitution.`,
          L`Missing the dry acetone condition in the Finkelstein reaction.`,
        ],
      ),
      frq(
        "case",
        L`A lab has to make a small sample of iodoethane from bromoethane. A student suggests $\mathrm{NaI}$ in water, while another suggests $\mathrm{NaI}$ in dry acetone.`,
        3,
        ["case_based", "finkelstein_reaction", "solvent_role"],
        parts([
          ["a", L`Which solvent choice is better for this conversion?`, 1],
          ["b", L`Write the substitution equation.`, 1],
          ["c", L`Explain why the reaction is driven forward.`, 1],
        ]),
        [
          L`This is a halogen-exchange reaction.`,
          L`Dry acetone makes $\mathrm{NaBr}$ precipitate.`,
          L`A precipitated product salt shifts the reaction forward.`,
        ],
        [
          {
            part: "a",
            explanation: L`Dry acetone is the better solvent choice.`,
          },
          {
            part: "b",
            explanation: L`The reaction is $\mathrm{CH_3CH_2Br + NaI \rightarrow CH_3CH_2I + NaBr}$.`,
          },
          {
            part: "c",
            explanation: L`$\mathrm{NaBr}$ is insoluble in acetone and precipitates, removing a product and driving the equilibrium towards iodoethane.`,
          },
        ],
        [
          L`Using water and losing the precipitation advantage.`,
          L`Writing iodine addition across a double bond even though the substrate is bromoethane.`,
        ],
      ),
    ],
  },
  {
    topicCode: "6.3",
    title: "Substitution, Elimination and Stereochemistry",
    subtopic:
      "Distinguish substitution and elimination conditions, ambident nucleophile products, and SN1/SN2 stereochemical outcomes.",
    mc: [
      mc(
        L`The hydrolysis of $\mathrm{(CH_3)_3CBr}$ in aqueous ethanol is mainly $\mathrm{S_N1}$. Its rate law is best written as`,
        3,
        ["sn1", "rate_law", "tertiary_haloalkane"],
        [
          L`rate $=k[\mathrm{(CH_3)_3CBr}]$`,
          L`rate $=k[\mathrm{(CH_3)_3CBr}][\mathrm{OH^-}]$`,
          L`rate $=k[\mathrm{OH^-}]$`,
          L`rate $=k[\mathrm{(CH_3)_3CBr}]^2$`,
        ],
        "A",
        {
          B: L`That is the usual second-order form for an $\mathrm{S_N2}$ step, not the rate-determining ionisation of $\mathrm{S_N1}$.`,
          C: L`The slow step depends on the haloalkane ionising, not only on hydroxide concentration.`,
          D: L`Two haloalkane molecules are not involved in the rate-determining step.`,
        },
        [
          L`$\mathrm{S_N1}$ means unimolecular substitution.`,
          L`The slow step forms a carbocation from the haloalkane.`,
          L`Only the substrate concentration appears in the rate law.`,
        ],
        [
          {
            step: 1,
            explanation: L`For an $\mathrm{S_N1}$ reaction, the rate-determining step is ionisation of the haloalkane, so the rate depends only on the substrate concentration.`,
            math: L`\text{rate}=k[\mathrm{(CH_3)_3CBr}]`,
          },
        ],
      ),
      mc(
        L`Which substrate is expected to react fastest by an $\mathrm{S_N2}$ mechanism with a strong nucleophile?`,
        2,
        ["sn2", "steric_hindrance", "substrate_order"],
        [
          L`$\mathrm{CH_3Br}$`,
          L`$\mathrm{CH_3CH_2CH_2Br}$`,
          L`$\mathrm{(CH_3)_2CHBr}$`,
          L`$\mathrm{(CH_3)_3CBr}$`,
        ],
        "A",
        {
          B: L`A primary bromide is good for $\mathrm{S_N2}$, but methyl bromide has even less steric hindrance.`,
          C: L`Secondary bromides are more hindered and slower in $\mathrm{S_N2}$.`,
          D: L`Tertiary bromides are too crowded for backside attack.`,
        },
        [
          L`$\mathrm{S_N2}$ needs backside attack.`,
          L`Less crowding around the carbon-halogen bond gives a faster reaction.`,
          L`Methyl halides are the least hindered.`,
        ],
        [
          {
            step: 1,
            explanation: L`The $\mathrm{S_N2}$ reactivity order by steric accessibility is methyl $>$ primary $>$ secondary $\gg$ tertiary, so $\mathrm{CH_3Br}$ is fastest.`,
          },
        ],
      ),
      mc(
        L`Optically active $\mathrm{2}$-bromobutane reacts with $\mathrm{OH^-}$ by a clean $\mathrm{S_N2}$ pathway. The product formation at the chiral carbon occurs mainly with`,
        3,
        ["sn2", "walden_inversion", "stereochemistry"],
        [
          L`inversion of configuration`,
          L`complete retention of configuration`,
          L`racemisation through a planar carbocation`,
          L`no change because $\mathrm{C-Br}$ is not broken`,
        ],
        "A",
        {
          B: L`Backside attack in $\mathrm{S_N2}$ gives inversion, not retention.`,
          C: L`A planar carbocation is an $\mathrm{S_N1}$ feature.`,
          D: L`The $\mathrm{C-Br}$ bond breaks during substitution.`,
        },
        [
          L`Think of the direction of nucleophile attack.`,
          L`$\mathrm{S_N2}$ is a single-step backside attack.`,
          L`Backside attack flips the arrangement at the chiral carbon.`,
        ],
        [
          {
            step: 1,
            explanation: L`A clean $\mathrm{S_N2}$ reaction proceeds through backside attack and gives Walden inversion at the reacting chiral carbon.`,
          },
        ],
      ),
      mc(
        L`Ethyl bromide is treated separately with $\mathrm{KCN}$ and $\mathrm{AgCN}$. The main products are respectively`,
        3,
        ["ambident_nucleophile", "cyanide", "isocyanide"],
        [
          L`ethyl cyanide and ethyl isocyanide`,
          L`ethyl isocyanide and ethyl cyanide`,
          L`ethene and ethane`,
          L`ethanol and ethoxyethane`,
        ],
        "A",
        {
          B: L`This reverses the linkage rule: ionic $\mathrm{KCN}$ attacks mainly through carbon, while covalent $\mathrm{AgCN}$ gives nitrogen linkage.`,
          C: L`These would require reduction or elimination conditions, not cyanide substitution.`,
          D: L`Hydroxide or alkoxide reagents would be needed for these oxygen-containing products.`,
        },
        [
          L`Cyanide ion is an ambident nucleophile.`,
          L`$\mathrm{KCN}$ gives carbon-linkage product $\mathrm{R-CN}$.`,
          L`$\mathrm{AgCN}$ favours nitrogen-linkage product $\mathrm{R-NC}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`$\mathrm{KCN}$ is mainly ionic and gives ethyl cyanide, $\mathrm{CH_3CH_2CN}$. $\mathrm{AgCN}$ is more covalent and gives ethyl isocyanide, $\mathrm{CH_3CH_2NC}$.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): $\mathrm{(CH_3)_3CCl}$ favours $\mathrm{S_N1}$ over $\mathrm{S_N2}$ in a polar protic solvent. Reason (R): The tertiary carbocation formed from it is relatively stable and the substrate is sterically crowded.`,
        3,
        ["assertion_reason", "sn1_vs_sn2", "carbocation_stability"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`Carbocation stability favours $\mathrm{S_N1}$ and steric crowding blocks $\mathrm{S_N2}$, so the reason directly explains the assertion.`,
          C: L`The reason is true for a tertiary chloride.`,
          D: L`The assertion is also true under the stated conditions.`,
        },
        [
          L`Tertiary substrates form more stable carbocations.`,
          L`Tertiary substrates are poor for backside attack.`,
          L`Polar protic solvent also supports ionisation.`,
        ],
        [
          {
            step: 1,
            explanation: L`Both statements are true and the reason explains the preference: stable tertiary carbocation formation supports $\mathrm{S_N1}$, while crowding disfavors $\mathrm{S_N2}$.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`What is Walden inversion in the context of nucleophilic substitution of haloalkanes?`,
        1,
        ["walden_inversion", "sn2", "stereochemistry"],
        parts([["a", L`State the meaning in one sentence.`, 1]]),
        [
          L`It is connected with $\mathrm{S_N2}$.`,
          L`Backside attack changes the arrangement at the chiral carbon.`,
          L`The configuration is inverted.`,
        ],
        [
          {
            part: "a",
            explanation: L`Walden inversion is inversion of configuration at a chiral carbon caused by backside attack in an $\mathrm{S_N2}$ reaction.`,
          },
        ],
        [
          L`Calling it racemisation.`,
          L`Writing only "change of product" without mentioning configuration.`,
        ],
      ),
      frq(
        "saq",
        L`$\mathrm{2}$-bromobutane is treated separately with aqueous $\mathrm{KOH}$ and alcoholic $\mathrm{KOH}$ under heating. Predict the major reaction type and main organic product in each case.`,
        2,
        ["substitution_vs_elimination", "dehydrohalogenation", "saytzeff_rule"],
        parts([
          ["a", L`What happens with aqueous $\mathrm{KOH}$?`, 1],
          [
            "b",
            L`What happens with alcoholic $\mathrm{KOH}$ under heating?`,
            1,
          ],
        ]),
        [
          L`Aqueous alkali favours substitution by $\mathrm{OH^-}$.`,
          L`Alcoholic alkali with heat favours elimination of $\mathrm{HBr}$.`,
          L`For elimination from $\mathrm{2}$-bromobutane, the more substituted alkene is the major product.`,
        ],
        [
          {
            part: "a",
            explanation: L`Aqueous $\mathrm{KOH}$ favours nucleophilic substitution, giving butan-$2$-ol.`,
            math: L`\mathrm{CH_3CHBrCH_2CH_3 \xrightarrow{aq.\ KOH} CH_3CH(OH)CH_2CH_3}`,
          },
          {
            part: "b",
            explanation: L`Alcoholic $\mathrm{KOH}$ under heating favours dehydrohalogenation. The major product is but-$2$-ene by Saytzeff rule.`,
            math: L`\mathrm{CH_3CHBrCH_2CH_3 \xrightarrow{alc.\ KOH,\ heat} CH_3CH=CHCH_3}`,
          },
        ],
        [
          L`Treating aqueous and alcoholic $\mathrm{KOH}$ as identical conditions.`,
          L`Writing only but-$1$-ene and missing the more substituted major alkene.`,
        ],
      ),
      frq(
        "saq",
        L`Use the figure to identify the substitution pathway and the stereochemical outcome shown.`,
        2,
        ["figure_based", "sn2", "stereochemistry"],
        parts([
          ["a", L`Name the pathway shown.`, 1],
          ["b", L`State the stereochemical outcome at carbon.`, 1],
        ]),
        [
          L`The nucleophile approaches opposite the leaving group.`,
          L`The leaving group and attacking nucleophile are involved in one step.`,
          L`The product has the substituent arrangement flipped.`,
        ],
        [
          {
            part: "a",
            explanation: L`The pathway shown is $\mathrm{S_N2}$ substitution.`,
          },
          {
            part: "b",
            explanation: L`Backside attack causes inversion of configuration at the reacting carbon.`,
          },
        ],
        [
          L`Calling the figure $\mathrm{S_N1}$ despite no free planar carbocation being shown.`,
          L`Writing racemisation instead of inversion.`,
        ],
        sn2InversionFigure,
      ),
      frq(
        "laq",
        L`A haloalkane $\mathrm{R-Cl}$ gives substitution product slowly in water. The rate is unchanged when the water concentration is increased, and an optically active sample gives nearly racemic product. Deduce the mechanism and justify it.`,
        3,
        ["mechanism_deduction", "sn1", "rate_law", "racemisation"],
        parts([
          ["a", L`Name the mechanism.`, 1],
          ["b", L`Use the rate observation to support your answer.`, 1],
          [
            "c",
            L`Use the stereochemical observation to support your answer.`,
            1,
          ],
        ]),
        [
          L`If rate does not depend on nucleophile concentration, think unimolecular.`,
          L`Nearly racemic product suggests attack on a planar intermediate.`,
          L`A planar carbocation is formed in $\mathrm{S_N1}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`The mechanism is $\mathrm{S_N1}$.`,
          },
          {
            part: "b",
            explanation: L`The rate being unchanged by increased water concentration shows that nucleophile attack is not in the rate-determining step. The slow step is ionisation of $\mathrm{R-Cl}$.`,
          },
          {
            part: "c",
            explanation: L`Nearly racemic product indicates formation of a planar carbocation, which can be attacked from both faces.`,
          },
        ],
        [
          L`Calling it $\mathrm{S_N2}$ even though nucleophile concentration does not affect the rate.`,
          L`Using only the solvent name without rate or stereochemical evidence.`,
        ],
      ),
      frq(
        "case",
        L`Two bottles contain A = $\mathrm{CH_3CH_2CH_2Cl}$ and B = $\mathrm{(CH_3)_3CCl}$. Both are tested with aqueous alkali and with a polar protic solvent mixture.`,
        3,
        ["case_based", "sn1_vs_sn2", "substrate_effect"],
        parts([
          [
            "a",
            L`Which compound is better suited to $\mathrm{S_N2}$ with a strong nucleophile?`,
            1,
          ],
          [
            "b",
            L`Which compound is better suited to $\mathrm{S_N1}$ solvolysis?`,
            1,
          ],
          ["c", L`Give one reason for each choice.`, 1],
        ]),
        [
          L`A is primary; B is tertiary.`,
          L`$\mathrm{S_N2}$ is slowed by crowding.`,
          L`$\mathrm{S_N1}$ is helped by stable carbocation formation.`,
        ],
        [
          {
            part: "a",
            explanation: L`A is better suited to $\mathrm{S_N2}$ because it is primary and less hindered.`,
          },
          {
            part: "b",
            explanation: L`B is better suited to $\mathrm{S_N1}$ because ionisation gives a relatively stable tertiary carbocation.`,
          },
          {
            part: "c",
            explanation: L`Primary structure favours backside attack for A, while tertiary carbocation stability and polar protic solvent favour B in $\mathrm{S_N1}$.`,
          },
        ],
        [
          L`Using the same mechanism for both bottles without checking structure.`,
          L`Saying tertiary always reacts fastest without specifying $\mathrm{S_N1}$ or $\mathrm{S_N2}$.`,
        ],
      ),
    ],
  },
  {
    topicCode: "6.4",
    title: "Haloarene Reactions and Organometallic Routes",
    subtopic:
      "Explain haloarene substitution patterns, harsh nucleophilic substitution conditions, and carbon-carbon bond forming reactions of halides.",
    mc: [
      mc(
        L`When chlorobenzene undergoes nitration, the major products are mainly`,
        3,
        ["haloarene_reactions", "directive_effect", "nitration"],
        [
          L`ortho- and para-nitrochlorobenzene`,
          L`only meta-nitrochlorobenzene`,
          L`benzyl nitrate`,
          L`chlorocyclohexane`,
        ],
        "A",
        {
          B: L`Halogens are deactivating but ortho-para directing because of resonance donation.`,
          C: L`The side-chain compound benzyl nitrate is not formed from chlorobenzene nitration.`,
          D: L`The aromatic ring is not being hydrogenated to cyclohexane.`,
        },
        [
          L`Halogens deactivate the ring but direct incoming electrophiles.`,
          L`Their resonance effect favours ortho and para positions.`,
          L`Nitration of chlorobenzene gives ortho and para products.`,
        ],
        [
          {
            step: 1,
            explanation: L`Chlorine is deactivating but ortho-para directing, so nitration gives mainly ortho- and para-nitrochlorobenzene.`,
          },
        ],
      ),
      mc(
        L`Chlorobenzene gives phenol on treatment with $\mathrm{NaOH}$ at high temperature and pressure followed by acidification. This shows that nucleophilic substitution in haloarenes generally requires`,
        3,
        ["dow_process", "haloarene_substitution", "reaction_conditions"],
        [
          L`harsh conditions because the aryl $\mathrm{C-Cl}$ bond is difficult to break`,
          L`only sunlight because the reaction is radical chlorination`,
          L`dry ether because phenol is a Grignard reagent`,
          L`aqueous $\mathrm{NaCl}$ because chloride is a catalyst`,
        ],
        "A",
        {
          B: L`This is not radical chlorination; it is replacement of chlorine by hydroxyl under harsh conditions.`,
          C: L`Dry ether is used for Grignard formation, not the Dow process to phenol.`,
          D: L`Aqueous sodium chloride does not catalyse this substitution.`,
        },
        [
          L`Haloarenes resist ordinary nucleophilic substitution.`,
          L`Dow process uses high temperature and pressure.`,
          L`The strong aryl $\mathrm{C-Cl}$ bond explains the harsh conditions.`,
        ],
        [
          {
            step: 1,
            explanation: L`The Dow process requires harsh conditions because chlorobenzene has a resonance-strengthened aryl $\mathrm{C-Cl}$ bond.`,
          },
        ],
      ),
      mc(
        L`The Wurtz reaction of bromomethane with sodium in dry ether mainly gives`,
        2,
        ["wurtz_reaction", "carbon_carbon_bond"],
        [L`ethane`, L`ethene`, L`methanol`, L`toluene`],
        "A",
        {
          B: L`Wurtz coupling joins two methyl groups; it does not eliminate HBr to an alkene here.`,
          C: L`Methanol would require substitution by hydroxide, not sodium in dry ether.`,
          D: L`Toluene would require an aryl halide plus methyl halide in a Wurtz-Fittig type reaction.`,
        },
        [
          L`Wurtz reaction couples two alkyl halide molecules.`,
          L`Two methyl groups join.`,
          L`$\mathrm{CH_3-CH_3}$ is ethane.`,
        ],
        [
          {
            step: 1,
            explanation: L`Two molecules of bromomethane couple in dry ether with sodium to form ethane.`,
            math: L`\mathrm{2CH_3Br + 2Na \rightarrow CH_3CH_3 + 2NaBr}`,
          },
        ],
      ),
      mc(
        L`Chlorobenzene and chloromethane are treated with sodium in dry ether. The intended cross-coupled product is`,
        3,
        ["wurtz_fittig_reaction", "haloarene", "carbon_carbon_bond"],
        [L`toluene`, L`biphenyl`, L`ethane`, L`phenol`],
        "A",
        {
          B: L`Biphenyl is formed by Fittig coupling of two aryl halide molecules, not cross-coupling with methyl chloride.`,
          C: L`Ethane is Wurtz coupling of methyl chloride with itself.`,
          D: L`Phenol requires replacement of aryl halogen by hydroxyl under harsh conditions.`,
        },
        [
          L`An aryl halide and an alkyl halide with sodium in dry ether suggests Wurtz-Fittig reaction.`,
          L`A phenyl group and a methyl group are coupled.`,
          L`$\mathrm{C_6H_5CH_3}$ is toluene.`,
        ],
        [
          {
            step: 1,
            explanation: L`Wurtz-Fittig reaction couples an aryl halide with an alkyl halide, giving toluene here.`,
            math: L`\mathrm{C_6H_5Cl + CH_3Cl + 2Na \rightarrow C_6H_5CH_3 + 2NaCl}`,
          },
        ],
      ),
      mc(
        L`Bromobenzene is treated with magnesium in dry ether. The reagent formed is useful but must be protected from water because water`,
        3,
        ["grignard_reagent", "dry_ether", "organometallic"],
        [
          L`protonates the Grignard reagent and destroys it`,
          L`converts it directly to nitrobenzene`,
          L`acts as the dry ether solvent`,
          L`oxidises benzene to benzoic acid without carbon dioxide`,
        ],
        "A",
        {
          B: L`There is no nitration reagent present.`,
          C: L`Water is not dry ether and is incompatible with Grignard reagents.`,
          D: L`Benzoic acid formation from a Grignard reagent requires carbon dioxide followed by hydrolysis, not water alone.`,
        },
        [
          L`The product is phenylmagnesium bromide.`,
          L`Grignard reagents are strongly basic.`,
          L`Water supplies acidic hydrogen and quenches them.`,
        ],
        [
          {
            step: 1,
            explanation: L`Bromobenzene forms phenylmagnesium bromide in dry ether. Water protonates the carbon-magnesium bond, destroying the Grignard reagent.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Name the two major positional products expected when chlorobenzene is nitrated under usual electrophilic substitution conditions.`,
        1,
        ["haloarene_reactions", "directive_effect"],
        parts([["a", L`Give both product positions.`, 1]]),
        [
          L`Chlorine is ortho-para directing.`,
          L`It is still deactivating, but the position effect remains ortho/para.`,
          L`Write the nitro group positions relative to chlorine.`,
        ],
        [
          {
            part: "a",
            explanation: L`The major positional products are ortho-nitrochlorobenzene and para-nitrochlorobenzene.`,
          },
        ],
        [
          L`Writing only meta product because chlorine is deactivating.`,
          L`Ignoring the directing effect of halogen resonance donation.`,
        ],
      ),
      frq(
        "saq",
        L`Explain why chlorobenzene does not undergo nucleophilic substitution as readily as chloroethane under ordinary laboratory conditions.`,
        2,
        ["haloarene_inertness", "resonance", "nucleophilic_substitution"],
        parts([
          ["a", L`Give the bond-strength reason.`, 1],
          ["b", L`Give the hybridisation/electronic reason.`, 1],
        ]),
        [
          L`The aryl $\mathrm{C-Cl}$ bond is not like an alkyl $\mathrm{C-Cl}$ bond.`,
          L`Resonance gives partial double-bond character.`,
          L`The carbon is sp$^2$ hybridised and holds chlorine more strongly.`,
        ],
        [
          {
            part: "a",
            explanation: L`Resonance between chlorine lone pairs and the benzene ring gives the aryl $\mathrm{C-Cl}$ bond partial double-bond character, making it shorter and stronger.`,
          },
          {
            part: "b",
            explanation: L`The carbon bonded to chlorine is sp$^2$ hybridised and more electronegative than an sp$^3$ carbon, so nucleophilic displacement is difficult.`,
          },
        ],
        [
          L`Saying only that benzene is aromatic without connecting to the $\mathrm{C-Cl}$ bond.`,
          L`Claiming chlorobenzene reacts faster because benzene is electron rich.`,
        ],
      ),
      frq(
        "saq",
        L`Convert chlorobenzene to phenol. State the conditions and the final work-up.`,
        2,
        ["dow_process", "phenol_preparation", "haloarene_substitution"],
        parts([
          ["a", L`Give the main reaction condition.`, 1],
          ["b", L`Give the final step to obtain phenol.`, 1],
        ]),
        [
          L`Use aqueous sodium hydroxide under harsh conditions.`,
          L`The first product is sodium phenoxide.`,
          L`Acidification gives phenol.`,
        ],
        [
          {
            part: "a",
            explanation: L`Treat chlorobenzene with aqueous $\mathrm{NaOH}$ at high temperature and pressure to form sodium phenoxide.`,
          },
          {
            part: "b",
            explanation: L`Acidify sodium phenoxide to obtain phenol.`,
            math: L`\mathrm{C_6H_5ONa \xrightarrow{H^+} C_6H_5OH}`,
          },
        ],
        [
          L`Using room-temperature aqueous alkali without noting harsh conditions.`,
          L`Stopping at sodium phenoxide and not acidifying.`,
        ],
      ),
      frq(
        "laq",
        L`Distinguish Wurtz, Fittig and Wurtz-Fittig reactions using one equation or example for each.`,
        3,
        ["named_reactions", "wurtz", "fittig", "wurtz_fittig"],
        parts([
          ["a", L`State Wurtz reaction with an example.`, 1],
          ["b", L`State Fittig reaction with an example.`, 1],
          ["c", L`State Wurtz-Fittig reaction with an example.`, 1],
        ]),
        [
          L`All use sodium in dry ether.`,
          L`Wurtz couples alkyl halides; Fittig couples aryl halides.`,
          L`Wurtz-Fittig couples an aryl halide with an alkyl halide.`,
        ],
        [
          {
            part: "a",
            explanation: L`Wurtz reaction couples two alkyl halides using sodium in dry ether.`,
            math: L`\mathrm{2CH_3Br+2Na \rightarrow CH_3CH_3+2NaBr}`,
          },
          {
            part: "b",
            explanation: L`Fittig reaction couples two aryl halides using sodium in dry ether.`,
            math: L`\mathrm{2C_6H_5Cl+2Na \rightarrow C_6H_5-C_6H_5+2NaCl}`,
          },
          {
            part: "c",
            explanation: L`Wurtz-Fittig reaction couples an aryl halide with an alkyl halide.`,
            math: L`\mathrm{C_6H_5Cl+CH_3Cl+2Na \rightarrow C_6H_5CH_3+2NaCl}`,
          },
        ],
        [
          L`Using water or alcohol solvent instead of dry ether.`,
          L`Mixing up Fittig and Wurtz-Fittig products.`,
        ],
      ),
      frq(
        "case",
        L`A student nitrates chlorobenzene and then compares the products with the three disubstituted benzene arrangements shown in the figure.`,
        3,
        ["case_based", "figure_based", "haloarene_directive_effect"],
        parts([
          ["a", L`Which arrangement represents the ortho product?`, 1],
          ["b", L`Which arrangement represents the para product?`, 1],
          [
            "c",
            L`Why are these positions favoured even though chlorine deactivates the ring?`,
            1,
          ],
        ]),
        [
          L`Ortho means adjacent substituents.`,
          L`Para means opposite substituents.`,
          L`Halogens deactivate by induction but donate by resonance to direct ortho/para.`,
        ],
        [
          {
            part: "a",
            explanation: L`Arrangement I is the ortho product because the two substituents are adjacent.`,
          },
          {
            part: "b",
            explanation: L`Arrangement III is the para product because the substituents are opposite each other.`,
          },
          {
            part: "c",
            explanation: L`Chlorine deactivates the ring by its $-I$ effect, but resonance donation stabilises ortho and para substitution intermediates, so it is ortho-para directing.`,
          },
        ],
        [
          L`Choosing the meta arrangement because halogens are deactivating.`,
          L`Using only the words ortho and para without identifying the positions in the figure.`,
        ],
        disubstitutedBenzeneFigure,
      ),
    ],
  },
  {
    topicCode: "6.5",
    title: "Polyhalogen Compounds and Environmental Aspects",
    subtopic:
      "Use reactions, storage facts and environmental evidence to reason about chloroform, iodoform, carbon tetrachloride, freons and DDT.",
    mc: [
      mc(
        L`Chloroform is stored in dark bottles filled nearly to the top because, in air and light, it can form`,
        2,
        ["chloroform", "phosgene", "storage"],
        [
          L`phosgene, $\mathrm{COCl_2}$`,
          L`iodoform, $\mathrm{CHI_3}$`,
          L`benzene hexachloride`,
          L`chlorobenzene`,
        ],
        "A",
        {
          B: L`Iodoform contains iodine and is not the oxidation product of chloroform in air.`,
          C: L`Benzene hexachloride comes from addition of chlorine to benzene under different conditions.`,
          D: L`Chlorobenzene is an aryl chloride, not the toxic oxidation product of chloroform.`,
        },
        [
          L`The danger involves oxidation by air in light.`,
          L`The product is a very poisonous carbonyl chloride.`,
          L`Its formula is $\mathrm{COCl_2}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Chloroform can be oxidised by air in sunlight to phosgene, $\mathrm{COCl_2}$, so it is stored away from light and air.`,
          },
        ],
      ),
      mc(
        L`Which compound is expected to give a positive iodoform test under suitable conditions?`,
        2,
        ["iodoform_test", "methyl_carbinol", "polyhalogen"],
        [
          L`propan-$2$-ol`,
          L`propan-$1$-ol`,
          L`benzyl alcohol`,
          L`chlorobenzene`,
        ],
        "A",
        {
          B: L`Propan-1-ol lacks the required $\mathrm{CH_3CH(OH)-}$ group.`,
          C: L`Benzyl alcohol does not contain the methyl carbinol unit needed for this test.`,
          D: L`Chlorobenzene is an aryl halide and does not give iodoform test.`,
        },
        [
          L`Iodoform test is given by compounds with $\mathrm{CH_3CO-}$ or oxidisable $\mathrm{CH_3CH(OH)-}$ groups.`,
          L`Secondary alcohols of type $\mathrm{CH_3CH(OH)R}$ can give the test.`,
          L`Propan-2-ol fits this pattern.`,
        ],
        [
          {
            step: 1,
            explanation: L`Propan-2-ol has the $\mathrm{CH_3CH(OH)-}$ unit and is oxidised under the test conditions to a methyl ketone, giving yellow iodoform.`,
          },
        ],
      ),
      mc(
        L`DDT became an environmental concern mainly because it is`,
        2,
        ["ddt", "environmental_effects", "biomagnification"],
        [
          L`persistent and can undergo biomagnification in food chains`,
          L`so reactive that it disappears instantly from soil`,
          L`a water-soluble fertiliser`,
          L`used only as a laboratory drying agent`,
        ],
        "A",
        {
          B: L`The concern is the opposite: it persists for long periods.`,
          C: L`DDT is not a water-soluble fertiliser.`,
          D: L`It was used as an insecticide, not mainly as a drying agent.`,
        },
        [
          L`Think about long-term environmental persistence.`,
          L`Fat-soluble persistent compounds can accumulate in organisms.`,
          L`Concentration can increase up the food chain.`,
        ],
        [
          {
            step: 1,
            explanation: L`DDT is persistent and fat-soluble, so it can accumulate and biomagnify through food chains.`,
          },
        ],
      ),
      mc(
        L`Freons damage the ozone layer because they can release, in the upper atmosphere,`,
        2,
        ["freons", "ozone_depletion", "chlorine_radicals"],
        [
          L`chlorine radicals that catalyse ozone decomposition`,
          L`sodium ions that neutralise ozone`,
          L`iodoform crystals that absorb ultraviolet light`,
          L`carbon particles that reduce atmospheric pressure`,
        ],
        "A",
        {
          B: L`Freons do not release sodium ions.`,
          C: L`Iodoform is not the ozone-depleting species from freons.`,
          D: L`Ozone depletion is not explained by carbon particles reducing pressure.`,
        },
        [
          L`Freons are chlorofluorocarbons.`,
          L`High-energy radiation can break C-Cl bonds in the stratosphere.`,
          L`Chlorine radicals catalyse ozone destruction.`,
        ],
        [
          {
            step: 1,
            explanation: L`In the stratosphere, freons can release chlorine radicals, which catalytically decompose ozone.`,
          },
        ],
      ),
      mc(
        L`The use of carbon tetrachloride as a cleaning solvent and fire-extinguishing fluid has been restricted because it is`,
        2,
        ["carbon_tetrachloride", "toxicity", "environmental_safety"],
        [
          L`toxic and can form poisonous gases at high temperature`,
          L`the safest solvent for human exposure`,
          L`a biodegradable nutrient`,
          L`identical in properties to water`,
        ],
        "A",
        {
          B: L`It is hazardous, not safe for exposure.`,
          C: L`Carbon tetrachloride is not a biodegradable nutrient.`,
          D: L`It is a non-polar chlorinated solvent, not water-like.`,
        },
        [
          L`Carbon tetrachloride is a polyhalogen compound with toxicity concerns.`,
          L`Heating chlorinated solvents can produce very poisonous gases.`,
          L`Safety restrictions are based on toxicity and environmental risk.`,
        ],
        [
          {
            step: 1,
            explanation: L`Carbon tetrachloride is toxic and may form poisonous gases such as phosgene at high temperature, so its use is restricted.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Give the formula and colour of iodoform.`,
        1,
        ["iodoform", "polyhalogen_compounds"],
        parts([["a", L`State both formula and colour.`, 1]]),
        [
          L`Iodoform is a trihalomethane.`,
          L`It contains one carbon, one hydrogen and three iodine atoms.`,
          L`It is recognised as a yellow solid.`,
        ],
        [
          {
            part: "a",
            explanation: L`Iodoform has formula $\mathrm{CHI_3}$ and is a yellow crystalline solid.`,
          },
        ],
        [
          L`Writing chloroform's formula $\mathrm{CHCl_3}$.`,
          L`Omitting the colour even though the question asks for it.`,
        ],
      ),
      frq(
        "saq",
        L`Why is chloroform stored in dark, tightly filled bottles?`,
        2,
        ["chloroform", "phosgene", "storage"],
        parts([
          ["a", L`Name the hazardous product avoided.`, 1],
          ["b", L`Explain the role of dark, tightly filled bottles.`, 1],
        ]),
        [
          L`Air and light promote oxidation.`,
          L`The dangerous product is phosgene.`,
          L`Dark bottles reduce light exposure; filling tightly reduces air.`,
        ],
        [
          {
            part: "a",
            explanation: L`The hazardous product is phosgene, $\mathrm{COCl_2}$.`,
          },
          {
            part: "b",
            explanation: L`Dark bottles reduce light exposure and tightly filled bottles reduce contact with oxygen, preventing oxidation of chloroform to phosgene.`,
          },
        ],
        [
          L`Saying only that chloroform evaporates.`,
          L`Naming iodoform instead of phosgene.`,
        ],
      ),
      frq(
        "saq",
        L`Compare dichloromethane and freons in terms of one important use/former use and one health or environmental concern.`,
        2,
        ["dichloromethane", "freons", "environmental_effects"],
        parts([
          [
            "a",
            L`State one use/former use and one concern of dichloromethane.`,
            1,
          ],
          ["b", L`State one use/former use and one concern of freons.`, 1],
        ]),
        [
          L`Dichloromethane is a chlorinated solvent.`,
          L`Freons were used as refrigerants or aerosol propellants.`,
          L`For concerns, separate human toxicity from ozone depletion.`,
        ],
        [
          {
            part: "a",
            explanation: L`Dichloromethane has been used as a solvent or paint remover, but inhalation exposure can harm health, especially the central nervous system.`,
          },
          {
            part: "b",
            explanation: L`Freons were used as refrigerants or aerosol propellants, but in the stratosphere they can release chlorine radicals that deplete ozone.`,
          },
        ],
        [
          L`Treating dichloromethane as environmentally identical to freons.`,
          L`Writing only uses without any health or environmental concern.`,
        ],
      ),
      frq(
        "laq",
        L`A teacher asks students to prepare a safety note on three polyhalogen compounds: chloroform, carbon tetrachloride and DDT. Write one use or former use and one hazard for each.`,
        3,
        ["polyhalogen_compounds", "applications", "hazards"],
        parts([
          ["a", L`Give one use/former use and one hazard of chloroform.`, 1],
          [
            "b",
            L`Give one use/former use and one hazard of carbon tetrachloride.`,
            1,
          ],
          ["c", L`Give one use/former use and one hazard of DDT.`, 1],
        ]),
        [
          L`Chloroform and carbon tetrachloride are chlorinated solvents with toxicity issues.`,
          L`DDT was used as an insecticide.`,
          L`For hazards, focus on phosgene/toxicity/persistence.`,
        ],
        [
          {
            part: "a",
            explanation: L`Chloroform was used as an anaesthetic/solvent, but it is harmful and can form poisonous phosgene in air and light.`,
          },
          {
            part: "b",
            explanation: L`Carbon tetrachloride was used as a solvent or fire-extinguishing fluid, but it is toxic and can form poisonous gases when heated.`,
          },
          {
            part: "c",
            explanation: L`DDT was used as an insecticide, but it persists in the environment and can biomagnify in food chains.`,
          },
        ],
        [
          L`Listing uses without hazards.`,
          L`Treating all three as safe because they were historically used.`,
        ],
      ),
      frq(
        "case",
        L`During a laboratory audit, one chloroform bottle is found half-filled near a sunny window, an old carbon tetrachloride cleaner is found near a burner, and a poster mentions the historical use of DDT as an insecticide.`,
        3,
        ["case_based", "safety", "polyhalogen_compounds"],
        parts([
          ["a", L`What is the risk with the chloroform bottle?`, 1],
          [
            "b",
            L`Why is the carbon tetrachloride cleaner unsafe near heat?`,
            1,
          ],
          [
            "c",
            L`Why is DDT no longer treated as an ordinary harmless insecticide?`,
            1,
          ],
        ]),
        [
          L`Chloroform reacts with air and light.`,
          L`Heated chlorinated solvents can produce toxic gases.`,
          L`DDT is persistent and accumulates.`,
        ],
        [
          {
            part: "a",
            explanation: L`The chloroform may oxidise in air and light to poisonous phosgene, so it should be stored in a dark, tightly filled bottle.`,
          },
          {
            part: "b",
            explanation: L`Carbon tetrachloride is toxic and can form poisonous gases such as phosgene at high temperature, so heat exposure is unsafe.`,
          },
          {
            part: "c",
            explanation: L`DDT is persistent and can biomagnify through food chains, creating long-term environmental risk.`,
          },
        ],
        [
          L`Saying the only issue is unpleasant smell.`,
          L`Ignoring the difference between immediate toxicity and long-term persistence.`,
        ],
      ),
    ],
  },
];

export const haloalkanesHaloarenesTopics: Topic[] = topicSeeds.map(makeTopic);
