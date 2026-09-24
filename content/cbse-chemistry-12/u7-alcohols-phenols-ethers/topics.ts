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
const UNIT = "u7-alcohols-phenols-ethers";
const VERSION = "0.1.1";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const TOPIC_CHOICE_ROTATION_OFFSETS: Record<string, number> = {
  "7.1": 1,
  "7.2": 0,
  "7.3": 2,
  "7.4": 2,
  "7.5": 3,
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
  return `You chose ${choiceText}. Recheck the hydroxyl or alkoxy carbon, acidity trend, reagent condition, reaction pathway, and product functional group before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        : "incorrect_cbse_class12_chemistry_alcohols_phenols_ethers_reasoning",
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
    contentId: `${COURSE}.u7.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "matches_reagent_or_acidity_rule_without_checking_the_actual_functional_group",
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
    contentId: `${COURSE}.u7.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "states_a_product_without_linking_it_to_the_reagent_condition_or_reactivity_trend",
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

function rubric(items: readonly FrqPart[]): FrqRubric {
  return {
    maxPoints: items.reduce((total, item) => total + item.points, 0),
    criteria: items.map((item) => ({
      part: item.letter,
      points: item.points,
      description: `Completes part ${item.letter} with correct alcohol, phenol or ether classification, reagent logic, product, acidity trend, mechanism condition or comparison as required.`,
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
    topicCode: "7.1",
    title: "Classification, Nomenclature and Physical Properties",
    subtopic:
      "Classify alcohols, phenols and ethers, name them, and connect hydrogen bonding with boiling point and solubility.",
    mc: [
      mc(
        L`The compound $\mathrm{CH_2=CHCH_2OH}$ is best classified as`,
        2,
        ["classification", "allylic_alcohol"],
        [L`an allylic alcohol`, L`a vinylic alcohol`, L`a phenol`, L`an ether`],
        "A",
        {
          B: L`In a vinylic alcohol, the $\mathrm{-OH}$ group is directly attached to an alkene carbon. Here it is on the adjacent sp$^3$ carbon.`,
          C: L`A phenol has $\mathrm{-OH}$ directly attached to an aromatic ring.`,
          D: L`An ether has a $\mathrm{C-O-C}$ linkage, not an $\mathrm{-OH}$ group.`,
        },
        [
          L`Locate the carbon bearing $\mathrm{-OH}$.`,
          L`It is next to a carbon-carbon double bond.`,
          L`An $\mathrm{-OH}$ group on an sp$^3$ carbon adjacent to $\mathrm{C=C}$ is allylic.`,
        ],
        [
          {
            step: 1,
            explanation: L`In $\mathrm{CH_2=CHCH_2OH}$, the hydroxyl group is on an sp$^3$ carbon adjacent to the double bond, so it is an allylic alcohol.`,
          },
        ],
      ),
      mc(
        L`The correct IUPAC name of $\mathrm{CH_3CH(OH)CH_2CH_3}$ is`,
        2,
        ["iupac_nomenclature", "alcohols"],
        [
          L`butan-$1$-ol`,
          L`butan-$2$-ol`,
          L`2-hydroxybutane`,
          L`sec-butyl alcohol`,
        ],
        "B",
        {
          A: L`The hydroxyl group is not on carbon $1$ of the butane chain.`,
          C: L`For the principal alcohol group, the suffix $-ol$ is used rather than treating $\mathrm{-OH}$ as a hydroxy substituent.`,
          D: L`This is a common name, not the IUPAC name asked for.`,
        },
        [
          L`Choose the longest chain containing $\mathrm{-OH}$.`,
          L`Number to give $\mathrm{-OH}$ the lower locant.`,
          L`The four-carbon parent is butane and $\mathrm{-OH}$ is on carbon $2$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The parent chain is butane and the hydroxyl group gets locant $2$.`,
            math: L`\mathrm{CH_3CH(OH)CH_2CH_3}=\text{butan-2-ol}`,
          },
        ],
      ),
      mc(
        L`The IUPAC name of $\mathrm{CH_3OCH_2CH_3}$ is`,
        2,
        ["iupac_nomenclature", "ethers"],
        [
          L`methoxyethane`,
          L`ethoxymethane`,
          L`ethyl methyl ether`,
          L`propan-$2$-ol`,
        ],
        "A",
        {
          B: L`The longer alkyl group is taken as the parent chain, so the compound is named as a methoxy derivative of ethane.`,
          C: L`Ethyl methyl ether is a common name, not the IUPAC name asked for.`,
          D: L`The compound is an ether, not an alcohol.`,
        },
        [
          L`For simple ethers, name the smaller group as alkoxy.`,
          L`The longer carbon chain is ethane.`,
          L`The $\mathrm{CH_3O-}$ group is methoxy.`,
        ],
        [
          {
            step: 1,
            explanation: L`The ethyl part is the parent chain and $\mathrm{CH_3O-}$ is the methoxy substituent.`,
            math: L`\mathrm{CH_3OCH_2CH_3}=\text{methoxyethane}`,
          },
        ],
      ),
      mc(
        L`Among compounds of comparable molar mass, alcohols generally have higher boiling points than ethers because alcohols`,
        2,
        ["hydrogen_bonding", "physical_properties"],
        [
          L`form intermolecular hydrogen bonds`,
          L`are always ionic solids`,
          L`lack polar bonds`,
          L`are less associated than ethers`,
        ],
        "A",
        {
          B: L`Most simple alcohols are covalent molecular compounds, not ionic solids.`,
          C: L`The $\mathrm{O-H}$ and $\mathrm{C-O}$ bonds are polar.`,
          D: L`Alcohols are more associated because of hydrogen bonding.`,
        },
        [
          L`Compare the functional groups of alcohols and ethers.`,
          L`Alcohols have an $\mathrm{O-H}$ bond.`,
          L`The $\mathrm{O-H}$ bond enables intermolecular hydrogen bonding.`,
        ],
        [
          {
            step: 1,
            explanation: L`Alcohol molecules can form intermolecular hydrogen bonds through the $\mathrm{O-H}$ group, increasing boiling point relative to comparable ethers.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): Phenol is more acidic than cyclohexanol. Reason (R): Phenoxide ion is resonance stabilised, whereas cyclohexoxide ion is not similarly stabilised.`,
        3,
        ["assertion_reason", "phenol_acidity", "resonance"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The resonance stabilisation of phenoxide is exactly the reason phenol is more acidic.`,
          C: L`The reason is true: phenoxide delocalises negative charge over the aromatic ring.`,
          D: L`The assertion is true; phenol is more acidic than cyclohexanol.`,
        },
        [
          L`Compare the conjugate bases.`,
          L`A more stable conjugate base means a stronger acid.`,
          L`Phenoxide is resonance stabilised.`,
        ],
        [
          {
            step: 1,
            explanation: L`Both statements are true. Resonance stabilisation of phenoxide ion makes phenol more acidic than cyclohexanol.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Give the IUPAC name of $\mathrm{HOCH_2CH_2OH}$.`,
        1,
        ["iupac_nomenclature", "polyhydric_alcohols"],
        parts([["a", L`Name the compound.`, 1]]),
        [
          L`The parent chain has two carbon atoms.`,
          L`Both carbons carry hydroxyl groups.`,
          L`Use the suffix diol with locants $1$ and $2$.`,
        ],
        [
          {
            part: "a",
            explanation: L`The compound is ethane-$1,2$-diol.`,
          },
        ],
        [
          L`Writing ethanol and missing the second $\mathrm{-OH}$ group.`,
          L`Omitting the locants for the two hydroxyl groups.`,
        ],
      ),
      frq(
        "saq",
        L`Classify the following as primary, secondary or tertiary alcohols: $\mathrm{CH_3CH_2OH}$, $\mathrm{(CH_3)_2CHOH}$ and $\mathrm{(CH_3)_3COH}$.`,
        2,
        ["classification", "primary_secondary_tertiary_alcohols"],
        parts([
          ["a", L`Classify each alcohol.`, 1],
          ["b", L`State the structural basis used for the classification.`, 1],
        ]),
        [
          L`Look at the carbon atom directly bonded to $\mathrm{-OH}$.`,
          L`Count how many carbon groups are attached to that carbon.`,
          L`One, two and three carbon groups correspond to primary, secondary and tertiary alcohols respectively.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{CH_3CH_2OH}$ is primary, $\mathrm{(CH_3)_2CHOH}$ is secondary, and $\mathrm{(CH_3)_3COH}$ is tertiary.`,
          },
          {
            part: "b",
            explanation: L`The classification depends on the number of carbon atoms attached to the carbon bearing the hydroxyl group.`,
          },
        ],
        [
          L`Counting the total number of carbons in the molecule instead of the groups attached to the carbinol carbon.`,
          L`Classifying by the number of hydrogen atoms in the whole molecule.`,
        ],
      ),
      frq(
        "saq",
        L`Methanol, ethanol and butan-$1$-ol are all soluble to different extents in water. Explain the trend as the alkyl chain grows.`,
        2,
        ["solubility", "hydrogen_bonding", "alkyl_chain_effect"],
        parts([
          [
            "a",
            L`What interaction helps low molecular mass alcohols dissolve in water?`,
            1,
          ],
          [
            "b",
            L`Why does water solubility decrease as the alkyl chain grows?`,
            1,
          ],
        ]),
        [
          L`The $\mathrm{-OH}$ group can hydrogen bond with water.`,
          L`The hydrocarbon part is non-polar.`,
          L`A larger non-polar part reduces the relative effect of the hydroxyl group.`,
        ],
        [
          {
            part: "a",
            explanation: L`The hydroxyl group forms hydrogen bonds with water molecules, so low molecular mass alcohols dissolve well.`,
          },
          {
            part: "b",
            explanation: L`As the alkyl chain grows, the non-polar hydrocarbon part becomes larger and reduces water solubility.`,
          },
        ],
        [
          L`Saying solubility always increases with molar mass.`,
          L`Mentioning polarity without explaining the competing non-polar alkyl chain.`,
        ],
      ),
      frq(
        "laq",
        L`A student compares propan-$1$-ol, methoxyethane and phenol. Use structure to answer the following.`,
        3,
        ["structure_property_comparison", "alcohols", "ethers", "phenols"],
        parts([
          ["a", L`Which compound is an ether?`, 1],
          [
            "b",
            L`Which of propan-$1$-ol and methoxyethane has the higher boiling point, and why?`,
            1,
          ],
          [
            "c",
            L`Which of propan-$1$-ol and phenol is more acidic, and why?`,
            1,
          ],
        ]),
        [
          L`An ether has a $\mathrm{C-O-C}$ linkage.`,
          L`Only the alcohol has an $\mathrm{O-H}$ bond for self-association.`,
          L`Compare the stability of alkoxide and phenoxide ions.`,
        ],
        [
          {
            part: "a",
            explanation: L`Methoxyethane is the ether because it contains the $\mathrm{C-O-C}$ linkage.`,
          },
          {
            part: "b",
            explanation: L`Propan-$1$-ol has the higher boiling point because it forms intermolecular hydrogen bonds; methoxyethane cannot donate hydrogen bonds to itself.`,
          },
          {
            part: "c",
            explanation: L`Phenol is more acidic because phenoxide ion is resonance stabilised, while propoxide ion is not.`,
          },
        ],
        [
          L`Treating all oxygen-containing compounds as equally hydrogen bonded.`,
          L`Comparing acidity from molecular mass rather than conjugate-base stability.`,
        ],
      ),
      frq(
        "case",
        L`Four unlabelled bottles contain methanol, propan-$2$-ol, phenol and methoxyethane. A student first sorts them by functional group and then plans simple reactions.`,
        3,
        ["case_based", "classification", "functional_group_reactivity"],
        parts([
          ["a", L`Which bottle contains an ether?`, 1],
          ["b", L`Which compound is a secondary alcohol?`, 1],
          [
            "c",
            L`Which compound is expected to be most acidic among the four, and why?`,
            1,
          ],
        ]),
        [
          L`Identify the $\mathrm{C-O-C}$ compound.`,
          L`For alcohol class, check the carbon bearing $\mathrm{-OH}$.`,
          L`Phenol forms a resonance-stabilised conjugate base.`,
        ],
        [
          {
            part: "a",
            explanation: L`Methoxyethane is the ether.`,
          },
          {
            part: "b",
            explanation: L`Propan-$2$-ol is a secondary alcohol because the carbon bearing $\mathrm{-OH}$ is attached to two carbon groups.`,
          },
          {
            part: "c",
            explanation: L`Phenol is most acidic because phenoxide ion is resonance stabilised.`,
          },
        ],
        [
          L`Calling methanol an ether because it contains oxygen.`,
          L`Calling propan-$2$-ol primary by counting from the end of the chain only.`,
        ],
      ),
    ],
  },
  {
    topicCode: "7.2",
    title: "Preparation of Alcohols and Phenols",
    subtopic:
      "Select conditions for preparing alcohols from alkenes and carbonyl compounds, and phenols from haloarenes, diazonium salts and cumene.",
    mc: [
      mc(
        L`Acid-catalysed hydration of propene gives mainly`,
        2,
        ["alkene_hydration", "markovnikov_addition"],
        [L`propan-$2$-ol`, L`propan-$1$-ol`, L`propanal`, L`propyne`],
        "A",
        {
          B: L`Acid-catalysed hydration follows Markovnikov addition, so $\mathrm{-OH}$ goes to the more substituted carbon.`,
          C: L`Hydration of propene under these conditions gives an alcohol, not an aldehyde.`,
          D: L`The reaction adds water; it does not form an alkyne.`,
        },
        [
          L`Use Markovnikov orientation.`,
          L`The more stable carbocation is secondary.`,
          L`The final alcohol has $\mathrm{-OH}$ on carbon $2$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Protonation gives the more stable secondary carbocation, followed by attack of water and deprotonation to form propan-$2$-ol.`,
          },
        ],
      ),
      mc(
        L`To convert propene into propan-$1$-ol as the major product, the best reagent set is`,
        3,
        ["hydroboration_oxidation", "anti_markovnikov_alcohol"],
        [
          L`$\mathrm{BH_3}$ followed by $\mathrm{H_2O_2/OH^-}$`,
          L`dilute $\mathrm{H_2SO_4}$ and water`,
          L`$\mathrm{HBr}$ in peroxide`,
          L`cold alkaline $\mathrm{KMnO_4}$ only`,
        ],
        "A",
        {
          B: L`Acid-catalysed hydration gives Markovnikov propan-$2$-ol.`,
          C: L`This gives an alkyl bromide, not an alcohol.`,
          D: L`Cold alkaline permanganate gives a vicinal diol, not propan-$1$-ol.`,
        },
        [
          L`The target alcohol is anti-Markovnikov relative to propene.`,
          L`Hydroboration-oxidation gives anti-Markovnikov hydration.`,
          L`Use borane followed by alkaline hydrogen peroxide.`,
        ],
        [
          {
            step: 1,
            explanation: L`Hydroboration-oxidation converts propene into propan-$1$-ol with anti-Markovnikov placement of $\mathrm{-OH}$.`,
            math: L`\mathrm{CH_3CH=CH_2 \xrightarrow[2.\ H_2O_2/OH^-]{1.\ BH_3} CH_3CH_2CH_2OH}`,
          },
        ],
      ),
      mc(
        L`Reduction of propanone with $\mathrm{NaBH_4}$ gives`,
        2,
        ["carbonyl_reduction", "secondary_alcohol"],
        [L`propan-$2$-ol`, L`propan-$1$-ol`, L`propanoic acid`, L`propanal`],
        "A",
        {
          B: L`Reduction of a ketone gives a secondary alcohol, not a primary alcohol.`,
          C: L`This would be an oxidation product, not a reduction product.`,
          D: L`Propanal is an aldehyde, not the reduction product of propanone.`,
        },
        [
          L`Identify propanone as a ketone.`,
          L`Ketones reduce to secondary alcohols.`,
          L`The carbonyl carbon becomes the $\mathrm{-OH}$-bearing carbon.`,
        ],
        [
          {
            step: 1,
            explanation: L`Propanone is a ketone, and reduction with $\mathrm{NaBH_4}$ gives the corresponding secondary alcohol, propan-$2$-ol.`,
          },
        ],
      ),
      mc(
        L`$\mathrm{CH_3MgBr}$ reacts with formaldehyde followed by hydrolysis. The major organic product is`,
        3,
        ["grignard_reagent", "alcohol_preparation", "formaldehyde"],
        [L`ethanol`, L`propan-$2$-ol`, L`methanol`, L`ethanoic acid`],
        "A",
        {
          B: L`A Grignard reagent with an aldehyde other than formaldehyde can give a secondary alcohol; formaldehyde gives a primary alcohol with one extra carbon.`,
          C: L`The methyl group from the Grignard reagent is added to formaldehyde, so the product has two carbons.`,
          D: L`Acid is not formed by simple Grignard addition to formaldehyde followed by hydrolysis.`,
        },
        [
          L`Formaldehyde has one carbon.`,
          L`The Grignard methyl group adds one more carbon.`,
          L`Hydrolysis gives a primary alcohol with two carbons.`,
        ],
        [
          {
            step: 1,
            explanation: L`Addition of $\mathrm{CH_3^-}$ equivalent to formaldehyde followed by hydrolysis gives ethanol.`,
            math: L`\mathrm{HCHO + CH_3MgBr \xrightarrow{H_3O^+} CH_3CH_2OH}`,
          },
        ],
      ),
      mc(
        L`Benzene diazonium chloride gives phenol most directly on treatment with`,
        2,
        ["phenol_preparation", "diazonium_salt"],
        [
          L`warm water`,
          L`dry ether and magnesium`,
          L`anhydrous $\mathrm{AlCl_3}$ only`,
          L`$\mathrm{NaI}$ in dry acetone`,
        ],
        "A",
        {
          B: L`Those conditions are used for Grignard formation from halides, not for diazonium hydrolysis.`,
          C: L`A Lewis acid alone does not convert diazonium salt into phenol.`,
          D: L`This is Finkelstein-type halogen exchange for alkyl halides.`,
        },
        [
          L`Diazonium salts can be hydrolysed.`,
          L`The leaving group is nitrogen gas.`,
          L`Water supplies the hydroxyl group.`,
        ],
        [
          {
            step: 1,
            explanation: L`Warm water hydrolyses benzene diazonium chloride to phenol with liberation of nitrogen gas.`,
            math: L`\mathrm{C_6H_5N_2^+Cl^- + H_2O \rightarrow C_6H_5OH + N_2 + HCl}`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`In the chlorobenzene route to phenol, what salt is formed when chlorobenzene is heated with aqueous $\mathrm{NaOH}$ under high temperature and pressure?`,
        2,
        ["phenol_preparation", "chlorobenzene_route"],
        parts([["a", L`Name the salt formed before acidification.`, 1]]),
        [
          L`This is the high-temperature phenol preparation from an aryl halide.`,
          L`The product before acidification is an ionic phenoxide salt.`,
          L`Acidification of that salt gives phenol.`,
        ],
        [
          {
            part: "a",
            explanation: L`Sodium phenoxide, $\mathrm{C_6H_5ONa}$, is formed; acidification then gives phenol.`,
          },
        ],
        [
          L`Writing phenol directly and missing the sodium phenoxide intermediate.`,
          L`Treating chlorobenzene like an ordinary alkyl halide under mild conditions.`,
        ],
      ),
      frq(
        "saq",
        L`Predict the alcohol obtained by reducing ethanal and propanone separately with $\mathrm{NaBH_4}$.`,
        2,
        ["carbonyl_reduction", "primary_secondary_alcohols"],
        parts([
          ["a", L`Product from ethanal.`, 1],
          ["b", L`Product from propanone.`, 1],
        ]),
        [
          L`Aldehydes reduce to primary alcohols.`,
          L`Ketones reduce to secondary alcohols.`,
          L`Keep the carbon skeleton unchanged.`,
        ],
        [
          {
            part: "a",
            explanation: L`Ethanal reduces to ethanol.`,
            math: L`\mathrm{CH_3CHO \xrightarrow{NaBH_4} CH_3CH_2OH}`,
          },
          {
            part: "b",
            explanation: L`Propanone reduces to propan-$2$-ol.`,
            math: L`\mathrm{CH_3COCH_3 \xrightarrow{NaBH_4} CH_3CH(OH)CH_3}`,
          },
        ],
        [
          L`Oxidising the carbonyl compound instead of reducing it.`,
          L`Changing the number of carbon atoms in the product.`,
        ],
      ),
      frq(
        "saq",
        L`Phenol is prepared industrially from cumene. State the key oxidation product and the two final products after acid cleavage.`,
        2,
        ["cumene_process", "phenol_preparation"],
        parts([
          ["a", L`Name the intermediate formed by oxidation of cumene.`, 1],
          ["b", L`Name the two final products after acidic cleavage.`, 1],
        ]),
        [
          L`Cumene is isopropylbenzene.`,
          L`Air oxidation gives a hydroperoxide.`,
          L`Acid cleavage gives phenol and a ketone.`,
        ],
        [
          {
            part: "a",
            explanation: L`Oxidation of cumene gives cumene hydroperoxide.`,
          },
          {
            part: "b",
            explanation: L`Acidic cleavage of cumene hydroperoxide gives phenol and acetone.`,
          },
        ],
        [
          L`Writing benzaldehyde as the co-product.`,
          L`Stopping at cumene hydroperoxide and not giving the cleavage products.`,
        ],
      ),
      frq(
        "laq",
        L`Plan preparations for the following targets, giving reagent conditions: ethanol from ethanal, $\mathrm{2}$-methylpropan-$2$-ol from propanone, and phenol from cumene.`,
        4,
        ["reaction_planning", "alcohol_preparation", "phenol_preparation"],
        parts([
          ["a", L`Route to ethanol from ethanal.`, 1],
          [
            "b",
            L`Route to $\mathrm{2}$-methylpropan-$2$-ol from propanone.`,
            1,
          ],
          ["c", L`Route to phenol from cumene.`, 1],
        ]),
        [
          L`Aldehydes reduce to primary alcohols.`,
          L`A methyl Grignard reagent adds to propanone and hydrolysis gives a tertiary alcohol.`,
          L`Cumene is oxidised to hydroperoxide and then cleaved in acid.`,
        ],
        [
          {
            part: "a",
            explanation: L`Reduce ethanal with $\mathrm{NaBH_4}$, $\mathrm{LiAlH_4}$ or catalytic hydrogenation to obtain ethanol.`,
            math: L`\mathrm{CH_3CHO \xrightarrow{[H]} CH_3CH_2OH}`,
          },
          {
            part: "b",
            explanation: L`React propanone with methylmagnesium bromide in dry ether, followed by hydrolysis, to obtain $\mathrm{2}$-methylpropan-$2$-ol.`,
            math: L`\mathrm{CH_3COCH_3 \xrightarrow[2.\ H_3O^+]{1.\ CH_3MgBr} (CH_3)_3COH}`,
          },
          {
            part: "c",
            explanation: L`Oxidise cumene to cumene hydroperoxide and cleave it with acid to obtain phenol along with acetone.`,
          },
        ],
        [
          L`Using a Grignard reagent in water instead of dry ether followed by hydrolysis.`,
          L`Stopping the cumene route at cumene hydroperoxide without acid cleavage.`,
        ],
      ),
      frq(
        "case",
        L`A student needs two alcohols from the same alkene, propene. One route must give the Markovnikov alcohol and the other must give the anti-Markovnikov alcohol.`,
        3,
        ["case_based", "regioselectivity", "alkene_to_alcohol"],
        parts([
          ["a", L`Which product is obtained by acid-catalysed hydration?`, 1],
          ["b", L`Which product is obtained by hydroboration-oxidation?`, 1],
          [
            "c",
            L`Why do the two routes give different positions of $\mathrm{-OH}$?`,
            1,
          ],
        ]),
        [
          L`Acid hydration proceeds through the more stable carbocation.`,
          L`Hydroboration-oxidation gives anti-Markovnikov hydration.`,
          L`The difference is regiochemistry, not molecular formula.`,
        ],
        [
          {
            part: "a",
            explanation: L`Acid-catalysed hydration gives propan-$2$-ol.`,
          },
          {
            part: "b",
            explanation: L`Hydroboration-oxidation gives propan-$1$-ol.`,
          },
          {
            part: "c",
            explanation: L`Acid hydration follows Markovnikov addition through the more stable carbocation, while hydroboration-oxidation places $\mathrm{-OH}$ at the less substituted carbon.`,
          },
        ],
        [
          L`Writing the same alcohol for both routes.`,
          L`Explaining only by molecular formula and ignoring regioselectivity.`,
        ],
      ),
    ],
  },
  {
    topicCode: "7.3",
    title: "Reactions of Alcohols and Commercial Alcohols",
    subtopic:
      "Use alcohol reactions with metals, hydrogen halides, oxidising agents and dehydrating agents, including methanol and ethanol safety.",
    mc: [
      mc(
        L`Ethanol reacts with sodium metal to liberate`,
        1,
        ["alcohol_reaction", "sodium_metal"],
        [L`hydrogen gas`, L`chlorine gas`, L`carbon dioxide`, L`nitrogen gas`],
        "A",
        {
          B: L`No chloride source is present.`,
          C: L`Carbon dioxide is not released in the sodium-alcohol reaction.`,
          D: L`Nitrogen is not present in ethanol or sodium.`,
        },
        [
          L`Alcohols have a weakly acidic $\mathrm{O-H}$ hydrogen.`,
          L`Sodium forms an alkoxide.`,
          L`The gas evolved is $\mathrm{H_2}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Sodium reacts with ethanol to form sodium ethoxide and hydrogen gas.`,
            math: L`\mathrm{2C_2H_5OH+2Na \rightarrow 2C_2H_5ONa+H_2}`,
          },
        ],
      ),
      mc(
        L`An alcohol gives immediate turbidity with Lucas reagent at room temperature. The alcohol is most likely`,
        2,
        ["lucas_test", "alcohol_classification"],
        [L`tertiary`, L`primary`, L`vinylic`, L`phenolic`],
        "A",
        {
          B: L`Primary alcohols do not usually give immediate turbidity at room temperature.`,
          C: L`Lucas test is used for ordinary primary, secondary and tertiary alcohols, not as a vinylic alcohol classification test.`,
          D: L`Phenols do not behave like simple alcohols in the Lucas test.`,
        },
        [
          L`Lucas reagent is concentrated $\mathrm{HCl}$ with anhydrous $\mathrm{ZnCl_2}$.`,
          L`Turbidity comes from formation of an insoluble alkyl chloride.`,
          L`Tertiary alcohols react fastest.`,
        ],
        [
          {
            step: 1,
            explanation: L`Tertiary alcohols form stable carbocations and give immediate turbidity with Lucas reagent.`,
          },
        ],
      ),
      mc(
        L`Heating butan-$2$-ol with concentrated $\mathrm{H_2SO_4}$ mainly gives`,
        3,
        ["dehydration", "saytzeff_rule"],
        [L`but-$2$-ene`, L`butanone`, L`butanoic acid`, L`butane-$1,2$-diol`],
        "A",
        {
          B: L`Butanone is an oxidation product, not the main dehydration product.`,
          C: L`A carboxylic acid would require stronger oxidation.`,
          D: L`A diol is not formed by acid-catalysed dehydration.`,
        },
        [
          L`Concentrated acid and heat dehydrate alcohols.`,
          L`Eliminate water to form an alkene.`,
          L`The more substituted alkene is the major product.`,
        ],
        [
          {
            step: 1,
            explanation: L`Dehydration of butan-$2$-ol follows Saytzeff rule, so the more substituted alkene, but-$2$-ene, is major.`,
          },
        ],
      ),
      mc(
        L`Complete oxidation of ethanol with acidified $\mathrm{K_2Cr_2O_7}$ gives mainly`,
        2,
        ["oxidation", "primary_alcohol"],
        [L`ethanoic acid`, L`ethene`, L`ethoxyethane`, L`methanal`],
        "A",
        {
          B: L`Ethene is formed by dehydration, not complete oxidation.`,
          C: L`Ethoxyethane can be formed by acid-catalysed dehydration under different conditions.`,
          D: L`Methanal has fewer carbon atoms and is not the complete oxidation product of ethanol.`,
        },
        [
          L`Ethanol is a primary alcohol.`,
          L`Strong oxidation of a primary alcohol can pass through aldehyde to acid.`,
          L`The two-carbon acid is ethanoic acid.`,
        ],
        [
          {
            step: 1,
            explanation: L`Acidified dichromate oxidises ethanol to ethanoic acid under complete oxidation conditions.`,
          },
        ],
      ),
      mc(
        L`Methanol poisoning is dangerous partly because methanol is oxidised in the body to`,
        2,
        ["commercial_alcohols", "methanol_toxicity"],
        [
          L`methanal and methanoic acid`,
          L`ethanol and ethanoic acid`,
          L`phenol and acetone`,
          L`diethyl ether and water`,
        ],
        "A",
        {
          B: L`Methanol has one carbon, so ethanol and ethanoic acid are not its oxidation products.`,
          C: L`Phenol and acetone are associated with aromatic/cumene chemistry, not methanol metabolism.`,
          D: L`Ether formation is not the toxic oxidation pathway.`,
        },
        [
          L`Oxidation of a primary alcohol first gives an aldehyde.`,
          L`Methanol has one carbon.`,
          L`Its oxidation products are formaldehyde and formic acid.`,
        ],
        [
          {
            step: 1,
            explanation: L`Methanol can be oxidised to methanal and then methanoic acid, which are responsible for serious toxicity.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`What gas is evolved when ethanol reacts with sodium metal?`,
        1,
        ["alcohol_reaction", "sodium_metal"],
        parts([["a", L`Name the gas.`, 1]]),
        [
          L`Sodium replaces the acidic hydrogen of $\mathrm{-OH}$.`,
          L`Two hydrogen atoms combine.`,
          L`The gas is dihydrogen.`,
        ],
        [
          {
            part: "a",
            explanation: L`Hydrogen gas, $\mathrm{H_2}$, is evolved.`,
          },
        ],
        [
          L`Writing oxygen because the molecule contains oxygen.`,
          L`Writing carbon dioxide without any carbonate or combustion reaction.`,
        ],
      ),
      frq(
        "saq",
        L`Give the expected Lucas test observation for $\mathrm{2}$-methylpropan-$2$-ol and propan-$1$-ol at room temperature, and explain the difference.`,
        2,
        ["lucas_test", "carbocation_stability"],
        parts([
          ["a", L`Observation for $\mathrm{2}$-methylpropan-$2$-ol.`, 1],
          [
            "b",
            L`Observation for propan-$1$-ol with reason for the contrast.`,
            1,
          ],
        ]),
        [
          L`$\mathrm{2}$-methylpropan-$2$-ol is tertiary.`,
          L`Propan-$1$-ol is primary.`,
          L`Tertiary alcohols form alkyl chlorides faster in Lucas reagent.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{2}$-methylpropan-$2$-ol gives immediate turbidity because it forms the tertiary chloride rapidly.`,
          },
          {
            part: "b",
            explanation: L`Propan-$1$-ol gives no immediate turbidity at room temperature because primary alcohols react much more slowly; they do not form stable carbocations easily.`,
          },
        ],
        [
          L`Reversing the order by assuming smaller molecules always react faster.`,
          L`Not connecting turbidity with alkyl chloride formation.`,
        ],
      ),
      frq(
        "saq",
        L`How can ethanol be distinguished from methanol using the iodoform test?`,
        2,
        ["iodoform_test", "ethanol", "methanol"],
        parts([
          ["a", L`State the observation for ethanol.`, 1],
          [
            "b",
            L`State the observation for methanol and the structural reason.`,
            1,
          ],
        ]),
        [
          L`Iodoform test is positive for $\mathrm{CH_3CO-}$ or oxidisable $\mathrm{CH_3CH(OH)-}$ groups.`,
          L`Ethanol is oxidised to ethanal under the test conditions.`,
          L`Methanol lacks the required methyl carbinol or methyl carbonyl arrangement.`,
        ],
        [
          {
            part: "a",
            explanation: L`Ethanol gives a yellow precipitate of iodoform, $\mathrm{CHI_3}$.`,
          },
          {
            part: "b",
            explanation: L`Methanol does not give the yellow iodoform precipitate because it lacks the required $\mathrm{CH_3CH(OH)-}$ or $\mathrm{CH_3CO-}$ unit.`,
          },
        ],
        [
          L`Assuming every alcohol gives iodoform test.`,
          L`Ignoring the structural requirement of the test.`,
        ],
      ),
      frq(
        "laq",
        L`Three isomeric alcohols A, B and C have molecular formula $\mathrm{C_4H_{10}O}$. A gives immediate turbidity with Lucas reagent and resists ordinary oxidation. B gives a yellow iodoform precipitate and is oxidised to a ketone. C gives no immediate Lucas turbidity, gives no iodoform precipitate, and is oxidised to butanoic acid. Identify A, B and C.`,
        4,
        [
          "multi_clue_identification",
          "lucas_test",
          "iodoform_test",
          "oxidation",
        ],
        parts([
          ["a", L`Identify A and give the Lucas-test reason.`, 1],
          ["b", L`Identify B and give the iodoform/oxidation reason.`, 1],
          ["c", L`Identify C and give the oxidation reason.`, 1],
        ]),
        [
          L`Immediate Lucas turbidity points to a tertiary alcohol.`,
          L`A positive iodoform test needs a $\mathrm{CH_3CH(OH)-}$ unit for alcohols.`,
          L`Oxidation to butanoic acid points to a straight-chain primary alcohol.`,
        ],
        [
          {
            part: "a",
            explanation: L`A is $\mathrm{2}$-methylpropan-$2$-ol because it is the tertiary $\mathrm{C_4H_{10}O}$ alcohol and gives immediate Lucas turbidity.`,
          },
          {
            part: "b",
            explanation: L`B is butan-$2$-ol because it contains the $\mathrm{CH_3CH(OH)-}$ group, gives iodoform test, and oxidises to butanone.`,
          },
          {
            part: "c",
            explanation: L`C is butan-$1$-ol because it is a primary alcohol that does not give the iodoform test and oxidises to butanoic acid.`,
          },
        ],
        [
          L`Assuming every secondary alcohol gives the same oxidation product or every alcohol gives iodoform test.`,
          L`Missing that immediate Lucas turbidity identifies the tertiary alcohol.`,
        ],
      ),
      frq(
        "case",
        L`A school laboratory prepares ethanol by fermentation for a demonstration and stores methanol separately with a poison warning label.`,
        3,
        ["case_based", "ethanol", "methanol", "commercial_alcohols"],
        parts([
          ["a", L`Name the gas evolved during fermentation of sugars.`, 1],
          ["b", L`Why is ethanol often denatured for industrial use?`, 1],
          ["c", L`Why is methanol labelled highly poisonous?`, 1],
        ]),
        [
          L`Fermentation produces ethanol and a gas.`,
          L`Denatured alcohol is made unfit for drinking.`,
          L`Methanol forms toxic oxidation products in the body.`,
        ],
        [
          {
            part: "a",
            explanation: L`Carbon dioxide is evolved during fermentation of sugars to ethanol.`,
          },
          {
            part: "b",
            explanation: L`Ethanol is denatured by adding poisonous or bad-tasting substances so that industrial alcohol is unfit for drinking.`,
          },
          {
            part: "c",
            explanation: L`Methanol is highly poisonous because it can be oxidised to methanal and methanoic acid, which can damage the optic nerve and other tissues.`,
          },
        ],
        [
          L`Writing hydrogen gas for fermentation.`,
          L`Treating methanol and ethanol as equally safe because both are alcohols.`,
        ],
      ),
    ],
  },
  {
    topicCode: "7.4",
    title: "Phenols: Acidity and Ring Reactions",
    subtopic:
      "Use phenoxide stability, substituent effects and electrophilic substitution reactions of phenols.",
    mc: [
      mc(
        L`Phenol is more acidic than ethanol mainly because`,
        2,
        ["phenol_acidity", "resonance"],
        [
          L`phenoxide ion is resonance stabilised`,
          L`ethoxide ion is resonance stabilised more strongly`,
          L`phenol contains more hydrogen atoms`,
          L`ethanol is aromatic`,
        ],
        "A",
        {
          B: L`Ethoxide ion does not have resonance stabilisation comparable to phenoxide.`,
          C: L`Acidity depends on ease of losing $\mathrm{H^+}$ and conjugate-base stability, not total hydrogen count.`,
          D: L`Ethanol is not aromatic.`,
        },
        [
          L`Compare the conjugate bases.`,
          L`Phenoxide delocalises negative charge.`,
          L`A stabilised conjugate base makes the acid stronger.`,
        ],
        [
          {
            step: 1,
            explanation: L`Phenoxide ion is resonance stabilised, whereas ethoxide ion is not, so phenol is more acidic than ethanol.`,
          },
        ],
      ),
      mc(
        L`The strongest acid among the following is`,
        3,
        ["substituent_effects", "phenol_acidity"],
        [L`$p$-nitrophenol`, L`phenol`, L`$p$-cresol`, L`cyclohexanol`],
        "A",
        {
          B: L`Phenol is acidic, but $p$-nitro substitution stabilises phenoxide more strongly.`,
          C: L`A methyl group is electron donating and reduces acidity relative to phenol.`,
          D: L`Cyclohexanol lacks phenoxide-type resonance stabilisation.`,
        },
        [
          L`Electron-withdrawing groups stabilise phenoxide.`,
          L`Electron-donating groups destabilise phenoxide relative to phenol.`,
          L`The nitro group is strongly electron withdrawing.`,
        ],
        [
          {
            step: 1,
            explanation: L`The $p$-nitro group withdraws electron density and stabilises the phenoxide ion, making $p$-nitrophenol the strongest acid listed.`,
          },
        ],
      ),
      mc(
        L`Phenol reacts with bromine water to give a white precipitate of`,
        2,
        ["phenol_reactions", "bromination"],
        [
          L`2,4,6-tribromophenol`,
          L`bromobenzene`,
          L`benzyl bromide`,
          L`$m$-bromophenol only`,
        ],
        "A",
        {
          B: L`Bromobenzene is formed by bromination of benzene under Lewis acid conditions, not phenol with bromine water.`,
          C: L`Benzyl bromide has bromine on a side chain, which phenol does not have here.`,
          D: L`The activating $\mathrm{-OH}$ group directs ortho and para substitution, and bromine water gives tribromination.`,
        },
        [
          L`Phenol activates the ring strongly.`,
          L`The $\mathrm{-OH}$ group directs ortho and para.`,
          L`Bromine water gives substitution at $2$, $4$ and $6$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Phenol gives 2,4,6-tribromophenol as a white precipitate with bromine water.`,
          },
        ],
      ),
      mc(
        L`Kolbe-Schmitt reaction of sodium phenoxide with $\mathrm{CO_2}$ followed by acidification gives mainly`,
        2,
        ["kolbe_schmitt", "salicylic_acid"],
        [L`salicylic acid`, L`benzaldehyde`, L`anisole`, L`cyclohexanol`],
        "A",
        {
          B: L`Benzaldehyde is associated with formylation reactions, not Kolbe-Schmitt carboxylation of phenoxide.`,
          C: L`Anisole is an ether, usually prepared by methylation of phenoxide.`,
          D: L`Cyclohexanol is not an aromatic carboxylation product.`,
        },
        [
          L`Kolbe-Schmitt introduces a carboxyl group into phenoxide.`,
          L`The ortho product is favoured under the usual conditions.`,
          L`The product is $o$-hydroxybenzoic acid.`,
        ],
        [
          {
            step: 1,
            explanation: L`Sodium phenoxide reacts with carbon dioxide under pressure and then acidification to give salicylic acid, $o$-hydroxybenzoic acid.`,
          },
        ],
      ),
      mc(
        L`Reimer-Tiemann reaction of phenol with chloroform and aqueous alkali followed by acidification gives mainly`,
        2,
        ["reimer_tiemann", "salicylaldehyde"],
        [L`salicylaldehyde`, L`benzoic acid`, L`anisole`, L`phenyl acetate`],
        "A",
        {
          B: L`The reaction introduces a formyl group, not a carboxyl group directly.`,
          C: L`Anisole is formed by methylation of phenoxide, not by Reimer-Tiemann reaction.`,
          D: L`Phenyl acetate would require acylation/esterification conditions.`,
        },
        [
          L`Reimer-Tiemann formylates phenol.`,
          L`The formyl group enters mainly at the ortho position.`,
          L`The product is $o$-hydroxybenzaldehyde.`,
        ],
        [
          {
            step: 1,
            explanation: L`Phenol undergoes ortho formylation in the Reimer-Tiemann reaction to give salicylaldehyde.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`What colour is usually observed when neutral $\mathrm{FeCl_3}$ is added to phenol?`,
        1,
        ["phenol_test", "ferric_chloride"],
        parts([["a", L`State the observation.`, 1]]),
        [
          L`Neutral ferric chloride is a common test for phenols.`,
          L`Phenol forms a coloured complex.`,
          L`The characteristic colour is violet.`,
        ],
        [
          {
            part: "a",
            explanation: L`A violet colour is observed.`,
          },
        ],
        [
          L`Writing white precipitate, which is associated with bromination of phenol.`,
          L`Using acidic ferric chloride instead of neutral ferric chloride in the test description.`,
        ],
      ),
      frq(
        "saq",
        L`Explain why phenol dissolves in aqueous $\mathrm{NaOH}$ but does not liberate $\mathrm{CO_2}$ from aqueous $\mathrm{NaHCO_3}$.`,
        2,
        ["phenol_acidity", "acid_base_reactions"],
        parts([
          ["a", L`Why does phenol dissolve in $\mathrm{NaOH}$?`, 1],
          [
            "b",
            L`Why does it not react like a carboxylic acid with $\mathrm{NaHCO_3}$?`,
            1,
          ],
        ]),
        [
          L`Phenol is acidic enough to form sodium phenoxide with strong base.`,
          L`Sodium bicarbonate reacts with acids stronger than carbonic acid.`,
          L`Phenol is weaker than carbonic acid.`,
        ],
        [
          {
            part: "a",
            explanation: L`Phenol reacts with aqueous $\mathrm{NaOH}$ to form water-soluble sodium phenoxide.`,
          },
          {
            part: "b",
            explanation: L`Phenol is weaker than carbonic acid, so it does not displace $\mathrm{CO_2}$ from bicarbonate.`,
          },
        ],
        [
          L`Assuming phenol is as acidic as carboxylic acids.`,
          L`Writing that phenol is completely neutral.`,
        ],
      ),
      frq(
        "saq",
        L`State the major products when phenol is treated separately with dilute nitric acid and with concentrated nitric acid.`,
        2,
        ["phenol_nitration", "electrophilic_substitution"],
        parts([
          ["a", L`Product mixture with dilute $\mathrm{HNO_3}$.`, 1],
          ["b", L`Product with concentrated $\mathrm{HNO_3}$.`, 1],
        ]),
        [
          L`The $\mathrm{-OH}$ group strongly activates the ring.`,
          L`Mild nitration gives ortho and para products.`,
          L`Strong nitration can give trinitration.`,
        ],
        [
          {
            part: "a",
            explanation: L`Dilute nitric acid gives mainly ortho-nitrophenol and para-nitrophenol.`,
          },
          {
            part: "b",
            explanation: L`Concentrated nitric acid gives 2,4,6-trinitrophenol, commonly called picric acid.`,
          },
        ],
        [
          L`Writing only meta-nitrophenol despite $\mathrm{-OH}$ being ortho-para directing.`,
          L`Missing the stronger nitration product with concentrated acid.`,
        ],
      ),
      frq(
        "laq",
        L`Account for the following observations about phenol using structure and electronic effects.`,
        3,
        ["phenol_reactivity", "directive_effect", "acidity"],
        parts([
          [
            "a",
            L`Phenol is more reactive than benzene towards electrophilic substitution.`,
            1,
          ],
          [
            "b",
            L`Electrophiles enter mainly at ortho and para positions in phenol.`,
            1,
          ],
          ["c", L`Phenol is more acidic than cyclohexanol.`, 1],
        ]),
        [
          L`The oxygen lone pair interacts with the aromatic ring.`,
          L`Resonance increases electron density at ortho and para positions.`,
          L`Compare phenoxide and cyclohexoxide ion stability.`,
        ],
        [
          {
            part: "a",
            explanation: L`The $\mathrm{-OH}$ group donates electron density to the ring by resonance, activating phenol towards electrophilic substitution.`,
          },
          {
            part: "b",
            explanation: L`Resonance donation increases electron density especially at ortho and para positions, so phenol is ortho-para directing.`,
          },
          {
            part: "c",
            explanation: L`Phenoxide ion is resonance stabilised, while cyclohexoxide ion is not similarly stabilised, so phenol is more acidic.`,
          },
        ],
        [
          L`Calling $\mathrm{-OH}$ meta-directing because oxygen is electronegative.`,
          L`Explaining acidity only from molecular mass instead of conjugate-base stability.`,
        ],
      ),
      frq(
        "case",
        L`Three solids are labelled X, Y and Z. X is phenol, Y is $p$-nitrophenol and Z is $p$-cresol. A student compares their acidity before choosing bases for separation.`,
        3,
        ["case_based", "phenol_acidity", "substituent_effects"],
        parts([
          ["a", L`Which is the strongest acid?`, 1],
          ["b", L`Which is less acidic than phenol?`, 1],
          ["c", L`Explain the trend using substituent effects.`, 1],
        ]),
        [
          L`Nitro is electron withdrawing.`,
          L`Methyl is electron donating.`,
          L`Stabilisation of phenoxide increases acidity.`,
        ],
        [
          {
            part: "a",
            explanation: L`$p$-Nitrophenol is the strongest acid among the three.`,
          },
          {
            part: "b",
            explanation: L`$p$-Cresol is less acidic than phenol.`,
          },
          {
            part: "c",
            explanation: L`The electron-withdrawing nitro group stabilises the phenoxide ion and increases acidity, while the electron-donating methyl group destabilises it relative to phenol.`,
          },
        ],
        [
          L`Assuming every ring substituent increases acidity.`,
          L`Comparing only molecular masses and ignoring electronic effects.`,
        ],
      ),
    ],
  },
  {
    topicCode: "7.5",
    title: "Ethers: Williamson Synthesis, Cleavage and Aromatic Reactions",
    subtopic:
      "Plan ether synthesis, predict cleavage with hydrogen halides, and use the directing effect of alkoxy groups in aryl ethers.",
    mc: [
      mc(
        L`The best Williamson route for preparing anisole is`,
        2,
        ["williamson_synthesis", "anisole"],
        [
          L`sodium phenoxide with methyl iodide`,
          L`chlorobenzene with sodium methoxide at room temperature`,
          L`phenol with methane gas`,
          L`benzene with methanol only`,
        ],
        "A",
        {
          B: L`Aryl halides do not undergo ordinary $\mathrm{S_N2}$ displacement with methoxide at room temperature.`,
          C: L`Methane is not an alkylating reagent in Williamson synthesis.`,
          D: L`Benzene and methanol alone do not form anisole directly.`,
        },
        [
          L`Williamson synthesis uses an alkoxide or phenoxide ion.`,
          L`The alkyl halide should be suitable for $\mathrm{S_N2}$.`,
          L`Methyl iodide is an excellent methylating agent.`,
        ],
        [
          {
            step: 1,
            explanation: L`Sodium phenoxide attacks methyl iodide by $\mathrm{S_N2}$ to give anisole.`,
            math: L`\mathrm{C_6H_5ONa+CH_3I \rightarrow C_6H_5OCH_3+NaI}`,
          },
        ],
      ),
      mc(
        L`Attempted Williamson synthesis using sodium ethoxide and tert-butyl bromide gives poor ether yield mainly because tert-butyl bromide`,
        3,
        ["williamson_limitations", "elimination"],
        [
          L`undergoes elimination readily with strong base`,
          L`is unable to form any carbon-halogen bond`,
          L`is an aryl halide`,
          L`contains no beta hydrogen`,
        ],
        "A",
        {
          B: L`Tert-butyl bromide already contains a carbon-bromine bond.`,
          C: L`Tert-butyl bromide is an alkyl halide, not an aryl halide.`,
          D: L`Tert-butyl bromide has beta hydrogens on the methyl groups.`,
        },
        [
          L`Williamson synthesis works best with primary alkyl halides.`,
          L`Tertiary halides are crowded for $\mathrm{S_N2}$.`,
          L`Strong alkoxide base promotes elimination.`,
        ],
        [
          {
            step: 1,
            explanation: L`Tertiary alkyl halides are too hindered for efficient $\mathrm{S_N2}$ and tend to undergo elimination with strong alkoxide bases.`,
          },
        ],
      ),
      mc(
        L`Anisole reacts with excess $\mathrm{HI}$ on heating to give mainly`,
        3,
        ["ether_cleavage", "anisole", "hi"],
        [
          L`phenol and methyl iodide`,
          L`iodobenzene and methanol`,
          L`benzene and iodoform`,
          L`phenyl acetate and water`,
        ],
        "A",
        {
          B: L`The aryl $\mathrm{C-O}$ bond is not cleaved easily; cleavage occurs at the methyl-oxygen bond.`,
          C: L`Iodoform is not produced in ether cleavage of anisole.`,
          D: L`No acetylating reagent is present.`,
        },
        [
          L`Aryl-oxygen bonds have partial double-bond character.`,
          L`The alkyl-oxygen bond is cleaved by iodide.`,
          L`Methyl iodide and phenol are formed.`,
        ],
        [
          {
            step: 1,
            explanation: L`In anisole, the aryl $\mathrm{C-O}$ bond is strengthened by resonance, so $\mathrm{HI}$ cleaves the methyl-oxygen bond to give phenol and methyl iodide.`,
          },
        ],
      ),
      mc(
        L`Diethyl ether does not react with sodium metal as ethanol does because diethyl ether`,
        2,
        ["ether_properties", "absence_of_oh"],
        [
          L`has no acidic $\mathrm{O-H}$ hydrogen`,
          L`has two acidic $\mathrm{O-H}$ bonds`,
          L`is an ionic salt`,
          L`contains a phenoxide ion`,
        ],
        "A",
        {
          B: L`Ethers have no $\mathrm{O-H}$ bond.`,
          C: L`Diethyl ether is a covalent molecular compound.`,
          D: L`Diethyl ether is not a phenoxide salt.`,
        },
        [
          L`Sodium reacts with the acidic hydrogen of alcohols.`,
          L`Check whether ether has an $\mathrm{O-H}$ bond.`,
          L`An ether has a $\mathrm{C-O-C}$ linkage only.`,
        ],
        [
          {
            step: 1,
            explanation: L`Diethyl ether lacks an $\mathrm{O-H}$ bond, so it does not liberate hydrogen with sodium as ethanol does.`,
          },
        ],
      ),
      mc(
        L`Nitration of anisole under controlled conditions gives mainly`,
        2,
        ["anisole_reactions", "ortho_para_directing"],
        [
          L`ortho- and para-nitroanisole`,
          L`only meta-nitroanisole`,
          L`nitromethane and phenol`,
          L`benzaldehyde`,
        ],
        "A",
        {
          B: L`The methoxy group is activating and ortho-para directing.`,
          C: L`The reaction is electrophilic substitution on the aromatic ring, not ether cleavage.`,
          D: L`Benzaldehyde would require formylation/oxidation chemistry, not nitration of anisole.`,
        },
        [
          L`Anisole contains a methoxy group on benzene.`,
          L`$\mathrm{-OCH_3}$ donates electron density by resonance.`,
          L`It directs electrophiles to ortho and para positions.`,
        ],
        [
          {
            step: 1,
            explanation: L`The methoxy group activates the ring and directs nitration mainly to ortho and para positions, giving ortho- and para-nitroanisole.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Give the IUPAC name of anisole, $\mathrm{C_6H_5OCH_3}$.`,
        1,
        ["iupac_nomenclature", "aryl_ethers"],
        parts([["a", L`Name the aryl ether.`, 1]]),
        [
          L`Anisole is a benzene ring bearing a methoxy group.`,
          L`Use benzene as the parent.`,
          L`The substituent is methoxy.`,
        ],
        [
          {
            part: "a",
            explanation: L`The IUPAC name is methoxybenzene.`,
          },
        ],
        [
          L`Writing only the common name anisole when IUPAC name is asked.`,
          L`Calling it methyl phenol instead of an aryl ether.`,
        ],
      ),
      frq(
        "saq",
        L`Why is methyl bromide a better alkyl halide than tert-butyl bromide for a Williamson ether synthesis?`,
        2,
        ["williamson_synthesis", "sn2", "steric_hindrance"],
        parts([
          ["a", L`State the mechanistic reason.`, 1],
          ["b", L`State the side reaction favoured by tert-butyl bromide.`, 1],
        ]),
        [
          L`Williamson synthesis is an $\mathrm{S_N2}$ reaction.`,
          L`Methyl halides are least hindered.`,
          L`Tertiary halides with strong base tend to eliminate.`,
        ],
        [
          {
            part: "a",
            explanation: L`Methyl bromide undergoes $\mathrm{S_N2}$ attack easily because it is unhindered.`,
          },
          {
            part: "b",
            explanation: L`Tert-butyl bromide is sterically hindered and tends to undergo elimination with alkoxide base instead of giving ether cleanly.`,
          },
        ],
        [
          L`Saying tertiary halides are always best because tertiary carbocations are stable, which is not the Williamson mechanism.`,
          L`Not naming elimination as the competing reaction.`,
        ],
      ),
      frq(
        "saq",
        L`Predict the products when ethoxybenzene is heated with excess $\mathrm{HI}$. Explain which bond is cleaved.`,
        2,
        ["ether_cleavage", "aryl_alkyl_ether"],
        parts([
          ["a", L`Give the products.`, 1],
          ["b", L`Explain the bond-cleavage preference.`, 1],
        ]),
        [
          L`Ethoxybenzene is an aryl alkyl ether.`,
          L`The aryl $\mathrm{C-O}$ bond is resonance strengthened.`,
          L`Cleavage occurs at the alkyl-oxygen bond.`,
        ],
        [
          {
            part: "a",
            explanation: L`The products are phenol and ethyl iodide.`,
          },
          {
            part: "b",
            explanation: L`The aryl $\mathrm{C-O}$ bond has partial double-bond character and is difficult to break, so iodide attacks the ethyl side.`,
          },
        ],
        [
          L`Writing iodobenzene as a major product from ordinary ether cleavage.`,
          L`Ignoring the difference between aryl-oxygen and alkyl-oxygen bonds.`,
        ],
      ),
      frq(
        "laq",
        L`Using Williamson synthesis, give suitable reactants for methoxyethane, anisole and ethoxyethane. Mention one limitation of the method.`,
        3,
        ["williamson_synthesis", "ether_preparation", "limitations"],
        parts([
          ["a", L`Reactants for methoxyethane.`, 1],
          ["b", L`Reactants for anisole or ethoxyethane.`, 1],
          ["c", L`One limitation involving tertiary alkyl halides.`, 1],
        ]),
        [
          L`Use an alkoxide or phenoxide with a primary/methyl alkyl halide.`,
          L`For anisole, sodium phenoxide plus methyl halide works well.`,
          L`Tertiary halides favour elimination.`,
        ],
        [
          {
            part: "a",
            explanation: L`Methoxyethane can be prepared from sodium methoxide and ethyl bromide, or sodium ethoxide and methyl bromide.`,
          },
          {
            part: "b",
            explanation: L`Anisole can be prepared from sodium phenoxide and methyl iodide; ethoxyethane can be prepared from sodium ethoxide and ethyl bromide.`,
          },
          {
            part: "c",
            explanation: L`Tertiary alkyl halides are poor substrates because alkoxide bases favour elimination instead of $\mathrm{S_N2}$ substitution.`,
          },
        ],
        [
          L`Using chlorobenzene as the aryl halide partner for ordinary Williamson synthesis.`,
          L`Forgetting that the alkyl halide should be methyl or primary for best yield.`,
        ],
      ),
      frq(
        "case",
        L`A bottle labelled anisole is used in two reactions: nitration under controlled conditions and heating with excess $\mathrm{HI}$.`,
        3,
        ["case_based", "anisole", "directing_effect", "ether_cleavage"],
        parts([
          [
            "a",
            L`Which group in anisole controls the orientation of ring nitration?`,
            1,
          ],
          [
            "b",
            L`What positional products are expected on nitration of anisole?`,
            1,
          ],
          [
            "c",
            L`What products are obtained when anisole is heated with excess $\mathrm{HI}$?`,
            1,
          ],
        ]),
        [
          L`Anisole contains a methoxy group on benzene.`,
          L`The methoxy group is ortho-para directing.`,
          L`Ether cleavage occurs at the methyl side for anisole.`,
        ],
        [
          {
            part: "a",
            explanation: L`The methoxy group, $\mathrm{-OCH_3}$, controls the orientation.`,
          },
          {
            part: "b",
            explanation: L`Nitration gives mainly ortho- and para-nitroanisole.`,
          },
          {
            part: "c",
            explanation: L`Heating anisole with excess $\mathrm{HI}$ gives phenol and methyl iodide.`,
          },
        ],
        [
          L`Choosing meta nitration because the group contains oxygen without considering resonance donation.`,
          L`Writing iodobenzene as the main cleavage product.`,
        ],
      ),
    ],
  },
];

export const alcoholsPhenolsEthersTopics: Topic[] = topicSeeds.map(makeTopic);
