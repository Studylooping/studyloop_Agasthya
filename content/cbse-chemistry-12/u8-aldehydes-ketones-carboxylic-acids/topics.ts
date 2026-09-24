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
const UNIT = "u8-aldehydes-ketones-carboxylic-acids";
const VERSION = "0.1.1";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const TOPIC_CHOICE_ROTATION_OFFSETS: Record<string, number> = {
  "8.1": 0,
  "8.2": 1,
  "8.3": 2,
  "8.4": 1,
  "8.5": 3,
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
  return `You chose ${choiceText}. Recheck the functional group priority, reagent condition, alpha hydrogen requirement, oxidation level, and test observation before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        : "incorrect_cbse_class12_chemistry_aldehydes_ketones_carboxylic_acids_reasoning",
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
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "matches_a_reagent_or_name_without_checking_functional_group_priority_or_conditions",
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
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_a_product_without_linking_it_to_carbonyl_or_carboxyl_reactivity",
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
      description: `Completes part ${item.letter} with correct aldehyde, ketone or carboxylic-acid nomenclature, reagent logic, test observation, product, acidity trend or conversion reasoning as required.`,
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

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "8.1",
    title: "Nomenclature and Structure",
    subtopic:
      "Name aldehydes, ketones and carboxylic acids, identify priority order, and connect the polarity of carbonyl and carboxyl groups with reactivity.",
    mc: [
      mc(
        L`The IUPAC name of $\mathrm{CH_3CH(CH_3)CH_2CHO}$ is`,
        2,
        ["iupac_nomenclature", "aldehydes"],
        [
          L`3-methylbutanal`,
          L`2-methylbutanal`,
          L`3-methylbutanone`,
          L`2-methylpropanal`,
        ],
        "A",
        {
          B: L`Numbering must start from the aldehyde carbon. The methyl group is on carbon 3, not carbon 2.`,
          C: L`The molecule has a terminal $\mathrm{-CHO}$ group, so the suffix is -al, not -one.`,
          D: L`This option uses a three-carbon parent chain and leaves out one carbon from the longest aldehyde chain.`,
        },
        [
          L`The $\mathrm{-CHO}$ carbon is always carbon 1.`,
          L`Choose the longest chain containing the aldehyde carbon.`,
          L`The parent chain has four carbons and a methyl group at carbon 3.`,
        ],
        [
          {
            step: 1,
            explanation: L`The longest chain containing the aldehyde carbon has four carbons, so the parent is butanal. The methyl substituent is on carbon 3.`,
            math: L`\mathrm{CH_3CH(CH_3)CH_2CHO=3\text{-}methylbutanal}`,
          },
        ],
      ),
      mc(
        L`For $\mathrm{CH_3COCH_2CH_2CHO}$, the correct IUPAC name is`,
        2,
        ["iupac_nomenclature", "functional_group_priority"],
        [
          L`4-oxopentanal`,
          L`2-oxopentanal`,
          L`pentane-2,5-dione`,
          L`5-oxopentan-2-one`,
        ],
        "A",
        {
          B: L`Numbering starts at the aldehyde carbon, so the ketone carbonyl is at carbon 4.`,
          C: L`The aldehyde has higher suffix priority than the ketone; it cannot be named as a dione here.`,
          D: L`This treats the ketone as the suffix and the aldehyde as a substituent, reversing the priority order.`,
        },
        [
          L`Compare aldehyde and ketone priority.`,
          L`Aldehyde is named by the suffix -al when both groups are present.`,
          L`The ketone carbonyl becomes an oxo substituent at carbon 4.`,
        ],
        [
          {
            step: 1,
            explanation: L`The aldehyde group is the principal functional group and is carbon 1. The ketone carbonyl is then an oxo substituent on carbon 4.`,
            math: L`\mathrm{CH_3COCH_2CH_2CHO=4\text{-}oxopentanal}`,
          },
        ],
      ),
      mc(
        L`In the carbonyl group of aldehydes and ketones, the carbon atom is electrophilic mainly because`,
        2,
        ["carbonyl_structure", "polarity"],
        [
          L`oxygen is more electronegative and pulls electron density from carbon`,
          L`carbon is more electronegative than oxygen`,
          L`the $\mathrm{C=O}$ bond is non-polar`,
          L`the carbonyl oxygen carries a permanent positive charge`,
        ],
        "A",
        {
          B: L`Oxygen is more electronegative than carbon, not the reverse.`,
          C: L`The $\mathrm{C=O}$ bond is strongly polar.`,
          D: L`The major polarity is $\mathrm{C^{\delta+}=O^{\delta-}}$; oxygen is electron-rich, not permanently positive.`,
        },
        [
          L`Think of bond polarity in $\mathrm{C=O}$.`,
          L`Oxygen attracts the shared electrons more strongly.`,
          L`A partial positive charge develops on carbon, making it vulnerable to nucleophilic attack.`,
        ],
        [
          {
            step: 1,
            explanation: L`Oxygen withdraws electron density from the carbonyl carbon, producing a partially positive carbon centre.`,
            math: L`\mathrm{R_2C^{\delta+}=O^{\delta-}}`,
          },
        ],
      ),
      mc(
        L`Which compound is expected to be more reactive than acetone toward nucleophilic addition?`,
        3,
        ["nucleophilic_addition", "reactivity_trend"],
        [L`ethanal`, L`benzophenone`, L`butan-2-one`, L`acetophenone`],
        "A",
        {
          B: L`Benzophenone has two phenyl groups; conjugation and steric hindrance reduce electrophilicity.`,
          C: L`Butan-2-one is another aliphatic ketone and is not more reactive than the aldehyde.`,
          D: L`Acetophenone is an aryl ketone; resonance with the ring lowers carbonyl reactivity.`,
        },
        [
          L`Aldehydes are usually more reactive than ketones.`,
          L`Less steric hindrance and less $+I$ donation make the carbonyl carbon more electrophilic.`,
          L`Ethanal is an aldehyde; acetone is a ketone.`,
        ],
        [
          {
            step: 1,
            explanation: L`Ethanal has one alkyl group and one hydrogen on the carbonyl carbon, so it is less hindered and less electron-donated than acetone.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): Carboxylic acids have higher boiling points than aldehydes or ketones of comparable molar mass. Reason (R): Carboxylic acids form strong intermolecular hydrogen-bonded dimers.`,
        3,
        ["physical_properties", "assertion_reason"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The dimer formation directly explains the stronger intermolecular association and higher boiling point.`,
          C: L`Carboxylic acids do form hydrogen-bonded dimers.`,
          D: L`The assertion is true for comparable molar masses.`,
        },
        [
          L`Compare intermolecular forces.`,
          L`Aldehydes and ketones cannot donate hydrogen bonds to themselves.`,
          L`Carboxylic acids commonly associate as dimers through two hydrogen bonds.`,
        ],
        [
          {
            step: 1,
            explanation: L`Carboxylic acids form strongly associated dimers, so more energy is required to separate their molecules during boiling.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Give the IUPAC name of $\mathrm{CH_3CH_2COCH_3}$.`,
        1,
        ["iupac_nomenclature", "ketones"],
        parts([["a", L`Write the name.`, 1]]),
        [
          L`The molecule has four carbons.`,
          L`The carbonyl group is inside the chain, so it is a ketone.`,
          L`Number to give the carbonyl carbon the smaller locant.`,
        ],
        [
          {
            part: "a",
            explanation: L`The parent chain has four carbons and the carbonyl carbon is at carbon 2.`,
            math: L`\mathrm{butan\text{-}2\text{-}one}`,
          },
        ],
        [L`Writing butanal by treating the carbonyl as terminal.`],
      ),
      frq(
        "vsaq",
        L`Which atom of the carbonyl group is attacked first by a nucleophile?`,
        1,
        ["carbonyl_structure", "nucleophilic_addition"],
        parts([["a", L`State the atom and the reason in one phrase.`, 1]]),
        [
          L`A nucleophile attacks an electron-poor centre.`,
          L`Oxygen polarises the $\mathrm{C=O}$ bond.`,
          L`The carbonyl carbon is partially positive.`,
        ],
        [
          {
            part: "a",
            explanation: L`A nucleophile attacks the carbonyl carbon because the $\mathrm{C=O}$ bond is polarised toward oxygen.`,
            math: L`\mathrm{C^{\delta+}=O^{\delta-}}`,
          },
        ],
        [L`Saying oxygen is attacked first because it is electronegative.`],
      ),
      frq(
        "saq",
        L`Name $\mathrm{CH_3CH=CHCHO}$ and identify whether it is saturated or unsaturated.`,
        2,
        ["iupac_nomenclature", "unsaturated_aldehydes"],
        parts([
          ["a", L`Write the IUPAC name.`, 1],
          ["b", L`State whether it is saturated or unsaturated.`, 1],
        ]),
        [
          L`The aldehyde carbon is carbon 1.`,
          L`Locate the double bond from the aldehyde end.`,
          L`The double bond between carbon 2 and carbon 3 makes the compound unsaturated.`,
        ],
        [
          {
            part: "a",
            explanation: L`Numbering begins at the aldehyde carbon. The double bond starts at carbon 2.`,
            math: L`\mathrm{but\text{-}2\text{-}enal}`,
          },
          {
            part: "b",
            explanation: L`It is unsaturated because it contains a carbon-carbon double bond.`,
          },
        ],
        [L`Numbering the chain from the methyl end and writing but-2-en-4-al.`],
      ),
      frq(
        "laq",
        L`A compound $\mathrm{X}$ has molecular formula $\mathrm{C_4H_8O}$, gives a positive 2,4-DNP test, but does not reduce Tollens' reagent. It has a straight carbon chain. Identify $\mathrm{X}$ and write its IUPAC name.`,
        3,
        ["functional_group_identification", "carbonyl_tests"],
        parts([
          ["a", L`Use the test results to identify the functional group.`, 1],
          [
            "b",
            L`Use the formula and straight-chain condition to identify the structure.`,
            1,
          ],
          ["c", L`Write the IUPAC name.`, 1],
        ]),
        [
          L`2,4-DNP detects a carbonyl group.`,
          L`Tollens' reagent is reduced by aldehydes but usually not by ketones.`,
          L`A straight-chain $\mathrm{C_4H_8O}$ ketone is $\mathrm{CH_3COCH_2CH_3}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`The positive 2,4-DNP test shows a carbonyl compound. The negative Tollens' test rules out an aldehyde, so it is a ketone.`,
          },
          {
            part: "b",
            explanation: L`The straight-chain ketone with formula $\mathrm{C_4H_8O}$ is $\mathrm{CH_3COCH_2CH_3}$.`,
          },
          {
            part: "c",
            explanation: L`Its IUPAC name is butan-2-one.`,
            math: L`\mathrm{CH_3COCH_2CH_3=butan\text{-}2\text{-}one}`,
          },
        ],
        [
          L`Calling it butanal despite the negative Tollens' test.`,
          L`Ignoring the straight-chain condition and choosing a branched isomer.`,
        ],
      ),
      frq(
        "case",
        L`A student compares three low-molar-mass compounds: propanal, propanone and propanoic acid. Use structure and intermolecular forces to answer the following.`,
        3,
        ["physical_properties", "conceptual_comparison"],
        parts([
          [
            "a",
            L`Which compound can both donate and accept hydrogen bonds with water?`,
            1,
          ],
          ["b", L`Which compound has the highest boiling point?`, 1],
          [
            "c",
            L`Why are propanal and propanone less strongly associated than propanoic acid?`,
            2,
          ],
        ]),
        [
          L`All three contain oxygen, but only the acid has an $\mathrm{O-H}$ group.`,
          L`Carboxylic acids form strong hydrogen-bonded dimers.`,
          L`Aldehydes and ketones can accept hydrogen bonds from water but cannot donate hydrogen bonds through an $\mathrm{O-H}$ group.`,
        ],
        [
          {
            part: "a",
            explanation: L`Propanoic acid can both donate and accept hydrogen bonds with water because it has the carboxyl $\mathrm{O-H}$ bond and carbonyl oxygen.`,
          },
          {
            part: "b",
            explanation: L`Propanoic acid has the highest boiling point due to strong hydrogen-bonded dimer formation.`,
          },
          {
            part: "c",
            explanation: L`Propanal and propanone have a polar carbonyl group but no $\mathrm{O-H}$ bond, so they cannot form the same acid dimers among themselves.`,
          },
        ],
        [
          L`Assuming all oxygen-containing compounds have the same hydrogen bonding.`,
        ],
      ),
    ],
  },
  {
    topicCode: "8.2",
    title: "Preparation of Aldehydes and Ketones",
    subtopic:
      "Choose selective oxidations, reductions and aromatic formylation/acylation routes with the correct reagent conditions.",
    mc: [
      mc(
        L`The most suitable reagent for converting $\mathrm{CH_3CH_2OH}$ to $\mathrm{CH_3CHO}$ without further oxidation to the acid is`,
        2,
        ["preparation", "selective_oxidation"],
        [
          L`PCC`,
          L`acidified $\mathrm{KMnO_4}$ under reflux`,
          L`hot alkaline $\mathrm{KMnO_4}$ followed by acidification`,
          L`concentrated $\mathrm{HNO_3}$`,
        ],
        "A",
        {
          B: L`Acidified permanganate under strong conditions oxidises a primary alcohol beyond the aldehyde to the acid.`,
          C: L`Hot alkaline permanganate followed by acidification also gives the carboxylic acid.`,
          D: L`Concentrated nitric acid is too strong and not the standard selective aldehyde route here.`,
        },
        [
          L`A primary alcohol must stop at the aldehyde stage.`,
          L`Strong oxidants over-oxidise aldehydes to acids.`,
          L`PCC is the standard selective reagent for this conversion.`,
        ],
        [
          {
            step: 1,
            explanation: L`PCC oxidises a primary alcohol to an aldehyde under controlled conditions without further oxidation to the acid.`,
            math: L`\mathrm{CH_3CH_2OH \xrightarrow{PCC} CH_3CHO}`,
          },
        ],
      ),
      mc(
        L`Rosenmund reduction converts an acid chloride into an aldehyde using`,
        2,
        ["preparation", "rosenmund_reduction"],
        [
          L`$\mathrm{H_2/Pd\text{-}BaSO_4}$`,
          L`$\mathrm{LiAlH_4}$ followed by hydrolysis`,
          L`$\mathrm{NaBH_4}$ in methanol`,
          L`$\mathrm{Zn(Hg)/conc.\ HCl}$`,
        ],
        "A",
        {
          B: L`Lithium aluminium hydride would reduce the acid chloride further to a primary alcohol.`,
          C: L`Sodium borohydride is used for aldehydes and ketones, not the named Rosenmund reduction.`,
          D: L`Zinc amalgam and concentrated hydrochloric acid are Clemmensen reduction conditions for carbonyl to methylene.`,
        },
        [
          L`Rosenmund reduction is a controlled catalytic hydrogenation.`,
          L`The catalyst is poisoned to stop at the aldehyde.`,
          L`The standard reagent is $\mathrm{H_2}$ over $\mathrm{Pd/BaSO_4}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`In Rosenmund reduction, the acid chloride is reduced with hydrogen over poisoned palladium on barium sulphate to give an aldehyde.`,
          },
        ],
      ),
      mc(
        L`Which route gives acetophenone from benzene in one main step?`,
        2,
        ["preparation", "friedel_crafts_acylation"],
        [
          L`$\mathrm{CH_3COCl/anhydrous\ AlCl_3}$`,
          L`$\mathrm{CH_3Cl/anhydrous\ AlCl_3}$`,
          L`$\mathrm{CO+HCl/AlCl_3,\ CuCl}$`,
          L`$\mathrm{HCHO/NaOH}$`,
        ],
        "A",
        {
          B: L`Methyl chloride gives toluene by Friedel-Crafts alkylation, not acetophenone.`,
          C: L`Carbon monoxide and hydrogen chloride under Gattermann-Koch conditions give benzaldehyde.`,
          D: L`Formaldehyde and alkali do not acylate benzene to acetophenone.`,
        },
        [
          L`Acetophenone is $\mathrm{C_6H_5COCH_3}$.`,
          L`You need to introduce an acyl group, not an alkyl group.`,
          L`Acetyl chloride with anhydrous $\mathrm{AlCl_3}$ performs Friedel-Crafts acylation.`,
        ],
        [
          {
            step: 1,
            explanation: L`Benzene undergoes Friedel-Crafts acylation with acetyl chloride and anhydrous aluminium chloride to give acetophenone.`,
            math: L`\mathrm{C_6H_6 \xrightarrow{CH_3COCl/AlCl_3} C_6H_5COCH_3}`,
          },
        ],
      ),
      mc(
        L`Hydration of propyne in the presence of $\mathrm{HgSO_4/H_2SO_4}$ gives mainly`,
        2,
        ["preparation", "alkyne_hydration"],
        [L`propanone`, L`propanal`, L`propan-1-ol`, L`propanoic acid`],
        "A",
        {
          B: L`Terminal alkynes other than ethyne give methyl ketones under mercuric-ion hydration.`,
          C: L`Hydration followed by keto-enol tautomerism gives a carbonyl compound, not an alcohol as the final major product.`,
          D: L`The reaction does not oxidise the alkyne to a carboxylic acid.`,
        },
        [
          L`First form the enol by Markovnikov hydration.`,
          L`The enol tautomerises to the carbonyl compound.`,
          L`Propyne gives the methyl ketone propanone.`,
        ],
        [
          {
            step: 1,
            explanation: L`Propyne gives the enol $\mathrm{CH_3C(OH)=CH_2}$, which tautomerises to propanone.`,
            math: L`\mathrm{CH_3C{\equiv}CH \xrightarrow{HgSO_4/H_2SO_4,H_2O} CH_3COCH_3}`,
          },
        ],
      ),
      mc(
        L`Assertion (A): Benzene can be converted to benzaldehyde by Gattermann-Koch reaction. Reason (R): The reaction introduces a formyl group using $\mathrm{CO}$ and $\mathrm{HCl}$ in the presence of $\mathrm{AlCl_3/CuCl}$.`,
        3,
        ["preparation", "assertion_reason", "gattermann_koch"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The reason states exactly how the formyl group is introduced, so it explains the assertion.`,
          C: L`The given reagent set is the standard Gattermann-Koch formylation condition.`,
          D: L`The assertion is true.`,
        },
        [
          L`Recall the aromatic formylation reaction.`,
          L`Gattermann-Koch uses carbon monoxide and hydrogen chloride.`,
          L`The product from benzene is benzaldehyde.`,
        ],
        [
          {
            step: 1,
            explanation: L`Gattermann-Koch reaction formylates benzene to benzaldehyde using $\mathrm{CO/HCl}$ with $\mathrm{AlCl_3/CuCl}$.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Name the reaction used to reduce $\mathrm{CH_3COCl}$ selectively to $\mathrm{CH_3CHO}$.`,
        1,
        ["preparation", "rosenmund_reduction"],
        parts([["a", L`Write the named reaction.`, 1]]),
        [
          L`The starting compound is an acid chloride.`,
          L`The product is an aldehyde.`,
          L`The controlled hydrogenation is Rosenmund reduction.`,
        ],
        [
          {
            part: "a",
            explanation: L`The named reaction is Rosenmund reduction.`,
          },
        ],
        [
          L`Writing Clemmensen reduction, which reduces aldehydes or ketones to hydrocarbons.`,
        ],
      ),
      frq(
        "saq",
        L`Give suitable reagents for the following conversions: $\mathrm{propan\text{-}1\text{-}ol\rightarrow propanal}$ and $\mathrm{propan\text{-}2\text{-}ol\rightarrow propanone}$.`,
        2,
        ["preparation", "oxidation"],
        parts([
          ["a", L`State a suitable reagent for the first conversion.`, 1],
          ["b", L`State a suitable reagent for the second conversion.`, 1],
        ]),
        [
          L`A primary alcohol must stop at aldehyde.`,
          L`A secondary alcohol oxidises to ketone.`,
          L`Use PCC for selective aldehyde formation and a usual oxidant such as acidified dichromate for the ketone.`,
        ],
        [
          {
            part: "a",
            explanation: L`Use PCC to oxidise propan-1-ol selectively to propanal.`,
            math: L`\mathrm{CH_3CH_2CH_2OH \xrightarrow{PCC} CH_3CH_2CHO}`,
          },
          {
            part: "b",
            explanation: L`Use acidified $\mathrm{K_2Cr_2O_7}$ or acidified $\mathrm{KMnO_4}$ to oxidise propan-2-ol to propanone.`,
            math: L`\mathrm{CH_3CH(OH)CH_3 \xrightarrow{[O]} CH_3COCH_3}`,
          },
        ],
        [
          L`Using strong oxidising conditions for the primary alcohol and reporting propanoic acid instead of propanal.`,
        ],
      ),
      frq(
        "saq",
        L`An unknown aromatic hydrocarbon $\mathrm{A}$ gives benzaldehyde when treated with $\mathrm{CO}$ and $\mathrm{HCl}$ in the presence of $\mathrm{AlCl_3/CuCl}$. Identify $\mathrm{A}$ and name the reaction.`,
        2,
        ["preparation", "gattermann_koch"],
        parts([
          ["a", L`Identify $\mathrm{A}$.`, 1],
          ["b", L`Name the reaction.`, 1],
        ]),
        [
          L`The reagent set is characteristic of aromatic formylation.`,
          L`The product is benzaldehyde.`,
          L`The parent aromatic hydrocarbon must be benzene.`,
        ],
        [
          {
            part: "a",
            explanation: L`The aromatic hydrocarbon is benzene.`,
          },
          {
            part: "b",
            explanation: L`The reaction is Gattermann-Koch formylation.`,
          },
        ],
        [
          L`Confusing this with Friedel-Crafts acylation, which uses an acid chloride or acid anhydride.`,
        ],
      ),
      frq(
        "laq",
        L`Plan separate preparations of benzaldehyde and acetophenone from benzene. Use one main organic step for each, and mention the reagent conditions.`,
        4,
        ["preparation", "aromatic_carbonyls", "route_planning"],
        parts([
          ["a", L`Give the route to benzaldehyde.`, 2],
          ["b", L`Give the route to acetophenone.`, 2],
        ]),
        [
          L`Benzaldehyde requires introduction of $\mathrm{-CHO}$.`,
          L`Acetophenone requires introduction of $\mathrm{-COCH_3}$.`,
          L`Use Gattermann-Koch for formylation and Friedel-Crafts acylation for acetylation.`,
        ],
        [
          {
            part: "a",
            explanation: L`Treat benzene with $\mathrm{CO}$ and $\mathrm{HCl}$ in the presence of anhydrous $\mathrm{AlCl_3/CuCl}$ to obtain benzaldehyde.`,
            math: L`\mathrm{C_6H_6 \xrightarrow{CO+HCl,\ AlCl_3/CuCl} C_6H_5CHO}`,
          },
          {
            part: "b",
            explanation: L`Treat benzene with acetyl chloride and anhydrous $\mathrm{AlCl_3}$ to obtain acetophenone by Friedel-Crafts acylation.`,
            math: L`\mathrm{C_6H_6 \xrightarrow{CH_3COCl,\ AlCl_3} C_6H_5COCH_3}`,
          },
        ],
        [
          L`Using $\mathrm{CH_3Cl/AlCl_3}$ for acetophenone; that gives toluene.`,
          L`Omitting the Lewis acid catalyst.`,
        ],
      ),
      frq(
        "case",
        L`A laboratory has three starting materials: $\mathrm{CH_3COCl}$, $\mathrm{CH_3CN}$ and $\mathrm{CH_3C{\equiv}CH}$. A student must prepare carbonyl compounds under controlled conditions.`,
        3,
        ["preparation", "reagent_selection"],
        parts([
          [
            "a",
            L`Which starting material can give ethanal by Rosenmund reduction?`,
            1,
          ],
          [
            "b",
            L`Which starting material gives ethanal by Stephen reduction followed by hydrolysis?`,
            1,
          ],
          [
            "c",
            L`Which starting material gives propanone on mercuric-ion catalysed hydration?`,
            1,
          ],
        ]),
        [
          L`Rosenmund reduction starts from acid chloride.`,
          L`Stephen reduction starts from nitrile.`,
          L`Hydration of propyne gives propanone.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{CH_3COCl}$ gives ethanal on Rosenmund reduction.`,
          },
          {
            part: "b",
            explanation: L`$\mathrm{CH_3CN}$ gives ethanal by Stephen reduction followed by hydrolysis.`,
          },
          {
            part: "c",
            explanation: L`$\mathrm{CH_3C{\equiv}CH}$ gives propanone on hydration with $\mathrm{HgSO_4/H_2SO_4}$.`,
          },
        ],
        [L`Mixing up acid chloride reduction and nitrile reduction routes.`],
      ),
    ],
  },
  {
    topicCode: "8.3",
    title: "Reactions of Aldehydes and Ketones",
    subtopic:
      "Use nucleophilic addition, oxidation tests, reduction, aldol, Cannizzaro and iodoform reactions to identify products and distinguish compounds.",
    mc: [
      mc(
        L`Which compound gives a silver mirror with Tollens' reagent but does not give the iodoform test?`,
        3,
        ["carbonyl_tests", "tollens_test", "iodoform_test"],
        [L`propanal`, L`ethanal`, L`propanone`, L`ethanol`],
        "A",
        {
          B: L`Ethanal gives Tollens' test, but it also gives the iodoform test because it contains the $\mathrm{CH_3CHO}$ group.`,
          C: L`Propanone gives the iodoform test but does not reduce Tollens' reagent.`,
          D: L`Ethanol can give iodoform test after oxidation but is not an aldehyde giving Tollens' silver mirror directly in the same way.`,
        },
        [
          L`Tollens' reagent detects aldehydes.`,
          L`Iodoform test is positive for $\mathrm{CH_3CO-}$ or $\mathrm{CH_3CH(OH)-}$ systems and for ethanal.`,
          L`Propanal is an aldehyde but lacks the methyl carbonyl pattern.`,
        ],
        [
          {
            step: 1,
            explanation: L`Propanal is an aldehyde and reduces Tollens' reagent, but it lacks the $\mathrm{CH_3CO-}$ or $\mathrm{CH_3CHO}$ group needed for iodoform test.`,
          },
        ],
      ),
      mc(
        L`The product obtained when acetone is reduced with $\mathrm{NaBH_4}$ is`,
        1,
        ["reduction", "carbonyl_reactions"],
        [L`propan-2-ol`, L`propan-1-ol`, L`propane`, L`propanoic acid`],
        "A",
        {
          B: L`A ketone reduces to a secondary alcohol, not a primary alcohol.`,
          C: L`Complete reduction to hydrocarbon needs Clemmensen or Wolff-Kishner conditions, not $\mathrm{NaBH_4}$.`,
          D: L`Reduction does not oxidise acetone to an acid.`,
        },
        [
          L`$\mathrm{NaBH_4}$ reduces aldehydes and ketones to alcohols.`,
          L`A ketone gives a secondary alcohol.`,
          L`Acetone gives propan-2-ol.`,
        ],
        [
          {
            step: 1,
            explanation: L`Acetone is a ketone, so sodium borohydride reduces it to the corresponding secondary alcohol.`,
            math: L`\mathrm{CH_3COCH_3 \xrightarrow{NaBH_4} CH_3CH(OH)CH_3}`,
          },
        ],
      ),
      mc(
        L`Which aldehyde undergoes Cannizzaro reaction most readily under concentrated alkali?`,
        2,
        ["cannizzaro_reaction", "alpha_hydrogen"],
        [L`benzaldehyde`, L`ethanal`, L`propanal`, L`butanal`],
        "A",
        {
          B: L`Ethanal has alpha hydrogen and prefers aldol reaction under dilute alkali.`,
          C: L`Propanal has alpha hydrogen.`,
          D: L`Butanal has alpha hydrogen.`,
        },
        [
          L`Cannizzaro reaction requires aldehydes without alpha hydrogen.`,
          L`Aliphatic aldehydes like ethanal, propanal and butanal have alpha hydrogen.`,
          L`Benzaldehyde has no alpha hydrogen attached to the carbon next to $\mathrm{-CHO}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Benzaldehyde lacks alpha hydrogen and therefore undergoes disproportionation in concentrated alkali.`,
          },
        ],
      ),
      mc(
        L`Which compound gives an aldol condensation product with dilute $\mathrm{NaOH}$?`,
        2,
        ["aldol_condensation", "alpha_hydrogen"],
        [L`ethanal`, L`benzaldehyde`, L`formaldehyde`, L`benzophenone`],
        "A",
        {
          B: L`Benzaldehyde has no alpha hydrogen and does not undergo self-aldol condensation.`,
          C: L`Formaldehyde has no alpha carbon and no alpha hydrogen.`,
          D: L`Benzophenone lacks alpha hydrogen.`,
        },
        [
          L`Aldol reaction needs at least one alpha hydrogen.`,
          L`Ethanal has alpha hydrogens on the methyl group.`,
          L`The other options lack suitable alpha hydrogen.`,
        ],
        [
          {
            step: 1,
            explanation: L`Ethanal contains alpha hydrogen and forms an enolate under dilute base, which then adds to another ethanal molecule.`,
          },
        ],
      ),
      mc(
        L`Wolff-Kishner reduction of $\mathrm{CH_3COCH_2CH_3}$ gives`,
        2,
        ["wolff_kishner_reduction", "carbonyl_reactions"],
        [L`butane`, L`butan-2-ol`, L`butanoic acid`, L`butanal`],
        "A",
        {
          B: L`Butan-2-ol is formed by hydride reduction, not Wolff-Kishner reduction.`,
          C: L`Wolff-Kishner is a reduction to hydrocarbon, not oxidation to acid.`,
          D: L`A ketone is not converted to an aldehyde under Wolff-Kishner conditions.`,
        },
        [
          L`Wolff-Kishner removes the oxygen of aldehydes and ketones.`,
          L`The carbonyl carbon becomes $\mathrm{-CH_2-}$.`,
          L`Butan-2-one becomes butane.`,
        ],
        [
          {
            step: 1,
            explanation: L`Wolff-Kishner reduction converts the carbonyl group of butan-2-one into methylene, giving butane.`,
            math: L`\mathrm{CH_3COCH_2CH_3 \xrightarrow{NH_2NH_2/KOH,\ heat} CH_3CH_2CH_2CH_3}`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Which reagent gives an orange-yellow precipitate with aldehydes and ketones but not with carboxylic acids?`,
        1,
        ["carbonyl_tests", "dnp_test"],
        parts([["a", L`Name the reagent.`, 1]]),
        [
          L`The test detects the carbonyl group of aldehydes and ketones.`,
          L`It forms a hydrazone derivative.`,
          L`The reagent is 2,4-dinitrophenylhydrazine.`,
        ],
        [
          {
            part: "a",
            explanation: L`The reagent is 2,4-dinitrophenylhydrazine, also called Brady's reagent.`,
          },
        ],
        [
          L`Writing Tollens' reagent, which is selective for aldehydes rather than all aldehydes and ketones.`,
        ],
      ),
      frq(
        "saq",
        L`Distinguish between ethanal and propanone using Tollens' reagent and iodoform test.`,
        3,
        ["distinguishing_tests", "tollens_test", "iodoform_test"],
        parts([
          ["a", L`State the Tollens' test observations.`, 1],
          ["b", L`State the iodoform test observations.`, 1],
          ["c", L`Explain why one test alone is not enough here.`, 1],
        ]),
        [
          L`Ethanal is an aldehyde; propanone is a methyl ketone.`,
          L`Tollens' reagent is reduced by aldehydes.`,
          L`Both ethanal and propanone give iodoform test.`,
        ],
        [
          {
            part: "a",
            explanation: L`Ethanal gives a silver mirror with Tollens' reagent, while propanone does not.`,
          },
          {
            part: "b",
            explanation: L`Both ethanal and propanone give yellow iodoform precipitate.`,
          },
          {
            part: "c",
            explanation: L`Iodoform test alone is not enough because both compounds have the required methyl carbonyl or equivalent aldehyde pattern.`,
          },
        ],
        [
          L`Saying propanone gives Tollens' test because it is a carbonyl compound.`,
        ],
      ),
      frq(
        "saq",
        L`Write the main product when propanal reacts with dilute $\mathrm{NaOH}$ at low temperature. Name the type of reaction.`,
        3,
        ["aldol_reaction", "carbonyl_reactions"],
        parts([
          ["a", L`Write the main aldol product.`, 2],
          ["b", L`Name the reaction.`, 1],
        ]),
        [
          L`Propanal has alpha hydrogen.`,
          L`Aldol addition gives a beta-hydroxy aldehyde first.`,
          L`The product is 3-hydroxy-2-methylpentanal.`,
        ],
        [
          {
            part: "a",
            explanation: L`The enolate of propanal adds to another propanal molecule to give a beta-hydroxy aldehyde.`,
            math: L`\mathrm{2CH_3CH_2CHO \xrightarrow{dil.\ NaOH} CH_3CH_2CH(OH)CH(CH_3)CHO}`,
          },
          {
            part: "b",
            explanation: L`The reaction is aldol addition; on heating it can undergo aldol condensation by dehydration.`,
          },
        ],
        [
          L`Writing crotonaldehyde, which is the dehydration product of ethanal aldol, not the low-temperature propanal aldol product.`,
        ],
      ),
      frq(
        "laq",
        L`An unknown aldehyde-or-ketone compound $\mathrm{A}$ with formula $\mathrm{C_7H_6O}$ gives 2,4-DNP test, reduces Tollens' reagent, and undergoes Cannizzaro reaction but not aldol reaction. Identify $\mathrm{A}$ and write the Cannizzaro products.`,
        4,
        ["multi_clue_identification", "cannizzaro_reaction", "carbonyl_tests"],
        parts([
          ["a", L`Identify the functional group from the first two tests.`, 1],
          [
            "b",
            L`Use the aldol/Cannizzaro behaviour to identify $\mathrm{A}$.`,
            1,
          ],
          ["c", L`Write the products of Cannizzaro reaction.`, 2],
        ]),
        [
          L`2,4-DNP plus Tollens' points to an aldehyde.`,
          L`Cannizzaro but no aldol means no alpha hydrogen.`,
          L`The formula $\mathrm{C_7H_6O}$ fits benzaldehyde.`,
        ],
        [
          {
            part: "a",
            explanation: L`A positive 2,4-DNP test shows a carbonyl compound and Tollens' reduction shows it is an aldehyde.`,
          },
          {
            part: "b",
            explanation: L`The formula and absence of alpha hydrogen identify $\mathrm{A}$ as benzaldehyde.`,
          },
          {
            part: "c",
            explanation: L`In concentrated alkali, benzaldehyde disproportionates to benzyl alcohol and benzoate salt; acidification of benzoate gives benzoic acid.`,
            math: L`\mathrm{2C_6H_5CHO+OH^- \rightarrow C_6H_5CH_2OH+C_6H_5COO^-}`,
          },
        ],
        [
          L`Calling $\mathrm{A}$ acetophenone even though it does not reduce Tollens' reagent.`,
          L`Writing aldol products despite the absence of alpha hydrogen.`,
        ],
      ),
      frq(
        "case",
        L`Identify the aldehyde-or-ketone contents of four bottles labelled P, Q, R and S. The possible compounds are methanal, ethanal, propanone and benzaldehyde, not in order. The observations are: P gives Tollens' test and iodoform test; Q gives Tollens' test, no iodoform test and does not reduce Fehling's solution; R gives 2,4-DNP but no Tollens' test and gives iodoform test; S gives Tollens' test, no iodoform test and reduces Fehling's solution.`,
        4,
        ["distinguishing_tests", "case_study", "multi_clue_identification"],
        parts([
          ["a", L`Identify P.`, 1],
          ["b", L`Identify Q.`, 1],
          ["c", L`Identify R.`, 1],
          ["d", L`Identify S.`, 1],
        ]),
        [
          L`Ethanal gives both Tollens' and iodoform tests.`,
          L`Benzaldehyde gives Tollens' test but does not reduce Fehling's solution under ordinary test conditions.`,
          L`Propanone gives 2,4-DNP and iodoform but not Tollens'; methanal gives Tollens' and Fehling's tests but no iodoform test.`,
        ],
        [
          {
            part: "a",
            explanation: L`P is ethanal because it is an aldehyde and also gives iodoform test.`,
          },
          {
            part: "b",
            explanation: L`Q is benzaldehyde because it reduces Tollens' reagent, lacks the iodoform group, and does not reduce Fehling's solution under ordinary test conditions.`,
          },
          {
            part: "c",
            explanation: L`R is propanone because it is a methyl ketone: 2,4-DNP positive, Tollens' negative, and iodoform positive.`,
          },
          {
            part: "d",
            explanation: L`S is methanal because it reduces Tollens' and Fehling's reagents but gives no iodoform test.`,
          },
        ],
        [L`Using iodoform test as if it were a general aldehyde test.`],
      ),
    ],
  },
  {
    topicCode: "8.4",
    title: "Carboxylic Acids",
    subtopic:
      "Prepare carboxylic acids, compare acidity, and predict reactions with bases, alcohols, thionyl chloride, soda lime and alpha-halogenation conditions.",
    mc: [
      mc(
        L`Which compound is the strongest acid among the following?`,
        2,
        ["acidity", "inductive_effect"],
        [
          L`$\mathrm{ClCH_2COOH}$`,
          L`$\mathrm{CH_3COOH}$`,
          L`$\mathrm{CH_3CH_2COOH}$`,
          L`$\mathrm{CH_3CH_2OH}$`,
        ],
        "A",
        {
          B: L`Acetic acid is weaker because it lacks the electron-withdrawing chloro group.`,
          C: L`Ethyl group has a $+I$ effect and weakens acidity compared with chloroacetic acid.`,
          D: L`Alcohols are far weaker acids than carboxylic acids.`,
        },
        [
          L`Electron-withdrawing groups stabilise carboxylate ions.`,
          L`Chlorine has a strong $-I$ effect.`,
          L`Chloroacetic acid is therefore stronger than unsubstituted alkanoic acids.`,
        ],
        [
          {
            step: 1,
            explanation: L`The $\mathrm{-Cl}$ group withdraws electron density and stabilises the conjugate base $\mathrm{ClCH_2COO^-}$, increasing acidity.`,
          },
        ],
      ),
      mc(
        L`The reaction of $\mathrm{CH_3COOH}$ with $\mathrm{NaHCO_3}$ is useful because it produces`,
        1,
        ["carboxylic_acid_tests", "bicarbonate_test"],
        [
          L`brisk effervescence of $\mathrm{CO_2}$`,
          L`a silver mirror`,
          L`yellow $\mathrm{CHI_3}$ precipitate`,
          L`orange 2,4-DNP precipitate`,
        ],
        "A",
        {
          B: L`Silver mirror is the Tollens' test for aldehydes, not carboxylic acids.`,
          C: L`Yellow iodoform precipitate is not the bicarbonate test observation.`,
          D: L`2,4-DNP detects aldehydes and ketones, not carboxylic acids.`,
        },
        [
          L`Carboxylic acids react with bicarbonates.`,
          L`The acid liberates carbon dioxide from bicarbonate.`,
          L`The visible observation is effervescence.`,
        ],
        [
          {
            step: 1,
            explanation: L`Acetic acid reacts with sodium bicarbonate to form sodium acetate, water and carbon dioxide gas.`,
            math: L`\mathrm{CH_3COOH+NaHCO_3\rightarrow CH_3COONa+H_2O+CO_2}`,
          },
        ],
      ),
      mc(
        L`Heating sodium acetate with soda lime mainly gives`,
        2,
        ["decarboxylation", "carboxylic_acid_reactions"],
        [L`methane`, L`ethane`, L`methanol`, L`ethanoic acid`],
        "A",
        {
          B: L`Soda-lime decarboxylation removes the carboxyl carbon, so sodium acetate gives one-carbon methane.`,
          C: L`The reaction gives an alkane, not an alcohol.`,
          D: L`Soda lime does not regenerate the acid.`,
        },
        [
          L`Soda lime removes $\mathrm{-COONa}$ as carbonate.`,
          L`The alkyl group receives hydrogen.`,
          L`$\mathrm{CH_3COONa}$ gives $\mathrm{CH_4}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Sodium acetate loses the carboxyl carbon on heating with soda lime, giving methane.`,
            math: L`\mathrm{CH_3COONa+NaOH \xrightarrow{CaO,\Delta} CH_4+Na_2CO_3}`,
          },
        ],
      ),
      mc(
        L`The Hell-Volhard-Zelinsky reaction of propanoic acid gives mainly`,
        2,
        ["hvz_reaction", "alpha_halogenation"],
        [
          L`2-bromopropanoic acid`,
          L`3-bromopropanoic acid`,
          L`bromoethane`,
          L`propanoyl bromide only`,
        ],
        "A",
        {
          B: L`HVZ halogenates at the alpha carbon next to the carboxyl group, not the beta carbon.`,
          C: L`The carboxylic acid framework is retained after hydrolysis.`,
          D: L`Acid bromide may form during the reaction sequence, but the final alpha-bromo acid is the product asked here.`,
        },
        [
          L`HVZ reaction requires alpha hydrogen.`,
          L`Propanoic acid has alpha hydrogens on carbon 2.`,
          L`Bromination gives the alpha-bromo acid.`,
        ],
        [
          {
            step: 1,
            explanation: L`Propanoic acid undergoes alpha bromination in the presence of bromine and red phosphorus, followed by hydrolysis.`,
            math: L`\mathrm{CH_3CH_2COOH \xrightarrow{Br_2/red\ P} CH_3CHBrCOOH}`,
          },
        ],
      ),
      mc(
        L`Assertion (A): Benzoic acid is weaker than chloroacetic acid. Reason (R): The $\mathrm{-Cl}$ group in chloroacetic acid stabilises the carboxylate ion by a strong $-I$ effect.`,
        3,
        ["acidity", "assertion_reason"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The reason directly explains why chloroacetic acid is stronger than benzoic acid.`,
          C: L`The $-I$ effect of chlorine does stabilise the carboxylate ion.`,
          D: L`Chloroacetic acid is stronger; hence benzoic acid is weaker in this comparison.`,
        },
        [
          L`Compare stabilisation of conjugate bases.`,
          L`A nearby chlorine atom withdraws electron density strongly.`,
          L`Greater carboxylate stabilisation means stronger acid.`,
        ],
        [
          {
            step: 1,
            explanation: L`Chlorine stabilises $\mathrm{ClCH_2COO^-}$ by its $-I$ effect, so chloroacetic acid is stronger than benzoic acid.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`What gas is evolved when ethanoic acid reacts with sodium bicarbonate?`,
        1,
        ["carboxylic_acid_tests", "bicarbonate_test"],
        parts([["a", L`Name the gas.`, 1]]),
        [
          L`An acid reacts with bicarbonate.`,
          L`Carbonic acid formed decomposes.`,
          L`The gas is carbon dioxide.`,
        ],
        [
          {
            part: "a",
            explanation: L`Carbon dioxide gas is evolved.`,
            math: L`\mathrm{CO_2}`,
          },
        ],
        [
          L`Writing hydrogen gas; hydrogen is evolved with active metals, not bicarbonate.`,
        ],
      ),
      frq(
        "saq",
        L`Arrange $\mathrm{CH_3COOH}$, $\mathrm{ClCH_2COOH}$ and $\mathrm{Cl_2CHCOOH}$ in increasing order of acidity. Give the reason.`,
        3,
        ["acidity", "inductive_effect"],
        parts([
          ["a", L`Write the increasing order.`, 1],
          ["b", L`Explain the trend.`, 2],
        ]),
        [
          L`More electron-withdrawing chlorine atoms stabilise the carboxylate ion more strongly.`,
          L`A stable conjugate base means a stronger acid.`,
          L`Dichloroacetic acid is stronger than chloroacetic acid, which is stronger than acetic acid.`,
        ],
        [
          {
            part: "a",
            explanation: L`The increasing order is acetic acid, chloroacetic acid, dichloroacetic acid.`,
            math: L`\mathrm{CH_3COOH<ClCH_2COOH<Cl_2CHCOOH}`,
          },
          {
            part: "b",
            explanation: L`Chlorine atoms withdraw electron density by the $-I$ effect and stabilise the corresponding carboxylate ions. Two chlorine atoms stabilise more strongly than one.`,
          },
        ],
        [
          L`Reversing the order by thinking that electron withdrawal destabilises the acid molecule rather than stabilising the conjugate base.`,
        ],
      ),
      frq(
        "saq",
        L`Give one suitable preparation of benzoic acid from toluene and one from a Grignard reagent.`,
        3,
        ["preparation", "carboxylic_acids"],
        parts([
          ["a", L`Write the oxidation route from toluene.`, 1],
          ["b", L`Write the Grignard route.`, 2],
        ]),
        [
          L`Alkylbenzene side chains oxidise to $\mathrm{-COOH}$.`,
          L`A Grignard reagent reacts with carbon dioxide.`,
          L`Acidic hydrolysis gives the carboxylic acid.`,
        ],
        [
          {
            part: "a",
            explanation: L`Oxidise toluene using hot alkaline $\mathrm{KMnO_4}$ followed by acidification.`,
            math: L`\mathrm{C_6H_5CH_3 \xrightarrow{KMnO_4/OH^-,\Delta;\ H^+} C_6H_5COOH}`,
          },
          {
            part: "b",
            explanation: L`Treat phenylmagnesium bromide with carbon dioxide and then hydrolyse the magnesium salt with acid.`,
            math: L`\mathrm{C_6H_5MgBr \xrightarrow{CO_2} C_6H_5COOMgBr \xrightarrow{H_3O^+} C_6H_5COOH}`,
          },
        ],
        [
          L`Trying to oxidise benzene directly to benzoic acid under normal board-level conditions.`,
        ],
      ),
      frq(
        "laq",
        L`Starting with ethanoic acid, show how you would prepare ethanoyl chloride, ethyl ethanoate and methane. Mention the reagent for each conversion.`,
        4,
        ["carboxylic_acid_reactions", "conversion_planning"],
        parts([
          ["a", L`Prepare ethanoyl chloride.`, 1],
          ["b", L`Prepare ethyl ethanoate.`, 1],
          ["c", L`Prepare methane.`, 2],
        ]),
        [
          L`Acid chlorides are made with $\mathrm{SOCl_2}$.`,
          L`Esters form with alcohol and acid catalyst.`,
          L`Methane comes from the sodium salt by soda-lime decarboxylation.`,
        ],
        [
          {
            part: "a",
            explanation: L`React ethanoic acid with thionyl chloride.`,
            math: L`\mathrm{CH_3COOH+SOCl_2\rightarrow CH_3COCl+SO_2+HCl}`,
          },
          {
            part: "b",
            explanation: L`React ethanoic acid with ethanol in the presence of concentrated sulphuric acid.`,
            math: L`\mathrm{CH_3COOH+C_2H_5OH \rightleftharpoons CH_3COOC_2H_5+H_2O}`,
          },
          {
            part: "c",
            explanation: L`First neutralise ethanoic acid with sodium hydroxide to form sodium ethanoate. Heat the dry sodium salt with soda lime to give methane.`,
            math: L`\mathrm{CH_3COOH+NaOH\rightarrow CH_3COONa+H_2O;\quad CH_3COONa+NaOH \xrightarrow{CaO,\Delta} CH_4+Na_2CO_3}`,
          },
        ],
        [
          L`Using $\mathrm{PCl_5}$ for chloride without balancing by-products is acceptable, but omitting a chlorinating reagent is incomplete.`,
          L`Trying to decarboxylate free ethanoic acid directly with soda lime without forming the salt.`,
        ],
      ),
      frq(
        "case",
        L`Three acids A, B and C are ethanoic acid, chloroethanoic acid and benzoic acid. Their acidity is compared using conjugate-base stability and substituent effects.`,
        3,
        ["acidity", "case_study"],
        parts([
          ["a", L`Which acid is strongest?`, 1],
          ["b", L`Why is ethanoic acid weaker than chloroethanoic acid?`, 1],
          [
            "c",
            L`Which test can distinguish these acids from neutral aldehydes and ketones by gas evolution?`,
            1,
          ],
        ]),
        [
          L`The strongest acid here has the strongest electron-withdrawing substituent near $\mathrm{-COOH}$.`,
          L`The methyl group donates electron density, while chlorine withdraws it.`,
          L`Bicarbonate gives $\mathrm{CO_2}$ with carboxylic acids.`,
        ],
        [
          {
            part: "a",
            explanation: L`Chloroethanoic acid is the strongest because chlorine stabilises the carboxylate ion by the $-I$ effect.`,
          },
          {
            part: "b",
            explanation: L`The methyl group in ethanoic acid has a $+I$ effect, while chlorine withdraws electron density and stabilises the conjugate base.`,
          },
          {
            part: "c",
            explanation: L`Sodium bicarbonate test distinguishes carboxylic acids by brisk effervescence of $\mathrm{CO_2}$.`,
          },
        ],
        [L`Using 2,4-DNP as if it detected carboxylic acids.`],
      ),
    ],
  },
  {
    topicCode: "8.5",
    title: "Mixed Conversions, Tests and Uses",
    subtopic:
      "Solve integrated board-style conversion and identification tasks involving aldehydes, ketones and carboxylic acids.",
    mc: [
      mc(
        L`A compound gives 2,4-DNP test, does not reduce Tollens' reagent, and gives yellow precipitate with $\mathrm{I_2/NaOH}$. The compound could be`,
        3,
        ["multi_clue_identification", "iodoform_test"],
        [L`acetophenone`, L`benzaldehyde`, L`benzoic acid`, L`propanal`],
        "A",
        {
          B: L`Benzaldehyde reduces Tollens' reagent and does not give the iodoform test.`,
          C: L`Benzoic acid does not give 2,4-DNP test.`,
          D: L`Propanal reduces Tollens' reagent and does not give iodoform test.`,
        },
        [
          L`2,4-DNP indicates aldehyde or ketone.`,
          L`Negative Tollens' test rules out aldehyde.`,
          L`Iodoform test points to a methyl ketone; acetophenone is $\mathrm{C_6H_5COCH_3}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Acetophenone is a methyl ketone. It gives 2,4-DNP and iodoform tests but does not reduce Tollens' reagent.`,
          },
        ],
      ),
      mc(
        L`The best sequence for converting ethanol to ethanoic acid through an aldehyde intermediate is`,
        3,
        ["conversion_planning", "oxidation"],
        [
          L`PCC, then acidified $\mathrm{K_2Cr_2O_7}$`,
          L`$\mathrm{NaBH_4}$, then PCC`,
          L`$\mathrm{SOCl_2}$, then water`,
          L`$\mathrm{I_2/NaOH}$, then $\mathrm{H_3O^+}$`,
        ],
        "A",
        {
          B: L`Sodium borohydride reduces carbonyl compounds; it does not oxidise ethanol to ethanal.`,
          C: L`Thionyl chloride converts alcohols to alkyl chlorides and acids to acid chlorides; this sequence does not pass through ethanal.`,
          D: L`Iodoform conditions cleave suitable methyl carbonyl compounds and are not the controlled ethanol-to-ethanal-to-acid sequence.`,
        },
        [
          L`First stop primary alcohol oxidation at aldehyde.`,
          L`Then oxidise aldehyde further to carboxylic acid.`,
          L`PCC followed by acidified dichromate fits this plan.`,
        ],
        [
          {
            step: 1,
            explanation: L`PCC converts ethanol to ethanal. Acidified dichromate then oxidises ethanal to ethanoic acid.`,
            math: L`\mathrm{CH_3CH_2OH \xrightarrow{PCC} CH_3CHO \xrightarrow{K_2Cr_2O_7/H^+} CH_3COOH}`,
          },
        ],
      ),
      mc(
        L`Formalin is commonly used as a disinfectant and preservative. It is an aqueous solution of`,
        1,
        ["uses", "formaldehyde"],
        [L`methanal`, L`ethanal`, L`propanone`, L`ethanoic acid`],
        "A",
        {
          B: L`Ethanal is acetaldehyde, not formalin.`,
          C: L`Propanone is acetone, mainly used as a solvent.`,
          D: L`Ethanoic acid is acetic acid, not formalin.`,
        },
        [
          L`Formalin is related to formaldehyde.`,
          L`Formaldehyde is the common name of methanal.`,
          L`It is an aqueous solution of methanal.`,
        ],
        [
          {
            step: 1,
            explanation: L`Formalin is an aqueous solution of formaldehyde, whose IUPAC name is methanal.`,
          },
        ],
      ),
      mc(
        L`Which pair can be distinguished by sodium bicarbonate solution?`,
        2,
        ["distinguishing_tests", "carboxylic_acids"],
        [
          L`benzoic acid and benzaldehyde`,
          L`ethanal and benzaldehyde`,
          L`propanone and acetophenone`,
          L`ethanal and propanal`,
        ],
        "A",
        {
          B: L`Both are aldehydes and do not give $\mathrm{CO_2}$ with bicarbonate.`,
          C: L`Both are ketones and do not give bicarbonate effervescence.`,
          D: L`Both are aldehydes, not carboxylic acids.`,
        },
        [
          L`Sodium bicarbonate detects carboxylic acids by $\mathrm{CO_2}$ evolution.`,
          L`Benzoic acid is a carboxylic acid.`,
          L`Benzaldehyde is neutral and does not effervesce with bicarbonate.`,
        ],
        [
          {
            step: 1,
            explanation: L`Benzoic acid reacts with sodium bicarbonate to liberate carbon dioxide, while benzaldehyde does not.`,
          },
        ],
      ),
      mc(
        L`A student wants to convert acetophenone into benzoic acid with loss of the methyl carbon. The suitable reaction is`,
        3,
        ["conversion_planning", "haloform_reaction"],
        [
          L`iodoform reaction followed by acidification`,
          L`Rosenmund reduction`,
          L`Cannizzaro reaction`,
          L`Stephen reduction`,
        ],
        "A",
        {
          B: L`Rosenmund reduction starts from acid chlorides and gives aldehydes.`,
          C: L`Cannizzaro reaction is for aldehydes lacking alpha hydrogen; acetophenone is a ketone.`,
          D: L`Stephen reduction starts from nitriles and gives aldehydes.`,
        },
        [
          L`Acetophenone is a methyl ketone.`,
          L`Methyl ketones undergo haloform reaction to give carboxylate salts with one fewer carbon on the acyl side.`,
          L`Acidification of sodium benzoate gives benzoic acid.`,
        ],
        [
          {
            step: 1,
            explanation: L`Acetophenone undergoes iodoform reaction with $\mathrm{I_2/NaOH}$ to give sodium benzoate and iodoform. Acidification gives benzoic acid.`,
            math: L`\mathrm{C_6H_5COCH_3 \xrightarrow{I_2/NaOH} C_6H_5COO^-Na^+ \xrightarrow{H^+} C_6H_5COOH}`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Name the household acid present in vinegar.`,
        1,
        ["uses", "carboxylic_acids"],
        parts([["a", L`Write the common or IUPAC name.`, 1]]),
        [
          L`Vinegar is a dilute aqueous solution of one carboxylic acid.`,
          L`The common name is acetic acid.`,
          L`The IUPAC name is ethanoic acid.`,
        ],
        [
          {
            part: "a",
            explanation: L`Vinegar contains ethanoic acid, commonly called acetic acid.`,
          },
        ],
        [
          L`Writing citric acid, which is present in citrus fruits, not vinegar.`,
        ],
      ),
      frq(
        "saq",
        L`How will you distinguish between acetaldehyde and acetone using one test? Give the observation.`,
        2,
        ["distinguishing_tests", "tollens_test"],
        parts([
          ["a", L`Name a suitable test.`, 1],
          ["b", L`State the observations for both compounds.`, 1],
        ]),
        [
          L`Both can give iodoform test, so choose another test.`,
          L`Tollens' reagent distinguishes aldehyde from ketone.`,
          L`Acetaldehyde reduces Tollens' reagent; acetone does not.`,
        ],
        [
          {
            part: "a",
            explanation: L`Use Tollens' reagent.`,
          },
          {
            part: "b",
            explanation: L`Acetaldehyde gives a silver mirror, while acetone gives no silver mirror.`,
          },
        ],
        [L`Using iodoform test, which both acetaldehyde and acetone can give.`],
      ),
      frq(
        "saq",
        L`Complete the conversion: $\mathrm{benzaldehyde\rightarrow benzyl\ alcohol}$ and $\mathrm{benzaldehyde\rightarrow benzoic\ acid}$. Give one reagent for each.`,
        2,
        ["conversion_planning", "oxidation_reduction"],
        parts([
          ["a", L`Give a reagent for the reduction.`, 1],
          ["b", L`Give a reagent for the oxidation.`, 1],
        ]),
        [
          L`Aldehyde reduction gives primary alcohol.`,
          L`Aldehyde oxidation gives carboxylic acid.`,
          L`Use $\mathrm{NaBH_4}$ or $\mathrm{LiAlH_4}$ for reduction and an oxidising agent for oxidation.`,
        ],
        [
          {
            part: "a",
            explanation: L`Use $\mathrm{NaBH_4}$ to reduce benzaldehyde to benzyl alcohol.`,
            math: L`\mathrm{C_6H_5CHO \xrightarrow{NaBH_4} C_6H_5CH_2OH}`,
          },
          {
            part: "b",
            explanation: L`Use acidified $\mathrm{KMnO_4}$ or acidified $\mathrm{K_2Cr_2O_7}$ to oxidise benzaldehyde to benzoic acid.`,
            math: L`\mathrm{C_6H_5CHO \xrightarrow{[O]} C_6H_5COOH}`,
          },
        ],
        [
          L`Using Clemmensen reduction for benzyl alcohol; it would remove the carbonyl oxygen completely.`,
        ],
      ),
      frq(
        "laq",
        L`An organic compound $\mathrm{A}$ has formula $\mathrm{C_8H_8O}$. It gives 2,4-DNP test, does not reduce Tollens' reagent, gives iodoform test, and on strong oxidation gives benzoic acid. Identify $\mathrm{A}$ and justify each clue.`,
        4,
        ["multi_clue_identification", "haloform_reaction", "oxidation"],
        parts([
          [
            "a",
            L`Use 2,4-DNP and Tollens' tests to identify the broad class.`,
            1,
          ],
          ["b", L`Use iodoform test to narrow the structure.`, 1],
          ["c", L`Use oxidation product to identify $\mathrm{A}$.`, 1],
          ["d", L`Write the name of $\mathrm{A}$.`, 1],
        ]),
        [
          L`2,4-DNP positive and Tollens' negative means ketone.`,
          L`Iodoform positive means methyl ketone.`,
          L`Oxidation to benzoic acid points to an aryl methyl ketone: acetophenone.`,
        ],
        [
          {
            part: "a",
            explanation: L`The compound is a ketone because it gives 2,4-DNP but does not reduce Tollens' reagent.`,
          },
          {
            part: "b",
            explanation: L`The iodoform test shows the presence of a $\mathrm{CH_3CO-}$ group.`,
          },
          {
            part: "c",
            explanation: L`Strong oxidation giving benzoic acid indicates the carbonyl compound is attached to a phenyl ring.`,
          },
          {
            part: "d",
            explanation: L`The compound is acetophenone, IUPAC name 1-phenylethan-1-one.`,
            math: L`\mathrm{C_6H_5COCH_3}`,
          },
        ],
        [
          L`Calling it benzaldehyde despite the negative Tollens' test.`,
          L`Calling it propiophenone despite the positive iodoform test.`,
        ],
      ),
      frq(
        "case",
        L`A conversion chart is partly erased: $\mathrm{ethanol \rightarrow A \rightarrow B \rightarrow C}$. The first step uses PCC, the second uses acidified $\mathrm{K_2Cr_2O_7}$, and the third uses ethanol with a few drops of concentrated $\mathrm{H_2SO_4}$.`,
        4,
        ["conversion_planning", "case_study"],
        parts([
          ["a", L`Identify $\mathrm{A}$.`, 1],
          ["b", L`Identify $\mathrm{B}$.`, 1],
          ["c", L`Identify $\mathrm{C}$.`, 1],
          ["d", L`Name the reaction in the final step.`, 1],
        ]),
        [
          L`PCC oxidises ethanol to ethanal.`,
          L`Acidified dichromate oxidises ethanal to ethanoic acid.`,
          L`Ethanoic acid reacts with ethanol under acid catalysis to form ethyl ethanoate.`,
        ],
        [
          {
            part: "a",
            explanation: L`A is ethanal, $\mathrm{CH_3CHO}$.`,
          },
          {
            part: "b",
            explanation: L`B is ethanoic acid, $\mathrm{CH_3COOH}$.`,
          },
          {
            part: "c",
            explanation: L`C is ethyl ethanoate, $\mathrm{CH_3COOC_2H_5}$.`,
          },
          {
            part: "d",
            explanation: L`The final step is esterification.`,
          },
        ],
        [L`Skipping the aldehyde intermediate and writing ethanoic acid as A.`],
      ),
    ],
  },
];

export const aldehydesKetonesCarboxylicAcidsTopics: Topic[] =
  topicSeeds.map(makeTopic);
