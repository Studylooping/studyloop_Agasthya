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

const COURSE = "cbse-science-10";
const VERSION = "0.2.0";
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const REVIEW_STATUS = "human_review_required" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

type Difficulty = 1 | 2 | 3 | 4 | 5;
type McLetter = (typeof LETTERS)[number];

interface ScienceBoostSpec {
  unit: string;
  topicCode: string;
  title: string;
  focus: string;
  core: string;
  application: string;
  bestMove: string;
  trap: string;
  shortTask: string;
  shortAnswer: string;
  shortMath?: string;
  difficulty: Difficulty;
}

function topicSlug(topicCode: string) {
  return topicCode.replace(".", "-");
}

function hints(items: readonly [string, string, string]): Hint[] {
  return items.map((body, index) => ({
    level: (index + 1) as Hint["level"],
    body,
  }));
}

function step(stepNumber: number, explanation: string, math?: string): SolutionStep {
  return { step: stepNumber, explanation, ...(math ? { math } : {}) };
}

function part(letter: string, promptMarkdown: string, points: number): FrqPart {
  return { letter, promptMarkdown, points };
}

function solutionPart(partLetter: string, explanation: string, math?: string): FrqSolutionPart {
  return { part: partLetter, explanation, ...(math ? { math } : {}) };
}

function rubric(parts: readonly FrqPart[]): FrqRubric {
  return {
    maxPoints: parts.reduce((sum, item) => sum + item.points, 0),
    criteria: parts.map((item) => ({
      part: item.letter,
      points: item.points,
      description: `Correct scientific reasoning for part ${item.letter}, with observation, principle and conclusion where required.`,
    })),
  };
}

function rotateChoiceTexts(
  choices: readonly [string, string, string, string],
  shift: number,
): { texts: readonly [string, string, string, string]; correctLetter: McLetter } {
  const rotated = [...choices];
  for (let count = 0; count < shift % LETTERS.length; count += 1) {
    const first = rotated.shift();
    if (first) rotated.push(first);
  }

  return {
    texts: rotated as [string, string, string, string],
    correctLetter: LETTERS[(LETTERS.length - (shift % LETTERS.length)) % LETTERS.length],
  };
}

function choice(
  letter: McLetter,
  text: string,
  correctLetter: McLetter,
  rationale: string,
): McChoice {
  return {
    letter,
    text,
    isCorrect: letter === correctLetter,
    rationaleIfWrong: letter === correctLetter ? null : rationale,
    misconceptionTag:
      letter === correctLetter ? null : "cbse_class10_science_booster_trap",
  };
}

