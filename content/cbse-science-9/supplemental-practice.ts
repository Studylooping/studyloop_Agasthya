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
import { repairedTopicsFor } from "./repaired-practice";

const COURSE = "cbse-science-9";
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
      description: `Correct Class 9 scientific reasoning for part ${item.letter}, with evidence from the given situation.`,
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
      letter === correctLetter ? null : "cbse_class9_science_booster_trap",
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
    skillTags: ["board_booster", "class9_foundation", topicSlug(spec.topicCode)],
    commonMisconceptions: [
      "uses_a_keyword_without_matching_the_given_observation_or_data",
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
      "Read the observation or data first.",
      "Name the process, property or law that explains it.",
      "Check that the final answer is not just a memorised word from another topic.",
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
    skillTags: ["board_booster", "class9_foundation", topicSlug(spec.topicCode)],
    commonMisconceptions: [
      "answers_from_memory_without_using_the_given_data_or_observation",
    ],
    questionLatex,
    parts: [...parts],
    hintLadder: hints([
      "Write the key observation from the stem.",
      "Connect it to the named process, property or formula.",
      "Give a complete conclusion in one or two sentences.",
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
  if (spec.unit === "u1-world-of-living") return 20;
  if (spec.unit === "u2-matter-nature-behaviour") return 20;
  if (spec.unit === "u3-motion-force-work-sound") return 20;
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
      L`In a board-style observation from ${spec.title}, which reasoning is strongest?`,
      [
        spec.core,
        `The answer should use the longest scientific term even if the observation does not support it.`,
        `The answer can ignore the data because the chapter name already gives the conclusion.`,
        `The common trap should be used because it sounds familiar: ${spec.trap}.`,
      ],
      [
        step(1, L`A science answer is strongest when it links observation to principle.`),
        step(2, spec.core),
      ],
    ),
    mc(
      spec,
      8,
      Math.min(4, d + 1) as Difficulty,
      L`A student answers a ${spec.title} question from memory and loses a mark. What should have been used first?`,
      [
        `The given observation or data, then ${spec.bestMove}.`,
        `Only the definition heading from the textbook.`,
        `A formula from another chapter with similar units.`,
        `The option that repeats most words from the stem.`,
      ],
      [
        step(1, L`CBSE application items usually hide the concept inside the observation.`),
        step(2, `The first useful move is to ${spec.bestMove}.`),
      ],
    ),
    frq(
      spec,
      9,
      "vsaq",
      Math.max(2, d - 1) as Difficulty,
      L`Correct this incomplete answer in ${spec.title}: ${spec.trap}.`,
      [part("a", "Write a corrected answer with one reason.", 2)],
      [
        solutionPart(
          "a",
          `${spec.shortAnswer} The correction is based on using the observation before naming the concept.`,
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
        `First ${spec.bestMove}, then connect it to the scientific principle.`,
        `Choose the answer that only names a process without a reason.`,
        `Ignore the observation and write a definition from memory.`,
        `Use the trap because it contains a familiar word: ${spec.trap}.`,
      ],
      [
        step(1, L`This application needs a first decision, then a scientific explanation.`),
        step(2, `Begin by ${spec.bestMove}.`),
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
        part("b", "Add the observation-principle link.", 2),
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
      L`A class report on ${spec.title} gives a correct term but no evidence from the situation.`,
      [
        part("a", "State the evidence or observation to use.", 1),
        part("b", "Name the idea/process/property.", 1),
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
      L`Which answer would be considered above basic level in ${spec.title}?`,
      [
        `It uses the observation, names the concept, and explains the cause or consequence.`,
        `It writes only the final keyword.`,
        `It draws a label without explaining what the label means.`,
        `It replaces the observation with the common trap: ${spec.trap}.`,
      ],
      [
        step(1, L`Above-basic science answers include a causal link.`),
        step(2, spec.core),
      ],
    ),
    frq(
      spec,
      14,
      "laq",
      Math.min(5, d + 1) as Difficulty,
      L`Use ${spec.title} to answer the situation: ${spec.application}`,
      [
        part("a", "Identify the concept.", 1),
        part("b", "Explain using the data or observation.", 2),
        part("c", "Mention the common wrong inference.", 1),
      ],
      [
        solutionPart("a", spec.focus),
        solutionPart("b", spec.shortAnswer, spec.shortMath),
        solutionPart("c", `The common wrong inference is to ${spec.trap}.`),
      ],
    ),
    mc(
      spec,
      15,
      d,
      L`A diagram or table appears in a ${spec.title} question. What should the student do before answering?`,
      [
        `Read the labelled observation/data and connect it to ${spec.focus}.`,
        `Ignore the diagram because diagrams are only decorative.`,
        `Copy every label without deciding which one is relevant.`,
        `Choose the answer that sounds most technical.`,
      ],
      [
        step(1, L`Figures and tables in StudyLoop questions are meant to carry information when included.`),
        step(2, `The relevant idea here is ${spec.focus}.`),
      ],
    ),
    frq(
      spec,
      16,
      "saq",
      Math.min(4, d + 1) as Difficulty,
      L`Write a two-line board answer for ${spec.title}: first the observation, then the reason.`,
      [
        part("a", "Observation/data line.", 1),
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
      L`Which misconception is most dangerous in ${spec.title}?`,
      [
        spec.trap,
        `Writing the answer with correct units where needed.`,
        `Using the observation before the definition.`,
        `Checking whether the conclusion matches the data.`,
      ],
      [
        step(1, L`The dangerous misconception is the one that breaks the observation-to-conclusion link.`),
        step(2, `Here that misconception is: ${spec.trap}.`),
      ],
    ),
    frq(
      spec,
      18,
      "case",
      Math.min(5, d + 1) as Difficulty,
      L`A student must improve a one-word answer from ${spec.title} into an exam-ready explanation.`,
      [
        part("a", "State the one-word answer/concept.", 1),
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
      L`What is the correct checking habit for a calculation or inference in ${spec.title}?`,
      [
        `Check the observation, the principle and the final conclusion.`,
        `Check only whether the final answer is short.`,
        `Check whether the answer uses a word from the question.`,
        `Check whether a more advanced chapter has a similar term.`,
      ],
      [
        step(1, L`Good checking in science follows observation, principle and conclusion.`),
        step(2, spec.core),
      ],
    ),
    frq(
      spec,
      20,
      "laq",
      Math.min(5, d + 1) as Difficulty,
      L`Write a complete explanation for this ${spec.title} task: ${spec.shortTask}`,
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
    subtopic: `${spec.focus} Additional CBSE-style practice with graded reasoning.`,
    items: [
      mc(
        spec,
        1,
        Math.max(2, d - 1) as Difficulty,
        L`Which statement best supports a correct answer in ${spec.title}?`,
        [
          spec.core,
          `A definition alone is enough even if it does not match the observation.`,
          `The answer should use the longest scientific word in the chapter.`,
          `The result should be guessed from the most familiar diagram label.`,
        ],
        [step(1, L`Use the observation, then connect it to the principle.`), step(2, spec.core)],
      ),
      mc(
        spec,
        2,
        d,
        spec.application,
        [
          `First ${spec.bestMove}.`,
          `Ignore the data and write the nearest memorised definition.`,
          `Use a different chapter's formula because it has similar units.`,
          `Choose the answer that only repeats the question.`,
        ],
        [
          step(1, L`This is an application item, so the first move matters.`),
          step(2, `Start by ${spec.bestMove}.`),
        ],
      ),
      mc(
        spec,
        3,
        Math.min(4, d + 1) as Difficulty,
        L`A student's answer in ${spec.title} is incomplete because it ${spec.trap}. What should be added?`,
        [
          `Add the observation-to-principle link and then state the conclusion.`,
          `Add more labels without explaining the process.`,
          `Replace the answer with a harder term from Class 10.`,
          `Remove the reason and keep only the final word.`,
        ],
        [step(1, `The missing part is: ${spec.trap}.`), step(2, spec.core)],
      ),
      frq(
        spec,
        4,
        "vsaq",
        d,
        spec.shortTask,
        [part("a", "Answer briefly with a reason.", 2)],
        [solutionPart("a", spec.shortAnswer, spec.shortMath)],
      ),
      frq(
        spec,
        5,
        "case",
        Math.min(4, d + 1) as Difficulty,
        L`A Class 9 student writes a one-word answer for a ${spec.title} observation. Improve it into a board-style response.`,
        [
          part("a", "State the key observation or data used.", 1),
          part("b", "Name the concept or formula.", 1),
          part("c", "Write the corrected conclusion.", 2),
        ],
        [
          solutionPart("a", spec.bestMove),
          solutionPart("b", spec.focus),
          solutionPart("c", spec.shortAnswer, spec.shortMath),
        ],
      ),
      frq(
        spec,
        6,
        "laq",
        Math.min(5, d + 1) as Difficulty,
        L`Use the idea from ${spec.title} to answer this situation: ${spec.application}`,
        [
          part("a", "Identify the concept.", 1),
          part("b", "Explain the reasoning.", 2),
          part("c", "Mention one common wrong answer and correct it.", 1),
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
    unit: "u1-world-of-living",
    topicCode: "1.1",
    title: "Cell Structure and Cell Processes",
    focus: "cell organelles, osmosis and division",
    core: "A cell-process answer must connect the structure or membrane condition to the movement or function observed.",
    application: L`A plant cell placed in a concentrated sugar solution shrinks away from the cell wall. What should be identified first?`,
    bestMove: "compare water concentration inside and outside the cell",
    trap: "calls the change diffusion but does not mention water movement",
    shortTask: L`Why does plasmolysis occur in a concentrated solution?`,
    shortAnswer: L`Water moves out of the cell by osmosis, so the protoplast shrinks away from the cell wall.`,
    difficulty: 3,
  },
  {
    unit: "u1-world-of-living",
    topicCode: "1.2",
    title: "Plant and Animal Tissues",
    focus: "structure-function links in tissues",
    core: "Tissue identification should use structure and function together, not one familiar word alone.",
    application: L`A tissue has long cells with thick lignified walls and helps conduct water. Which feature should guide the answer?`,
    bestMove: "link lignified tubes to xylem conduction and support",
    trap: "chooses phloem only because both are vascular tissues",
    shortTask: L`Why are xylem vessels suited for water conduction?`,
    shortAnswer: L`They form long tube-like dead cells with lignified walls, helping water conduction and mechanical support.`,
    difficulty: 3,
  },
  {
    unit: "u1-world-of-living",
    topicCode: "1.3",
    title: "Reproduction in Plants and Animals",
    focus: "asexual and sexual reproduction with life-cycle reasoning",
    core: "Reproduction answers should identify parent number, gamete involvement and variation.",
    application: L`A new plant grows from a potato tuber and is genetically similar to the parent. What should be inferred?`,
    bestMove: "identify vegetative propagation as asexual reproduction",
    trap: "calls every new plant growth sexual reproduction",
    shortTask: L`Give one reason vegetative propagation is useful in agriculture.`,
    shortAnswer: L`It produces many plants quickly with the desired traits of the parent plant.`,
    difficulty: 3,
  },
  {
    unit: "u1-world-of-living",
    topicCode: "1.4",
    title: "Diversity and Classification",
    focus: "classification keys and major groups",
    core: "Classification is based on observable shared characters arranged from broad to specific groups.",
    application: L`An organism has a backbone, scales and breathes using lungs. What should be checked before naming the group?`,
    bestMove: "match the characters to the vertebrate class features",
    trap: "uses habitat alone as the basis of classification",
    shortTask: L`Why is classification useful in studying biodiversity?`,
    shortAnswer: L`It organises organisms by shared features, making comparison, identification and prediction of traits easier.`,
    difficulty: 3,
  },
  {
    unit: "u1-world-of-living",
    topicCode: "1.5",
    title: "Integrated Biology and Practical Reasoning",
    focus: "microscope observations and biological inference",
    core: "A practical biology answer should separate what is observed from what is inferred.",
    application: L`A slide shows rectangular cells with a distinct cell wall and green bodies. What should be concluded carefully?`,
    bestMove: "identify plant cells from cell wall and chloroplast-like green bodies",
    trap: "names an organelle without using the visible evidence",
    shortTask: L`Why should a labelled biological diagram include only visible or taught parts?`,
    shortAnswer: L`Labels must match observable or syllabus-taught structures; adding unsupported labels can make the inference wrong.`,
    difficulty: 3,
  },
  {
    unit: "u2-matter-nature-behaviour",
    topicCode: "2.1",
    title: "Mixtures, Solutions and Concentration",
    focus: "solution properties and concentration calculations",
    core: "Mixture identification uses uniformity, particle visibility, scattering and stability.",
    application: L`A liquid mixture looks uniform and does not scatter a beam of light. Which property should be used first?`,
    bestMove: "identify it as a true solution using uniformity and no Tyndall effect",
    trap: "calls every uniform mixture a colloid",
    shortTask: L`A solution contains $5$ g salt in $95$ g water. Find the mass percentage of salt.`,
    shortAnswer: L`Mass of solution $=100$ g, so mass percentage $=5/100\times100=5\%$.`,
    shortMath: L`5\%`,
    difficulty: 3,
  },
  {
    unit: "u2-matter-nature-behaviour",
    topicCode: "2.2",
    title: "Separation Techniques and Solubility",
    focus: "choosing a separation method from properties",
    core: "A separation method is selected from differences in size, solubility, boiling point, magnetism or sublimation.",
    application: L`A mixture contains ammonium chloride, sand and common salt. What should be separated first?`,
    bestMove: "use sublimation for ammonium chloride before dissolving salt",
    trap: "dissolves the whole mixture first and loses the sublimable component",
    shortTask: L`Why is crystallisation better than evaporation for obtaining pure crystals from a solution?`,
    shortAnswer: L`Crystallisation gives purer crystals because impurities remain in the mother liquor instead of being left mixed with the solid.`,
    difficulty: 3,
  },
  {
    unit: "u2-matter-nature-behaviour",
    topicCode: "2.3",
    title: "Atomic Models and Electronic Arrangement",
    focus: "shell filling and model interpretation",
    core: "Electronic arrangement should follow shell capacity and atomic number.",
    application: L`An atom has atomic number $12$. What must be written before deciding its valency?`,
    bestMove: "write the shell distribution as $2,8,2$",
    trap: "uses mass number as the number of electrons",
    shortTask: L`Write the electronic configuration of magnesium, atomic number $12$.`,
    shortAnswer: L`Magnesium has 12 electrons, so the shell distribution is $2,8,2$.`,
    shortMath: L`2,8,2`,
    difficulty: 3,
  },
  {
    unit: "u2-matter-nature-behaviour",
    topicCode: "2.4",
    title: "Atomic Number, Mass Number and Valency",
    focus: "protons, neutrons, electrons, isotopes and valency",
    core: "Atomic number gives protons and, for a neutral atom, electrons; mass number gives protons plus neutrons.",
    application: L`An atom has atomic number $17$ and mass number $35$. What should be found before identifying neutrons?`,
    bestMove: "subtract atomic number from mass number",
    trap: "adds atomic number and mass number to get neutrons",
    shortTask: L`Find the number of neutrons in $^{35}_{17}\mathrm{Cl}$.`,
    shortAnswer: L`Neutrons $=35-17=18$.`,
    shortMath: L`18`,
    difficulty: 3,
  },
  {
    unit: "u2-matter-nature-behaviour",
    topicCode: "2.5",
    title: "Chemical Formulae, Masses and Laws",
    focus: "valency crossing, molecular mass and conservation of mass",
    core: "Chemical formulae use valency balance and masses must obey conservation in a closed reaction.",
    application: L`A compound is formed by aluminium ions of valency $3$ and sulphate ions of valency $2$. What should be balanced?`,
    bestMove: "cross valencies to make the total positive and negative charges equal",
    trap: "writes symbols side by side without balancing valencies",
    shortTask: L`Write the formula of aluminium sulphate using valencies $Al^{3+}$ and $SO_4^{2-}$.`,
    shortAnswer: L`The formula is $\mathrm{Al_2(SO_4)_3}$ because total charge balances as $2(3+)=3(2-)$.`,
    shortMath: L`\mathrm{Al_2(SO_4)_3}`,
    difficulty: 4,
  },
  {
    unit: "u3-motion-force-work-sound",
    topicCode: "3.1",
    title: "Motion and Graphs",
    focus: "distance, displacement and graph slopes",
    core: "A motion graph answer must identify what the axes show and whether slope or area is required.",
    application: L`A distance-time graph is a straight line with increasing distance. What should be read from its slope?`,
    bestMove: "identify speed as slope of the distance-time graph",
    trap: "uses area under a distance-time graph as distance",
    shortTask: L`A body covers $60$ m in $12$ s uniformly. Find its speed.`,
    shortAnswer: L`Speed $=60/12=5$ m/s.`,
    shortMath: L`5\text{ m/s}`,
    difficulty: 2,
  },
  {
    unit: "u3-motion-force-work-sound",
    topicCode: "3.2",
    title: "Equations of Motion and Circular Motion",
    focus: "uniform acceleration and circular motion direction",
    core: "Use equations of motion only for uniform acceleration and keep direction in circular motion clear.",
    application: L`A car starts from rest and accelerates uniformly at $2\,\text{m/s}^2$ for $5$ s. What should be found first?`,
    bestMove: "use $v=u+at$ with $u=0$",
    trap: "uses average speed as if acceleration were zero",
    shortTask: L`Find the final velocity for $u=0$, $a=2\,\text{m/s}^2$, $t=5$ s.`,
    shortAnswer: L`Using $v=u+at$, $v=0+2(5)=10$ m/s.`,
    shortMath: L`10\text{ m/s}`,
    difficulty: 3,
  },
  {
    unit: "u3-motion-force-work-sound",
    topicCode: "3.3",
    title: "Force, Friction and Newton's Laws",
    focus: "net force, inertia, momentum and friction",
    core: "Newton's laws require identifying net external force and the resulting change in motion.",
    application: L`A book on a rough table needs a push to keep moving uniformly. Which force is being balanced by the push?`,
    bestMove: "identify friction acting opposite motion",
    trap: "assumes a moving object always needs an unbalanced forward force",
    shortTask: L`Why does a passenger lurch forward when a moving bus stops suddenly?`,
    shortAnswer: L`Due to inertia, the passenger's body tends to continue in motion even when the bus stops.`,
    difficulty: 3,
  },
  {
    unit: "u3-motion-force-work-sound",
    topicCode: "3.4",
    title: "Work, Energy, Power and Simple Machines",
    focus: "work-energy relation and mechanical advantage",
    core: "Work is done only when a force causes displacement in its direction; power is the rate of doing work.",
    application: L`A force of $20$ N moves a box $4$ m in the direction of force. What should be calculated?`,
    bestMove: "use $W=Fs$ because force and displacement are in the same direction",
    trap: "calculates power even though time is not given",
    shortTask: L`Find the work done by a $20$ N force over $4$ m in the same direction.`,
    shortAnswer: L`Work $=20\times4=80$ J.`,
    shortMath: L`80\text{ J}`,
    difficulty: 2,
  },
  {
    unit: "u3-motion-force-work-sound",
    topicCode: "3.5",
    title: "Sound Waves and Applications",
    focus: "wave properties, echo and sound speed",
    core: "Sound questions require linking wavelength, frequency, speed, amplitude or reflection to the observation.",
    application: L`An echo is heard $2$ s after clapping near a wall. What path should be considered?`,
    bestMove: "use the round-trip distance travelled by sound",
    trap: "uses only one-way distance when the echo time is for going and returning",
    shortTask: L`If sound speed is $340$ m/s and echo time is $2$ s, find the distance of the wall.`,
    shortAnswer: L`Sound travels $340\times2=680$ m round trip, so wall distance is $340$ m.`,
    shortMath: L`340\text{ m}`,
    difficulty: 3,
  },
];

function byUnit(unit: string): Topic[] {
  // The 201-220 generator family is quarantined following the educator review.
  // Only explicitly re-authored, self-contained replacements may be published.
  return repairedTopicsFor(unit);
}

export const worldOfLivingSupplementalTopics = byUnit("u1-world-of-living");
export const matterNatureBehaviourSupplementalTopics = byUnit(
  "u2-matter-nature-behaviour",
);
export const motionForceWorkSoundSupplementalTopics = byUnit(
  "u3-motion-force-work-sound",
);
