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
const UNIT = "u9-amines";
const VERSION = "0.1.1";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const TOPIC_CHOICE_ROTATION_OFFSETS: Record<string, number> = {
  "9.1": 0,
  "9.2": 1,
  "9.3": 2,
  "9.4": 3,
  "9.5": 0,
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
  return `You chose ${choiceText}. Recheck the amine class, reagent condition, basicity factor, test observation, or diazonium replacement before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        : "incorrect_cbse_class12_chemistry_amines_reasoning",
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
      "matches_a_reagent_or_product_without_checking_amine_class_or_conditions",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
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
      "states_a_product_or_order_without_linking_it_to_lone_pair_availability_or_reagent_conditions",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
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
      description: `Completes part ${item.letter} with correct amine classification, nomenclature, preparation, basicity, test, diazonium reaction or conversion reasoning as required.`,
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
  };
}

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "9.1",
    title: "Structure, Classification and Nomenclature",
    subtopic:
      "Classify amines, name aliphatic and aromatic amines, and connect the nitrogen lone pair with pyramidal structure and hydrogen bonding.",
    mc: [
      mc(
        L`The compounds $\mathrm{CH_3NH_2}$, $\mathrm{(CH_3)_2NH}$ and $\mathrm{(CH_3)_3N}$ are respectively`,
        1,
        ["classification", "amine_degree"],
        [
          L`primary, secondary and tertiary amines`,
          L`secondary, primary and tertiary amines`,
          L`primary, tertiary and secondary amines`,
          L`primary, secondary and quaternary ammonium compounds`,
        ],
        "A",
        {
          B: L`$\mathrm{(CH_3)_2NH}$ has two alkyl groups on nitrogen, so it is secondary.`,
          C: L`$\mathrm{(CH_3)_3N}$ has three alkyl groups on nitrogen, so it is tertiary.`,
          D: L`A quaternary ammonium ion would have four carbon groups and a positive charge on nitrogen.`,
        },
        [
          L`Count carbon groups directly attached to nitrogen.`,
          L`One carbon group means primary; two means secondary; three means tertiary.`,
          L`The sequence is $1^\circ,2^\circ,3^\circ$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The degree of an amine depends on the number of alkyl or aryl groups bonded to nitrogen.`,
          },
          {
            step: 2,
            explanation: L`The three compounds have one, two and three methyl groups on nitrogen respectively.`,
            math: L`\mathrm{CH_3NH_2:\ 1^\circ,\quad (CH_3)_2NH:\ 2^\circ,\quad (CH_3)_3N:\ 3^\circ}`,
          },
        ],
      ),
      mc(
        L`The correct IUPAC name of $\mathrm{CH_3CH_2CH_2NH_2}$ is`,
        1,
        ["iupac_nomenclature", "primary_amine"],
        [
          L`propan-1-amine`,
          L`propan-2-amine`,
          L`N-methylethanamine`,
          L`ethylmethanamine`,
        ],
        "A",
        {
          B: L`The $\mathrm{-NH_2}$ group is on terminal carbon 1, not carbon 2.`,
          C: L`N-methylethanamine has one methyl and one ethyl group attached to nitrogen, not a straight three-carbon chain.`,
          D: L`Ethylmethanamine is not the preferred IUPAC name for this primary straight-chain amine.`,
        },
        [
          L`Choose the longest carbon chain attached to $\mathrm{-NH_2}$.`,
          L`Number the carbon chain to give the amino group the lowest locant.`,
          L`The parent is propane and the amino group is on carbon 1.`,
        ],
        [
          {
            step: 1,
            explanation: L`The structure contains a three-carbon chain and a terminal amino group.`,
          },
          {
            step: 2,
            explanation: L`Therefore the IUPAC name is propan-1-amine.`,
          },
        ],
      ),
      mc(
        L`The IUPAC name of aniline is`,
        1,
        ["iupac_nomenclature", "aromatic_amine"],
        [
          L`benzenamine`,
          L`phenylmethanamine`,
          L`aminocyclohexane`,
          L`benzylamine`,
        ],
        "A",
        {
          B: L`Phenylmethanamine is benzylamine, $\mathrm{C_6H_5CH_2NH_2}$, where nitrogen is not directly attached to the ring.`,
          C: L`Aminocyclohexane is a saturated cyclic amine, not an aromatic amine.`,
          D: L`Benzylamine has a $\mathrm{-CH_2NH_2}$ side chain; aniline has $\mathrm{-NH_2}$ directly on benzene.`,
        },
        [
          L`Aniline has $\mathrm{-NH_2}$ directly attached to benzene.`,
          L`Use benzene as parent and amine as suffix.`,
          L`The systematic name is benzenamine.`,
        ],
        [
          {
            step: 1,
            explanation: L`Aniline is $\mathrm{C_6H_5NH_2}$, so nitrogen is directly bonded to the benzene ring.`,
          },
          {
            step: 2,
            explanation: L`The IUPAC name is benzenamine.`,
          },
        ],
      ),
      mc(
        L`Among $\mathrm{CH_3CH_2NH_2}$, $\mathrm{(CH_3)_2NH}$ and $\mathrm{(CH_3)_3N}$, the one with the greatest capacity for intermolecular hydrogen bonding with molecules of its own kind is`,
        2,
        ["hydrogen_bonding", "physical_properties"],
        [
          L`$\mathrm{CH_3CH_2NH_2}$`,
          L`$\mathrm{(CH_3)_2NH}$`,
          L`$\mathrm{(CH_3)_3N}$`,
          L`all three equally`,
        ],
        "A",
        {
          B: L`Dimethylamine has only one $\mathrm{N-H}$ bond, so it self-associates less extensively than a primary amine.`,
          C: L`Trimethylamine has no $\mathrm{N-H}$ bond and cannot donate hydrogen bonds to another amine molecule.`,
          D: L`The number of $\mathrm{N-H}$ bonds changes across the three compounds, so their self hydrogen bonding is not equal.`,
        },
        [
          L`Self hydrogen bonding needs a hydrogen attached to nitrogen.`,
          L`A primary amine has two $\mathrm{N-H}$ bonds.`,
          L`Tertiary amines can accept hydrogen bonds but cannot donate them.`,
        ],
        [
          {
            step: 1,
            explanation: L`A primary amine has two $\mathrm{N-H}$ bonds and can both donate and accept hydrogen bonds.`,
          },
          {
            step: 2,
            explanation: L`Among the choices, ethylamine has the greatest self hydrogen-bonding capacity.`,
          },
        ],
      ),
      mc(
        L`Which pair has molecular formula $\mathrm{C_3H_9N}$ but belongs to different amine classes?`,
        2,
        ["isomerism", "amine_classification"],
        [
          L`propan-1-amine and N-methylethanamine`,
          L`propan-1-amine and propan-2-amine`,
          L`ethylamine and dimethylamine`,
          L`aniline and benzylamine`,
        ],
        "A",
        {
          B: L`Both propan-1-amine and propan-2-amine are primary amines, so they differ by position, not amine class.`,
          C: L`Ethylamine and dimethylamine have formula $\mathrm{C_2H_7N}$, not $\mathrm{C_3H_9N}$.`,
          D: L`Aniline and benzylamine do not have the same molecular formula.`,
        },
        [
          L`Different amine classes can share the same molecular formula.`,
          L`Check both formula and amine class.`,
          L`One member should be primary and the other secondary for this pair.`,
        ],
        [
          {
            step: 1,
            explanation: L`Propan-1-amine is a primary amine and N-methylethanamine is a secondary amine.`,
          },
          {
            step: 2,
            explanation: L`Both have formula $\mathrm{C_3H_9N}$ but differ in amine class.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Write the IUPAC name of $\mathrm{CH_3CH_2NHCH_3}$.`,
        1,
        ["iupac_nomenclature", "secondary_amine"],
        parts([["a", L`Give the name.`, 1]]),
        [
          L`Choose the longer carbon chain attached to nitrogen as the parent.`,
          L`The remaining alkyl group is named as an N-substituent.`,
          L`The parent is ethanamine and the substituent on nitrogen is methyl.`,
        ],
        [
          {
            part: "a",
            explanation: L`The correct name is N-methylethanamine.`,
          },
        ],
        [L`Writing methylethylamine as the IUPAC name instead of a common-style name.`],
      ),
      frq(
        "saq",
        L`Classify each compound as primary, secondary or tertiary amine: $\mathrm{C_6H_5NH_2}$, $\mathrm{(C_2H_5)_2NH}$ and $\mathrm{N(CH_3)_3}$.`,
        2,
        ["classification", "aromatic_and_aliphatic_amines"],
        parts([
          ["a", L`Classify $\mathrm{C_6H_5NH_2}$.`, 1],
          ["b", L`Classify $\mathrm{(C_2H_5)_2NH}$ and $\mathrm{N(CH_3)_3}$.`, 1],
        ]),
        [
          L`Count organic groups bonded to nitrogen, not carbon atoms in those groups.`,
          L`A phenyl group counts as one organic group attached to nitrogen.`,
          L`One, two and three organic groups correspond to primary, secondary and tertiary.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{C_6H_5NH_2}$ has one phenyl group attached to nitrogen, so it is a primary aromatic amine.`,
          },
          {
            part: "b",
            explanation: L`$\mathrm{(C_2H_5)_2NH}$ is secondary and $\mathrm{N(CH_3)_3}$ is tertiary.`,
          },
        ],
        [L`Classifying aniline as tertiary because the ring has many carbons.`],
      ),
      frq(
        "vsaq",
        L`How many $\mathrm{N-H}$ bonds are present in trimethylamine?`,
        1,
        ["structure", "tertiary_amine"],
        parts([["a", L`State the number.`, 1]]),
        [
          L`Write trimethylamine as $\mathrm{N(CH_3)_3}$.`,
          L`All three valencies of nitrogen are used by methyl groups.`,
          L`No hydrogen is attached directly to nitrogen.`,
        ],
        [
          {
            part: "a",
            explanation: L`Trimethylamine has zero $\mathrm{N-H}$ bonds.`,
            math: L`\mathrm{N(CH_3)_3}`,
          },
        ],
        [L`Counting hydrogens on methyl groups as $\mathrm{N-H}$ hydrogens.`],
      ),
      frq(
        "laq",
        L`Write the structures of all amine isomers with molecular formula $\mathrm{C_3H_9N}$ and classify each as primary, secondary or tertiary.`,
        4,
        ["isomer_enumeration", "classification"],
        parts([
          ["a", L`Write the two primary amine isomers.`, 2],
          ["b", L`Write the secondary amine isomer.`, 1],
          ["c", L`Write the tertiary amine isomer.`, 1],
        ]),
        [
          L`First distribute three carbons around nitrogen.`,
          L`Primary amines have one three-carbon group; secondary amines can split carbons as 2 + 1.`,
          L`The tertiary option splits carbons as 1 + 1 + 1.`,
        ],
        [
          {
            part: "a",
            explanation: L`The primary isomers are propan-1-amine and propan-2-amine.`,
            math: L`\mathrm{CH_3CH_2CH_2NH_2,\quad CH_3CH(NH_2)CH_3}`,
          },
          {
            part: "b",
            explanation: L`The secondary isomer is N-methylethanamine.`,
            math: L`\mathrm{CH_3NHCH_2CH_3}`,
          },
          {
            part: "c",
            explanation: L`The tertiary isomer is trimethylamine.`,
            math: L`\mathrm{N(CH_3)_3}`,
          },
        ],
        [
          L`Missing propan-2-amine as a position isomer.`,
          L`Writing an amide or nitrile, which does not match the amine-only formula requirement.`,
        ],
      ),
      frq(
        "case",
        L`A bottle label gives the structure $\mathrm{C_6H_5CH_2NH_2}$. A student calls it aniline because it contains a benzene ring and an amino group.`,
        3,
        ["structure_interpretation", "aromatic_vs_aralkyl"],
        parts([
          ["a", L`Is the student's name correct?`, 1],
          ["b", L`Give the common name and IUPAC name.`, 1],
          ["c", L`Classify the compound as primary, secondary or tertiary.`, 1],
        ]),
        [
          L`Check whether nitrogen is directly attached to the ring.`,
          L`A $\mathrm{-CH_2-}$ group between ring and $\mathrm{-NH_2}$ changes the compound.`,
          L`One organic group attached to nitrogen means primary amine.`,
        ],
        [
          {
            part: "a",
            explanation: L`No. Aniline is $\mathrm{C_6H_5NH_2}$, where nitrogen is directly attached to the benzene ring.`,
          },
          {
            part: "b",
            explanation: L`The compound is benzylamine; its IUPAC name is phenylmethanamine.`,
          },
          {
            part: "c",
            explanation: L`It is a primary amine because nitrogen is attached to one organic group and two hydrogens.`,
          },
        ],
        [L`Treating every benzene-ring amine as aniline.`],
      ),
    ],
  },
  {
    topicCode: "9.2",
    title: "Preparation of Amines",
    subtopic:
      "Use reduction, ammonolysis, Gabriel synthesis and Hoffmann bromamide degradation with correct carbon counting and limitations.",
    mc: [
      mc(
        L`The best reagent set to convert nitrobenzene into aniline is`,
        2,
        ["preparation", "nitro_reduction"],
        [
          L`$\mathrm{Sn/HCl}$ followed by alkali`,
          L`$\mathrm{Br_2/KOH}$`,
          L`$\mathrm{NaNO_2/HCl}$ at $\mathrm{273-278\ K}$`,
          L`$\mathrm{H_2SO_4}$ and heat`,
        ],
        "A",
        {
          B: L`$\mathrm{Br_2/KOH}$ is used in Hoffmann bromamide degradation of amides, not direct nitro reduction.`,
          C: L`$\mathrm{NaNO_2/HCl}$ diazotises aniline; it does not reduce nitrobenzene.`,
          D: L`Concentrated acid and heat do not selectively reduce $\mathrm{-NO_2}$ to $\mathrm{-NH_2}$.`,
        },
        [
          L`A nitro group must be reduced to an amino group.`,
          L`Common reducing systems include $\mathrm{Sn/HCl}$ or $\mathrm{Fe/HCl}$.`,
          L`The amine salt formed in acid is liberated by alkali.`,
        ],
        [
          {
            step: 1,
            explanation: L`Nitrobenzene is reduced to anilinium chloride in acidic medium.`,
          },
          {
            step: 2,
            explanation: L`Alkali liberates free aniline.`,
            math: L`\mathrm{C_6H_5NO_2 \xrightarrow{Sn/HCl} C_6H_5NH_3^+Cl^- \xrightarrow{OH^-} C_6H_5NH_2}`,
          },
        ],
      ),
      mc(
        L`Hoffmann bromamide degradation of propanamide gives`,
        2,
        ["hoffmann_bromamide", "carbon_counting"],
        [
          L`ethanamine`,
          L`propan-1-amine`,
          L`methanamine`,
          L`propanenitrile`,
        ],
        "A",
        {
          B: L`Hoffmann bromamide degradation shortens the carbon chain by one carbon.`,
          C: L`Only one carbon is lost; propanamide therefore gives a two-carbon amine.`,
          D: L`A nitrile is not the product of the $\mathrm{Br_2/KOH}$ degradation of an amide.`,
        },
        [
          L`Count the carbonyl carbon in the amide before reaction.`,
          L`The product amine has one carbon fewer than the amide.`,
          L`$\mathrm{CH_3CH_2CONH_2}$ gives $\mathrm{CH_3CH_2NH_2}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Propanamide has three carbons including the carbonyl carbon.`,
          },
          {
            step: 2,
            explanation: L`Hoffmann bromamide degradation removes the carbonyl carbon, giving ethanamine.`,
            math: L`\mathrm{CH_3CH_2CONH_2 \xrightarrow{Br_2/KOH} CH_3CH_2NH_2}`,
          },
        ],
      ),
      mc(
        L`Gabriel phthalimide synthesis is not suitable for preparing aniline because`,
        2,
        ["gabriel_synthesis", "limitations"],
        [
          L`aryl halides do not undergo the required $\mathrm{S_N2}$ substitution easily`,
          L`phthalimide cannot form its potassium salt`,
          L`aniline is a tertiary amine`,
          L`the method always gives nitriles instead of amines`,
        ],
        "A",
        {
          B: L`Potassium phthalimide can be formed; the problem is substitution at aryl halide carbon.`,
          C: L`Aniline is a primary aromatic amine, not tertiary.`,
          D: L`Gabriel synthesis is designed to give primary amines after hydrolysis, not nitriles.`,
        },
        [
          L`Gabriel synthesis needs alkylation of phthalimide.`,
          L`The alkyl halide step is essentially an $\mathrm{S_N2}$ process.`,
          L`Aryl halides resist this displacement because of partial double-bond character and ring bonding.`,
        ],
        [
          {
            step: 1,
            explanation: L`Gabriel synthesis works well with primary alkyl halides.`,
          },
          {
            step: 2,
            explanation: L`Chlorobenzene or bromobenzene does not undergo the needed $\mathrm{S_N2}$ substitution, so aniline is not prepared by this method.`,
          },
        ],
      ),
      mc(
        L`For preparing ethylamine from bromoethane by ammonolysis, the condition that best suppresses formation of higher amines is`,
        3,
        ["ammonolysis", "selectivity"],
        [
          L`use excess alcoholic ammonia`,
          L`use excess bromoethane`,
          L`carry out the reaction without ammonia`,
          L`add nitrous acid before heating`,
        ],
        "A",
        {
          B: L`Excess alkyl halide promotes further alkylation to secondary and tertiary amines.`,
          C: L`Ammonia is the nucleophile required for ammonolysis.`,
          D: L`Nitrous acid is used in diazotisation or amine tests, not for suppressing alkylation.`,
        },
        [
          L`The primary amine product is still nucleophilic.`,
          L`Further alkylation gives secondary and tertiary amines.`,
          L`A large excess of ammonia makes first substitution more likely than further alkylation.`,
        ],
        [
          {
            step: 1,
            explanation: L`Bromoethane reacts with ammonia to form ethylamine, but ethylamine can react further with bromoethane.`,
          },
          {
            step: 2,
            explanation: L`Using excess ammonia reduces the chance of further alkylation and favours the primary amine.`,
          },
        ],
      ),
      mc(
        L`Reduction of $\mathrm{CH_3CN}$ with $\mathrm{LiAlH_4}$ followed by hydrolysis gives`,
        2,
        ["nitrile_reduction", "carbon_counting"],
        [
          L`ethanamine`,
          L`methanamine`,
          L`ethyl alcohol`,
          L`ethanamide`,
        ],
        "A",
        {
          B: L`Reduction of a nitrile retains the nitrile carbon, so a two-carbon nitrile gives a two-carbon amine.`,
          C: L`The nitrile is reduced to a primary amine, not an alcohol.`,
          D: L`Ethanamide is obtained by partial hydrolysis of a nitrile, not by complete reduction with $\mathrm{LiAlH_4}$.`,
        },
        [
          L`In nitrile reduction, $\mathrm{-C\equiv N}$ becomes $\mathrm{-CH_2NH_2}$.`,
          L`Do not lose the nitrile carbon.`,
          L`$\mathrm{CH_3CN}$ becomes $\mathrm{CH_3CH_2NH_2}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Lithium aluminium hydride reduces the nitrile group to a primary amine.`,
          },
          {
            step: 2,
            explanation: L`The carbon chain length is retained, so ethanenitrile gives ethanamine.`,
            math: L`\mathrm{CH_3CN \xrightarrow{LiAlH_4/H_2O} CH_3CH_2NH_2}`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Name one reagent system that converts nitrobenzene to aniline.`,
        1,
        ["preparation", "nitro_reduction"],
        parts([["a", L`Give the reagent system.`, 1]]),
        [
          L`The nitro group must be reduced.`,
          L`Acidic metal reductions are standard.`,
          L`Use $\mathrm{Sn/HCl}$ or $\mathrm{Fe/HCl}$, followed by alkali work-up.`,
        ],
        [
          {
            part: "a",
            explanation: L`One suitable reagent system is $\mathrm{Sn/HCl}$ followed by alkali, or $\mathrm{Fe/HCl}$ followed by alkali.`,
          },
        ],
        [L`Giving diazotisation reagents instead of reducing reagents.`],
      ),
      frq(
        "saq",
        L`Convert ethanamide into methanamine. Name the reaction and write the main reagent.`,
        2,
        ["hoffmann_bromamide", "conversion"],
        parts([
          ["a", L`Name the reaction.`, 1],
          ["b", L`Give the reagent and product.`, 1],
        ]),
        [
          L`The product has one carbon fewer than the amide.`,
          L`This is the degradation reaction of amides with bromine and alkali.`,
          L`Use $\mathrm{Br_2/KOH}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`The reaction is Hoffmann bromamide degradation.`,
          },
          {
            part: "b",
            explanation: L`Ethanamide reacts with bromine and alkali to give methanamine.`,
            math: L`\mathrm{CH_3CONH_2 \xrightarrow{Br_2/KOH} CH_3NH_2}`,
          },
        ],
        [L`Writing ethanamine as the product and forgetting the one-carbon loss.`],
      ),
      frq(
        "saq",
        L`Explain why Gabriel phthalimide synthesis gives a clean primary aliphatic amine but is not used to prepare aniline from bromobenzene.`,
        3,
        ["gabriel_synthesis", "mechanism_limitation"],
        parts([
          ["a", L`State why the method gives primary amines cleanly with alkyl halides.`, 1],
          ["b", L`State why bromobenzene does not work.`, 1],
          ["c", L`Name a better preparation of aniline.`, 1],
        ]),
        [
          L`Potassium phthalimide has one nucleophilic nitrogen site.`,
          L`The alkylation step needs backside substitution at an alkyl halide.`,
          L`Aniline is more conveniently made by reduction of nitrobenzene.`,
        ],
        [
          {
            part: "a",
            explanation: L`Potassium phthalimide undergoes alkylation with an alkyl halide and, after hydrolysis, releases a primary amine without further alkylation.`,
          },
          {
            part: "b",
            explanation: L`Bromobenzene does not undergo ordinary $\mathrm{S_N2}$ substitution at the aryl carbon, so the key alkylation step fails.`,
          },
          {
            part: "c",
            explanation: L`Aniline can be prepared by reducing nitrobenzene using $\mathrm{Sn/HCl}$ or $\mathrm{Fe/HCl}$ followed by alkali.`,
          },
        ],
        [
          L`Saying Gabriel synthesis is impossible because phthalimide cannot react at all.`,
          L`Forgetting that the limitation is specifically with aryl halides.`,
        ],
      ),
      frq(
        "laq",
        L`Plan a conversion of bromoethane to propan-1-amine using a one-carbon chain-extension route. Do not use direct ammonolysis as the main step. Give the intermediate and reagents.`,
        4,
        ["conversion_planning", "nitrile_reduction", "carbon_extension"],
        parts([
          ["a", L`Write the first reagent and intermediate.`, 1],
          ["b", L`Write the second reagent and final product.`, 1],
          ["c", L`Explain why the route increases the carbon chain by one.`, 1],
          ["d", L`Give one reason direct ammonolysis of bromoethane is unsuitable for this target.`, 1],
        ]),
        [
          L`To add one carbon, use cyanide ion.`,
          L`A nitrile can be reduced to a primary amine.`,
          L`Direct ammonolysis of bromoethane would give ethanamine, not propan-1-amine.`,
        ],
        [
          {
            part: "a",
            explanation: L`Treat bromoethane with alcoholic $\mathrm{KCN}$ to form propanenitrile.`,
            math: L`\mathrm{CH_3CH_2Br \xrightarrow{alc.\ KCN} CH_3CH_2CN}`,
          },
          {
            part: "b",
            explanation: L`Reduce propanenitrile with $\mathrm{LiAlH_4}$ followed by hydrolysis to form propan-1-amine.`,
            math: L`\mathrm{CH_3CH_2CN \xrightarrow{LiAlH_4/H_2O} CH_3CH_2CH_2NH_2}`,
          },
          {
            part: "c",
            explanation: L`The carbon of $\mathrm{-CN}$ becomes the $\mathrm{-CH_2-}$ carbon next to $\mathrm{-NH_2}$, so the chain length increases by one.`,
          },
          {
            part: "d",
            explanation: L`Direct ammonolysis of bromoethane gives mainly ethanamine, with no one-carbon chain extension.`,
          },
        ],
        [
          L`Using $\mathrm{AgCN}$, which favours isocyanide formation instead of nitrile.`,
          L`Losing the nitrile carbon during reduction.`,
        ],
      ),
      frq(
        "case",
        L`A student has three starting compounds: $\mathrm{CH_3CH_2Br}$, $\mathrm{CH_3CH_2CONH_2}$ and $\mathrm{C_6H_5NO_2}$. They must prepare one aliphatic primary amine without carbon loss, one amine with one carbon fewer, and one aromatic primary amine.`,
        4,
        ["case_study", "preparation_routes"],
        parts([
          ["a", L`Which starting compound gives an amine without carbon loss by ammonolysis?`, 1],
          ["b", L`Which starting compound gives an amine with one carbon fewer?`, 1],
          ["c", L`Which starting compound gives an aromatic primary amine?`, 1],
          ["d", L`Give the reagent for part c.`, 1],
        ]),
        [
          L`Alkyl halide plus ammonia gives an amine with the same carbon skeleton.`,
          L`Amide plus $\mathrm{Br_2/KOH}$ loses the carbonyl carbon.`,
          L`Nitrobenzene reduction gives aniline.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{CH_3CH_2Br}$ gives ethylamine by ammonolysis with excess alcoholic ammonia.`,
          },
          {
            part: "b",
            explanation: L`$\mathrm{CH_3CH_2CONH_2}$ gives ethanamine by Hoffmann bromamide degradation, losing one carbon.`,
          },
          {
            part: "c",
            explanation: L`$\mathrm{C_6H_5NO_2}$ gives aniline on reduction.`,
          },
          {
            part: "d",
            explanation: L`Use $\mathrm{Sn/HCl}$ or $\mathrm{Fe/HCl}$ followed by alkali.`,
          },
        ],
        [L`Treating all preparation routes as if they preserve carbon count.`],
      ),
    ],
  },
  {
    topicCode: "9.3",
    title: "Basicity and Physical Properties",
    subtopic:
      "Compare basic strength using inductive effect, resonance and solvation, and explain solubility and boiling-point trends.",
    mc: [
      mc(
        L`In aqueous solution, the correct decreasing basic strength order for methylamines and ammonia is`,
        3,
        ["basicity_order", "solvation"],
        [
          L`$\mathrm{(CH_3)_2NH>CH_3NH_2>(CH_3)_3N>NH_3}$`,
          L`$\mathrm{(CH_3)_3N>(CH_3)_2NH>CH_3NH_2>NH_3}$`,
          L`$\mathrm{NH_3>CH_3NH_2>(CH_3)_2NH>(CH_3)_3N}$`,
          L`$\mathrm{CH_3NH_2>(CH_3)_2NH>NH_3>(CH_3)_3N}$`,
        ],
        "A",
        {
          B: L`In water, solvation lowers the effective basicity of trimethylamine relative to dimethylamine and methylamine.`,
          C: L`Alkyl groups donate electron density, so methylamines are generally more basic than ammonia.`,
          D: L`Dimethylamine is more basic than methylamine in aqueous solution because of stronger $+I$ effect with adequate solvation.`,
        },
        [
          L`Do not use only the number of alkyl groups.`,
          L`In water, both electron release and solvation of the conjugate acid matter.`,
          L`For methylamines: secondary $>$ primary $>$ tertiary $>$ ammonia.`,
        ],
        [
          {
            step: 1,
            explanation: L`Alkyl groups increase electron density on nitrogen, but the protonated amine must also be solvated in water.`,
          },
          {
            step: 2,
            explanation: L`The accepted aqueous order is dimethylamine greater than methylamine greater than trimethylamine greater than ammonia.`,
            math: L`\mathrm{(CH_3)_2NH>CH_3NH_2>(CH_3)_3N>NH_3}`,
          },
        ],
      ),
      mc(
        L`Aniline is less basic than cyclohexylamine mainly because in aniline`,
        2,
        ["resonance", "basicity"],
        [
          L`the nitrogen lone pair is delocalised into the benzene ring`,
          L`nitrogen has no lone pair`,
          L`the benzene ring donates electron density very strongly to nitrogen`,
          L`aniline cannot form a conjugate acid`,
        ],
        "A",
        {
          B: L`Nitrogen in aniline has a lone pair; it is less available because of resonance.`,
          C: L`The ring withdraws lone-pair availability through resonance interaction, making aniline less basic.`,
          D: L`Aniline can form anilinium ion, but it does so less readily than aliphatic amines form alkylammonium ions.`,
        },
        [
          L`Basicity depends on availability of the lone pair.`,
          L`Compare direct ring attachment with saturated ring attachment.`,
          L`In aniline, the lone pair participates in resonance with the benzene ring.`,
        ],
        [
          {
            step: 1,
            explanation: L`In cyclohexylamine, the lone pair is localised on nitrogen and is readily available for protonation.`,
          },
          {
            step: 2,
            explanation: L`In aniline, resonance delocalisation into the ring decreases lone-pair availability, so aniline is less basic.`,
          },
        ],
      ),
      mc(
        L`Among aniline, p-nitroaniline and p-methoxyaniline, the strongest base is`,
        3,
        ["substituent_effects", "basicity"],
        [
          L`p-methoxyaniline`,
          L`aniline`,
          L`p-nitroaniline`,
          L`all three have equal basic strength`,
        ],
        "A",
        {
          B: L`The methoxy group donates electron density by resonance from the para position and increases basicity relative to aniline.`,
          C: L`The nitro group withdraws electron density strongly and decreases basicity.`,
          D: L`Substituents change electron density and lone-pair availability; the basicities are not equal.`,
        },
        [
          L`Electron-donating substituents increase basicity.`,
          L`Electron-withdrawing substituents decrease basicity.`,
          L`$\mathrm{-OCH_3}$ donates by resonance, while $\mathrm{-NO_2}$ withdraws strongly.`,
        ],
        [
          {
            step: 1,
            explanation: L`A para methoxy group increases electron density on the ring and makes the nitrogen lone pair more available than in aniline.`,
          },
          {
            step: 2,
            explanation: L`A para nitro group withdraws electron density and makes the amine least basic. Hence p-methoxyaniline is strongest.`,
          },
        ],
      ),
      mc(
        L`Aniline becomes soluble in dilute hydrochloric acid because it forms`,
        2,
        ["acid_base_salt", "solubility"],
        [
          L`water-soluble anilinium chloride`,
          L`nitrobenzene`,
          L`benzene diazonium chloride at room temperature`,
          L`chlorobenzene`,
        ],
        "A",
        {
          B: L`Dilute hydrochloric acid protonates aniline; it does not oxidise it to nitrobenzene.`,
          C: L`Diazonium salt formation needs nitrous acid at low temperature, not only dilute hydrochloric acid.`,
          D: L`Replacing $\mathrm{-NH_2}$ by chlorine requires diazotisation followed by a Sandmeyer reaction.`,
        },
        [
          L`Aniline is a weak base.`,
          L`A base reacts with acid to form a salt.`,
          L`Ionic salts are generally more water soluble than neutral aniline.`,
        ],
        [
          {
            step: 1,
            explanation: L`Aniline accepts a proton from hydrochloric acid to form anilinium ion.`,
            math: L`\mathrm{C_6H_5NH_2+HCl\rightarrow C_6H_5NH_3^+Cl^-}`,
          },
          {
            step: 2,
            explanation: L`The ionic salt, anilinium chloride, is soluble in water.`,
          },
        ],
      ),
      mc(
        L`The compound expected to have the highest $\mathrm{p}K_b$ among the following is`,
        2,
        ["pkb", "weak_base"],
        [
          L`aniline`,
          L`methylamine`,
          L`dimethylamine`,
          L`ammonia`,
        ],
        "A",
        {
          B: L`Methylamine is more basic than ammonia because of the $+I$ effect and has a lower $\mathrm{p}K_b$ than aniline.`,
          C: L`Dimethylamine is a stronger base in water and has a lower $\mathrm{p}K_b$.`,
          D: L`Ammonia is weak, but aniline is still weaker because its lone pair is delocalised into the ring.`,
        },
        [
          L`Higher $\mathrm{p}K_b$ means weaker base.`,
          L`Aromatic resonance reduces basicity.`,
          L`Aniline is weaker than ammonia and aliphatic amines.`,
        ],
        [
          {
            step: 1,
            explanation: L`A higher $\mathrm{p}K_b$ corresponds to lower basic strength.`,
          },
          {
            step: 2,
            explanation: L`Aniline has the least available lone pair because of resonance with the benzene ring, so it has the highest $\mathrm{p}K_b$ among these.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why does aniline dissolve in dilute hydrochloric acid?`,
        1,
        ["solubility", "acid_base_reaction"],
        parts([["a", L`Give the reason in one sentence.`, 1]]),
        [
          L`Aniline is basic.`,
          L`Hydrochloric acid protonates the amino group.`,
          L`The product is ionic and water soluble.`,
        ],
        [
          {
            part: "a",
            explanation: L`Aniline forms the ionic salt anilinium chloride with dilute hydrochloric acid, so it dissolves.`,
            math: L`\mathrm{C_6H_5NH_2+HCl\rightarrow C_6H_5NH_3^+Cl^-}`,
          },
        ],
        [L`Saying it dissolves because benzene is polar; the salt formation is the key.`],
      ),
      frq(
        "saq",
        L`Account for the fact that aniline is less basic than ammonia, although aniline contains an electron-releasing amino group attached to a ring.`,
        2,
        ["basicity", "resonance"],
        parts([
          ["a", L`State what happens to the nitrogen lone pair in aniline.`, 1],
          ["b", L`Connect this to basic strength.`, 1],
        ]),
        [
          L`Basicity requires donation of the nitrogen lone pair.`,
          L`In aniline, the lone pair is not fully localised on nitrogen.`,
          L`Resonance with the benzene ring makes protonation less favourable.`,
        ],
        [
          {
            part: "a",
            explanation: L`The nitrogen lone pair in aniline is delocalised into the benzene ring by resonance.`,
          },
          {
            part: "b",
            explanation: L`Because the lone pair is less available for protonation, aniline is less basic than ammonia.`,
          },
        ],
        [L`Using only inductive effect and ignoring resonance.`],
      ),
      frq(
        "saq",
        L`Arrange $\mathrm{CH_3NH_2}$, $\mathrm{(CH_3)_2NH}$, $\mathrm{(CH_3)_3N}$ and $\mathrm{NH_3}$ in decreasing basic strength in water. Give one reason for the position of trimethylamine.`,
        3,
        ["basicity_order", "solvation"],
        parts([
          ["a", L`Write the decreasing order.`, 2],
          ["b", L`Explain why trimethylamine is not the strongest in water.`, 1],
        ]),
        [
          L`Balance $+I$ effect with solvation of the conjugate acid.`,
          L`Secondary methylamine is strongest in water.`,
          L`Bulky trimethylammonium ion is less effectively solvated.`,
        ],
        [
          {
            part: "a",
            explanation: L`The decreasing basic strength order in water is dimethylamine, methylamine, trimethylamine, ammonia.`,
            math: L`\mathrm{(CH_3)_2NH>CH_3NH_2>(CH_3)_3N>NH_3}`,
          },
          {
            part: "b",
            explanation: L`Trimethylamine has strong $+I$ effect, but its conjugate acid is less effectively solvated in water, so it is not the strongest.`,
          },
        ],
        [L`Using the gas-phase order blindly for aqueous solution.`],
      ),
      frq(
        "laq",
        L`Compare ethylamine, diethylamine, triethylamine and aniline with respect to basicity and physical behaviour. Your answer should use inductive effect, solvation and resonance rather than only memorised order.`,
        4,
        ["compare_explain", "basicity", "physical_properties"],
        parts([
          ["a", L`Explain why aliphatic amines are generally more basic than ammonia.`, 1],
          ["b", L`Explain why solvation affects the order among primary, secondary and tertiary amines in water.`, 1],
          ["c", L`Explain why aniline is much less basic than ethylamine.`, 1],
          ["d", L`State one physical-property consequence of $\mathrm{N-H}$ bonding.`, 1],
        ]),
        [
          L`Use $+I$ effect for alkyl groups.`,
          L`Use hydration of the conjugate acid for aqueous basicity.`,
          L`Use resonance for aniline and $\mathrm{N-H}$ bonds for hydrogen bonding.`,
        ],
        [
          {
            part: "a",
            explanation: L`Alkyl groups donate electron density by the $+I$ effect, increasing lone-pair availability on nitrogen.`,
          },
          {
            part: "b",
            explanation: L`In water, the stability of the protonated amine depends on solvation; bulky tertiary ammonium ions are less effectively solvated.`,
          },
          {
            part: "c",
            explanation: L`In aniline, the nitrogen lone pair is delocalised into the benzene ring, so it is less available for protonation than in ethylamine.`,
          },
          {
            part: "d",
            explanation: L`Primary and secondary amines can form intermolecular hydrogen bonds, so they generally have higher boiling points than comparable tertiary amines.`,
          },
        ],
        [
          L`Ranking bases from alkyl count alone without discussing solvation.`,
          L`Saying aniline is more basic because benzene is electron rich, while ignoring lone-pair delocalisation.`,
        ],
      ),
      frq(
        "case",
        L`Three bases are labelled P, Q and R. P is aniline, Q is cyclohexylamine, and R is p-nitroaniline. Equal amounts are shaken separately with dilute hydrochloric acid and then compared for tendency to form ammonium salts.`,
        4,
        ["case_study", "basicity", "substituent_effects"],
        parts([
          ["a", L`Which base is strongest?`, 1],
          ["b", L`Which base is weakest?`, 1],
          ["c", L`Explain the role of resonance in P.`, 1],
          ["d", L`Explain the role of the nitro group in R.`, 1],
        ]),
        [
          L`Cyclohexylamine is an aliphatic amine.`,
          L`Aniline has resonance delocalisation of the lone pair.`,
          L`A nitro group withdraws electron density and reduces basicity further.`,
        ],
        [
          {
            part: "a",
            explanation: L`Q, cyclohexylamine, is strongest because the nitrogen lone pair is localised and the alkyl group donates electron density.`,
          },
          {
            part: "b",
            explanation: L`R, p-nitroaniline, is weakest because the nitro group withdraws electron density from the ring and reduces lone-pair availability.`,
          },
          {
            part: "c",
            explanation: L`In aniline, resonance delocalises the nitrogen lone pair into the benzene ring, so protonation is less favourable.`,
          },
          {
            part: "d",
            explanation: L`The $\mathrm{-NO_2}$ group has strong $-I$ and $-R$ effects, making the amino nitrogen still less basic.`,
          },
        ],
        [L`Calling aniline strongest simply because it is aromatic.`],
      ),
    ],
  },
  {
    topicCode: "9.4",
    title: "Chemical Reactions and Identification",
    subtopic:
      "Apply carbylamine, Hinsberg, acylation, electrophilic substitution and nitrous-acid reactions to distinguish and transform amines.",
    mc: [
      mc(
        L`Which compound gives a positive carbylamine test with chloroform and alcoholic $\mathrm{KOH}$?`,
        2,
        ["carbylamine_test", "identification"],
        [
          L`aniline`,
          L`dimethylamine`,
          L`trimethylamine`,
          L`acetamide`,
        ],
        "A",
        {
          B: L`Secondary amines do not give the carbylamine test.`,
          C: L`Tertiary amines do not have the required $\mathrm{-NH_2}$ group.`,
          D: L`Amides are not primary amines and do not give this test.`,
        },
        [
          L`Carbylamine test is specific for primary amines.`,
          L`Both primary aliphatic and primary aromatic amines respond.`,
          L`Aniline is a primary aromatic amine.`,
        ],
        [
          {
            step: 1,
            explanation: L`The carbylamine test is given only by primary amines.`,
          },
          {
            step: 2,
            explanation: L`Aniline has a primary amino group and gives phenyl isocyanide with a foul smell.`,
          },
        ],
      ),
      mc(
        L`In Hinsberg's test, a secondary amine reacts with benzenesulphonyl chloride to form a product that is`,
        3,
        ["hinsberg_test", "identification"],
        [
          L`insoluble in alkali because it has no acidic $\mathrm{N-H}$ proton`,
          L`soluble in alkali because it has one acidic $\mathrm{N-H}$ proton`,
          L`unchanged but soluble in dilute hydrochloric acid only`,
          L`converted into an isocyanide`,
        ],
        "A",
        {
          B: L`A primary amine's sulphonamide has an acidic $\mathrm{N-H}$ proton; a secondary amine's product does not.`,
          C: L`Tertiary amines do not form sulphonamide and dissolve in acid; secondary amines do react.`,
          D: L`Isocyanide formation belongs to the carbylamine test, not Hinsberg's test.`,
        },
        [
          L`Recall the different behaviour of primary, secondary and tertiary amines.`,
          L`A secondary amine has only one hydrogen before reaction.`,
          L`After sulphonylation, no acidic $\mathrm{N-H}$ remains.`,
        ],
        [
          {
            step: 1,
            explanation: L`A secondary amine forms N,N-disubstituted sulphonamide with benzenesulphonyl chloride.`,
          },
          {
            step: 2,
            explanation: L`The product lacks an acidic $\mathrm{N-H}$ proton, so it is insoluble in alkali.`,
          },
        ],
      ),
      mc(
        L`Aniline reacts with acetyl chloride or acetic anhydride to give`,
        2,
        ["acylation", "aniline_reactions"],
        [
          L`acetanilide`,
          L`nitrobenzene`,
          L`benzenediazonium chloride`,
          L`chlorobenzene`,
        ],
        "A",
        {
          B: L`Nitration needs nitrating mixture, not acetyl chloride or acetic anhydride.`,
          C: L`Diazonium salt formation requires nitrous acid at low temperature.`,
          D: L`Chlorobenzene is obtained from a diazonium salt by Sandmeyer reaction, not simple acetylation.`,
        },
        [
          L`Acylation converts $\mathrm{-NH_2}$ to an amide group.`,
          L`The product of aniline acetylation is often used to protect the amino group.`,
          L`The product is acetanilide.`,
        ],
        [
          {
            step: 1,
            explanation: L`Aniline undergoes acylation at nitrogen.`,
          },
          {
            step: 2,
            explanation: L`The product is acetanilide.`,
            math: L`\mathrm{C_6H_5NH_2 \rightarrow C_6H_5NHCOCH_3}`,
          },
        ],
      ),
      mc(
        L`Aniline reacts with bromine water at room temperature to give mainly`,
        2,
        ["electrophilic_substitution", "aniline"],
        [
          L`2,4,6-tribromoaniline`,
          L`bromobenzene`,
          L`m-bromoaniline only`,
          L`benzyl bromide`,
        ],
        "A",
        {
          B: L`The amino group strongly activates the ring, so ring bromination occurs rather than replacement of $\mathrm{-NH_2}$.`,
          C: L`The $\mathrm{-NH_2}$ group is ortho/para directing and strongly activating; bromination in water gives tribromo product.`,
          D: L`Benzyl bromide would require a methyl side chain; aniline has none.`,
        },
        [
          L`$\mathrm{-NH_2}$ activates benzene strongly.`,
          L`It directs electrophiles to ortho and para positions.`,
          L`With bromine water, multiple substitution occurs.`,
        ],
        [
          {
            step: 1,
            explanation: L`The amino group is strongly activating and ortho/para directing.`,
          },
          {
            step: 2,
            explanation: L`Aniline gives a white precipitate of 2,4,6-tribromoaniline with bromine water.`,
          },
        ],
      ),
      mc(
        L`A primary aliphatic amine treated with nitrous acid at low temperature is best identified by`,
        2,
        ["nitrous_acid", "amine_reactions"],
        [
          L`evolution of nitrogen gas from an unstable aliphatic diazonium salt`,
          L`formation of a stable diazonium salt that can be isolated`,
          L`an amide without gas evolution`,
          L`a nitro compound`,
        ],
        "A",
        {
          B: L`Aromatic diazonium salts are relatively stable at low temperature; aliphatic diazonium salts are unstable and decompose.`,
          C: L`Nitrous acid does not convert primary aliphatic amines into amides.`,
          D: L`Oxidation to nitro compounds is not the usual reaction with nitrous acid.`,
        },
        [
          L`Compare aliphatic and aromatic primary amines.`,
          L`Aliphatic diazonium salts decompose readily.`,
          L`The reliable observation is nitrogen evolution; alcohol commonly forms among the products.`,
        ],
        [
          {
            step: 1,
            explanation: L`Primary aliphatic amines form unstable aliphatic diazonium salts with nitrous acid.`,
          },
          {
            step: 2,
            explanation: L`They decompose with evolution of nitrogen gas; alcohol is commonly formed, but the key diagnostic feature is instability and gas evolution rather than isolation of a stable diazonium salt.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State the reagent mixture used in the carbylamine test.`,
        1,
        ["carbylamine_test", "reagent"],
        parts([["a", L`Give the reagent mixture.`, 1]]),
        [
          L`The test uses chloroform.`,
          L`The medium is strongly basic and alcoholic.`,
          L`Use chloroform and alcoholic $\mathrm{KOH}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`The reagent mixture is chloroform and alcoholic potassium hydroxide.`,
          },
        ],
        [L`Giving Hinsberg reagent instead of carbylamine reagent.`],
      ),
      frq(
        "saq",
        L`How would you distinguish methylamine and dimethylamine using one chemical test? Give the observation for each.`,
        3,
        ["distinguishing_tests", "primary_secondary_amines"],
        parts([
          ["a", L`Name the test.`, 1],
          ["b", L`Observation with methylamine.`, 1],
          ["c", L`Observation with dimethylamine.`, 1],
        ]),
        [
          L`Methylamine is primary; dimethylamine is secondary.`,
          L`Carbylamine test is positive only for primary amines.`,
          L`A foul-smelling isocyanide indicates methylamine.`,
        ],
        [
          {
            part: "a",
            explanation: L`Use the carbylamine test with chloroform and alcoholic $\mathrm{KOH}$.`,
          },
          {
            part: "b",
            explanation: L`Methylamine gives a foul-smelling isocyanide, so the test is positive.`,
          },
          {
            part: "c",
            explanation: L`Dimethylamine does not give the carbylamine test because it is secondary.`,
          },
        ],
        [L`Using Tollens' or Fehling's tests, which are carbonyl tests, not amine-class tests.`],
      ),
      frq(
        "saq",
        L`A student directly nitrates aniline with concentrated nitric acid and sulfuric acid and expects only p-nitroaniline. Explain why this expectation is unsafe and how the amino group is usually protected.`,
        3,
        ["protection", "electrophilic_substitution", "aniline"],
        parts([
          ["a", L`Why does direct nitration not give only the expected para product?`, 1],
          ["b", L`How is the amino group protected?`, 1],
          ["c", L`How is the free amine regenerated?`, 1],
        ]),
        [
          L`Strong acid protonates aniline to anilinium ion.`,
          L`Anilinium ion is meta-directing and deactivating.`,
          L`Acetylation gives acetanilide, which moderates activation and directs mainly para.`,
        ],
        [
          {
            part: "a",
            explanation: L`In strongly acidic nitrating mixture, aniline is protonated to anilinium ion, which changes directive behaviour and gives a mixture.`,
          },
          {
            part: "b",
            explanation: L`Protect $\mathrm{-NH_2}$ by acetylation to form acetanilide.`,
          },
          {
            part: "c",
            explanation: L`After nitration, hydrolyse the amide group to regenerate the free amine.`,
          },
        ],
        [
          L`Ignoring protonation of aniline in strongly acidic medium.`,
          L`Calling acetylation a permanent conversion instead of a protecting step.`,
        ],
      ),
      frq(
        "laq",
        L`Convert aniline to p-bromoaniline as the major product. Give the sequence and explain why protection is needed.`,
        4,
        ["conversion_planning", "protection", "bromination"],
        parts([
          ["a", L`Write the protecting step.`, 1],
          ["b", L`Write the bromination step.`, 1],
          ["c", L`Write the deprotection step.`, 1],
          ["d", L`Explain why direct bromination is unsuitable.`, 1],
        ]),
        [
          L`Convert aniline to acetanilide first.`,
          L`Brominate the protected compound; para product predominates.`,
          L`Hydrolysis regenerates $\mathrm{-NH_2}$. Direct bromination gives 2,4,6-tribromoaniline.`,
        ],
        [
          {
            part: "a",
            explanation: L`Acetylate aniline with acetic anhydride or acetyl chloride to form acetanilide.`,
            math: L`\mathrm{C_6H_5NH_2\rightarrow C_6H_5NHCOCH_3}`,
          },
          {
            part: "b",
            explanation: L`Brominate acetanilide to get mainly p-bromoacetanilide.`,
          },
          {
            part: "c",
            explanation: L`Hydrolyse p-bromoacetanilide to p-bromoaniline.`,
          },
          {
            part: "d",
            explanation: L`Direct bromination of aniline is too fast in bromine water and gives 2,4,6-tribromoaniline.`,
          },
        ],
        [
          L`Directly brominating aniline and stopping at monobromo product.`,
          L`Forgetting to hydrolyse the protecting group.`,
        ],
      ),
      frq(
        "case",
        L`Three liquid samples P, Q and R are known to be methylamine, dimethylamine and trimethylamine. P gives a foul-smelling product with chloroform and alcoholic $\mathrm{KOH}$. Q reacts with benzenesulphonyl chloride but gives an alkali-insoluble product. R does not react with benzenesulphonyl chloride but dissolves in dilute acid.`,
        4,
        ["case_study", "hinsberg_test", "carbylamine_test"],
        parts([
          ["a", L`Identify P.`, 1],
          ["b", L`Identify Q.`, 1],
          ["c", L`Identify R.`, 1],
          ["d", L`Name the test that mainly identifies Q and R.`, 1],
        ]),
        [
          L`Carbylamine test identifies primary amines.`,
          L`Secondary amines form alkali-insoluble sulphonamides in Hinsberg's test.`,
          L`Tertiary amines do not form sulphonamides but dissolve in acid.`,
        ],
        [
          {
            part: "a",
            explanation: L`P is methylamine because it gives the carbylamine test.`,
          },
          {
            part: "b",
            explanation: L`Q is dimethylamine because a secondary amine forms an alkali-insoluble sulphonamide with Hinsberg reagent.`,
          },
          {
            part: "c",
            explanation: L`R is trimethylamine because tertiary amines do not react with benzenesulphonyl chloride but form soluble salts with dilute acid.`,
          },
          {
            part: "d",
            explanation: L`The distinguishing test for Q and R is Hinsberg's test.`,
          },
        ],
        [L`Treating lack of sulphonamide formation as absence of basicity.`],
      ),
    ],
  },
  {
    topicCode: "9.5",
    title: "Diazonium Salts and Aromatic Synthesis",
    subtopic:
      "Prepare benzene diazonium salts at low temperature and use replacement, coupling and deamination reactions for synthetic conversions.",
    mc: [
      mc(
        L`Benzenediazonium chloride is prepared from aniline using`,
        2,
        ["diazotisation", "reagents"],
        [
          L`$\mathrm{NaNO_2/HCl}$ at $\mathrm{273-278\ K}$`,
          L`$\mathrm{Br_2/KOH}$ at room temperature`,
          L`$\mathrm{Sn/HCl}$ followed by alkali`,
          L`$\mathrm{CHCl_3}$ and alcoholic $\mathrm{KOH}$`,
        ],
        "A",
        {
          B: L`$\mathrm{Br_2/KOH}$ is used in Hoffmann bromamide degradation, not diazotisation.`,
          C: L`$\mathrm{Sn/HCl}$ reduces nitrobenzene to aniline.`,
          D: L`Chloroform and alcoholic $\mathrm{KOH}$ are used in the carbylamine test.`,
        },
        [
          L`Diazotisation uses nitrous acid generated in situ.`,
          L`Nitrous acid is made from sodium nitrite and hydrochloric acid.`,
          L`The temperature must be kept low to stabilise the diazonium salt.`,
        ],
        [
          {
            step: 1,
            explanation: L`Aniline reacts with nitrous acid generated from sodium nitrite and hydrochloric acid.`,
          },
          {
            step: 2,
            explanation: L`The reaction is carried out at $\mathrm{273-278\ K}$ to form benzenediazonium chloride.`,
            math: L`\mathrm{C_6H_5NH_2 \xrightarrow[273-278\ K]{NaNO_2/HCl} C_6H_5N_2^+Cl^-}`,
          },
        ],
      ),
      mc(
        L`When an aqueous solution of benzenediazonium chloride is warmed, the main organic product is`,
        2,
        ["diazonium_replacement", "phenol_preparation"],
        [
          L`phenol`,
          L`chlorobenzene`,
          L`aniline`,
          L`benzamide`,
        ],
        "A",
        {
          B: L`Chlorobenzene requires replacement by chloride using cuprous chloride in the Sandmeyer reaction.`,
          C: L`Aniline is the starting amine before diazotisation, not the hydrolysis product.`,
          D: L`No amide group is introduced by warming aqueous diazonium salt.`,
        },
        [
          L`Water can replace the diazonium group.`,
          L`Nitrogen gas is evolved.`,
          L`The product is phenol.`,
        ],
        [
          {
            step: 1,
            explanation: L`The diazonium group is replaced by $\mathrm{-OH}$ on warming with water.`,
          },
          {
            step: 2,
            explanation: L`Phenol forms with evolution of nitrogen gas.`,
            math: L`\mathrm{C_6H_5N_2^+Cl^- + H_2O \rightarrow C_6H_5OH + N_2 + HCl}`,
          },
        ],
      ),
      mc(
        L`The Sandmeyer reagent used to convert benzenediazonium chloride into chlorobenzene is`,
        2,
        ["sandmeyer_reaction", "diazonium_salts"],
        [
          L`$\mathrm{CuCl/HCl}$`,
          L`$\mathrm{KI}$`,
          L`$\mathrm{H_3PO_2}$`,
          L`$\mathrm{HBF_4}$ followed by heat`,
        ],
        "A",
        {
          B: L`Potassium iodide replaces the diazonium group by iodine, not chlorine.`,
          C: L`Hypophosphorous acid replaces the diazonium group by hydrogen.`,
          D: L`Fluorobenzene is obtained by the Balz-Schiemann reaction.`,
        },
        [
          L`Sandmeyer reactions use cuprous salts.`,
          L`For chlorine, use cuprous chloride.`,
          L`The acidic medium is hydrochloric acid.`,
        ],
        [
          {
            step: 1,
            explanation: L`Benzenediazonium chloride reacts with cuprous chloride in hydrochloric acid.`,
          },
          {
            step: 2,
            explanation: L`The diazonium group is replaced by chlorine to form chlorobenzene.`,
          },
        ],
      ),
      mc(
        L`Coupling of benzenediazonium chloride with phenol in alkaline medium gives mainly`,
        3,
        ["azo_coupling", "diazonium_salts"],
        [
          L`p-hydroxyazobenzene`,
          L`benzyl alcohol`,
          L`benzoic acid`,
          L`nitrobenzene`,
        ],
        "A",
        {
          B: L`No side-chain reduction occurs in azo coupling.`,
          C: L`Azo coupling does not oxidise the ring to a carboxylic acid.`,
          D: L`Nitrobenzene is not formed by coupling a diazonium salt with phenol.`,
        },
        [
          L`Phenol in alkaline medium is strongly activated.`,
          L`Diazonium ion behaves as an electrophile in coupling.`,
          L`The azo group $\mathrm{-N=N-}$ links the two aromatic rings, mainly at para position.`,
        ],
        [
          {
            step: 1,
            explanation: L`Phenoxide ion activates the ring toward electrophilic coupling.`,
          },
          {
            step: 2,
            explanation: L`Benzenediazonium ion couples mainly at the para position to form p-hydroxyazobenzene.`,
          },
        ],
      ),
      mc(
        L`The correct route for converting aniline into fluorobenzene is`,
        3,
        ["balz_schiemann", "conversion_planning"],
        [
          L`diazotisation, treatment with $\mathrm{HBF_4}$, then heating`,
          L`direct treatment with $\mathrm{HF}$ at room temperature`,
          L`bromination followed by $\mathrm{AgF}$`,
          L`acetylation followed by hydrolysis`,
        ],
        "A",
        {
          B: L`Direct replacement of $\mathrm{-NH_2}$ by fluorine with $\mathrm{HF}$ is not the standard route.`,
          C: L`This does not give selective conversion of aniline to fluorobenzene in the CBSE diazonium-salt route.`,
          D: L`Acetylation and hydrolysis protect and regenerate $\mathrm{-NH_2}$; they do not introduce fluorine.`,
        },
        [
          L`Aryl fluorides are commonly prepared through diazonium tetrafluoroborates.`,
          L`First make benzenediazonium chloride.`,
          L`Then form the tetrafluoroborate and heat it.`,
        ],
        [
          {
            step: 1,
            explanation: L`First diazotise aniline to benzenediazonium chloride.`,
          },
          {
            step: 2,
            explanation: L`Treat with fluoroboric acid and heat the diazonium tetrafluoroborate to form fluorobenzene.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`What temperature range is used for diazotisation of aniline?`,
        1,
        ["diazotisation", "conditions"],
        parts([["a", L`State the temperature range.`, 1]]),
        [
          L`Diazonium salts decompose at higher temperature.`,
          L`The reaction is done near ice-bath temperature.`,
          L`Use $\mathrm{273-278\ K}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Diazotisation of aniline is carried out at $\mathrm{273-278\ K}$.`,
          },
        ],
        [L`Using high temperature during diazotisation instead of during selected replacement steps.`],
      ),
      frq(
        "saq",
        L`Convert aniline into phenol using a diazonium salt. Give the reagents and main product.`,
        2,
        ["diazonium_replacement", "conversion"],
        parts([
          ["a", L`Write the diazotisation step.`, 1],
          ["b", L`Write the hydrolysis step.`, 1],
        ]),
        [
          L`First form benzenediazonium chloride at low temperature.`,
          L`Then warm with water.`,
          L`The diazonium group is replaced by $\mathrm{-OH}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Treat aniline with $\mathrm{NaNO_2/HCl}$ at $\mathrm{273-278\ K}$ to form benzenediazonium chloride.`,
            math: L`\mathrm{C_6H_5NH_2\rightarrow C_6H_5N_2^+Cl^-}`,
          },
          {
            part: "b",
            explanation: L`Warm the aqueous diazonium salt to form phenol with nitrogen evolution.`,
            math: L`\mathrm{C_6H_5N_2^+Cl^-\xrightarrow{H_2O,\ warm} C_6H_5OH}`,
          },
        ],
        [L`Trying to replace $\mathrm{-NH_2}$ directly by $\mathrm{-OH}$ without diazotisation.`],
      ),
      frq(
        "saq",
        L`Why are diazonium salts important in aromatic synthesis? Give two examples of groups that can replace the diazonium group.`,
        3,
        ["synthetic_importance", "diazonium_salts"],
        parts([
          ["a", L`State the synthetic importance.`, 1],
          ["b", L`Give two replacement examples.`, 2],
        ]),
        [
          L`The diazonium group is a good leaving group as nitrogen gas.`,
          L`It helps introduce substituents that are difficult to introduce directly.`,
          L`Examples include $\mathrm{-Cl}$, $\mathrm{-Br}$, $\mathrm{-I}$, $\mathrm{-CN}$, $\mathrm{-OH}$, $\mathrm{-F}$ and $\mathrm{-H}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Arenediazonium salts are useful because the $\mathrm{-N_2^+}$ group can be replaced by many groups with loss of stable nitrogen gas.`,
          },
          {
            part: "b",
            explanation: L`For example, $\mathrm{CuCl/HCl}$ gives chlorobenzene and warm water gives phenol. Other valid examples include iodide, cyanide, fluoride and hydrogen replacements.`,
          },
        ],
        [L`Saying diazonium salts are useful only for dyes and ignoring replacement reactions.`],
      ),
      frq(
        "laq",
        L`Plan the conversion of aniline to 1,3,5-tribromobenzene. Write the major steps and explain the role of diazotisation.`,
        4,
        ["multi_step_conversion", "diazonium_deamination", "bromination"],
        parts([
          ["a", L`Write the first reaction from aniline.`, 1],
          ["b", L`Write the diazotisation step.`, 1],
          ["c", L`Write the final replacement step.`, 1],
          ["d", L`Explain why this route removes the amino group.`, 1],
        ]),
        [
          L`Aniline brominates strongly with bromine water.`,
          L`The product is 2,4,6-tribromoaniline.`,
          L`Diazotisation followed by $\mathrm{H_3PO_2}$ replaces $\mathrm{-N_2^+}$ by hydrogen.`,
        ],
        [
          {
            part: "a",
            explanation: L`Treat aniline with bromine water to form 2,4,6-tribromoaniline.`,
          },
          {
            part: "b",
            explanation: L`Diazotise 2,4,6-tribromoaniline using $\mathrm{NaNO_2/HCl}$ at $\mathrm{273-278\ K}$.`,
          },
          {
            part: "c",
            explanation: L`Treat the diazonium salt with $\mathrm{H_3PO_2}$ to replace the diazonium group by hydrogen, giving 1,3,5-tribromobenzene.`,
          },
          {
            part: "d",
            explanation: L`Diazotisation converts $\mathrm{-NH_2}$ into $\mathrm{-N_2^+Cl^-}$, and hypophosphorous acid removes it as nitrogen gas while placing hydrogen at that ring carbon.`,
          },
        ],
        [
          L`Stopping at 2,4,6-tribromoaniline and not removing $\mathrm{-NH_2}$.`,
          L`Diazotising before bromination, which would lose the activating/directing amino group.`,
        ],
      ),
      frq(
        "case",
        L`A reaction chart begins with aniline. Step 1 gives salt A at $\mathrm{273-278\ K}$. From A, reagent set I gives phenol, reagent set II gives chlorobenzene, reagent set III gives iodobenzene, and reagent set IV gives benzene.`,
        4,
        ["case_study", "diazonium_replacement"],
        parts([
          ["a", L`Identify A.`, 1],
          ["b", L`Give reagent set I.`, 1],
          ["c", L`Give reagent set II and III.`, 1],
          ["d", L`Give reagent set IV.`, 1],
        ]),
        [
          L`A is the diazonium salt of aniline.`,
          L`Warm water gives phenol.`,
          L`$\mathrm{CuCl/HCl}$ gives chlorobenzene, $\mathrm{KI}$ gives iodobenzene, and $\mathrm{H_3PO_2}$ gives benzene.`,
        ],
        [
          {
            part: "a",
            explanation: L`A is benzenediazonium chloride, $\mathrm{C_6H_5N_2^+Cl^-}$.`,
          },
          {
            part: "b",
            explanation: L`Reagent set I is warm water, which replaces the diazonium group by $\mathrm{-OH}$.`,
          },
          {
            part: "c",
            explanation: L`Reagent set II is $\mathrm{CuCl/HCl}$ and reagent set III is $\mathrm{KI}$.`,
          },
          {
            part: "d",
            explanation: L`Reagent set IV is $\mathrm{H_3PO_2}$, which replaces the diazonium group by hydrogen.`,
          },
        ],
        [L`Mixing up $\mathrm{KI}$ and $\mathrm{CuCl/HCl}$ replacement products.`],
      ),
    ],
  },
];

export const aminesTopics: Topic[] = topicSeeds.map(makeTopic);