function mc(
  spec: ScienceBoostSpec,
  localIndex: number,
  difficulty: Difficulty,
  questionLatex: string,
  choices: readonly [string, string, string, string],
  solution: readonly SolutionStep[],
): McSingleItem {
  const rotated = rotateChoiceTexts(
    choices,
    localIndex + Math.round(Number(spec.topicCode.replace(".", ""))),
  );

  return {
    contentId: `${COURSE}.${spec.unit}.t${topicSlug(spec.topicCode)}.mc.${String(200 + localIndex).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: spec.unit,
    topic: spec.topicCode,
    difficulty,
    calculatorAllowed: false,
    skillTags: ["board_booster", "application_reasoning", topicSlug(spec.topicCode)],
    commonMisconceptions: [
      "memorises_the_fact_but_misses_the_observation_condition_or_causal_link",
    ],
    questionLatex,
    choices: LETTERS.map((letter, index) =>
      choice(
        letter,
        rotated.texts[index],
        rotated.correctLetter,
        `This follows the common trap in ${spec.title}: ${spec.trap}.`,
      ),
    ),
    correctLetter: rotated.correctLetter,
    hintLadder: hints([
      "Identify the observation or data given in the question.",
      "Connect it to the principle from the chapter.",
      "Eliminate the option that explains a different process or skips the condition.",
    ]),
    workedSolution: [...solution],
    reviewStatus: REVIEW_STATUS,
    version: VERSION,
    sourceType: SOURCE_TYPE,
  };
}

function frq(
  spec: ScienceBoostSpec,
  localIndex: number,
  responseType: "vsaq" | "saq" | "case" | "laq",
  difficulty: Difficulty,
  questionLatex: string,
  parts: readonly FrqPart[],
  workedSolution: readonly FrqSolutionPart[],
): FrqItem {
  return {
    contentId: `${COURSE}.${spec.unit}.t${topicSlug(spec.topicCode)}.${responseType}.${String(200 + localIndex).padStart(3, "0")}`,
    kind: "frq",
    responseType,
    course: COURSE,
    unit: spec.unit,
    topic: spec.topicCode,
    difficulty,
    calculatorAllowed: false,
    skillTags: ["board_booster", "application_reasoning", topicSlug(spec.topicCode)],
    commonMisconceptions: [
      "states_a_keyword_without_linking_it_to_the_given_observation",
    ],
    questionLatex,
    parts: [...parts],
    hintLadder: hints([
      "Underline the observation, change, graph feature or experimental condition.",
      "Name the correct concept before writing the answer.",
      "Finish with the effect, product, image, trait or safety conclusion asked.",
    ]),
    rubric: rubric(parts),
    commonErrors: [spec.trap],
    workedSolution: [...workedSolution],
    reviewStatus: REVIEW_STATUS,
    version: VERSION,
    sourceType: SOURCE_TYPE,
  };
}

function weightedSupplementalTarget(spec: ScienceBoostSpec): number {
  if (spec.unit === "u1-chemical-substances-nature-behaviour") return 20;
  if (spec.unit === "u2-world-of-living") return 20;
  if (spec.unit === "u3-natural-phenomena") return 16;
  if (spec.unit === "u4-effects-of-current") return 16;
  return 10;
}

function weightedExpansionItems(
  spec: ScienceBoostSpec,
): (McSingleItem | FrqItem)[] {
  const d = spec.difficulty;
  const items: (McSingleItem | FrqItem)[] = [
    mc(
      spec,
      7,
      d,
      L`In a competency-based question from ${spec.title}, which response best connects observation and principle?`,
      [
        spec.core,
        `The final term is enough even if the observation is not explained.`,
        `A memorised exception should be used before checking the condition.`,
        `The common trap is acceptable because it sounds close: ${spec.trap}.`,
      ],
      [
        step(1, L`Class 10 Science board items often reward the observation-principle link.`),
        step(2, spec.core),
      ],
    ),
    mc(
      spec,
      8,
      Math.min(4, d + 1) as Difficulty,
      L`A student writes a one-line answer in ${spec.title} and loses a reasoning mark. What should be added?`,
      [
        `Use the given condition or observation, then ${spec.bestMove}.`,
        `Add a longer definition without using the observation.`,
        `Use a formula from another chapter because the units look similar.`,
        `Select the option that repeats the stem most closely.`,
      ],
      [
        step(1, L`Reasoning marks come from using the actual condition in the stem.`),
        step(2, `The answer should begin by ${spec.bestMove}.`),
      ],
    ),
    frq(
      spec,
      9,
      "vsaq",
      Math.max(2, d - 1) as Difficulty,
      L`Correct this weak answer in ${spec.title}: ${spec.trap}.`,
      [part("a", "Write a corrected answer with one reason.", 2)],
      [
        solutionPart(
          "a",
          `${spec.shortAnswer} The corrected answer uses the observation or condition instead of only naming a term.`,
          spec.shortMath,
        ),
      ],
    ),
    mc(
      spec,
      10,
      d,
      spec.application,
      [
        `First ${spec.bestMove}, then state the conclusion.`,
        `Ignore the observation and write the most familiar word.`,
        `Use the trap directly: ${spec.trap}.`,
        `Choose the answer with the largest number or longest phrase.`,
      ],
      [
        step(1, L`The application item is asking for the first defensible scientific move.`),
        step(2, `The defensible move is to ${spec.bestMove}.`),
      ],
    ),
    frq(
      spec,
      11,
      "saq",
      d,
      spec.shortTask,
      [
        part("a", "Answer the question.", 1),
        part("b", "Justify it using the relevant observation/principle.", 2),
      ],
      [
        solutionPart("a", spec.shortAnswer, spec.shortMath),
        solutionPart("b", spec.core),
      ],
    ),
    frq(
      spec,
      12,
      "case",
      Math.min(4, d + 1) as Difficulty,
      L`A teacher asks for a board-style justification in ${spec.title}, not just a keyword.`,
      [
        part("a", "State the observation or condition used.", 1),
        part("b", "Name the principle/process/law.", 1),
        part("c", "Write the corrected conclusion.", 2),
      ],
      [
        solutionPart("a", spec.bestMove),
        solutionPart("b", spec.focus),
        solutionPart("c", spec.shortAnswer, spec.shortMath),
      ],
    ),
    mc(
      spec,
      13,
      Math.min(4, d + 1) as Difficulty,
      L`Which answer shows above-CBSE rigor in ${spec.title}?`,
      [
        `It identifies the observation, names the principle, and explains the consequence.`,
        `It writes only the name of the chapter concept.`,
        `It adds a diagram label without a reason.`,
        `It uses the common wrong inference: ${spec.trap}.`,
      ],
      [
        step(1, L`Above-CBSE rigor means the answer can be defended from the data.`),
        step(2, spec.core),
      ],
    ),
    frq(
      spec,
      14,
      "laq",
      Math.min(5, d + 1) as Difficulty,
      L`Use ${spec.title} to answer this situation: ${spec.application}`,
      [
        part("a", "Identify the scientific idea.", 1),
        part("b", "Explain using the observation or data.", 2),
        part("c", "Write one common wrong inference and correct it.", 1),
      ],
      [
        solutionPart("a", spec.focus),
        solutionPart("b", spec.shortAnswer, spec.shortMath),
        solutionPart("c", `A common wrong inference is to ${spec.trap}.`),
      ],
    ),
    mc(
      spec,
      15,
      d,
      L`A figure, table or experimental result is given in ${spec.title}. What should be done before choosing an answer?`,
      [
        `Extract the relevant observation/data and connect it to ${spec.focus}.`,
        `Treat the figure as decoration and answer from memory.`,
        `Copy every label without deciding which one matters.`,
        `Pick the option containing the most technical words.`,
      ],
      [
        step(1, L`When a figure or table is included, it should carry information.`),
        step(2, `The relevant idea here is ${spec.focus}.`),
      ],
    ),
    frq(
      spec,
      16,
      "saq",
      Math.min(4, d + 1) as Difficulty,
      L`Write a two-line explanation for ${spec.title}: one line for observation, one line for reason.`,
      [
        part("a", "Observation/condition line.", 1),
        part("b", "Reason/conclusion line.", 2),
      ],
      [
        solutionPart("a", spec.bestMove),
        solutionPart("b", spec.shortAnswer, spec.shortMath),
      ],
    ),
    mc(
      spec,
      17,
      Math.min(4, d + 1) as Difficulty,
      L`Which misconception should be avoided in ${spec.title}?`,
      [
        spec.trap,
        `Using the given observation before naming the process.`,
        `Checking the condition of the law or reaction.`,
        `Writing units where the answer is numerical.`,
      ],
      [
        step(1, L`A dangerous misconception breaks the link between the observation and the conclusion.`),
        step(2, `Here it is: ${spec.trap}.`),
      ],
    ),
    frq(
      spec,
      18,
      "case",
      Math.min(5, d + 1) as Difficulty,
      L`Improve a one-word answer from ${spec.title} into an exam-ready explanation.`,
      [
        part("a", "Name the concept/process/law.", 1),
        part("b", "Add the supporting reason.", 2),
        part("c", "State how the answer avoids the common trap.", 1),
      ],
      [
        solutionPart("a", spec.focus),
        solutionPart("b", spec.shortAnswer, spec.shortMath),
        solutionPart("c", `It avoids the trap of ${spec.trap}.`),
      ],
    ),
    mc(
      spec,
      19,
      d,
      L`What checking habit makes a ${spec.title} answer reliable?`,
      [
        `Check the observation, the principle and the final conclusion.`,
        `Check only whether the final answer is short.`,
        `Check whether the answer repeats a word from the stem.`,
        `Check whether a harder chapter has a similar term.`,
      ],
      [
        step(1, L`Reliable science reasoning moves from observation to principle to conclusion.`),
        step(2, spec.core),
      ],
    ),
    frq(
      spec,
      20,
      "laq",
      Math.min(5, d + 1) as Difficulty,
      L`Write a complete board-style explanation for this ${spec.title} task: ${spec.shortTask}`,
      [
        part("a", "State the concept.", 1),
        part("b", "Write the explanation or calculation.", 2),
        part("c", "Write one caution against a wrong answer.", 1),
      ],
      [
        solutionPart("a", spec.focus),
        solutionPart("b", spec.shortAnswer, spec.shortMath),
        solutionPart("c", `Do not ${spec.trap}.`),
      ],
    ),
  ];

  return items.slice(0, Math.max(0, weightedSupplementalTarget(spec) - 6));
}

function makeTopic(spec: ScienceBoostSpec): Topic {
  const d = spec.difficulty;

  return {
    topicCode: spec.topicCode,
    title: spec.title,
    subtopic: `${spec.focus} Extra CBSE-style application and reasoning practice.`,
    items: [
      mc(
        spec,
        1,
        Math.max(2, d - 1) as Difficulty,
        L`In ${spec.title}, which explanation best matches the observation in a board-answer setting?`,
        [
          spec.core,
          `The final keyword is enough even if the observation is not explained.`,
          `A memorised exception should be used before checking the given condition.`,
          `The conclusion should be chosen from the largest number in the question.`,
        ],
        [
          step(1, L`Board answers require the observation and principle to agree.`),
          step(2, spec.core),
        ],
      ),
      mc(
        spec,
        2,
        d,
        spec.application,
        [
          `First ${spec.bestMove}.`,
          `Ignore the observation and choose the most familiar term.`,
          `Use a formula or definition from another topic because it looks similar.`,
          `Choose the option that repeats the stem without explaining the cause.`,
        ],
        [
          step(1, L`This item tests the correct first scientific decision.`),
          step(2, `The useful first move is to ${spec.bestMove}.`),
        ],
      ),
      mc(
        spec,
        3,
        Math.min(4, d + 1) as Difficulty,
        L`A student loses a mark in ${spec.title} because the answer ${spec.trap}. Which correction is best?`,
        [
          `Link the observation to the correct principle, then state the conclusion.`,
          `Keep the same explanation and change only one scientific word.`,
          `Write a longer answer without naming the relevant observation.`,
          `Use a diagram label as the full answer even when a reason is asked.`,
        ],
        [
          step(1, `The mistake is: ${spec.trap}.`),
          step(2, L`The repair must connect observation, principle and conclusion.`),
        ],
      ),
      frq(
        spec,
        4,
        "vsaq",
        d,
        spec.shortTask,
        [part("a", "Answer with one key reason or calculation.", 2)],
        [solutionPart("a", spec.shortAnswer, spec.shortMath)],
      ),
      frq(
        spec,
        5,
        "case",
        Math.min(4, d + 1) as Difficulty,
        L`A teacher asks students to justify an answer from ${spec.title}, not only name the chapter term. The student's rough answer gives the final term but skips the observation.`,
        [
          part("a", "State the observation or condition that must be used.", 1),
          part("b", "Name the principle or process.", 1),
          part("c", "Write the corrected conclusion.", 2),
        ],
        [
          solutionPart("a", spec.bestMove),
          solutionPart("b", spec.core),
          solutionPart("c", spec.shortAnswer, spec.shortMath),
        ],
      ),
      frq(
        spec,
        6,
        "laq",
        Math.min(5, d + 1) as Difficulty,
        L`Write a board-style answer for the following ${spec.title} situation: ${spec.application}`,
        [
          part("a", "Identify the scientific idea being tested.", 1),
          part("b", "Explain the reasoning using the data or observation.", 2),
          part("c", "State one common wrong inference and correct it.", 1),
        ],
        [
          solutionPart("a", spec.focus),
          solutionPart("b", spec.shortAnswer, spec.shortMath),
          solutionPart("c", `Avoid this: ${spec.trap}.`),
        ],
      ),
      ...weightedExpansionItems(spec),
    ],
  };
}

