import type {
  FrqItem,
  FrqPart,
  FrqRubric,
  FrqSolutionPart,
  Hint,
  McChoice,
  McSingleItem,
  SolutionStep,
  Topic,
} from "@/lib/content/types";
import { calibrateCbseChemistryDifficulty } from "../../../lib/content/difficulty-calibration.mjs";

const COURSE = "cbse-chemistry-12";
const UNIT = "u10-biomolecules";
const VERSION = "0.1.1";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const TOPIC_CHOICE_ROTATION_OFFSETS: Record<string, number> = {
  "10.1": 0,
  "10.2": 1,
  "10.3": 2,
  "10.4": 3,
  "10.5": 0,
};
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
        /(^|[^\\])\b(mathrm|text|frac|Delta|delta|alpha|beta|gamma|times|cdot|approx|rightarrow|rightleftharpoons|xrightarrow|le|ge|neq|mu|sqrt|sigma|pi)\b/g,
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

function repairSolutionStep(step: SolutionStepSeed, index: number): SolutionStep {
  return {
    step: step.step ?? index + 1,
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
  return `You chose ${choiceText}. Recheck the biomolecule class, bond type, hydrolysis product, biological role, or structural unit before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        : "incorrect_cbse_class12_chemistry_biomolecules_reasoning",
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
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "matches_a_familiar_biomolecule_name_without_checking_the_evidence",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    choices,
    correctLetter: choices.find((choice) => choice.isCorrect)?.letter ?? "A",
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map((step, stepIndex) =>
      repairSolutionStep(step, stepIndex),
    ),
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
    difficulty: calibrateCbseChemistryDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_a_biological_fact_without_linking_it_to_structure_or_function",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
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

function rubric(items: readonly FrqPart[]): FrqRubric {
  return {
    maxPoints: items.reduce((total, item) => total + item.points, 0),
    criteria: items.map((item) => ({
      part: item.letter,
      points: item.points,
      description: `Completes part ${item.letter} with correct biomolecule classification, structure-function reasoning, hydrolysis product, deficiency, base-pairing or regulatory role as required.`,
    })),
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

function mc(
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  choices: readonly [string, string, string, string],
  correctLetter: McLetter,
  rationales: Partial<Record<McLetter, string>>,
  hintsInput: readonly [string, string, string],
  solution: readonly SolutionStepSeed[],
  commonMisconceptions?: string[],
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
    commonMisconceptions,
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
  commonMisconceptions?: string[],
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
    commonMisconceptions,
  };
}

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "10.1",
    title: "Carbohydrates",
    subtopic:
      "Classification, reducing and non-reducing sugars, hydrolysis products, and polysaccharide roles.",
    mc: [
      mc(
        L`A carbohydrate sample has formula $\mathrm{C_6H_{12}O_6}$ and has an aldehyde group in its open-chain form. It is best classified as`,
        2,
        ["glucose_classification", "aldose_ketose"],
        [
          L`an aldohexose`,
          L`a ketohexose`,
          L`a disaccharide`,
          L`a polysaccharide`,
        ],
        "A",
        {
          B: L`Fructose is a ketohexose; glucose contains an aldehyde group in its open-chain form.`,
          C: L`A disaccharide contains two monosaccharide units, not one $\mathrm{C_6}$ unit.`,
          D: L`A polysaccharide is a high-molar-mass polymer of many monosaccharide units.`,
        },
        [
          L`Look for the functional group in the open-chain form.`,
          L`Aldehyde-containing hexose means aldohexose.`,
          L`Glucose is the standard aldohexose in this chapter.`,
        ],
        [
          {
            explanation: L`The sample has six carbon atoms and behaves as an aldehyde-containing monosaccharide.`,
            math: L`\mathrm{hexose + aldehyde = aldohexose}`,
          },
        ],
      ),
      mc(
        L`Sucrose does not reduce Tollens' reagent, whereas maltose does. The best reason is that sucrose`,
        3,
        ["reducing_sugars", "glycosidic_bond"],
        [
          L`has both anomeric carbons involved in the glycosidic bond`,
          L`contains no oxygen atoms`,
          L`is not hydrolysed by acids`,
          L`contains only fructose units`,
        ],
        "A",
        {
          B: L`Sucrose contains many oxygen atoms; oxygen count is not the reducing-sugar test.`,
          C: L`Sucrose is hydrolysed by dilute acids or enzymes into glucose and fructose.`,
          D: L`Sucrose is made from glucose and fructose, not fructose alone.`,
        },
        [
          L`A reducing sugar needs a free anomeric carbon.`,
          L`Compare maltose with sucrose at the glycosidic linkage.`,
          L`In sucrose, neither monosaccharide unit has a free hemiacetal/hemiketal centre.`,
        ],
        [
          {
            explanation: L`A sugar is reducing when it can open to a carbonyl form through a free anomeric carbon.`,
          },
          {
            explanation: L`In sucrose, the glycosidic bond uses both anomeric carbons, so it is non-reducing.`,
          },
        ],
      ),
      mc(
        L`Hydrolysis of lactose gives`,
        2,
        ["disaccharide_hydrolysis", "lactose"],
        [
          L`glucose and galactose`,
          L`glucose and fructose`,
          L`two glucose units`,
          L`fructose and galactose`,
        ],
        "A",
        {
          B: L`Glucose and fructose are the hydrolysis products of sucrose.`,
          C: L`Two glucose units are obtained from maltose.`,
          D: L`Lactose contains glucose and galactose, not fructose and galactose.`,
        },
        [
          L`Recall the three common disaccharides separately.`,
          L`Sucrose: glucose + fructose; maltose: glucose + glucose.`,
          L`Lactose is the milk sugar made from glucose and galactose.`,
        ],
        [
          {
            explanation: L`Lactose is a disaccharide built from one glucose unit and one galactose unit.`,
            math: L`\mathrm{lactose + H_2O \rightarrow glucose + galactose}`,
          },
        ],
      ),
      mc(
        L`Humans digest starch more readily than cellulose mainly because cellulose contains`,
        3,
        ["polysaccharides", "cellulose"],
        [
          L`$\beta$-glycosidic linkages that human digestive enzymes do not hydrolyse efficiently`,
          L`only fructose units instead of glucose units`,
          L`no glycosidic bonds`,
          L`peptide bonds between glucose units`,
        ],
        "A",
        {
          B: L`Cellulose is a polymer of glucose units, not fructose units.`,
          C: L`Cellulose is held together by glycosidic bonds.`,
          D: L`Peptide bonds occur in proteins, not in polysaccharides.`,
        },
        [
          L`Both starch and cellulose are glucose polymers.`,
          L`The difference is the type of glycosidic linkage and chain arrangement.`,
          L`Human enzymes hydrolyse starch linkages but not cellulose linkages effectively.`,
        ],
        [
          {
            explanation: L`Starch and cellulose both contain glucose units, but cellulose has $\beta$-glycosidic linkages.`,
          },
          {
            explanation: L`Human digestive enzymes do not hydrolyse these cellulose linkages efficiently, so cellulose acts as dietary fibre.`,
          },
        ],
      ),
      mc(
        L`In the name D-glucose, the symbol D refers to`,
        2,
        ["d_l_configuration", "carbohydrate_configuration"],
        [
          L`configuration at the highest-numbered chiral carbon relative to D-glyceraldehyde`,
          L`a guarantee that the compound rotates plane-polarised light to the right`,
          L`the number of carbon atoms in the sugar`,
          L`the fact that glucose is a disaccharide`,
        ],
        "A",
        {
          B: L`D/L configuration is not the same as the sign of optical rotation.`,
          C: L`The number of carbon atoms is expressed by terms such as hexose.`,
          D: L`Glucose is a monosaccharide, not a disaccharide.`,
        },
        [
          L`D/L notation is a configurational convention.`,
          L`Do not confuse D/L with +/-.`,
          L`For sugars, compare the highest-numbered chiral carbon with glyceraldehyde.`,
        ],
        [
          {
            explanation: L`D/L notation tells the configuration of the highest-numbered chiral carbon in a sugar relative to glyceraldehyde.`,
          },
          {
            explanation: L`It does not by itself state whether the compound is dextrorotatory or laevorotatory.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`What does the term reducing sugar mean?`,
        1,
        ["reducing_sugars"],
        onePart(L`State the condition required for a sugar to be reducing.`, 1),
        [
          L`Think of Tollens' or Fehling's test.`,
          L`The sugar must be able to generate a free aldehydic or ketonic carbonyl form under test conditions.`,
          L`A free anomeric carbon is the key structural clue for many sugars.`,
        ],
        [
          {
            part: "a",
            explanation: L`A reducing sugar is one that can reduce mild oxidising reagents such as Tollens' or Fehling's solution because it has, or can form, a free carbonyl form.`,
          },
        ],
        [L`Naming only glucose and not stating the structural condition.`],
      ),
      frq(
        "saq",
        L`Glucose and fructose have the same molecular formula $\mathrm{C_6H_{12}O_6}$ but are not the same carbohydrate. Explain by classifying both.`,
        2,
        ["aldose_ketose", "carbohydrate_isomerism"],
        parts([
          ["a", L`Classify glucose.`, 1],
          ["b", L`Classify fructose and state the difference.`, 1],
        ]),
        [
          L`Both are monosaccharides and both are hexoses.`,
          L`Check the carbonyl group in the open-chain form.`,
          L`Glucose is aldehydic; fructose is ketonic.`,
        ],
        [
          {
            part: "a",
            explanation: L`Glucose is an aldohexose: it is a six-carbon monosaccharide with an aldehyde group in its open-chain form.`,
          },
          {
            part: "b",
            explanation: L`Fructose is a ketohexose: it has the same molecular formula but contains a ketone group in the open-chain form.`,
          },
        ],
        [L`Calling both carbohydrates identical because their molecular formula is the same.`],
      ),
      frq(
        "saq",
        L`A sweet solution is non-reducing before hydrolysis. After acid hydrolysis it gives an equimolar mixture of glucose and fructose. Identify the sugar and justify your answer.`,
        3,
        ["sucrose", "hydrolysis", "non_reducing_sugar"],
        parts([
          ["a", L`Identify the sugar.`, 1],
          ["b", L`Give the hydrolysis products.`, 1],
          ["c", L`Explain why the original sugar is non-reducing.`, 1],
        ]),
        [
          L`The hydrolysis products are the strongest clue.`,
          L`Glucose + fructose points to sucrose.`,
          L`Non-reducing behaviour comes from no free anomeric carbon in sucrose.`,
        ],
        [
          {
            part: "a",
            explanation: L`The sugar is sucrose.`,
          },
          {
            part: "b",
            explanation: L`Sucrose hydrolyses to glucose and fructose.`,
            math: L`\mathrm{sucrose + H_2O \rightarrow glucose + fructose}`,
          },
          {
            part: "c",
            explanation: L`Sucrose is non-reducing because both anomeric carbons are involved in the glycosidic bond.`,
          },
        ],
        [L`Identifying the sugar as maltose because it is a disaccharide.`],
      ),
      frq(
        "laq",
        L`Three carbohydrate samples X, Y and Z are tested. X is non-reducing but on hydrolysis gives glucose and fructose. Y is reducing and on hydrolysis gives two glucose units. Z gives a blue-black colour with iodine and on hydrolysis gives only glucose.`,
        4,
        ["carbohydrate_identification", "disaccharides", "polysaccharides"],
        parts([
          ["a", L`Identify X.`, 1],
          ["b", L`Identify Y.`, 1],
          ["c", L`Identify Z.`, 1],
          ["d", L`Give one justification linking each identification to the data.`, 1],
        ]),
        [
          L`Match hydrolysis products first.`,
          L`Glucose + fructose is sucrose; glucose + glucose is maltose.`,
          L`Iodine blue-black is the classic starch clue.`,
        ],
        [
          {
            part: "a",
            explanation: L`X is sucrose.`,
          },
          {
            part: "b",
            explanation: L`Y is maltose.`,
          },
          {
            part: "c",
            explanation: L`Z is starch.`,
          },
          {
            part: "d",
            explanation: L`Sucrose is non-reducing and hydrolyses to glucose and fructose. Maltose is reducing and gives two glucose units. Starch gives a blue-black iodine test and is a polymer of glucose.`,
          },
        ],
        [
          L`Using only the reducing test and ignoring hydrolysis products.`,
          L`Calling starch a disaccharide.`,
        ],
      ),
      frq(
        "case",
        L`A nutrition note compares three glucose-based polymers. Polymer A is the main storage carbohydrate in plants. Polymer B is the structural material of plant cell walls and behaves as dietary fibre for humans. Polymer C is a highly branched storage carbohydrate in animals.`,
        4,
        ["case_study", "polysaccharides", "biological_roles"],
        parts([
          ["a", L`Identify A.`, 1],
          ["b", L`Identify B.`, 1],
          ["c", L`Identify C.`, 1],
          ["d", L`Why is B not a good source of glucose calories for humans?`, 1],
        ]),
        [
          L`All three are glucose polymers.`,
          L`Plant storage, plant structure and animal storage point to different polysaccharides.`,
          L`The digestibility issue comes from cellulose linkages.`,
        ],
        [
          {
            part: "a",
            explanation: L`A is starch.`,
          },
          {
            part: "b",
            explanation: L`B is cellulose.`,
          },
          {
            part: "c",
            explanation: L`C is glycogen.`,
          },
          {
            part: "d",
            explanation: L`Humans do not efficiently hydrolyse the $\beta$-glycosidic linkages of cellulose, so it mainly acts as dietary fibre.`,
          },
        ],
        [L`Confusing starch and cellulose because both are glucose polymers.`],
      ),
    ],
  },
  {
    topicCode: "10.2",
    title: "Amino Acids and Proteins",
    subtopic:
      "Zwitterions, peptide bonds, protein structure levels, and denaturation.",
    mc: [
      mc(
        L`At a suitable pH, an amino acid such as glycine exists mainly as a zwitterion because it contains`,
        2,
        ["amino_acids", "zwitterions"],
        [
          L`both an acidic carboxyl group and a basic amino group`,
          L`only covalent non-polar bonds`,
          L`a glycosidic linkage`,
          L`a phosphate ester group`,
        ],
        "A",
        {
          B: L`A zwitterion has formal positive and negative charges within the same molecule.`,
          C: L`Glycosidic linkages are found in carbohydrates, not amino-acid zwitterions.`,
          D: L`Phosphate ester groups are important in nucleotides, not in simple amino-acid zwitterions.`,
        },
        [
          L`A zwitterion has both positive and negative charge centres.`,
          L`The carboxyl group can lose $\mathrm{H^+}$ and the amino group can gain $\mathrm{H^+}$.`,
          L`Write glycine as $\mathrm{^+H_3NCH_2COO^-}$.`,
        ],
        [
          {
            explanation: L`The carboxyl group can exist as $\mathrm{-COO^-}$ while the amino group exists as $\mathrm{-NH_3^+}$.`,
            math: L`\mathrm{H_2NCH_2COOH \rightleftharpoons ^+H_3NCH_2COO^-}`,
          },
        ],
      ),
      mc(
        L`The bond formed when the carboxyl group of one amino acid condenses with the amino group of another is a`,
        2,
        ["peptide_bond", "protein_structure"],
        [
          L`peptide bond`,
          L`glycosidic bond`,
          L`phosphodiester bond`,
          L`hydrogen bond only`,
        ],
        "A",
        {
          B: L`Glycosidic bonds join monosaccharide units in carbohydrates.`,
          C: L`Phosphodiester bonds occur in nucleic-acid backbones.`,
          D: L`Hydrogen bonds help stabilise protein shapes but are not the covalent linkage between amino acid residues.`,
        },
        [
          L`Condensation between $\mathrm{-COOH}$ and $\mathrm{-NH_2}$ eliminates water.`,
          L`The new linkage is an amide linkage.`,
          L`In proteins, this amide linkage is called a peptide bond.`,
        ],
        [
          {
            explanation: L`A peptide bond is the amide linkage formed between two amino acid residues.`,
            math: L`\mathrm{-COOH + H_2N- \rightarrow -CONH- + H_2O}`,
          },
        ],
      ),
      mc(
        L`When egg white is heated and coagulates, the best molecular explanation is that`,
        3,
        ["denaturation", "protein_structure"],
        [
          L`secondary and tertiary structures are disturbed while the peptide sequence largely remains intact`,
          L`all peptide bonds are hydrolysed into free amino acids instantly`,
          L`starch chains are converted into cellulose`,
          L`the protein becomes a vitamin`,
        ],
        "A",
        {
          B: L`Heating denatures the protein; complete hydrolysis of all peptide bonds is a different, much harsher process.`,
          C: L`Starch and cellulose are carbohydrates, not protein forms.`,
          D: L`A denatured protein does not become a vitamin.`,
        },
        [
          L`Denaturation changes shape and biological activity.`,
          L`It usually affects higher-order structure before primary structure.`,
          L`The amino-acid sequence is the primary structure.`,
        ],
        [
          {
            explanation: L`Heating disrupts weak interactions responsible for secondary and tertiary protein structures.`,
          },
          {
            explanation: L`The primary amino-acid sequence is generally not broken during ordinary denaturation.`,
          },
        ],
      ),
      mc(
        L`The primary structure of a protein is determined by`,
        2,
        ["protein_structure_levels", "primary_structure"],
        [
          L`the sequence of amino acid residues in the polypeptide chain`,
          L`only the total percentage of nitrogen in the protein`,
          L`the vitamin bound to the protein`,
          L`the number of glucose units attached to it`,
        ],
        "A",
        {
          B: L`Nitrogen percentage does not specify the order of amino acid residues.`,
          C: L`A vitamin may act as a cofactor in some systems, but it does not define primary structure.`,
          D: L`Glucose units are carbohydrate units; primary protein structure is an amino-acid sequence.`,
        },
        [
          L`Primary means first level of structural information.`,
          L`Ask what information would be lost if the sequence order changed.`,
          L`The answer is the exact amino-acid order.`,
        ],
        [
          {
            explanation: L`Primary structure is the linear sequence of amino acid residues joined by peptide bonds.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): A protein can lose its biological activity without all peptide bonds being broken. Reason (R): Denaturation can disturb the secondary and tertiary structure of a protein.`,
        3,
        ["assertion_reason", "denaturation"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`R explains A because protein function depends strongly on three-dimensional shape.`,
          C: L`R is true; denaturation disrupts higher-order structure.`,
          D: L`A is true; loss of shape can remove biological activity without complete peptide hydrolysis.`,
        },
        [
          L`Biological activity depends on shape.`,
          L`Denaturation is not the same as complete hydrolysis.`,
          L`If shape changes, active sites and binding regions can be lost.`,
        ],
        [
          {
            explanation: L`Denaturation disturbs secondary and tertiary structure.`,
          },
          {
            explanation: L`Since protein activity depends on three-dimensional arrangement, A is true and R explains it.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`What is a peptide bond?`,
        1,
        ["peptide_bond"],
        onePart(L`Define peptide bond.`, 1),
        [
          L`It is formed between two amino acids.`,
          L`It is a condensation product of carboxyl and amino groups.`,
          L`It is the $\mathrm{-CONH-}$ linkage in proteins.`,
        ],
        [
          {
            part: "a",
            explanation: L`A peptide bond is the amide linkage $\mathrm{-CONH-}$ formed between the carboxyl group of one amino acid and the amino group of another with loss of water.`,
          },
        ],
        [L`Calling any bond in a protein a peptide bond without specifying $\mathrm{-CONH-}$.`],
      ),
      frq(
        "saq",
        L`Explain why amino acids can show amphoteric behaviour.`,
        2,
        ["amino_acids", "amphoteric_behaviour"],
        parts([
          ["a", L`Identify the acidic and basic groups.`, 1],
          ["b", L`Relate these groups to zwitterion formation.`, 1],
        ]),
        [
          L`Amphoteric means behaving as acid and base.`,
          L`Amino acids have both $\mathrm{-COOH}$ and $\mathrm{-NH_2}$ groups.`,
          L`Internal proton transfer gives a zwitterionic form.`,
        ],
        [
          {
            part: "a",
            explanation: L`The $\mathrm{-COOH}$ group is acidic and the $\mathrm{-NH_2}$ group is basic.`,
          },
          {
            part: "b",
            explanation: L`The carboxyl group can donate a proton and the amino group can accept it, giving a zwitterion such as $\mathrm{^+H_3NCHRCOO^-}$.`,
          },
        ],
        [L`Saying amphoteric means neutral and missing acid-base behaviour.`],
      ),
      frq(
        "saq",
        L`A student says, "Heating a protein always breaks it into amino acids." Correct this statement using the idea of denaturation.`,
        3,
        ["denaturation", "claim_correction"],
        parts([
          ["a", L`State what heating commonly does to protein structure.`, 1],
          ["b", L`State what usually remains largely intact.`, 1],
          ["c", L`Give one visible consequence.`, 1],
        ]),
        [
          L`Distinguish denaturation from hydrolysis.`,
          L`Denaturation changes higher-order structure.`,
          L`Coagulation of egg white is a common visible example.`,
        ],
        [
          {
            part: "a",
            explanation: L`Heating commonly denatures proteins by disturbing secondary and tertiary structures.`,
          },
          {
            part: "b",
            explanation: L`The primary amino-acid sequence and peptide bonds usually remain largely intact under ordinary heating.`,
          },
          {
            part: "c",
            explanation: L`A visible consequence is coagulation, such as egg white turning opaque on heating.`,
          },
        ],
        [L`Equating denaturation with complete peptide-bond hydrolysis.`],
      ),
      frq(
        "laq",
        L`Three amino acid molecules join in a chain to form a tripeptide.`,
        4,
        ["peptide_formation", "protein_structure"],
        parts([
          ["a", L`How many peptide bonds are formed?`, 1],
          ["b", L`How many water molecules are eliminated?`, 1],
          ["c", L`Name the type of reaction.`, 1],
          ["d", L`Why is the amino-acid sequence important?`, 1],
        ]),
        [
          L`Joining two amino acids forms one peptide bond and one water molecule.`,
          L`A chain of three amino acids has two junctions.`,
          L`The order of residues defines primary structure.`,
        ],
        [
          {
            part: "a",
            explanation: L`Two peptide bonds are formed.`,
          },
          {
            part: "b",
            explanation: L`Two water molecules are eliminated.`,
          },
          {
            part: "c",
            explanation: L`The reaction is a condensation reaction.`,
          },
          {
            part: "d",
            explanation: L`The amino-acid sequence is the primary structure of the peptide/protein and strongly affects folding and function.`,
          },
        ],
        [
          L`Counting three peptide bonds for three amino acids.`,
          L`Forgetting that each peptide bond formation eliminates one water molecule.`,
        ],
      ),
      frq(
        "case",
        L`A protein sample is active at room temperature. After heating, it coagulates and no longer catalyses its biological reaction. Acid hydrolysis of a separate portion gives amino acids.`,
        4,
        ["case_study", "denaturation", "protein_hydrolysis"],
        parts([
          ["a", L`What change occurred on heating?`, 1],
          ["b", L`Did heating necessarily break all peptide bonds?`, 1],
          ["c", L`What does acid hydrolysis prove about the sample?`, 1],
          ["d", L`Which level of structure is represented by the amino-acid sequence?`, 1],
        ]),
        [
          L`Heating and acid hydrolysis are different treatments.`,
          L`Coagulation points to denaturation.`,
          L`Amino acids from hydrolysis show that the sample is proteinaceous.`,
        ],
        [
          {
            part: "a",
            explanation: L`Heating caused denaturation of the protein.`,
          },
          {
            part: "b",
            explanation: L`No. Denaturation need not break all peptide bonds; it mainly disrupts higher-order structure.`,
          },
          {
            part: "c",
            explanation: L`Formation of amino acids on acid hydrolysis shows that the sample is made of amino-acid residues joined in a protein/polypeptide.`,
          },
          {
            part: "d",
            explanation: L`The amino-acid sequence is the primary structure.`,
          },
        ],
        [L`Treating denaturation and hydrolysis as the same process.`],
      ),
    ],
  },
  {
    topicCode: "10.3",
    title: "Enzymes and Vitamins",
    subtopic:
      "Enzyme action, specificity, denaturation, vitamin classes, functions, and deficiencies.",
    mc: [
      mc(
        L`Which set contains only fat-soluble vitamins?`,
        2,
        ["vitamin_classification", "fat_soluble_vitamins"],
        [L`A, D, E and K`, L`B-complex and C`, L`C, D, and B1`, L`A, C, and B12`],
        "A",
        {
          B: L`B-complex and C are water-soluble vitamins.`,
          C: L`Vitamin C and B1 are water-soluble.`,
          D: L`Vitamin C and B12 are water-soluble.`,
        },
        [
          L`Recall the short fat-soluble list.`,
          L`The fat-soluble vitamins are stored more readily in body fat.`,
          L`A, D, E and K are the standard group.`,
        ],
        [
          {
            explanation: L`Vitamins A, D, E and K are fat-soluble. Vitamins of the B group and vitamin C are water-soluble.`,
          },
        ],
      ),
      mc(
        L`A student has swollen gums and delayed wound healing due to deficiency of a water-soluble vitamin. The missing vitamin is most likely`,
        2,
        ["vitamin_deficiency", "vitamin_c"],
        [L`vitamin C`, L`vitamin D`, L`vitamin A`, L`vitamin K`],
        "A",
        {
          B: L`Vitamin D deficiency is associated with rickets/osteomalacia, not scurvy symptoms.`,
          C: L`Vitamin A deficiency is associated with night blindness/xerophthalmia.`,
          D: L`Vitamin K is linked with blood clotting.`,
        },
        [
          L`Swollen gums are a classic deficiency clue.`,
          L`The condition is scurvy.`,
          L`Scurvy is due to vitamin C deficiency.`,
        ],
        [
          {
            explanation: L`Swollen gums and poor wound healing are symptoms of scurvy, caused by vitamin C deficiency.`,
          },
        ],
      ),
      mc(
        L`An enzyme solution loses activity after being boiled. The most reasonable explanation is`,
        2,
        ["enzymes", "denaturation"],
        [
          L`the enzyme protein is denatured at high temperature`,
          L`the enzyme is converted into glucose`,
          L`the enzyme has become a nucleic acid`,
          L`the activation energy of the reaction has become zero permanently`,
        ],
        "A",
        {
          B: L`Boiling does not convert proteins into glucose.`,
          C: L`An enzyme does not become a nucleic acid on heating.`,
          D: L`Enzymes lower activation energy; they do not make it permanently zero.`,
        },
        [
          L`Most enzymes are proteins.`,
          L`High temperature changes protein shape.`,
          L`Loss of active-site shape lowers enzyme activity.`,
        ],
        [
          {
            explanation: L`Boiling disturbs the enzyme protein's three-dimensional structure.`,
          },
          {
            explanation: L`The active site no longer fits the substrate properly, so enzyme activity is lost.`,
          },
        ],
      ),
      mc(
        L`The high specificity of an enzyme is mainly due to`,
        3,
        ["enzyme_specificity", "active_site"],
        [
          L`the shape and chemical environment of its active site`,
          L`the enzyme being consumed completely in every reaction`,
          L`the enzyme being a simple metal atom in all cases`,
          L`the absence of any protein structure`,
        ],
        "A",
        {
          B: L`Enzymes are catalysts and are not consumed in the overall reaction.`,
          C: L`Many enzymes are proteins; not all are simple metal atoms.`,
          D: L`Protein structure is central to enzyme specificity.`,
        },
        [
          L`Specificity means one enzyme acts best on particular substrates.`,
          L`The substrate must fit and interact with the active site.`,
          L`Shape and functional groups at the active site matter.`,
        ],
        [
          {
            explanation: L`An enzyme's active site has a particular shape and chemical environment.`,
          },
          {
            explanation: L`Only suitable substrates bind productively, giving high specificity.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): Enzymes can speed up a biochemical reaction without changing the reaction's equilibrium constant. Reason (R): Enzymes provide a lower-activation-energy pathway without changing the relative energies of reactants and products.`,
        3,
        ["assertion_reason", "enzyme_catalysis"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`R explains A because a lower-activation-energy pathway changes rate, while unchanged relative energies leave equilibrium unchanged.`,
          C: L`R is true; catalysts provide a lower-energy pathway.`,
          D: L`A is true; catalysts do not change the equilibrium constant.`,
        },
        [
          L`Enzymes are biological catalysts.`,
          L`Catalysts change rate, not equilibrium constant.`,
          L`They work by giving a lower-activation-energy pathway.`,
        ],
        [
          {
            explanation: L`Enzymes provide a lower-activation-energy pathway and increase reaction rate.`,
          },
          {
            explanation: L`Because they do not change the relative energies of reactants and products, the equilibrium constant is unchanged; therefore A and R are true and R explains A.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`A highly specific protein speeds up a biochemical reaction and is recovered after the reaction. Name this type of biomolecule.`,
        1,
        ["enzyme_definition"],
        onePart(L`Identify the biomolecule and state its catalytic role.`, 1),
        [
          L`It acts in living systems.`,
          L`It increases the rate of biochemical reactions.`,
          L`Most enzymes are proteins and act as biological catalysts.`,
        ],
        [
          {
            part: "a",
            explanation: L`An enzyme is a biological catalyst, usually a protein, that increases the rate of a biochemical reaction without being consumed.`,
          },
        ],
        [L`Calling an enzyme a food nutrient rather than a catalyst.`],
      ),
      frq(
        "saq",
        L`Give two reasons why enzyme activity falls sharply at very high temperature.`,
        2,
        ["enzyme_denaturation", "temperature_effect"],
        parts([
          ["a", L`State the structural effect on the enzyme.`, 1],
          ["b", L`Relate the structural effect to activity.`, 1],
        ]),
        [
          L`Most enzymes are proteins.`,
          L`High temperature disturbs protein folding.`,
          L`Activity depends on the active site's shape.`,
        ],
        [
          {
            part: "a",
            explanation: L`High temperature denatures the enzyme protein by disturbing its three-dimensional structure.`,
          },
          {
            part: "b",
            explanation: L`The active site loses the proper shape and interactions required for substrate binding, so catalytic activity decreases sharply.`,
          },
        ],
        [L`Saying the enzyme is used up by heat without mentioning denaturation.`],
      ),
      frq(
        "saq",
        L`Why do water-soluble vitamins generally need a regular dietary supply? Give one example.`,
        2,
        ["water_soluble_vitamins", "vitamin_examples"],
        parts([
          ["a", L`Give the reason.`, 1],
          ["b", L`Give one example.`, 1],
        ]),
        [
          L`Compare storage of fat-soluble and water-soluble vitamins.`,
          L`Water-soluble vitamins are not stored in large amounts.`,
          L`Examples include vitamin C and B-complex vitamins.`,
        ],
        [
          {
            part: "a",
            explanation: L`Water-soluble vitamins are not stored in the body to a large extent and excess amounts are more readily excreted, so regular intake is needed.`,
          },
          {
            part: "b",
            explanation: L`Vitamin C or any B-complex vitamin is a valid example.`,
          },
        ],
        [L`Listing only fat-soluble vitamins as examples.`],
      ),
      frq(
        "laq",
        L`A health card lists these deficiency clues: night blindness, rickets, scurvy, and delayed blood clotting.`,
        4,
        ["vitamin_deficiency", "vitamin_functions"],
        parts([
          ["a", L`Match night blindness to the vitamin.`, 1],
          ["b", L`Match rickets to the vitamin.`, 1],
          ["c", L`Match scurvy to the vitamin.`, 1],
          ["d", L`Match delayed blood clotting to the vitamin.`, 1],
        ]),
        [
          L`Use the most standard deficiency associations.`,
          L`A: vision; D: bones; C: scurvy.`,
          L`K is linked with blood clotting.`,
        ],
        [
          {
            part: "a",
            explanation: L`Night blindness is associated with vitamin A deficiency.`,
          },
          {
            part: "b",
            explanation: L`Rickets is associated with vitamin D deficiency.`,
          },
          {
            part: "c",
            explanation: L`Scurvy is associated with vitamin C deficiency.`,
          },
          {
            part: "d",
            explanation: L`Delayed blood clotting is associated with vitamin K deficiency.`,
          },
        ],
        [L`Confusing vitamin K with potassium metal or potassium ion.`],
      ),
      frq(
        "case",
        L`In an enzyme experiment, the same substrate is treated with the same enzyme at different temperatures. Activity is low at $10\,\mathrm{^\circ C}$, maximum near $37\,\mathrm{^\circ C}$, and almost absent after boiling.`,
        4,
        ["case_study", "enzyme_activity", "temperature"],
        parts([
          ["a", L`Why is activity low at $10\,\mathrm{^\circ C}$?`, 1],
          ["b", L`Why is activity high near $37\,\mathrm{^\circ C}$?`, 1],
          ["c", L`Why is activity almost absent after boiling?`, 1],
          ["d", L`Does the enzyme change the equilibrium constant?`, 1],
        ]),
        [
          L`At low temperature, molecular motion is slower.`,
          L`Near optimum temperature, active-site collisions are effective.`,
          L`Boiling denatures the enzyme; catalysts do not change equilibrium constants.`,
        ],
        [
          {
            part: "a",
            explanation: L`At low temperature, enzyme-substrate collisions and molecular motion are less effective, so activity is low.`,
          },
          {
            part: "b",
            explanation: L`Near the optimum temperature, the active site remains properly shaped and collisions are sufficiently energetic.`,
          },
          {
            part: "c",
            explanation: L`Boiling denatures the enzyme protein and destroys the effective active-site shape.`,
          },
          {
            part: "d",
            explanation: L`No. An enzyme changes the rate of reaching equilibrium, not the equilibrium constant.`,
          },
        ],
        [L`Saying boiling makes the enzyme permanently stronger because particles move faster.`],
      ),
    ],
  },
  {
    topicCode: "10.4",
    title: "Nucleic Acids",
    subtopic:
      "Nucleosides, nucleotides, DNA/RNA composition, base pairing, and genetic information.",
    mc: [
      mc(
        L`The correct distinction between a nucleoside and a nucleotide is that a nucleotide contains`,
        2,
        ["nucleoside_nucleotide", "nucleic_acids"],
        [
          L`base, sugar and phosphate`,
          L`only base and sugar`,
          L`only amino acid residues`,
          L`only glucose units`,
        ],
        "A",
        {
          B: L`Base plus sugar is a nucleoside, not a nucleotide.`,
          C: L`Amino acid residues are protein units.`,
          D: L`Glucose units are carbohydrate units.`,
        },
        [
          L`Break the words into structural units.`,
          L`Nucleoside = base + sugar.`,
          L`Nucleotide = nucleoside + phosphate.`,
        ],
        [
          {
            explanation: L`A nucleoside contains a nitrogenous base and a pentose sugar.`,
          },
          {
            explanation: L`A nucleotide contains base, sugar and phosphate.`,
          },
        ],
      ),
      mc(
        L`A nucleic acid sample contains ribose sugar and uracil. It is most likely`,
        2,
        ["dna_rna_difference", "rna"],
        [L`RNA`, L`DNA`, L`cellulose`, L`glycogen`],
        "A",
        {
          B: L`DNA contains deoxyribose and thymine instead of ribose and uracil.`,
          C: L`Cellulose is a carbohydrate polymer of glucose.`,
          D: L`Glycogen is an animal storage polysaccharide.`,
        },
        [
          L`Check both the sugar and the base.`,
          L`RNA has ribose.`,
          L`RNA uses uracil in place of thymine.`,
        ],
        [
          {
            explanation: L`RNA contains ribose sugar and uracil as one of its bases.`,
          },
        ],
      ),
      mc(
        L`In a double-stranded DNA sample, adenine is $20\%$ of the bases. The percentage of guanine is`,
        3,
        ["base_pairing", "dna_composition"],
        [L`$30\%$`, L`$20\%$`, L`$40\%$`, L`$60\%$`],
        "A",
        {
          B: L`Guanine need not equal adenine; adenine pairs with thymine.`,
          C: L`If guanine were $40\%$, cytosine would also be $40\%$, exceeding the total.`,
          D: L`$60\%$ would leave no room for cytosine and thymine.`,
        },
        [
          L`Use complementary base pairing.`,
          L`Adenine pairs with thymine, so thymine is also $20\%$.`,
          L`The remaining $60\%$ is guanine plus cytosine in equal amounts.`,
        ],
        [
          {
            explanation: L`In double-stranded DNA, adenine pairs with thymine, so $\mathrm{T}=20\%$.`,
          },
          {
            explanation: L`The remaining $60\%$ is divided equally between guanine and cytosine.`,
            math: L`\mathrm{G}=\mathrm{C}=\frac{60}{2}=30\%`,
          },
        ],
      ),
      mc(
        L`Complete hydrolysis of a nucleotide gives`,
        2,
        ["nucleotide_hydrolysis", "nucleic_acid_units"],
        [
          L`a nitrogenous base, a pentose sugar and phosphoric acid`,
          L`only amino acids`,
          L`only glucose and fructose`,
          L`fatty acids and glycerol`,
        ],
        "A",
        {
          B: L`Amino acids are obtained by hydrolysis of proteins.`,
          C: L`Glucose and fructose are carbohydrate hydrolysis products, such as from sucrose.`,
          D: L`Fatty acids and glycerol relate to fats, not nucleotides.`,
        },
        [
          L`A nucleotide has three components.`,
          L`Break the phosphate ester and sugar-base connection conceptually.`,
          L`The components are base, sugar and phosphate.`,
        ],
        [
          {
            explanation: L`A nucleotide is composed of a nitrogenous base, a pentose sugar and phosphate.`,
          },
          {
            explanation: L`On complete hydrolysis it gives the base, sugar and phosphoric acid.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): DNA can store genetic information. Reason (R): The sequence of nitrogenous bases along DNA carries coded information.`,
        3,
        ["assertion_reason", "genetic_information"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`R directly explains how DNA stores information: through base sequence.`,
          C: L`R is true; base sequence is the information-bearing feature.`,
          D: L`A is true; DNA is the genetic material in cells.`,
        },
        [
          L`Ask what part of DNA varies from gene to gene.`,
          L`The sugar-phosphate backbone is repetitive.`,
          L`The base sequence carries information.`,
        ],
        [
          {
            explanation: L`DNA stores genetic information because the order of nitrogenous bases can vary and encode information.`,
          },
          {
            explanation: L`Therefore both A and R are true, and R explains A.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State one difference between a nucleoside and a nucleotide.`,
        1,
        ["nucleoside_nucleotide"],
        onePart(L`Give the structural difference.`, 1),
        [
          L`Both contain a base and sugar in related forms.`,
          L`The extra group distinguishes nucleotide from nucleoside.`,
          L`A nucleotide contains phosphate.`,
        ],
        [
          {
            part: "a",
            explanation: L`A nucleoside contains a nitrogenous base and pentose sugar, whereas a nucleotide contains base, sugar and phosphate.`,
          },
        ],
        [L`Reversing nucleoside and nucleotide definitions.`],
      ),
      frq(
        "saq",
        L`Give two chemical-composition differences between DNA and RNA.`,
        2,
        ["dna_rna_difference"],
        parts([
          ["a", L`State the sugar difference.`, 1],
          ["b", L`State one base difference.`, 1],
        ]),
        [
          L`DNA and RNA differ in the pentose sugar.`,
          L`They also differ in one pyrimidine base.`,
          L`DNA has thymine; RNA has uracil.`,
        ],
        [
          {
            part: "a",
            explanation: L`DNA contains deoxyribose, whereas RNA contains ribose.`,
          },
          {
            part: "b",
            explanation: L`DNA contains thymine, whereas RNA contains uracil instead of thymine.`,
          },
        ],
        [L`Saying RNA lacks all nitrogenous bases.`],
      ),
      frq(
        "saq",
        L`In a double-stranded DNA sample, adenine is $18\%$ of the total bases. Find the percentages of thymine, guanine and cytosine.`,
        3,
        ["base_pairing", "dna_composition"],
        parts([
          ["a", L`Find thymine percentage.`, 1],
          ["b", L`Find the combined percentage of guanine and cytosine.`, 1],
          ["c", L`Find each of guanine and cytosine.`, 1],
        ]),
        [
          L`Use A pairs with T and G pairs with C.`,
          L`If A is $18\%$, T is also $18\%$.`,
          L`The remaining bases are G and C in equal amounts.`,
        ],
        [
          {
            part: "a",
            explanation: L`Thymine is $18\%$ because adenine pairs with thymine.`,
          },
          {
            part: "b",
            explanation: L`Adenine plus thymine is $36\%$, so guanine plus cytosine is $64\%$.`,
            math: L`100-18-18=64`,
          },
          {
            part: "c",
            explanation: L`Guanine and cytosine are equal, so each is $32\%$.`,
            math: L`\frac{64}{2}=32`,
          },
        ],
        [L`Making guanine equal to adenine instead of pairing A with T.`],
      ),
      frq(
        "laq",
        L`A biomolecule fragment contains a nitrogenous base, a pentose sugar and a phosphate group joined into a repeating chain.`,
        4,
        ["nucleotides", "nucleic_acid_backbone"],
        parts([
          ["a", L`Name the monomeric unit described.`, 1],
          ["b", L`What would the unit be called if phosphate were absent?`, 1],
          ["c", L`Name the broad class of biomolecule formed by the repeating chain.`, 1],
          ["d", L`State one biological role of this class.`, 1],
        ]),
        [
          L`Base + sugar + phosphate is the key unit.`,
          L`Without phosphate, it is base + sugar only.`,
          L`Repeated nucleotides form nucleic acids.`,
        ],
        [
          {
            part: "a",
            explanation: L`The monomeric unit is a nucleotide.`,
          },
          {
            part: "b",
            explanation: L`Without phosphate, base plus sugar is a nucleoside.`,
          },
          {
            part: "c",
            explanation: L`A repeating chain of nucleotides forms a nucleic acid such as DNA or RNA.`,
          },
          {
            part: "d",
            explanation: L`Nucleic acids store and transfer genetic information and participate in protein synthesis.`,
          },
        ],
        [L`Calling the monomer an amino acid because it contains nitrogen.`],
      ),
      frq(
        "case",
        L`Two samples are analysed. Sample P contains deoxyribose and bases A, G, C and T. Sample Q contains ribose and bases A, G, C and U.`,
        4,
        ["case_study", "dna_rna_identification"],
        parts([
          ["a", L`Identify sample P.`, 1],
          ["b", L`Identify sample Q.`, 1],
          ["c", L`Which base in Q replaces thymine?`, 1],
          ["d", L`Name the linkage type that forms the sugar-phosphate backbone.`, 1],
        ]),
        [
          L`Use sugar and base composition together.`,
          L`DNA has deoxyribose and thymine.`,
          L`RNA has ribose and uracil; the backbone uses phosphodiester linkages.`,
        ],
        [
          {
            part: "a",
            explanation: L`Sample P is DNA.`,
          },
          {
            part: "b",
            explanation: L`Sample Q is RNA.`,
          },
          {
            part: "c",
            explanation: L`Uracil replaces thymine in RNA.`,
          },
          {
            part: "d",
            explanation: L`The sugar-phosphate backbone contains phosphodiester linkages.`,
          },
        ],
        [L`Identifying RNA only by single-strandedness and ignoring the chemical composition given.`],
      ),
    ],
  },
  {
    topicCode: "10.5",
    title: "Hormones and Integrated Biomolecule Reasoning",
    subtopic:
      "Elementary hormone idea excluding structures, and integrated identification across biomolecule classes.",
    mc: [
      mc(
        L`In the CBSE Biomolecules chapter, a hormone is best described as`,
        2,
        ["hormone_definition"],
        [
          L`a chemical messenger secreted by endocrine glands and active in small amounts`,
          L`a structural polysaccharide of plant cell walls`,
          L`a nucleotide polymer that stores genetic information`,
          L`a reducing disaccharide made of two glucose units`,
        ],
        "A",
        {
          B: L`This describes cellulose, not a hormone.`,
          C: L`This describes DNA, not a hormone.`,
          D: L`This describes maltose, not a hormone.`,
        },
        [
          L`Hormones are regulatory molecules.`,
          L`They are secreted by endocrine glands.`,
          L`They act in small amounts on target tissues/organs.`,
        ],
        [
          {
            explanation: L`Hormones are chemical messengers produced by endocrine glands and effective in small quantities.`,
          },
        ],
      ),
      mc(
        L`Insulin is most directly associated with regulation of`,
        2,
        ["hormones", "insulin"],
        [
          L`blood glucose level`,
          L`DNA base pairing`,
          L`cellulose digestion in humans`,
          L`vitamin C storage in fat`,
        ],
        "A",
        {
          B: L`DNA base pairing is a nucleic-acid property, not insulin's function.`,
          C: L`Humans do not efficiently digest cellulose; insulin is not a cellulose enzyme.`,
          D: L`Vitamin C is water-soluble and insulin does not store it in fat.`,
        },
        [
          L`Insulin is a hormone, not a nucleic acid or vitamin.`,
          L`It is secreted by the pancreas.`,
          L`Its commonly tested role is regulation of blood sugar.`,
        ],
        [
          {
            explanation: L`Insulin helps regulate blood glucose level.`,
          },
        ],
      ),
      mc(
        L`Which statement best distinguishes a hormone from an enzyme?`,
        3,
        ["hormones_vs_enzymes", "biomolecule_function"],
        [
          L`A hormone acts as a messenger/regulator, whereas an enzyme acts as a catalyst.`,
          L`A hormone must always be a polysaccharide, whereas an enzyme must always be DNA.`,
          L`A hormone is consumed stoichiometrically, whereas an enzyme is never specific.`,
          L`A hormone contains only glucose, whereas an enzyme contains only thymine.`,
        ],
        "A",
        {
          B: L`Hormones and enzymes are not restricted to these incorrect biomolecule classes.`,
          C: L`Hormones act in small amounts; enzymes are catalysts and are often highly specific.`,
          D: L`This confuses carbohydrate and nucleic-acid units with hormone/enzyme function.`,
        },
        [
          L`Focus on function rather than memorised names.`,
          L`Hormones transmit regulatory signals.`,
          L`Enzymes speed up biochemical reactions.`,
        ],
        [
          {
            explanation: L`Hormones function mainly as chemical messengers or regulators.`,
          },
          {
            explanation: L`Enzymes function as biological catalysts that increase reaction rates.`,
          },
        ],
      ),
      mc(
        L`A biomolecule gives a positive biuret test and on complete hydrolysis yields amino acids. It is best classified as`,
        2,
        ["protein_identification", "biomolecule_tests"],
        [L`a protein`, L`a disaccharide`, L`a nucleic acid`, L`a fat-soluble vitamin`],
        "A",
        {
          B: L`A disaccharide hydrolyses to monosaccharides, not amino acids.`,
          C: L`A nucleic acid hydrolyses to bases, pentose sugar and phosphate-containing units.`,
          D: L`A vitamin is not identified by peptide-bond biuret behaviour.`,
        },
        [
          L`Biuret test detects peptide linkages.`,
          L`Proteins are polymers of amino acid residues.`,
          L`Hydrolysis to amino acids confirms the protein class.`,
        ],
        [
          {
            explanation: L`A positive biuret test indicates peptide linkages.`,
          },
          {
            explanation: L`Hydrolysis to amino acids identifies the substance as a protein or polypeptide.`,
          },
        ],
      ),
      mc(
        L`Which option correctly pairs the biomolecule with its main structural unit?`,
        3,
        ["integrated_biomolecule_units"],
        [
          L`Protein - amino acid`,
          L`DNA - glucose`,
          L`Cellulose - nucleotide`,
          L`Starch - amino acid`,
        ],
        "A",
        {
          B: L`DNA is built from nucleotides, not glucose.`,
          C: L`Cellulose is a glucose polymer, not a nucleotide polymer.`,
          D: L`Starch is a glucose polymer, not an amino-acid polymer.`,
        },
        [
          L`Match polymers to their monomer units.`,
          L`Proteins are polypeptides.`,
          L`Polypeptides are built from amino acids.`,
        ],
        [
          {
            explanation: L`Proteins are polymers of amino acid residues joined by peptide bonds.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Define hormone in one sentence.`,
        1,
        ["hormone_definition"],
        onePart(L`Give the elementary definition of hormone.`, 1),
        [
          L`It is secreted by endocrine glands.`,
          L`It carries a regulatory signal.`,
          L`It acts in small amounts on target tissues or organs.`,
        ],
        [
          {
            part: "a",
            explanation: L`A hormone is a chemical messenger secreted by endocrine glands that regulates physiological processes in small amounts.`,
          },
        ],
        [L`Giving a hormone structure; structures are outside the required scope here.`],
      ),
      frq(
        "saq",
        L`Compare vitamins and hormones in terms of source and function.`,
        2,
        ["vitamins_vs_hormones", "biomolecule_function"],
        parts([
          ["a", L`State one source-related difference.`, 1],
          ["b", L`State one function-related difference.`, 1],
        ]),
        [
          L`Vitamins are dietary requirements in small amounts.`,
          L`Hormones are secreted inside the body by endocrine glands.`,
          L`Both may be needed in small amounts, but their roles are different.`,
        ],
        [
          {
            part: "a",
            explanation: L`Vitamins are organic compounds generally required from the diet in small amounts, whereas hormones are secreted by endocrine glands in the body.`,
          },
          {
            part: "b",
            explanation: L`Vitamins often function as nutrients/coenzyme-related substances, whereas hormones act as chemical messengers regulating body processes.`,
          },
        ],
        [L`Saying every vitamin is a hormone because both act in small amounts.`],
      ),
      frq(
        "saq",
        L`A doctor suspects poor regulation of blood glucose due to a hormone imbalance. Name the hormone commonly associated with this regulation and state its broad role.`,
        2,
        ["insulin", "hormone_function"],
        parts([
          ["a", L`Name the hormone.`, 1],
          ["b", L`State its broad role.`, 1],
        ]),
        [
          L`The hormone is secreted by the pancreas.`,
          L`Its common school-level role is linked with blood sugar.`,
          L`Name the hormone and do not write its structure.`,
        ],
        [
          {
            part: "a",
            explanation: L`The hormone is insulin.`,
          },
          {
            part: "b",
            explanation: L`Insulin helps regulate blood glucose level.`,
          },
        ],
        [L`Writing a detailed insulin structure, which is outside the chapter requirement.`],
      ),
      frq(
        "laq",
        L`Classify the following biomolecule clues: P hydrolyses to amino acids; Q contains base, pentose sugar and phosphate units; R is a non-reducing disaccharide giving glucose and fructose on hydrolysis; S is required in small amounts and its deficiency causes scurvy.`,
        4,
        ["integrated_classification", "biomolecule_identification"],
        parts([
          ["a", L`Identify the class of P.`, 1],
          ["b", L`Identify the class of Q.`, 1],
          ["c", L`Identify R.`, 1],
          ["d", L`Identify S.`, 1],
        ]),
        [
          L`Hydrolysis products give strong clues.`,
          L`Base + sugar + phosphate units point to nucleic acids.`,
          L`Glucose + fructose from a non-reducing disaccharide is sucrose; scurvy is vitamin C deficiency.`,
        ],
        [
          {
            part: "a",
            explanation: L`P is a protein or polypeptide because it hydrolyses to amino acids.`,
          },
          {
            part: "b",
            explanation: L`Q is a nucleic acid because it contains nucleotide units.`,
          },
          {
            part: "c",
            explanation: L`R is sucrose.`,
          },
          {
            part: "d",
            explanation: L`S is vitamin C.`,
          },
        ],
        [
          L`Calling Q a protein just because it contains nitrogenous bases.`,
          L`Confusing sucrose with maltose despite the fructose product.`,
        ],
      ),
      frq(
        "case",
        L`A student prepares a one-page summary: carbohydrates supply structural and storage materials; proteins are polymers of amino acids; enzymes are biological catalysts; nucleic acids carry genetic information; hormones act as chemical messengers. The teacher asks the student to connect each statement to one structural or functional clue.`,
        4,
        ["case_study", "integrated_biomolecules"],
        parts([
          ["a", L`Give one carbohydrate example used for plant structure.`, 1],
          ["b", L`Name the bond joining amino acid residues in proteins.`, 1],
          ["c", L`State why enzyme shape matters.`, 1],
          ["d", L`State what feature of DNA carries genetic information.`, 1],
        ]),
        [
          L`Plant structure points to cellulose.`,
          L`Amino acids are joined by peptide bonds.`,
          L`Enzymes need active-site shape; DNA information lies in base sequence.`,
        ],
        [
          {
            part: "a",
            explanation: L`Cellulose is a carbohydrate used for plant cell-wall structure.`,
          },
          {
            part: "b",
            explanation: L`Amino acid residues in proteins are joined by peptide bonds.`,
          },
          {
            part: "c",
            explanation: L`Enzyme shape matters because the active site must bind the correct substrate effectively.`,
          },
          {
            part: "d",
            explanation: L`The sequence of nitrogenous bases in DNA carries genetic information.`,
          },
        ],
        [L`Answering with only biomolecule names and not linking them to the requested clue.`],
      ),
    ],
  },
];

export const biomoleculesTopics: Topic[] = topicSeeds.map(makeTopic);