const specs: ScienceBoostSpec[] = [
  {
    unit: "u1-chemical-substances-nature-behaviour",
    topicCode: "1.1",
    title: "Chemical Reactions and Equations",
    focus: "balancing equations and identifying reaction evidence",
    core: "A chemical equation must conserve atoms of every element and should be balanced before using it for inference.",
    application: L`A strip of iron placed in copper sulphate solution turns the solution pale green and deposits copper. What should be checked first?`,
    bestMove: "identify displacement using the reactivity order and then write the balanced equation",
    trap: "names displacement but does not conserve atoms in the equation",
    shortTask: L`Balance: $\mathrm{Fe+CuSO_4\rightarrow FeSO_4+Cu}$ and name the reaction type.`,
    shortAnswer: L`It is already balanced, and iron displaces copper from copper sulphate, so it is a displacement reaction.`,
    difficulty: 3,
  },
  {
    unit: "u1-chemical-substances-nature-behaviour",
    topicCode: "1.2",
    title: "Acids, Bases and Salts",
    focus: "pH, neutralisation, gas tests and salt preparation",
    core: "The pH value, indicator colour and evolved gas must be interpreted together before naming the substance or reaction.",
    application: L`A solution turns blue litmus red and reacts with zinc to release a gas that burns with a pop sound. What is the best inference?`,
    bestMove: "identify the solution as acidic and confirm hydrogen gas from the pop test",
    trap: "uses only litmus colour and ignores the gas test",
    shortTask: L`Why does an acid react with a metal carbonate to give brisk effervescence?`,
    shortAnswer: L`Carbon dioxide is produced during the acid-carbonate reaction, causing brisk effervescence.`,
    difficulty: 3,
  },
  {
    unit: "u1-chemical-substances-nature-behaviour",
    topicCode: "1.3",
    title: "Metals and Non-metals",
    focus: "reactivity series, displacement and properties",
    core: "A more reactive metal can displace a less reactive metal from its salt solution.",
    application: L`A student adds zinc granules to copper sulphate solution but adds silver to zinc sulphate solution in another test. Which observation needs the reactivity series?`,
    bestMove: "compare the reacting metal with the metal ion in solution",
    trap: "assumes every metal displaces every other metal from solution",
    shortTask: L`Why can zinc displace copper from copper sulphate solution?`,
    shortAnswer: L`Zinc is more reactive than copper, so zinc forms zinc sulphate and copper is displaced.`,
    difficulty: 3,
  },
  {
    unit: "u1-chemical-substances-nature-behaviour",
    topicCode: "1.4",
    title: "Carbon and Its Compounds",
    focus: "bonding, functional groups and homologous series",
    core: "Carbon forms covalent bonds and compounds in a homologous series differ by $-\mathrm{CH_2}-$ with similar chemical properties.",
    application: L`Two compounds have formulae $\mathrm{C_2H_5OH}$ and $\mathrm{C_3H_7OH}$. What should be compared before calling them homologues?`,
    bestMove: "check the same functional group and the difference of one $-\mathrm{CH_2}-$ unit",
    trap: "uses only the number of carbon atoms and ignores the functional group",
    shortTask: L`State why ethanoic acid and ethanol are not members of the same homologous series.`,
    shortAnswer: L`They have different functional groups: ethanoic acid has $-\mathrm{COOH}$ while ethanol has $-\mathrm{OH}$.`,
    difficulty: 3,
  },
  {
    unit: "u1-chemical-substances-nature-behaviour",
    topicCode: "1.5",
    title: "Integrated Practical Chemistry",
    focus: "linking observations to chemical conclusions",
    core: "Practical conclusions must be based on controlled observations such as colour change, gas evolution, precipitate formation or pH change.",
    application: L`A student records bubbles but no gas test while reacting dilute acid with a metal. What is missing from the conclusion?`,
    bestMove: "test the gas before identifying it",
    trap: "identifies a gas from bubbles alone without a confirmatory test",
    shortTask: L`Why is a control or confirmatory test important in a chemistry practical answer?`,
    shortAnswer: L`It prevents guessing; the observation is linked to a specific chemical property or product.`,
    difficulty: 3,
  },
  {
    unit: "u2-world-of-living",
    topicCode: "2.1",
    title: "Nutrition and Respiration",
    focus: "photosynthesis, human digestion and respiration pathways",
    core: "Nutrition or respiration answers should connect the organ/process to the substance being transported, broken down or released.",
    application: L`A destarched leaf is partly covered with black paper and then tested with iodine after sunlight exposure. What is being tested?`,
    bestMove: "connect light exposure to starch formation in photosynthesis",
    trap: "treats iodine as testing for chlorophyll instead of starch",
    shortTask: L`Why is the leaf destarched before the photosynthesis experiment?`,
    shortAnswer: L`Destarching removes previously stored starch, so any starch detected after the test is due to photosynthesis during the experiment.`,
    difficulty: 3,
  },
  {
    unit: "u2-world-of-living",
    topicCode: "2.2",
    title: "Transport and Excretion",
    focus: "double circulation, transport in plants and nephron function",
    core: "Transport questions require following the pathway and identifying what each vessel, tissue or organ carries.",
    application: L`Blood from the lungs enters the heart before being pumped to the body. Which circulation idea explains this route?`,
    bestMove: "trace pulmonary and systemic circulation separately",
    trap: "mixes oxygenated and deoxygenated pathways",
    shortTask: L`Why is double circulation useful in mammals?`,
    shortAnswer: L`It keeps oxygenated and deoxygenated blood largely separate and maintains efficient oxygen supply to body tissues.`,
    difficulty: 3,
  },
  {
    unit: "u2-world-of-living",
    topicCode: "2.3",
    title: "Control and Coordination",
    focus: "reflex arcs, hormones and plant responses",
    core: "A response must be linked to the correct control pathway: nervous impulses for rapid responses and hormones for slower chemical coordination.",
    application: L`A person withdraws a hand immediately after touching a hot object. Which route must be identified first?`,
    bestMove: "trace the reflex arc from receptor to spinal cord to effector",
    trap: "says the brain consciously decides before the withdrawal",
    shortTask: L`Why is a reflex action faster than a voluntary action?`,
    shortAnswer: L`The impulse is processed through the spinal cord reflex arc, so the response occurs before detailed conscious processing by the brain.`,
    difficulty: 3,
  },
  {
    unit: "u2-world-of-living",
    topicCode: "2.4",
    title: "Reproduction and Reproductive Health",
    focus: "flower reproduction, human reproduction and health decisions",
    core: "The answer should identify the reproductive structure, its function and the consequence of fertilisation or health practice.",
    application: L`A flower is emasculated before artificial pollination. What must be prevented by this step?`,
    bestMove: "identify removal of anthers to prevent self-pollination",
    trap: "confuses emasculation with removing the stigma",
    shortTask: L`What is the function of the stigma in a flower?`,
    shortAnswer: L`The stigma receives pollen grains during pollination.`,
    difficulty: 3,
  },
  {
    unit: "u2-world-of-living",
    topicCode: "2.5",
    title: "Heredity and Sex Determination",
    focus: "Mendelian ratios, inherited traits and sex chromosomes",
    core: "A heredity answer should distinguish genotype from phenotype and use the cross or chromosome combination given.",
    application: L`A cross between two heterozygous tall pea plants is analysed. What should be set up before writing the ratio?`,
    bestMove: "write the gametes and complete the monohybrid cross",
    trap: "uses the visible trait alone and ignores allele combinations",
    shortTask: L`In humans, why does the father determine the sex of the child?`,
    shortAnswer: L`The mother contributes only an $X$ chromosome, while the father can contribute either $X$ or $Y$. The sperm chromosome decides $XX$ or $XY$.`,
    difficulty: 4,
  },
  {
    unit: "u3-natural-phenomena",
    topicCode: "3.1",
    title: "Reflection by Spherical Mirrors",
    focus: "ray diagrams and image nature",
    core: "Image nature is decided from object position, mirror type and principal rays, not from mirror name alone.",
    application: L`An object is placed between the focus and pole of a concave mirror. What must be concluded from the ray diagram?`,
    bestMove: "locate the object relative to focus and pole",
    trap: "assumes every concave mirror image is real and inverted",
    shortTask: L`State the nature of image formed by a concave mirror when the object is between $F$ and $P$.`,
    shortAnswer: L`The image is virtual, erect and magnified, formed behind the mirror.`,
    difficulty: 3,
  },
  {
    unit: "u3-natural-phenomena",
    topicCode: "3.2",
    title: "Mirror Formula and Magnification",
    focus: "sign convention, mirror formula and image interpretation",
    core: "The sign convention must be applied before substituting in the mirror formula or magnification relation.",
    application: L`For a concave mirror, a student substitutes $f=+15$ cm in the mirror formula. What should be checked first?`,
    bestMove: "apply the Cartesian sign convention to the focal length and object distance",
    trap: "uses positive focal length for a concave mirror under Cartesian convention",
    shortTask: L`A concave mirror has $f=-15$ cm and $u=-30$ cm. Find $v$.`,
    shortAnswer: L`Using $\frac1f=\frac1v+\frac1u$, $\frac1{-15}=\frac1v+\frac1{-30}$, so $v=-30$ cm.`,
    shortMath: L`v=-30\text{ cm}`,
    difficulty: 4,
  },
  {
    unit: "u3-natural-phenomena",
    topicCode: "3.3",
    title: "Refraction and Refractive Index",
    focus: "bending of light and refractive index",
    core: "Refraction depends on change in speed between media, so direction of bending is linked to optical density.",
    application: L`A ray enters glass from air obliquely. Which comparison should be made before drawing the refracted ray?`,
    bestMove: "compare optical density and speed in air and glass",
    trap: "draws the ray away from the normal when it enters denser glass",
    shortTask: L`Why does a ray bend towards the normal when it enters glass from air?`,
    shortAnswer: L`Light slows down in optically denser glass, so the refracted ray bends towards the normal.`,
    difficulty: 3,
  },
  {
    unit: "u3-natural-phenomena",
    topicCode: "3.4",
    title: "Spherical Lenses and Power",
    focus: "lens formula, power and image formation",
    core: "Lens problems require sign convention and the relation $P=1/f$ with focal length in metres.",
    application: L`A lens has focal length $-50$ cm. What must be done before calculating its power?`,
    bestMove: "convert focal length to metres and keep the negative sign",
    trap: "uses centimetres directly in $P=1/f$",
    shortTask: L`Find the power of a lens of focal length $-50$ cm.`,
    shortAnswer: L`The focal length is $-0.50$ m, so $P=1/f=-2$ D.`,
    shortMath: L`P=-2\text{ D}`,
    difficulty: 3,
  },
  {
    unit: "u3-natural-phenomena",
    topicCode: "3.5",
    title: "Human Eye, Prism and Scattering",
    focus: "vision defects, dispersion and scattering",
    core: "The correction of an eye defect is chosen from where the image forms and which lens shifts it back to the retina.",
    application: L`A student sees nearby objects clearly but distant objects appear blurred. What should be identified before naming the lens?`,
    bestMove: "recognise myopia and locate the image before the retina",
    trap: "uses convex lens correction for myopia",
    shortTask: L`Which lens corrects myopia and why?`,
    shortAnswer: L`A concave lens corrects myopia because it diverges incoming rays so the eye lens forms the image on the retina.`,
    difficulty: 3,
  },
  {
    unit: "u4-effects-of-current",
    topicCode: "4.1",
    title: "Current, Potential Difference and Ohm's Law",
    focus: "V-I relation, resistance and graph interpretation",
    core: "Ohm's law applies when temperature and physical conditions remain constant, and resistance is the slope relation from $V=IR$.",
    application: L`A $V-I$ graph is a straight line through the origin only for one wire at constant temperature. What conclusion is justified?`,
    bestMove: "use the graph slope to infer constant resistance",
    trap: "uses Ohm's law without checking constant physical conditions",
    shortTask: L`A resistor has $V=6$ V when $I=0.5$ A. Find $R$.`,
    shortAnswer: L`Using $R=V/I$, $R=6/0.5=12\,\Omega$.`,
    shortMath: L`R=12\,\Omega`,
    difficulty: 3,
  },
  {
    unit: "u4-effects-of-current",
    topicCode: "4.2",
    title: "Resistance, Resistivity and Resistor Combinations",
    focus: "series-parallel combinations and resistivity",
    core: "Equivalent resistance depends on connection type: series adds directly while parallel adds reciprocals.",
    application: L`Two $6\,\Omega$ resistors are connected in parallel and then joined in series with $3\,\Omega$. What should be found first?`,
    bestMove: "reduce the parallel pair before adding the series resistor",
    trap: "adds all resistances directly even when a parallel branch is present",
    shortTask: L`Find the equivalent resistance of two $6\,\Omega$ resistors in parallel.`,
    shortAnswer: L`For equal parallel resistors, $R_{\text{eq}}=6/2=3\,\Omega$.`,
    shortMath: L`R_{\text{eq}}=3\,\Omega`,
    difficulty: 4,
  },
  {
    unit: "u4-effects-of-current",
    topicCode: "4.3",
    title: "Heating Effect and Electric Power",
    focus: "Joule heating, power and energy consumption",
    core: "Heating and power questions require choosing among $H=I^2Rt$, $P=VI$, $P=I^2R$ and energy in kWh according to the data.",
    application: L`A heater is rated $1000$ W and used for $2$ h. Which unit conversion is needed for the electricity bill?`,
    bestMove: "convert watt to kilowatt and multiply by time in hours",
    trap: "uses joules and kWh as if they were the same unit",
    shortTask: L`Find the energy consumed by a $1.5$ kW heater used for $2$ h.`,
    shortAnswer: L`Energy $=1.5\times2=3$ kWh.`,
    shortMath: L`E=3\text{ kWh}`,
    difficulty: 3,
  },
  {
    unit: "u4-effects-of-current",
    topicCode: "4.4",
    title: "Magnetic Effects of Electric Current",
    focus: "field direction, solenoid field and force on a conductor",
    core: "Magnetic direction questions require the right-hand thumb rule or Fleming's left-hand rule according to the situation.",
    application: L`A current-carrying straight conductor is held vertically upward. What rule should be used to find the direction of field lines?`,
    bestMove: "use the right-hand thumb rule with thumb along current",
    trap: "uses Fleming's left-hand rule for field around a straight conductor",
    shortTask: L`State the rule for finding magnetic field direction around a straight current-carrying conductor.`,
    shortAnswer: L`Use the right-hand thumb rule: thumb points in the direction of current and curled fingers show magnetic field direction.`,
    difficulty: 3,
  },
  {
    unit: "u4-effects-of-current",
    topicCode: "4.5",
    title: "AC, DC and Domestic Electric Circuits",
    focus: "household wiring, fuse, earthing and AC frequency",
    core: "Domestic circuit safety answers must identify live, neutral, earth and fuse functions correctly.",
    application: L`A metal-cased appliance is connected without earthing. What safety risk should be explained?`,
    bestMove: "link leakage current to the need for a low-resistance earth path",
    trap: "says earthing only increases appliance power",
    shortTask: L`Why is a fuse connected in series with the live wire?`,
    shortAnswer: L`The fuse melts when current exceeds the safe value, breaking the live circuit and protecting the appliance and user.`,
    difficulty: 3,
  },
];

function byUnit(_unit: string): Topic[] {
  // This shares the incomplete/cueing generator used in Class IX. Keep the
  // source for editorial repair, but do not publish these generated exercises.
  return [];
}

export const chemicalSubstancesNatureBehaviourSupplementalTopics = byUnit(
  "u1-chemical-substances-nature-behaviour",
);
export const worldOfLivingXSupplementalTopics = byUnit("u2-world-of-living");
export const naturalPhenomenaXSupplementalTopics = byUnit(
  "u3-natural-phenomena",
);
export const effectsOfCurrentXSupplementalTopics = byUnit(
  "u4-effects-of-current",
);
