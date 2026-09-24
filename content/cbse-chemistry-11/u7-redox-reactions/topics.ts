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
const UNIT = "u7-redox-reactions";
const VERSION = "0.1.2";
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
        /(^|[^\\])\b(mathrm|text|frac|Delta|rightarrow|rightleftharpoons|approx|cdot|times)\b/g,
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
  return `You chose ${choiceText}. Recheck electron loss/gain, oxidation numbers, charge balance or electrode roles before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        : "incorrect_cbse_class11_chemistry_redox_reasoning",
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
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_redox_terms_without_tracking_electrons_or_oxidation_numbers",
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
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_a_redox_label_without_supporting_charge_or_electron_accounting",
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
      description: `Completes part ${part.letter} with correct redox reasoning, charges and notation.`,
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

const zincCopperDisplacementFigure: ItemFigure = {
  type: "svg",
  title: "Zinc strip in copper sulphate solution",
  description:
    "A zinc strip is dipped in a blue copper sulphate solution; copper coating appears near the strip.",
  svg: `<svg viewBox="0 0 720 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="390" fill="#ffffff"/>
  <text x="360" y="34" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Displacement setup</text>
  <path d="M170 85 H550 L520 330 H200 Z" fill="#eff6ff" stroke="#475569" stroke-width="3"/>
  <path d="M197 205 H523 L507 330 H213 Z" fill="#bfdbfe" stroke="#2563eb" stroke-width="2"/>
  <text x="360" y="260" text-anchor="middle" font-family="Arial" font-size="17" fill="#1d4ed8">copper sulphate solution</text>
  <rect x="326" y="78" width="48" height="214" rx="5" fill="#cbd5e1" stroke="#64748b" stroke-width="3"/>
  <text x="350" y="118" text-anchor="middle" font-family="Arial" font-size="16" fill="#111827">Zn</text>
  <path d="M315 245 C330 230 352 230 384 242 C372 260 338 266 315 245 Z" fill="#f97316" stroke="#c2410c" stroke-width="2"/>
  <text x="360" y="315" text-anchor="middle" font-family="Arial" font-size="15" fill="#9a3412">brown copper coating appears</text>
</svg>`,
};

const simpleCellFigure: ItemFigure = {
  type: "svg",
  title: "Zinc-copper electrochemical cell",
  description:
    "Two half-cells with zinc and copper electrodes connected by a salt bridge and an external wire.",
  svg: `<svg viewBox="0 0 760 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="420" fill="#ffffff"/>
  <text x="380" y="34" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Two-electrode cell</text>
  <path d="M95 130 H285 L265 335 H115 Z" fill="#f8fafc" stroke="#475569" stroke-width="3"/>
  <path d="M475 130 H665 L645 335 H495 Z" fill="#f8fafc" stroke="#475569" stroke-width="3"/>
  <path d="M113 235 H267 L258 335 H122 Z" fill="#e0f2fe" stroke="#0ea5e9" stroke-width="2"/>
  <path d="M493 235 H647 L638 335 H502 Z" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
  <rect x="176" y="90" width="32" height="200" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
  <rect x="556" y="90" width="32" height="200" fill="#f97316" stroke="#c2410c" stroke-width="2"/>
  <text x="192" y="82" text-anchor="middle" font-family="Arial" font-size="16" fill="#111827">Zn</text>
  <text x="572" y="82" text-anchor="middle" font-family="Arial" font-size="16" fill="#111827">Cu</text>
  <text x="190" y="315" text-anchor="middle" font-family="Arial" font-size="15" fill="#0369a1">ZnSO<tspan baseline-shift="sub" font-size="11">4</tspan>(aq)</text>
  <text x="570" y="315" text-anchor="middle" font-family="Arial" font-size="15" fill="#1d4ed8">CuSO<tspan baseline-shift="sub" font-size="11">4</tspan>(aq)</text>
  <path d="M208 102 H334" fill="none" stroke="#334155" stroke-width="3"/>
  <path d="M426 102 H556" fill="none" stroke="#334155" stroke-width="3"/>
  <rect x="334" y="76" width="92" height="52" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="2"/>
  <text x="380" y="108" text-anchor="middle" font-family="Arial" font-size="16" fill="#111827">meter</text>
  <path d="M260 210 C310 160 450 160 500 210" fill="none" stroke="#64748b" stroke-width="15" stroke-linecap="round"/>
  <text x="380" y="174" text-anchor="middle" font-family="Arial" font-size="15" fill="#334155">salt bridge</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "7.1",
    title: "Oxidation, Reduction and Electron Transfer",
    subtopic:
      "Classical oxidation/reduction ideas, electron-loss/electron-gain model and paired redox changes",
    mc: [
      mc(
        L`In the reaction $\mathrm{Mg+Cl_2\rightarrow MgCl_2}$, magnesium is`,
        2,
        ["oxidation", "electron_loss"],
        [
          "reduced because it gains chlorine",
          "oxidised because it loses electrons",
          "reduced because its charge increases",
          "neither oxidised nor reduced",
        ],
        "B",
        {
          A: "Classical combination with chlorine is not the electron-transfer criterion.",
          C: "Increase in oxidation number indicates oxidation, not reduction.",
          D: "Magnesium changes from 0 to +2.",
        },
        [
          "Magnesium becomes $\\mathrm{Mg^{2+}}$.",
          "Loss of electrons is oxidation.",
          "Its oxidation number increases from 0 to +2.",
        ],
        L`Magnesium loses two electrons to form $\mathrm{Mg^{2+}}$, so it is oxidised.`,
      ),
      mc(
        L`A species that accepts electrons in a redox reaction acts as`,
        1,
        ["oxidising_agent", "electron_gain"],
        [
          "reducing agent",
          "oxidising agent",
          "spectator ion",
          "precipitate only",
        ],
        "B",
        {
          A: "A reducing agent donates electrons.",
          C: "A spectator ion does not undergo redox change.",
          D: "Electron acceptance is not the definition of precipitation.",
        },
        [
          "Acceptance of electrons means the species itself is reduced.",
          "The electron acceptor causes oxidation of the other species.",
          "Therefore it is the oxidising agent.",
        ],
        "An electron acceptor is reduced and therefore acts as the oxidising agent.",
      ),
      mc(
        L`In $\mathrm{Zn+Cu^{2+}\rightarrow Zn^{2+}+Cu}$, the species reduced is`,
        2,
        ["electron_transfer", "reduction"],
        [
          L`$\mathrm{Zn}$`,
          L`$\mathrm{Cu^{2+}}$`,
          L`$\mathrm{Zn^{2+}}$`,
          L`$\mathrm{Cu}$`,
        ],
        "B",
        {
          A: "Zinc loses electrons, so it is oxidised.",
          C: "$\\mathrm{Zn^{2+}}$ is the product after oxidation.",
          D: "Copper metal is the reduced product, not the species that undergoes reduction.",
        },
        [
          "Reduction is gain of electrons.",
          "$\\mathrm{Cu^{2+}}$ gains two electrons.",
          "It becomes copper metal.",
        ],
        L`$\mathrm{Cu^{2+}+2e^-\rightarrow Cu}$, so $\mathrm{Cu^{2+}}$ is reduced.`,
        zincCopperDisplacementFigure,
      ),
      mc(
        L`Which statement is always true for a redox reaction?`,
        2,
        ["redox_pairing", "electron_accounting"],
        [
          "Only oxidation occurs",
          "Only reduction occurs",
          "Oxidation and reduction occur together",
          "No electron accounting is possible",
        ],
        "C",
        {
          A: "Electron loss must be matched by electron gain.",
          B: "Reduction cannot occur alone in a chemical redox reaction.",
          D: "Redox is identified by electron or oxidation-number accounting.",
        },
        [
          "Electrons are conserved.",
          "If one species loses electrons, another gains them.",
          "The two half changes are coupled.",
        ],
        "Oxidation and reduction are simultaneous because electrons lost by one species are gained by another.",
      ),
      mc(
        L`In terms of oxygen, oxidation can be described as`,
        1,
        ["classical_oxidation"],
        [
          "loss of oxygen",
          "gain of oxygen",
          "gain of hydrogen",
          "no chemical change",
        ],
        "B",
        {
          A: "Loss of oxygen is classical reduction.",
          C: "Gain of hydrogen is classical reduction.",
          D: "Oxidation is a chemical change.",
        },
        [
          "Classical oxidation often involves oxygen addition.",
          "Reduction often involves oxygen removal.",
          "Use the older oxygen-based definition.",
        ],
        "Classically, oxidation includes gain of oxygen.",
      ),
      mc(
        L`In terms of hydrogen, reduction can be described as`,
        1,
        ["classical_reduction"],
        [
          "loss of hydrogen",
          "gain of hydrogen",
          "loss of electrons",
          "increase in oxidation number",
        ],
        "B",
        {
          A: "Loss of hydrogen is classical oxidation.",
          C: "Loss of electrons is oxidation.",
          D: "Increase in oxidation number is oxidation.",
        },
        [
          "Classical reduction may involve hydrogen addition.",
          "Oxidation may involve hydrogen removal.",
          "Connect reduction with gain of hydrogen.",
        ],
        "Reduction can be described classically as gain of hydrogen.",
      ),
      mc(
        L`The half-reaction $\mathrm{Fe^{2+}\rightarrow Fe^{3+}+e^-}$ represents`,
        2,
        ["half_reaction", "oxidation"],
        ["reduction", "oxidation", "neutralisation", "hydrolysis"],
        "B",
        {
          A: "The electron appears on the product side, so it is lost.",
          C: "No acid-base neutralisation is shown.",
          D: "No water-splitting hydrolysis is involved.",
        },
        [
          "Locate the electron.",
          "Electron on product side means loss of electron.",
          "Loss of electron is oxidation.",
        ],
        L`$\mathrm{Fe^{2+}}$ loses one electron to form $\mathrm{Fe^{3+}}$, so it is oxidation.`,
      ),
      mc(
        L`A reaction in which no element changes oxidation number is`,
        2,
        ["non_redox", "oxidation_number_change"],
        [
          "redox reaction",
          "electron-transfer reaction",
          "not a redox reaction",
          "always a displacement reaction",
        ],
        "C",
        {
          A: "Redox requires oxidation-number change.",
          B: "Electron transfer would change oxidation numbers.",
          D: "Displacement reactions are often redox, but this condition says no change.",
        },
        [
          "Oxidation-number change is a redox test.",
          "No change means no oxidation or reduction.",
          "So it is non-redox.",
        ],
        "If oxidation numbers do not change, the reaction is not redox.",
      ),
      mc(
        L`In $\mathrm{2Na+Cl_2\rightarrow2NaCl}$, chlorine acts as the oxidising agent because it`,
        3,
        ["oxidising_agent", "chlorine"],
        [
          "loses electrons",
          "accepts electrons from sodium",
          "forms a metal",
          "increases its oxidation number",
        ],
        "B",
        {
          A: "Chlorine gains electrons.",
          C: "Chlorine forms chloride ions, not a metal.",
          D: "Chlorine oxidation number decreases from 0 to -1.",
        },
        [
          "Sodium loses electrons.",
          "Chlorine gains those electrons.",
          "The species reduced is the oxidising agent.",
        ],
        "Chlorine accepts electrons from sodium and is reduced to chloride, so it is the oxidising agent.",
      ),
      mc(
        L`A student says, "The reducing agent is reduced." The correct correction is`,
        3,
        ["agent_misconception", "redox_terms"],
        [
          "true; reducing agent always gains electrons",
          "false; reducing agent is oxidised",
          "true only in ionic reactions",
          "false; reducing agent is unchanged",
        ],
        "B",
        {
          A: "A reducing agent donates electrons rather than gains them.",
          C: "The agent relationship is not limited to ionic reactions.",
          D: "The reducing agent changes because it loses electrons.",
        },
        [
          "A reducing agent reduces another species.",
          "To do that, it supplies electrons.",
          "The supplier of electrons is oxidised.",
        ],
        "A reducing agent donates electrons and is itself oxidised.",
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`In one sentence, define oxidation in terms of electron transfer.`,
        1,
        ["oxidation_definition"],
        singlePart("a", "Give the electron-transfer definition.", 1),
        [
          "Use electrons, not oxygen.",
          "Oxidation means electron loss.",
          "The species losing electrons is oxidised.",
        ],
        [
          {
            part: "a",
            explanation:
              "Oxidation is the loss of one or more electrons by a species.",
          },
        ],
        ["Writing gain of electrons for oxidation."],
      ),
      frq(
        "vsaq",
        L`In one sentence, define reduction in terms of electron transfer.`,
        1,
        ["reduction_definition"],
        singlePart("a", "Give the electron-transfer definition.", 1),
        [
          "Use electrons, not hydrogen.",
          "Reduction means electron gain.",
          "The species gaining electrons is reduced.",
        ],
        [
          {
            part: "a",
            explanation:
              "Reduction is the gain of one or more electrons by a species.",
          },
        ],
        ["Writing loss of electrons for reduction."],
      ),
      frq(
        "saq",
        L`For $\mathrm{Zn+Cu^{2+}\rightarrow Zn^{2+}+Cu}$, identify oxidation, reduction, oxidising agent and reducing agent.`,
        4,
        ["electron_transfer", "agents"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the oxidation half-change.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Write the reduction half-change.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Identify oxidising and reducing agents.",
            points: 2,
          },
        ],
        [
          "Zinc becomes zinc ion.",
          "Copper ion becomes copper metal.",
          "The reduced species is the oxidising agent.",
        ],
        [
          {
            part: "a",
            explanation: "$\\mathrm{Zn\\rightarrow Zn^{2+}+2e^-}$.",
          },
          {
            part: "b",
            explanation: "$\\mathrm{Cu^{2+}+2e^-\\rightarrow Cu}$.",
          },
          {
            part: "c",
            explanation:
              "$\\mathrm{Cu^{2+}}$ is the oxidising agent and Zn is the reducing agent.",
          },
        ],
        ["Calling the product copper metal the oxidising agent."],
        zincCopperDisplacementFigure,
      ),
      frq(
        "saq",
        L`Classify the changes $\mathrm{S^{2-}\rightarrow S}$ and $\mathrm{Fe^{3+}\rightarrow Fe^{2+}}$ as oxidation or reduction.`,
        3,
        ["half_reaction", "oxidation_reduction"],
        [
          {
            letter: "a",
            promptMarkdown: "Classify $\\mathrm{S^{2-}\\rightarrow S}$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Classify $\\mathrm{Fe^{3+}\\rightarrow Fe^{2+}}$.",
            points: 2,
          },
        ],
        [
          "Compare charges as oxidation numbers.",
          "Increase is oxidation.",
          "Decrease is reduction.",
        ],
        [
          {
            part: "a",
            explanation:
              "Sulfur changes from -2 to 0, an increase, so it is oxidation.",
          },
          {
            part: "b",
            explanation:
              "Iron changes from +3 to +2, a decrease, so it is reduction.",
          },
        ],
        ["Treating negative-to-zero as a decrease."],
      ),
      frq(
        "saq",
        L`A metal M changes from $\mathrm{M}$ to $\mathrm{M^{3+}}$ in a reaction.`,
        3,
        ["electron_loss", "oxidation"],
        [
          {
            letter: "a",
            promptMarkdown: "How many electrons are lost or gained?",
            points: 2,
          },
          { letter: "b", promptMarkdown: "Name the process.", points: 1 },
        ],
        [
          "Neutral M has oxidation number 0.",
          "$\\mathrm{M^{3+}}$ has charge +3.",
          "Increase in positive charge means electron loss.",
        ],
        [
          { part: "a", explanation: "M loses three electrons." },
          { part: "b", explanation: "The process is oxidation." },
        ],
        ["Saying it gains three electrons because the charge is +3."],
      ),
      frq(
        "laq",
        L`Explain why oxidation and reduction cannot occur independently in an ordinary chemical redox reaction.`,
        4,
        ["electron_conservation", "redox_pairing"],
        [
          {
            letter: "a",
            promptMarkdown: "State what happens to electrons in oxidation.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State what happens to electrons in reduction.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Use conservation of charge/electrons to connect the two.",
            points: 3,
          },
        ],
        [
          "Oxidation releases electrons.",
          "Reduction consumes electrons.",
          "Electrons cannot appear or disappear in the overall reaction.",
        ],
        [
          { part: "a", explanation: "Oxidation is loss of electrons." },
          { part: "b", explanation: "Reduction is gain of electrons." },
          {
            part: "c",
            explanation:
              "The electrons lost by one species must be accepted by another species, so both half-changes occur together in the net reaction.",
          },
        ],
        ["Writing oxidation and reduction as separate unrelated changes."],
      ),
      frq(
        "case",
        L`A grey zinc strip is dipped in blue copper sulphate solution. After some time, a reddish-brown coating appears on the strip.`,
        4,
        ["case_based", "displacement_redox"],
        [
          {
            letter: "a",
            promptMarkdown: "Which metal is oxidised?",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Which ion is reduced?", points: 1 },
          {
            letter: "c",
            promptMarkdown: "Write the net ionic equation.",
            points: 3,
          },
        ],
        [
          "The coating is copper metal.",
          "Copper ions must gain electrons.",
          "Zinc supplies those electrons.",
        ],
        [
          { part: "a", explanation: "Zinc is oxidised." },
          { part: "b", explanation: "$\\mathrm{Cu^{2+}}$ is reduced." },
          {
            part: "c",
            explanation:
              "The net ionic equation is $\\mathrm{Zn+Cu^{2+}\\rightarrow Zn^{2+}+Cu}$.",
          },
        ],
        [
          "Treating the colour change as only a physical deposition without redox.",
        ],
        zincCopperDisplacementFigure,
      ),
      frq(
        "saq",
        L`In $\mathrm{H_2+F_2\rightarrow2HF}$, identify which element is oxidised and which is reduced using oxidation numbers.`,
        3,
        ["oxidation_number_change", "electron_transfer"],
        [
          {
            letter: "a",
            promptMarkdown: "Find oxidation-number change for hydrogen.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find oxidation-number change for fluorine.",
            points: 2,
          },
        ],
        [
          "Elements in elemental form have oxidation number zero.",
          "In HF, hydrogen is +1 and fluorine is -1.",
          "Increase is oxidation; decrease is reduction.",
        ],
        [
          {
            part: "a",
            explanation: "Hydrogen changes from 0 to +1, so it is oxidised.",
          },
          {
            part: "b",
            explanation: "Fluorine changes from 0 to -1, so it is reduced.",
          },
        ],
        ["Calling fluorine oxidised because it is very reactive."],
      ),
      frq(
        "saq",
        L`A student writes $\mathrm{Cu^{2+}+2e^-\rightarrow Cu}$ and calls it oxidation. Correct the statement.`,
        3,
        ["misconception_repair", "half_reaction"],
        [
          {
            letter: "a",
            promptMarkdown: "Name the actual process.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Explain using the electron position.",
            points: 2,
          },
        ],
        [
          "Electrons are on the left side.",
          "The species uses electrons.",
          "Gain of electrons is reduction.",
        ],
        [
          { part: "a", explanation: "The process is reduction." },
          {
            part: "b",
            explanation:
              "$\\mathrm{Cu^{2+}}$ gains two electrons to form Cu; gain of electrons is reduction.",
          },
        ],
        ["Naming half-reactions by the charge of the product only."],
      ),
      frq(
        "case",
        L`In an industrial cleaning reaction, chlorine converts iodide ions to iodine while chlorine itself becomes chloride ions.`,
        4,
        ["case_based", "agents", "halogen_redox"],
        [
          {
            letter: "a",
            promptMarkdown: "Which species is oxidised?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which species is reduced?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Identify oxidising and reducing agents.",
            points: 3,
          },
        ],
        [
          "Iodide becomes iodine.",
          "Chlorine becomes chloride.",
          "The reduced species is the oxidising agent.",
        ],
        [
          {
            part: "a",
            explanation: "$\\mathrm{I^-}$ is oxidised to $\\mathrm{I_2}$.",
          },
          {
            part: "b",
            explanation: "$\\mathrm{Cl_2}$ is reduced to $\\mathrm{Cl^-}$.",
          },
          {
            part: "c",
            explanation:
              "$\\mathrm{Cl_2}$ is the oxidising agent and $\\mathrm{I^-}$ is the reducing agent.",
          },
        ],
        ["Calling iodine the reducing agent because it is a product."],
      ),
    ],
  },
  {
    topicCode: "7.2",
    title: "Oxidation Number Rules and Redox Agents",
    subtopic:
      "Oxidation-number assignment, changes in oxidation state and identification of oxidants/reductants",
    mc: [
      mc(
        L`The oxidation number of chromium in $\mathrm{Cr_2O_7^{2-}}$ is`,
        3,
        ["oxidation_number", "polyatomic_ion"],
        ["+3", "+4", "+5", "+6"],
        "D",
        {
          A: "This does not satisfy the total charge with seven oxygens.",
          B: "The total would not be -2.",
          C: "The total would be too low.",
        },
        [
          "Oxygen is usually -2.",
          "Let chromium be x: $2x+7(-2)=-2$.",
          "$2x=12$, so $x=+6$.",
        ],
        L`For $\mathrm{Cr_2O_7^{2-}}$, $2x-14=-2$, so $x=+6$.`,
      ),
      mc(
        L`The oxidation number of sulphur in $\mathrm{H_2SO_4}$ is`,
        2,
        ["oxidation_number"],
        ["+4", "+5", "+6", "-2"],
        "C",
        {
          A: "This would give total charge -2 for the neutral molecule.",
          B: "This does not balance the oxygen contribution.",
          D: "Sulphur is not -2 in sulphuric acid.",
        },
        [
          "Hydrogen is +1.",
          "Oxygen is -2.",
          "For a neutral molecule, the sum is zero.",
        ],
        L`$2(+1)+x+4(-2)=0$, so $x=+6$.`,
      ),
      mc(
        L`In $\mathrm{H_2O_2}$, the oxidation number of oxygen is`,
        3,
        ["oxidation_number_exception", "peroxide"],
        ["-2", "-1", "0", "+1"],
        "B",
        {
          A: "Oxygen is -2 in many compounds, but peroxides are an exception.",
          C: "Oxygen is not elemental here.",
          D: "Hydrogen is +1, so oxygen cannot be +1 in neutral hydrogen peroxide.",
        },
        [
          "Hydrogen is +1.",
          "The molecule is neutral.",
          "Peroxide oxygen is -1.",
        ],
        L`In $\mathrm{H_2O_2}$, $2(+1)+2x=0$, so $x=-1$.`,
      ),
      mc(
        L`In $\mathrm{MnO_4^-}$, manganese has oxidation number`,
        2,
        ["oxidation_number", "permanganate"],
        ["+2", "+4", "+6", "+7"],
        "D",
        {
          A: "This is too low to balance four oxygen atoms and charge -1.",
          B: "This gives net charge -4.",
          C: "This gives net charge -2.",
        },
        ["Oxygen is -2.", "Let manganese be x.", "$x+4(-2)=-1$."],
        L`$x-8=-1$, so $x=+7$.`,
      ),
      mc(
        L`In $\mathrm{NH_4^+}$, the oxidation number of nitrogen is`,
        3,
        ["oxidation_number", "ammonium"],
        ["-5", "-3", "+1", "+5"],
        "B",
        {
          A: "This would make the total charge too negative.",
          C: "Hydrogen is +1, so nitrogen must be negative in ammonium.",
          D: "This is impossible for the given total charge.",
        },
        [
          "Hydrogen is +1 with non-metals.",
          "The total charge is +1.",
          "Set $x+4(+1)=+1$.",
        ],
        L`$x+4=1$, so $x=-3$.`,
      ),
      mc(
        L`In $\mathrm{2FeCl_2+Cl_2\rightarrow2FeCl_3}$, the reducing agent is`,
        3,
        ["agents_from_oxidation_number"],
        [
          L`$\mathrm{Fe^{2+}}$ in $\mathrm{FeCl_2}$`,
          L`$\mathrm{Cl_2}$`,
          L`$\mathrm{Fe^{3+}}$ in $\mathrm{FeCl_3}$`,
          L`$\mathrm{Cl^-}$ in $\mathrm{FeCl_3}$`,
        ],
        "A",
        {
          B: "Chlorine is reduced from 0 to -1, so it is the oxidising agent.",
          C: "The ferric ion is the product after oxidation.",
          D: "Chloride is not the species losing electrons.",
        },
        [
          "Iron changes from +2 to +3.",
          "Increase in oxidation number is oxidation.",
          "The species oxidised is the reducing agent.",
        ],
        L`$\mathrm{Fe^{2+}}$ is oxidised to $\mathrm{Fe^{3+}}$, so it is the reducing agent.`,
      ),
      mc(
        L`Which species has nitrogen in the $+3$ oxidation state, so it can act as either oxidising or reducing agent under suitable conditions?`,
        4,
        ["intermediate_oxidation_state", "redox_agents"],
        [
          L`$\mathrm{NH_3}$`,
          L`$\mathrm{N_2}$`,
          L`$\mathrm{NO_2^-}$`,
          L`$\mathrm{NO_3^-}$`,
        ],
        "C",
        {
          A: "Nitrogen is already at a very low oxidation state, so oxidation is more likely than reduction.",
          B: "Nitrogen is 0 in $\\mathrm{N_2}$, not +3.",
          D: "Nitrogen is +5 in nitrate, the maximum common value in this set.",
        },
        [
          "Find nitrogen oxidation numbers.",
          "Nitrite has nitrogen at +3.",
          "It can be oxidised to +5 or reduced to lower states.",
        ],
        L`In $\mathrm{NO_2^-}$, nitrogen is +3, an intermediate value, so both oxidation and reduction are possible.`,
      ),
      mc(
        L`The oxidation number of carbon in $\mathrm{CH_3OH}$ is`,
        4,
        ["oxidation_number", "organic_compound"],
        ["-4", "-2", "0", "+2"],
        "B",
        {
          A: "This would ignore the oxygen atom bonded in the molecule.",
          C: "The hydrogen and oxygen contributions do not cancel to leave carbon zero.",
          D: "The sign is reversed.",
        },
        [
          "Use H = +1 and O = -2.",
          "The molecule is neutral.",
          "Let carbon be x: $x+4(+1)-2=0$.",
        ],
        L`$x+4-2=0$, so carbon is $-2$.`,
      ),
      mc(
        L`The oxidation number of oxygen is positive in`,
        3,
        ["oxidation_number_exception", "oxygen_fluorides"],
        [
          L`$\mathrm{H_2O}$`,
          L`$\mathrm{Na_2O}$`,
          L`$\mathrm{OF_2}$`,
          L`$\mathrm{H_2O_2}$`,
        ],
        "C",
        {
          A: "Oxygen is -2 in water.",
          B: "Oxygen is -2 in sodium oxide.",
          D: "Oxygen is -1 in hydrogen peroxide.",
        },
        [
          "Fluorine is always -1 in compounds.",
          "In OF2, two fluorines contribute -2.",
          "Oxygen must be +2.",
        ],
        L`In $\mathrm{OF_2}$, oxygen is +2 because fluorine is -1 each.`,
      ),
      mc(
        L`For $\mathrm{SO_2\rightarrow SO_4^{2-}}$, sulphur undergoes`,
        3,
        ["oxidation_number_change"],
        [
          "reduction from +4 to +6",
          "oxidation from +4 to +6",
          "reduction from +6 to +4",
          "no redox change",
        ],
        "B",
        {
          A: "An increase in oxidation number is oxidation, not reduction.",
          C: "The direction is reversed.",
          D: "Sulphur changes oxidation number.",
        },
        [
          "Find sulphur in SO2.",
          "Find sulphur in sulfate.",
          "Increase is oxidation.",
        ],
        L`Sulphur changes from +4 in $\mathrm{SO_2}$ to +6 in $\mathrm{SO_4^{2-}}$, so it is oxidised.`,
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Find the oxidation number of phosphorus in $\mathrm{H_3PO_4}$.`,
        2,
        ["oxidation_number"],
        singlePart("a", "Show the oxidation-number equation and answer.", 2),
        ["Hydrogen is +1.", "Oxygen is -2.", "The molecule is neutral."],
        [{ part: "a", explanation: "$3(+1)+x+4(-2)=0$, so $x=+5$." }],
        ["Forgetting the coefficient 3 on hydrogen."],
      ),
      frq(
        "vsaq",
        L`Find the oxidation number of chlorine in $\mathrm{ClO_3^-}$.`,
        2,
        ["oxidation_number"],
        singlePart("a", "Show the equation and answer.", 2),
        ["Oxygen is -2.", "The ion has charge -1.", "Let chlorine be x."],
        [{ part: "a", explanation: "$x+3(-2)=-1$, so $x=+5$." }],
        ["Setting the sum equal to zero instead of the ion charge."],
      ),
      frq(
        "saq",
        L`For $\mathrm{MnO_4^-+Fe^{2+}\rightarrow Mn^{2+}+Fe^{3+}}$ in acid, identify the oxidised and reduced species.`,
        4,
        ["agents_from_oxidation_number", "permanganate"],
        [
          {
            letter: "a",
            promptMarkdown: "Find the change in oxidation number of Mn.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the change in oxidation number of Fe.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Identify oxidising and reducing agents.",
            points: 2,
          },
        ],
        [
          "Mn is +7 in permanganate.",
          "Iron changes from +2 to +3.",
          "Reduced species is the oxidising agent.",
        ],
        [
          {
            part: "a",
            explanation:
              "Mn changes from +7 in $\\mathrm{MnO_4^-}$ to +2 in $\\mathrm{Mn^{2+}}$, so Mn is reduced.",
          },
          {
            part: "b",
            explanation:
              "Fe changes from +2 to +3, so $\\mathrm{Fe^{2+}}$ is oxidised.",
          },
          {
            part: "c",
            explanation:
              "$\\mathrm{MnO_4^-}$ is the oxidising agent and $\\mathrm{Fe^{2+}}$ is the reducing agent.",
          },
        ],
        [
          "Calling permanganate the reducing agent because its charge is negative.",
        ],
      ),
      frq(
        "saq",
        L`Assign oxidation numbers to nitrogen in $\mathrm{NH_3}$, $\mathrm{N_2}$, $\mathrm{NO}$ and $\mathrm{NO_3^-}$.`,
        4,
        ["oxidation_number_series"],
        [
          {
            letter: "a",
            promptMarkdown: "$\\mathrm{NH_3}$ and $\\mathrm{N_2}$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "$\\mathrm{NO}$ and $\\mathrm{NO_3^-}$.",
            points: 2,
          },
        ],
        ["Hydrogen is +1.", "Elemental nitrogen is zero.", "Oxygen is -2."],
        [
          {
            part: "a",
            explanation:
              "Nitrogen is -3 in $\\mathrm{NH_3}$ and 0 in $\\mathrm{N_2}$.",
          },
          {
            part: "b",
            explanation:
              "Nitrogen is +2 in $\\mathrm{NO}$ and +5 in $\\mathrm{NO_3^-}$.",
          },
        ],
        ["Giving the same oxidation number to nitrogen in all oxides."],
      ),
      frq(
        "laq",
        L`In $\mathrm{K_2Cr_2O_7+HCl\rightarrow CrCl_3+Cl_2+KCl+H_2O}$, identify the element oxidised and the element reduced.`,
        5,
        ["oxidation_number_change", "dichromate_chloride"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Find oxidation number of Cr in dichromate and in $\\mathrm{CrCl_3}$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find oxidation number of Cl in HCl and in $\\mathrm{Cl_2}$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "State which element is oxidised and which is reduced.",
            points: 1,
          },
        ],
        [
          "Cr is +6 in dichromate.",
          "Chlorine is -1 in HCl and 0 in chlorine gas.",
          "Increase means oxidation; decrease means reduction.",
        ],
        [
          {
            part: "a",
            explanation:
              "Cr changes from +6 in $\\mathrm{Cr_2O_7^{2-}}$ to +3 in $\\mathrm{CrCl_3}$.",
          },
          {
            part: "b",
            explanation: "Cl changes from -1 in HCl to 0 in $\\mathrm{Cl_2}$.",
          },
          {
            part: "c",
            explanation: "Chlorine is oxidised and chromium is reduced.",
          },
        ],
        [
          "Using the charge on the whole dichromate ion as chromium's oxidation number.",
        ],
      ),
      frq(
        "case",
        L`A bottle label shows $\mathrm{KMnO_4}$ as a strong oxidising agent in acidic medium. A student says manganese must therefore be oxidised during its action.`,
        4,
        ["case_based", "oxidising_agent"],
        [
          {
            letter: "a",
            promptMarkdown: "Find Mn oxidation number in $\\mathrm{KMnO_4}$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "If it becomes $\\mathrm{Mn^{2+}}$, is Mn oxidised or reduced?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Correct the student's statement.",
            points: 2,
          },
        ],
        [
          "Potassium is +1 and oxygen is -2.",
          "Mn goes from +7 to +2.",
          "An oxidising agent is itself reduced.",
        ],
        [
          { part: "a", explanation: "In $\\mathrm{KMnO_4}$, Mn is +7." },
          { part: "b", explanation: "Mn is reduced from +7 to +2." },
          {
            part: "c",
            explanation:
              "The oxidising agent causes another species to be oxidised, but it is itself reduced.",
          },
        ],
        ["Assuming the oxidising agent itself must be oxidised."],
      ),
      frq(
        "saq",
        L`Find the oxidation number of carbon in $\mathrm{CO_2}$ and $\mathrm{C_2O_4^{2-}}$.`,
        4,
        ["oxidation_number", "oxalate"],
        [
          {
            letter: "a",
            promptMarkdown: "Carbon in $\\mathrm{CO_2}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Average carbon oxidation number in $\\mathrm{C_2O_4^{2-}}$.",
            points: 3,
          },
        ],
        [
          "Oxygen is -2.",
          "Use the total charge of oxalate.",
          "There are two carbon atoms.",
        ],
        [
          { part: "a", explanation: "In $\\mathrm{CO_2}$, carbon is +4." },
          {
            part: "b",
            explanation: "For oxalate, $2x+4(-2)=-2$, so $2x=6$ and $x=+3$.",
          },
        ],
        [
          "Forgetting that the oxidation number found in oxalate is per carbon atom.",
        ],
      ),
      frq(
        "saq",
        L`In $\mathrm{2S_2O_3^{2-}+I_2\rightarrow S_4O_6^{2-}+2I^-}$, iodine changes from 0 to -1.`,
        3,
        ["agents_from_change", "iodine"],
        [
          {
            letter: "a",
            promptMarkdown: "Is iodine oxidised or reduced?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Does iodine act as oxidising or reducing agent?",
            points: 2,
          },
        ],
        [
          "Iodine oxidation number decreases.",
          "Decrease means reduction.",
          "The species reduced is the oxidising agent.",
        ],
        [
          { part: "a", explanation: "Iodine is reduced." },
          {
            part: "b",
            explanation: "$\\mathrm{I_2}$ acts as the oxidising agent.",
          },
        ],
        ["Calling iodine reducing agent because iodide is produced."],
      ),
      frq(
        "case",
        L`Four species contain chlorine: $\mathrm{Cl^-}$, $\mathrm{Cl_2}$, $\mathrm{ClO^-}$ and $\mathrm{ClO_4^-}$.`,
        5,
        ["case_based", "oxidation_number_range"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Assign oxidation numbers of chlorine in all four species.",
            points: 4,
          },
          {
            letter: "b",
            promptMarkdown:
              "Which species has chlorine in the highest oxidation state?",
            points: 1,
          },
        ],
        [
          "Elemental chlorine is zero.",
          "Oxygen is -2 in oxyanions.",
          "Use the ion charge as the total.",
        ],
        [
          {
            part: "a",
            explanation:
              "The oxidation numbers are -1 in $\\mathrm{Cl^-}$, 0 in $\\mathrm{Cl_2}$, +1 in $\\mathrm{ClO^-}$ and +7 in $\\mathrm{ClO_4^-}$.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{ClO_4^-}$ has chlorine in the highest oxidation state, +7.",
          },
        ],
        ["Using oxygen's charge as the total charge of the ion."],
      ),
      frq(
        "vsaq",
        L`A species has its oxidation number increased from +2 to +5. Name the process.`,
        1,
        ["oxidation_number_change"],
        singlePart("a", "Name the process.", 1),
        [
          "Compare initial and final oxidation numbers.",
          "The value increases.",
          "Increase means oxidation.",
        ],
        [{ part: "a", explanation: "The process is oxidation." }],
        ["Treating larger positive charge as reduction."],
      ),
    ],
  },
  {
    topicCode: "7.3",
    title: "Types of Redox Reactions",
    subtopic:
      "Combination, decomposition, displacement and disproportionation reactions with oxidant/reductant roles",
    mc: [
      mc(
        L`The reaction $\mathrm{2Mg+O_2\rightarrow2MgO}$ is best classified as`,
        2,
        ["combination_redox"],
        [
          "decomposition redox",
          "combination redox",
          "disproportionation",
          "neutralisation only",
        ],
        "B",
        {
          A: "Two reactants combine rather than one compound decomposing.",
          C: "No single element is both oxidised and reduced.",
          D: "No acid-base salt and water formation is shown.",
        },
        [
          "Two reactants form one product type.",
          "Mg is oxidised and O is reduced.",
          "So it is a combination redox reaction.",
        ],
        "Magnesium and oxygen combine to form magnesium oxide, with simultaneous oxidation and reduction.",
      ),
      mc(
        L`The reaction $\mathrm{2KClO_3\rightarrow2KCl+3O_2}$ is a redox reaction because`,
        3,
        ["decomposition_redox"],
        [
          "potassium changes from +1 to 0",
          "chlorine and oxygen oxidation numbers change",
          "only physical state changes",
          "all oxidation numbers remain same",
        ],
        "B",
        {
          A: "Potassium remains +1.",
          C: "Chemical species and oxidation numbers change.",
          D: "Chlorine and oxygen do change.",
        },
        [
          "Find Cl in chlorate.",
          "Find Cl in chloride.",
          "Oxygen changes from -2 to 0.",
        ],
        "Chlorine is reduced from +5 to -1, while oxygen is oxidised from -2 to 0.",
      ),
      mc(
        L`In $\mathrm{Cl_2+2OH^-\rightarrow Cl^-+ClO^-+H_2O}$, chlorine undergoes`,
        4,
        ["disproportionation"],
        [
          "only oxidation",
          "only reduction",
          "both oxidation and reduction",
          "no oxidation-number change",
        ],
        "C",
        {
          A: "Some chlorine decreases from 0 to -1.",
          B: "Some chlorine increases from 0 to +1.",
          D: "Chlorine changes to -1 and +1.",
        },
        [
          "Chlorine starts at 0.",
          "It becomes -1 in chloride.",
          "It becomes +1 in hypochlorite.",
        ],
        "The same element chlorine is both reduced and oxidised, so the reaction is disproportionation.",
      ),
      mc(
        L`A metal displacement reaction is redox because`,
        2,
        ["displacement_redox"],
        [
          "the more reactive metal loses electrons and another metal ion gains electrons",
          "no oxidation number changes",
          "only water molecules rearrange",
          "both metals must become gases",
        ],
        "A",
        {
          B: "Displacement involves oxidation-number changes.",
          C: "Water rearrangement is not the key redox feature.",
          D: "Metals do not need to become gases.",
        },
        [
          "Active metal becomes an ion.",
          "Metal ion in solution becomes metal.",
          "Electron transfer occurs.",
        ],
        "The displacing metal is oxidised while the displaced metal ion is reduced.",
      ),
      mc(
        L`Which reaction is a disproportionation reaction?`,
        4,
        ["disproportionation", "classification"],
        [
          L`$\mathrm{Zn+Cu^{2+}\rightarrow Zn^{2+}+Cu}$`,
          L`$\mathrm{2H_2+O_2\rightarrow2H_2O}$`,
          L`$\mathrm{2H_2O_2\rightarrow2H_2O+O_2}$`,
          L`$\mathrm{HCl+NaOH\rightarrow NaCl+H_2O}$`,
        ],
        "C",
        {
          A: "This is a displacement redox reaction.",
          B: "This is a combination redox reaction.",
          D: "This is neutralisation and not redox.",
        },
        [
          "Look for one element in one reactant changing two ways.",
          "Oxygen in peroxide is -1.",
          "It becomes -2 in water and 0 in oxygen gas.",
        ],
        L`In decomposition of $\mathrm{H_2O_2}$, oxygen is both reduced and oxidised, so it is disproportionation.`,
      ),
      mc(
        L`In $\mathrm{CuO+H_2\rightarrow Cu+H_2O}$, hydrogen acts as`,
        2,
        ["reducing_agent", "classical_redox"],
        [
          "oxidising agent",
          "reducing agent",
          "spectator molecule",
          "acid only",
        ],
        "B",
        {
          A: "Hydrogen removes oxygen from copper oxide and is itself oxidised.",
          C: "Hydrogen changes to water.",
          D: "No acid-base proton transfer is the main event.",
        },
        [
          "Copper oxide loses oxygen.",
          "Hydrogen gains oxygen to form water.",
          "The species oxidised is the reducing agent.",
        ],
        "Hydrogen reduces copper oxide to copper and is itself oxidised to water, so it is the reducing agent.",
      ),
      mc(
        L`The reaction $\mathrm{2HgO\rightarrow2Hg+O_2}$ is a`,
        2,
        ["decomposition_redox"],
        [
          "combination reaction only",
          "decomposition redox reaction",
          "double displacement with no redox",
          "precipitation reaction",
        ],
        "B",
        {
          A: "One compound decomposes into simpler substances.",
          C: "Oxidation numbers of Hg and O change.",
          D: "No insoluble precipitate formation is shown.",
        },
        [
          "One compound splits.",
          "Hg changes from +2 to 0.",
          "O changes from -2 to 0.",
        ],
        "Mercury(II) oxide decomposes and oxidation numbers change, so it is a decomposition redox reaction.",
      ),
      mc(
        L`When sodium reacts with water to liberate hydrogen gas, the element whose oxidation number decreases is`,
        3,
        ["displacement_redox", "hydrogen"],
        [
          L`$\mathrm{Na}$`,
          L`$\mathrm{H}$ in water`,
          L`$\mathrm{O}$ in water`,
          L`$\mathrm{Na^+}$`,
        ],
        "B",
        {
          A: "Sodium is oxidised from 0 to +1.",
          C: "Oxygen remains -2.",
          D: "$\\mathrm{Na^+}$ is the product of oxidation.",
        },
        [
          "Hydrogen in water is +1.",
          "Hydrogen gas has oxidation number 0.",
          "Decrease means reduction.",
        ],
        "Hydrogen changes from +1 in water to 0 in hydrogen gas, so hydrogen is reduced.",
      ),
      mc(
        L`A reddish deposit appears when aluminium is placed in a copper(II) salt solution. The process is best described as`,
        3,
        ["displacement_redox", "agents"],
        [
          "non-redox",
          "acid-base only",
          "redox displacement",
          "disproportionation",
        ],
        "C",
        {
          A: "Both aluminium and copper change oxidation number.",
          B: "No proton-transfer neutralisation is the main process.",
          D: "One element is not both oxidised and reduced.",
        },
        [
          "Aluminium loses electrons.",
          "Copper ion gains electrons.",
          "A metal displaces another from solution.",
        ],
        "This is a metal displacement redox reaction.",
      ),
      mc(
        L`The key sign of disproportionation is that`,
        3,
        ["disproportionation_definition"],
        [
          "two different elements exchange oxygen",
          "the same element is simultaneously oxidised and reduced",
          "no species changes oxidation number",
          "only spectator ions are present",
        ],
        "B",
        {
          A: "Oxygen transfer may occur in redox but does not define disproportionation.",
          C: "Disproportionation is a redox change.",
          D: "Spectator ions are not the key reacting species.",
        },
        [
          "Look for one element starting in one oxidation state.",
          "It forms products with higher and lower oxidation states.",
          "That is simultaneous oxidation and reduction of the same element.",
        ],
        "Disproportionation occurs when the same element is oxidised and reduced in one reaction.",
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Name the type of redox reaction in which two or more reactants form one product.`,
        1,
        ["combination_redox"],
        singlePart("a", "Name the reaction type.", 1),
        [
          "Think of synthesis.",
          "Reactants combine.",
          "It is a combination reaction.",
        ],
        [
          {
            part: "a",
            explanation:
              "It is a combination redox reaction when oxidation numbers also change.",
          },
        ],
        ["Calling every combination reaction non-redox."],
      ),
      frq(
        "saq",
        L`Classify $\mathrm{2Mg+O_2\rightarrow2MgO}$ and identify the oxidised element.`,
        3,
        ["combination_redox", "oxidised_species"],
        [
          { letter: "a", promptMarkdown: "Classify the reaction.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Identify the element oxidised and justify.",
            points: 2,
          },
        ],
        [
          "Two substances combine.",
          "Magnesium goes from 0 to +2.",
          "Increase means oxidation.",
        ],
        [
          { part: "a", explanation: "It is a combination redox reaction." },
          {
            part: "b",
            explanation:
              "Magnesium is oxidised because its oxidation number increases from 0 to +2.",
          },
        ],
        ["Naming oxygen as oxidised because oxygen is involved."],
      ),
      frq(
        "saq",
        L`Show that $\mathrm{2H_2O_2\rightarrow2H_2O+O_2}$ is disproportionation.`,
        4,
        ["disproportionation", "peroxide"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Find oxidation number of oxygen in $\\mathrm{H_2O_2}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find oxygen oxidation numbers in products.",
            points: 2,
          },
          { letter: "c", promptMarkdown: "State the conclusion.", points: 1 },
        ],
        [
          "Peroxide oxygen is -1.",
          "Oxygen is -2 in water and 0 in oxygen gas.",
          "One element goes both down and up.",
        ],
        [
          { part: "a", explanation: "Oxygen is -1 in $\\mathrm{H_2O_2}$." },
          {
            part: "b",
            explanation: "Oxygen is -2 in water and 0 in $\\mathrm{O_2}$.",
          },
          {
            part: "c",
            explanation:
              "Oxygen is both reduced and oxidised, so the reaction is disproportionation.",
          },
        ],
        ["Saying a decomposition reaction cannot also be redox."],
      ),
      frq(
        "saq",
        L`For $\mathrm{CuO+H_2\rightarrow Cu+H_2O}$, use both classical and oxidation-number ideas to identify oxidation and reduction.`,
        4,
        ["classical_redox", "oxidation_number_change"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Give the classical oxygen-transfer interpretation.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Give the oxidation-number interpretation.",
            points: 3,
          },
        ],
        [
          "Copper oxide loses oxygen.",
          "Hydrogen gains oxygen.",
          "Cu changes +2 to 0; H changes 0 to +1.",
        ],
        [
          {
            part: "a",
            explanation:
              "$\\mathrm{CuO}$ is reduced to Cu by loss of oxygen; hydrogen is oxidised to water by gain of oxygen.",
          },
          {
            part: "b",
            explanation:
              "Cu decreases from +2 to 0, so it is reduced. Hydrogen increases from 0 to +1, so it is oxidised.",
          },
        ],
        [
          "Mixing the classical oxygen meaning with the electron meaning without checking direction.",
        ],
      ),
      frq(
        "laq",
        L`In $\mathrm{Cl_2+2OH^-\rightarrow Cl^-+ClO^-+H_2O}$, prove that the reaction is disproportionation.`,
        4,
        ["disproportionation", "chlorine"],
        [
          {
            letter: "a",
            promptMarkdown: "Find chlorine oxidation number in reactant.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find chlorine oxidation numbers in products.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State why this is disproportionation.",
            points: 2,
          },
        ],
        [
          "Elemental chlorine is 0.",
          "Chloride has chlorine -1.",
          "Hypochlorite has chlorine +1.",
        ],
        [
          { part: "a", explanation: "Chlorine in $\\mathrm{Cl_2}$ is 0." },
          {
            part: "b",
            explanation:
              "Chlorine is -1 in $\\mathrm{Cl^-}$ and +1 in $\\mathrm{ClO^-}$.",
          },
          {
            part: "c",
            explanation:
              "The same element chlorine is reduced to -1 and oxidised to +1, so it is disproportionation.",
          },
        ],
        ["Looking only at one chlorine-containing product."],
      ),
      frq(
        "case",
        L`A student puts an aluminium strip into a blue copper(II) salt solution. A reddish solid forms while aluminium ions enter solution.`,
        4,
        ["case_based", "displacement_redox"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the oxidation half-change.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Write the reduction half-change.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Classify the reaction type.",
            points: 2,
          },
        ],
        [
          "Aluminium becomes $\\mathrm{Al^{3+}}$.",
          "Copper(II) becomes copper metal.",
          "A more reactive metal displaces a less reactive metal ion.",
        ],
        [
          {
            part: "a",
            explanation: "$\\mathrm{Al\\rightarrow Al^{3+}+3e^-}$.",
          },
          {
            part: "b",
            explanation: "$\\mathrm{Cu^{2+}+2e^-\\rightarrow Cu}$.",
          },
          {
            part: "c",
            explanation: "It is a metal displacement redox reaction.",
          },
        ],
        [
          "Trying to balance electrons before correctly identifying the half-changes.",
        ],
      ),
      frq(
        "vsaq",
        L`Name the redox reaction type in which a single species forms products where the same element has higher and lower oxidation numbers.`,
        2,
        ["disproportionation_definition"],
        singlePart("a", "Name the reaction type.", 1),
        [
          "One species supplies the same element.",
          "That element both increases and decreases oxidation number.",
          "This is disproportionation.",
        ],
        [
          {
            part: "a",
            explanation: "The reaction type is disproportionation.",
          },
        ],
        ["Calling it simple decomposition without checking oxidation numbers."],
      ),
      frq(
        "saq",
        L`Classify $\mathrm{2Na+2H_2O\rightarrow2NaOH+H_2}$ as a type of redox reaction and identify the reducing agent.`,
        4,
        ["displacement_redox", "reducing_agent"],
        [
          { letter: "a", promptMarkdown: "Classify the reaction.", points: 2 },
          {
            letter: "b",
            promptMarkdown: "Identify the reducing agent.",
            points: 2,
          },
        ],
        [
          "Sodium displaces hydrogen from water.",
          "Sodium changes from 0 to +1.",
          "The oxidised species is the reducing agent.",
        ],
        [
          { part: "a", explanation: "It is a displacement redox reaction." },
          {
            part: "b",
            explanation:
              "Sodium is the reducing agent because it is oxidised from 0 to +1.",
          },
        ],
        ["Calling water the reducing agent because hydrogen gas forms."],
      ),
      frq(
        "case",
        L`Three reactions are given: P combines two elements into one compound, Q breaks one compound into simpler substances with oxidation-number changes, and R has chlorine changing from 0 to both -1 and +1.`,
        4,
        ["case_based", "classification"],
        [
          { letter: "a", promptMarkdown: "Classify P.", points: 1 },
          { letter: "b", promptMarkdown: "Classify Q.", points: 1 },
          { letter: "c", promptMarkdown: "Classify R.", points: 2 },
        ],
        [
          "P is synthesis.",
          "Q is one substance breaking down.",
          "R has the same element oxidised and reduced.",
        ],
        [
          { part: "a", explanation: "P is a combination redox reaction." },
          { part: "b", explanation: "Q is a decomposition redox reaction." },
          { part: "c", explanation: "R is a disproportionation reaction." },
        ],
        ["Classifying only by reactant count and ignoring redox changes."],
      ),
      frq(
        "saq",
        L`Explain why $\mathrm{HCl+NaOH\rightarrow NaCl+H_2O}$ is not a redox reaction.`,
        3,
        ["non_redox", "oxidation_number_check"],
        [
          {
            letter: "a",
            promptMarkdown: "State the main reaction type.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Explain using oxidation numbers.",
            points: 2,
          },
        ],
        [
          "This is acid-base neutralisation.",
          "Check H, Cl, Na and O oxidation states.",
          "No oxidation number changes.",
        ],
        [
          {
            part: "a",
            explanation: "It is an acid-base neutralisation reaction.",
          },
          {
            part: "b",
            explanation:
              "The oxidation numbers of H, Cl, Na and O remain the same, so no oxidation or reduction occurs.",
          },
        ],
        ["Assuming every ionic equation is redox."],
      ),
    ],
  },
  {
    topicCode: "7.4",
    title: "Balancing Redox Reactions",
    subtopic:
      "Oxidation-number method and half-reaction method in acidic and basic media",
    mc: [
      mc(
        L`In acidic medium, the balanced half-reaction for $\mathrm{MnO_4^-\rightarrow Mn^{2+}}$ contains`,
        4,
        ["half_reaction_method", "acidic_medium"],
        [
          "4 electrons on product side",
          "5 electrons on reactant side",
          "3 electrons on reactant side",
          "8 electrons on product side",
        ],
        "B",
        {
          A: "Permanganate is reduced, so electrons are on the reactant side.",
          C: "Mn changes from +7 to +2, requiring five electrons.",
          D: "Electrons are not on the product side for reduction.",
        },
        [
          "Mn changes from +7 to +2.",
          "Reduction by 5 units needs 5 electrons.",
          "Electrons appear on the left in a reduction half-reaction.",
        ],
        L`$\mathrm{MnO_4^-+8H^+ +5e^-\rightarrow Mn^{2+}+4H_2O}$.`,
      ),
      mc(
        L`The coefficient of $\mathrm{H^+}$ in acidic balancing of $\mathrm{Cr_2O_7^{2-}\rightarrow Cr^{3+}}$ is`,
        4,
        ["half_reaction_method", "dichromate"],
        ["6", "8", "12", "14"],
        "D",
        {
          A: "Six electrons are used, not six protons.",
          B: "Eight hydrogens would not balance seven oxygens as water.",
          C: "Twelve hydrogens would make only six waters.",
        },
        [
          "Seven oxygen atoms become seven water molecules.",
          "Seven water molecules contain fourteen H atoms.",
          "Use fourteen protons on the left.",
        ],
        L`$\mathrm{Cr_2O_7^{2-}+14H^+ +6e^-\rightarrow2Cr^{3+}+7H_2O}$.`,
      ),
      mc(
        L`In the ion-electron method, oxygen atoms are balanced in acidic medium by adding`,
        1,
        ["half_reaction_method", "acidic_medium"],
        [
          L`$\mathrm{H^+}$`,
          L`$\mathrm{OH^-}$`,
          L`$\mathrm{H_2O}$`,
          "electrons",
        ],
        "C",
        {
          A: "$\\mathrm{H^+}$ is used after oxygen to balance hydrogen.",
          B: "$\\mathrm{OH^-}$ is mainly used in basic medium after conversion.",
          D: "Electrons balance charge, not oxygen atoms.",
        },
        [
          "First balance atoms other than O and H.",
          "Then balance O.",
          "Use water for oxygen in acidic medium.",
        ],
        "In acidic half-reaction balancing, oxygen is balanced by adding water.",
      ),
      mc(
        L`For $\mathrm{Fe^{2+}\rightarrow Fe^{3+}}$, the balanced oxidation half-reaction is`,
        2,
        ["half_reaction", "oxidation"],
        [
          L`$\mathrm{Fe^{2+}+e^-\rightarrow Fe^{3+}}$`,
          L`$\mathrm{Fe^{2+}\rightarrow Fe^{3+}+e^-}$`,
          L`$\mathrm{Fe^{3+}\rightarrow Fe^{2+}+e^-}$`,
          L`$\mathrm{Fe^{2+}+2e^-\rightarrow Fe}$`,
        ],
        "B",
        {
          A: "Electron on reactant side would make this a reduction.",
          C: "This shows ferric ion being reduced incorrectly.",
          D: "This forms iron metal, not ferric ion.",
        },
        [
          "Fe(II) changes to Fe(III).",
          "Charge increases by one.",
          "One electron is lost.",
        ],
        L`$\mathrm{Fe^{2+}\rightarrow Fe^{3+}+e^-}$.`,
      ),
      mc(
        L`The balanced acidic equation for $\mathrm{MnO_4^-}$ oxidising $\mathrm{Fe^{2+}}$ has the ratio $\mathrm{MnO_4^-:Fe^{2+}}$ equal to`,
        4,
        ["redox_balancing", "electron_equalisation"],
        ["1:1", "1:3", "1:5", "5:1"],
        "C",
        {
          A: "One permanganate accepts five electrons, not one.",
          B: "The electron changes are not three.",
          D: "The ratio is reversed.",
        },
        [
          "Permanganate to Mn2+ accepts 5 electrons.",
          "Each Fe2+ loses 1 electron.",
          "Five iron(II) ions are needed per permanganate.",
        ],
        L`$\mathrm{MnO_4^-+5Fe^{2+}+8H^+\rightarrow Mn^{2+}+5Fe^{3+}+4H_2O}$.`,
      ),
      mc(
        L`While balancing a redox equation in basic medium, after balancing in acidic form, one usually adds`,
        3,
        ["basic_medium", "half_reaction_method"],
        [
          L`$\mathrm{H^+}$ to both sides`,
          L`$\mathrm{OH^-}$ to both sides to neutralise $\mathrm{H^+}$`,
          "electrons to oxygen atoms",
          "solid sodium metal",
        ],
        "B",
        {
          A: "Adding more acid does not convert to basic medium.",
          C: "Electrons balance charge, not oxygen.",
          D: "Sodium metal is not a balancing species in aqueous basic medium.",
        },
        [
          "Acidic balancing may leave H+.",
          "Basic medium should not contain free H+.",
          "Add OH- to both sides to form water.",
        ],
        L`In basic medium, add $\mathrm{OH^-}$ to both sides for every $\mathrm{H^+}$ present, then simplify water.`,
      ),
      mc(
        L`The oxidation-number method balances redox equations by first matching`,
        2,
        ["oxidation_number_method"],
        [
          "total atoms of hydrogen only",
          "increase and decrease in oxidation numbers",
          "only charges of spectator ions",
          "physical states",
        ],
        "B",
        {
          A: "Hydrogen balancing is not the first redox accounting step.",
          C: "Spectator ions do not drive the redox change.",
          D: "Physical states do not balance electron transfer.",
        },
        [
          "Find atoms whose oxidation numbers change.",
          "Compute total increase and decrease.",
          "Make electron loss equal electron gain.",
        ],
        "The oxidation-number method equates total increase and decrease in oxidation numbers.",
      ),
      mc(
        L`In acidic medium, $\mathrm{NO_3^-}$ changing to $\mathrm{NO}$ requires how many electrons per nitrogen atom?`,
        4,
        ["half_reaction_method", "nitrate_reduction"],
        ["1", "2", "3", "5"],
        "C",
        {
          A: "Nitrogen does not change by one unit.",
          B: "This would reduce nitrogen only from +5 to +3.",
          D: "Five electrons would reduce nitrogen to 0.",
        },
        [
          "N is +5 in nitrate.",
          "N is +2 in NO.",
          "Decrease of 3 means gain of 3 electrons.",
        ],
        L`Nitrogen changes from +5 to +2, so each nitrate ion gains 3 electrons.`,
      ),
      mc(
        L`The final balanced equation must satisfy`,
        2,
        ["balancing_check", "conservation"],
        [
          "mass balance only",
          "charge balance only",
          "neither mass nor charge balance",
          "both mass and charge balance",
        ],
        "D",
        {
          A: "Ionic redox equations must also balance charge.",
          B: "Atoms must also be conserved.",
          C: "Both conservation conditions are mandatory.",
        },
        [
          "Chemical equations conserve atoms.",
          "Ionic equations also conserve net charge.",
          "Both checks are needed.",
        ],
        "A balanced redox equation must conserve both mass and charge.",
      ),
      mc(
        L`The number of electrons in $\mathrm{Cr_2O_7^{2-}+14H^+ +xe^-\rightarrow2Cr^{3+}+7H_2O}$ is`,
        4,
        ["half_reaction_charge_balance", "dichromate"],
        ["3", "5", "6", "7"],
        "C",
        {
          A: "Each chromium changes by 3, and there are two chromium atoms.",
          B: "Five electrons applies to permanganate to manganese(II).",
          D: "Seven is the number of oxygen atoms/water molecules.",
        },
        [
          "Each Cr changes from +6 to +3.",
          "That is gain of 3 electrons per Cr.",
          "There are two Cr atoms.",
        ],
        "The half-reaction needs six electrons.",
      ),
    ],
    constructed: [
      frq(
        "saq",
        L`Balance the half-reaction $\mathrm{MnO_4^-\rightarrow Mn^{2+}}$ in acidic medium.`,
        5,
        ["half_reaction_method", "acidic_medium"],
        [
          {
            letter: "a",
            promptMarkdown: "Balance oxygen and hydrogen.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Balance charge with electrons.",
            points: 3,
          },
        ],
        [
          "Add water to the side needing oxygen.",
          "Add hydrogen ions to balance hydrogen.",
          "Then add electrons to balance charge.",
        ],
        [
          {
            part: "a",
            explanation:
              "$\\mathrm{MnO_4^-\\rightarrow Mn^{2+}+4H_2O}$, then add $8\\mathrm{H^+}$ to the left.",
          },
          {
            part: "b",
            explanation:
              "Charge balance gives $\\mathrm{MnO_4^-+8H^+ +5e^-\\rightarrow Mn^{2+}+4H_2O}$.",
          },
        ],
        [
          "Adding electrons before balancing atoms and then losing charge balance.",
        ],
      ),
      frq(
        "saq",
        L`Balance $\mathrm{Fe^{2+}\rightarrow Fe^{3+}}$ and $\mathrm{Ce^{4+}\rightarrow Ce^{3+}}$ as half-reactions, then combine them.`,
        4,
        ["half_reaction_combination"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the oxidation half-reaction.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Write the reduction half-reaction.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Write the net ionic equation.",
            points: 2,
          },
        ],
        [
          "Iron(II) loses one electron.",
          "Cerium(IV) gains one electron.",
          "The electrons cancel directly.",
        ],
        [
          {
            part: "a",
            explanation: "$\\mathrm{Fe^{2+}\\rightarrow Fe^{3+}+e^-}$.",
          },
          {
            part: "b",
            explanation: "$\\mathrm{Ce^{4+}+e^-\\rightarrow Ce^{3+}}$.",
          },
          {
            part: "c",
            explanation:
              "$\\mathrm{Fe^{2+}+Ce^{4+}\\rightarrow Fe^{3+}+Ce^{3+}}$.",
          },
        ],
        ["Adding electrons to the final net equation."],
      ),
      frq(
        "laq",
        L`Balance $\mathrm{Cr_2O_7^{2-}+Fe^{2+}\rightarrow Cr^{3+}+Fe^{3+}}$ in acidic medium.`,
        5,
        ["redox_balancing", "acidic_medium", "dichromate"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Write the balanced dichromate reduction half-reaction.",
            points: 3,
          },
          {
            letter: "b",
            promptMarkdown:
              "Write the iron oxidation half-reaction and equalise electrons.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Write the final net ionic equation.",
            points: 2,
          },
        ],
        [
          "Dichromate needs 14 H+ and 7 water molecules.",
          "Dichromate accepts 6 electrons.",
          "Multiply iron half-reaction by 6.",
        ],
        [
          {
            part: "a",
            explanation:
              "$\\mathrm{Cr_2O_7^{2-}+14H^+ +6e^-\\rightarrow2Cr^{3+}+7H_2O}$.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{Fe^{2+}\\rightarrow Fe^{3+}+e^-}$; multiply by 6.",
          },
          {
            part: "c",
            explanation:
              "$\\mathrm{Cr_2O_7^{2-}+14H^+ +6Fe^{2+}\\rightarrow2Cr^{3+}+7H_2O+6Fe^{3+}}$.",
          },
        ],
        ["Using five Fe2+ ions by confusing dichromate with permanganate."],
      ),
      frq(
        "saq",
        L`Balance $\mathrm{Cl_2\rightarrow Cl^-+ClO^-}$ in basic medium.`,
        5,
        ["basic_medium", "disproportionation_balancing"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Write the balanced equation with hydroxide and water.",
            points: 4,
          },
          {
            letter: "b",
            promptMarkdown: "Show the oxidation-number reason.",
            points: 2,
          },
        ],
        [
          "This is chlorine disproportionation.",
          "Basic medium includes OH-.",
          "The known atom and charge balance gives one water molecule.",
        ],
        [
          {
            part: "a",
            explanation: "$\\mathrm{Cl_2+2OH^-\\rightarrow Cl^-+ClO^-+H_2O}$.",
          },
          {
            part: "b",
            explanation:
              "Chlorine changes from 0 to -1 in chloride and from 0 to +1 in hypochlorite.",
          },
        ],
        ["Balancing atoms but leaving net charge unequal."],
      ),
      frq(
        "vsaq",
        L`In acidic half-reaction balancing, what is added to balance oxygen atoms and what is added to balance hydrogen atoms?`,
        2,
        ["acidic_medium_steps"],
        singlePart("a", "State both additions.", 2),
        [
          "Oxygen is balanced before hydrogen.",
          "Water supplies oxygen.",
          "Hydrogen ions balance hydrogen.",
        ],
        [
          {
            part: "a",
            explanation:
              "Add $\\mathrm{H_2O}$ to balance oxygen atoms and $\\mathrm{H^+}$ to balance hydrogen atoms.",
          },
        ],
        ["Using hydroxide ions for acidic medium directly."],
      ),
      frq(
        "case",
        L`A student balances an ionic redox equation and gets equal atoms on both sides, but the total charge is +3 on the left and +1 on the right.`,
        3,
        ["case_based", "balancing_check"],
        [
          {
            letter: "a",
            promptMarkdown: "Is the equation fully balanced?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "What condition is still violated?",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Which species is normally used to repair charge balance in half-reactions?",
            points: 1,
          },
        ],
        [
          "Ionic equations require more than atom balance.",
          "Net charge must also match.",
          "Electrons are used to balance charge in half-reactions.",
        ],
        [
          { part: "a", explanation: "No, it is not fully balanced." },
          {
            part: "b",
            explanation:
              "Charge conservation is violated because total charges differ.",
          },
          {
            part: "c",
            explanation:
              "Electrons are used to balance charge in half-reactions.",
          },
        ],
        ["Checking only atom counts in ionic redox equations."],
      ),
      frq(
        "saq",
        L`Using oxidation-number changes, find the coefficient ratio for $\mathrm{I^-}$ and $\mathrm{MnO_4^-}$ in acidic oxidation of iodide to iodine.`,
        5,
        ["oxidation_number_method", "electron_equalisation"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Find electrons lost by two iodide ions forming iodine.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find electrons gained by one permanganate ion forming $\\mathrm{Mn^{2+}}$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Give the ratio $\\mathrm{MnO_4^-:I^-}$.",
            points: 2,
          },
        ],
        [
          "Two iodide ions form one iodine molecule.",
          "Each iodide goes from -1 to 0.",
          "Permanganate gains 5 electrons.",
        ],
        [
          {
            part: "a",
            explanation:
              "$\\mathrm{2I^-\\rightarrow I_2+2e^-}$, so two iodides lose two electrons.",
          },
          {
            part: "b",
            explanation:
              "One $\\mathrm{MnO_4^-}$ gains five electrons to form $\\mathrm{Mn^{2+}}$.",
          },
          {
            part: "c",
            explanation:
              "LCM of 2 and 5 is 10, so ratio $\\mathrm{MnO_4^-:I^-}=2:10=1:5$.",
          },
        ],
        ["Using one iodide ion directly to form one iodine molecule."],
      ),
      frq(
        "saq",
        L`Balance the skeleton half-reaction $\mathrm{NO_3^-\rightarrow NO}$ in acidic medium.`,
        5,
        ["half_reaction_method", "nitrate_reduction"],
        [
          {
            letter: "a",
            promptMarkdown: "Balance oxygen and hydrogen.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Balance charge with electrons.",
            points: 3,
          },
        ],
        [
          "Three oxygens on nitrate require water on the product side.",
          "Use protons to balance hydrogen.",
          "Nitrogen changes from +5 to +2.",
        ],
        [
          {
            part: "a",
            explanation:
              "$\\mathrm{NO_3^-+4H^+\\rightarrow NO+2H_2O}$ balances atoms.",
          },
          {
            part: "b",
            explanation:
              "Charge balance gives $\\mathrm{NO_3^-+4H^+ +3e^-\\rightarrow NO+2H_2O}$.",
          },
        ],
        [
          "Putting electrons on the product side for a reduction half-reaction.",
        ],
      ),
      frq(
        "laq",
        L`In alkaline medium, construct the net ionic equation for $\mathrm{MnO_4^-}$ converting $\mathrm{SO_3^{2-}}$ to $\mathrm{SO_4^{2-}}$ while itself forming $\mathrm{MnO_2}$.`,
        5,
        ["basic_medium", "half_reaction_method"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the balanced reduction half-reaction.",
            points: 3,
          },
          {
            letter: "b",
            promptMarkdown: "Write the balanced oxidation half-reaction.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Combine the half-reactions.",
            points: 3,
          },
        ],
        [
          "In basic medium, $\\mathrm{MnO_4^-}$ becomes $\\mathrm{MnO_2}$.",
          "Sulfite becomes sulfate.",
          "Equalise two-electron changes.",
        ],
        [
          {
            part: "a",
            explanation:
              "$\\mathrm{MnO_4^-+2H_2O+3e^-\\rightarrow MnO_2+4OH^-}$.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{SO_3^{2-}+2OH^-\\rightarrow SO_4^{2-}+H_2O+2e^-}$.",
          },
          {
            part: "c",
            explanation:
              "After multiplying by 2 and 3 respectively, the net equation is $\\mathrm{2MnO_4^-+3SO_3^{2-}+H_2O\\rightarrow2MnO_2+3SO_4^{2-}+2OH^-}$.",
          },
        ],
        ["Leaving acidic $\\mathrm{H^+}$ in a final basic-medium equation."],
      ),
      frq(
        "case",
        L`A learner balances $\mathrm{MnO_4^-+Fe^{2+}}$ in acid and writes coefficient 3 for $\mathrm{Fe^{2+}}$ because there are three oxygen atoms in a different example.`,
        4,
        ["case_based", "error_analysis_balancing"],
        [
          {
            letter: "a",
            promptMarkdown: "What electron change occurs for Mn?",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "What coefficient of $\\mathrm{Fe^{2+}}$ is required per $\\mathrm{MnO_4^-}$?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Explain the student's mistake.",
            points: 2,
          },
        ],
        [
          "Mn changes +7 to +2.",
          "Fe2+ loses one electron.",
          "Coefficients come from electron balance, not oxygen count from another reaction.",
        ],
        [
          { part: "a", explanation: "Mn gains 5 electrons." },
          {
            part: "b",
            explanation:
              "Five $\\mathrm{Fe^{2+}}$ ions are needed per permanganate ion.",
          },
          {
            part: "c",
            explanation:
              "The coefficient is fixed by equalising electron gain and loss, not by copying an oxygen count.",
          },
        ],
        ["Memorising a coefficient without checking oxidation-number change."],
      ),
    ],
  },
  {
    topicCode: "7.5",
    title: "Redox Reactions and Electrode Processes",
    subtopic:
      "Oxidation and reduction at electrodes, anode/cathode roles, simple galvanic-cell interpretation and electrode half-reactions",
    mc: [
      mc(
        L`In a galvanic cell, oxidation occurs at the`,
        2,
        ["electrode_process", "anode"],
        ["cathode", "anode", "salt bridge", "voltmeter"],
        "B",
        {
          A: "Reduction occurs at the cathode.",
          C: "The salt bridge completes the circuit but is not where oxidation occurs.",
          D: "The voltmeter measures potential difference.",
        },
        [
          "Remember anode and oxidation both begin with vowels.",
          "Oxidation is electron loss.",
          "In galvanic cells, oxidation occurs at the anode.",
        ],
        "Oxidation occurs at the anode.",
        simpleCellFigure,
      ),
      mc(
        L`In the zinc-copper cell shown, the zinc electrode most directly undergoes`,
        3,
        ["galvanic_cell", "zinc_copper_cell"],
        [
          "reduction to zinc metal",
          "oxidation to zinc ions",
          "precipitation of zinc sulphate",
          "neutralisation",
        ],
        "B",
        {
          A: "Zinc metal is the starting electrode and tends to form zinc ions.",
          C: "The main electrode process is electron loss by zinc.",
          D: "No acid-base neutralisation is shown.",
        },
        [
          "Zinc is the more active metal in this pair.",
          "It loses electrons.",
          "Loss of electrons is oxidation.",
        ],
        L`At the zinc electrode, $\mathrm{Zn\rightarrow Zn^{2+}+2e^-}$.`,
        simpleCellFigure,
      ),
      mc(
        L`Reduction in an electrochemical cell means`,
        1,
        ["electrode_process", "reduction"],
        [
          "loss of electrons at cathode",
          "gain of electrons at cathode",
          "loss of protons at salt bridge",
          "evaporation of solvent",
        ],
        "B",
        {
          A: "Loss of electrons is oxidation.",
          C: "The salt bridge maintains ion flow; it is not the redox electrode process.",
          D: "Evaporation is not reduction.",
        },
        [
          "Reduction is electron gain.",
          "In a galvanic cell reduction occurs at cathode.",
          "Combine both ideas.",
        ],
        "Reduction is gain of electrons, and it occurs at the cathode in a galvanic cell.",
      ),
      mc(
        L`The salt bridge in a simple galvanic cell is used mainly to`,
        2,
        ["salt_bridge", "galvanic_cell"],
        [
          "supply electrons directly to the cathode",
          "maintain electrical neutrality by ion migration",
          "consume all metal ions",
          "stop all chemical reaction",
        ],
        "B",
        {
          A: "Electrons move through the external wire, not the salt bridge.",
          C: "The salt bridge does not consume all ions.",
          D: "The salt bridge allows the cell reaction to continue.",
        },
        [
          "Charge would build up in half-cells without ion movement.",
          "The bridge permits ions to migrate.",
          "This completes the internal circuit.",
        ],
        "The salt bridge maintains electrical neutrality by allowing ion migration.",
        simpleCellFigure,
      ),
      mc(
        L`For the half-cell $\mathrm{Cu^{2+}+2e^-\rightarrow Cu}$, the electrode process is`,
        2,
        ["cathode_process", "reduction"],
        [
          "oxidation at anode",
          "reduction at cathode",
          "oxidation at cathode",
          "reduction at anode in a galvanic cell",
        ],
        "B",
        {
          A: "Electrons are consumed, not produced.",
          C: "Oxidation is electron loss.",
          D: "In a galvanic cell, reduction occurs at the cathode.",
        },
        [
          "Electrons are on the reactant side.",
          "That means gain of electrons.",
          "Reduction occurs at cathode.",
        ],
        "Copper ions gain electrons at the cathode to form copper metal.",
      ),
      mc(
        L`If electrons flow through the external wire from electrode X to electrode Y in a galvanic cell, electrode X is the`,
        4,
        ["electron_flow", "anode_cathode"],
        [
          "cathode where reduction occurs",
          "anode where oxidation occurs",
          "salt bridge terminal",
          "cathode where oxidation occurs",
        ],
        "B",
        {
          A: "Electrons are produced at the anode and consumed at the cathode.",
          C: "A salt bridge is not an electrode.",
          D: "Cathode is the reduction electrode in a galvanic cell.",
        },
        [
          "Electrons leave the oxidation electrode.",
          "Oxidation produces electrons.",
          "Therefore X is the anode.",
        ],
        "The electrode from which electrons leave is the anode, where oxidation occurs.",
      ),
      mc(
        L`In the cell reaction $\mathrm{Zn+Cu^{2+}\rightarrow Zn^{2+}+Cu}$, the cathode half-reaction is`,
        3,
        ["cathode_half_reaction"],
        [
          L`$\mathrm{Zn\rightarrow Zn^{2+}+2e^-}$`,
          L`$\mathrm{Cu^{2+}+2e^-\rightarrow Cu}$`,
          L`$\mathrm{Zn^{2+}+2e^-\rightarrow Zn}$`,
          L`$\mathrm{Cu\rightarrow Cu^{2+}+2e^-}$`,
        ],
        "B",
        {
          A: "This is oxidation at the anode.",
          C: "Zinc ion reduction is not the given spontaneous cell reaction.",
          D: "Copper oxidation is the reverse of the cathode process.",
        },
        [
          "Cathode is reduction.",
          "Copper(II) ions become copper metal.",
          "Write electrons on the left.",
        ],
        L`The cathode half-reaction is $\mathrm{Cu^{2+}+2e^-\rightarrow Cu}$.`,
        simpleCellFigure,
      ),
      mc(
        L`At the anode of the zinc-copper galvanic cell, mass of the zinc electrode generally`,
        3,
        ["electrode_mass", "zinc_anode"],
        [
          "increases because zinc plates out",
          "decreases because zinc atoms enter solution as ions",
          "remains exactly constant",
          "turns into copper",
        ],
        "B",
        {
          A: "Zinc is oxidised and dissolves; copper plates at the cathode.",
          C: "Zinc atoms are consumed into solution.",
          D: "The electrode does not transmute into copper.",
        },
        [
          "Anode is oxidation.",
          "Zinc changes to zinc ions.",
          "Metal atoms leave the electrode.",
        ],
        "The zinc electrode loses mass as zinc atoms form zinc ions in solution.",
        simpleCellFigure,
      ),
      mc(
        L`Which statement about electrode naming in a galvanic cell is correct?`,
        3,
        ["electrode_naming", "galvanic_cell"],
        [
          "Anode is always positive because oxidation occurs there",
          "Cathode is the electrode where oxidation occurs",
          "Anode is the electrode where reduction occurs",
          "Cathode is where reduction occurs",
        ],
        "D",
        {
          A: "In a galvanic cell the anode is negative, but the universal idea is oxidation at anode.",
          B: "Cathode is reduction.",
          C: "Anode is oxidation.",
        },
        [
          "Do not rely only on sign.",
          "Use process definitions.",
          "Cathode is reduction.",
        ],
        "In a galvanic cell, the cathode is where reduction occurs.",
      ),
      mc(
        L`The electrode process $\mathrm{Ag^+ + e^- \rightarrow Ag}$ would cause`,
        3,
        ["electrode_deposition", "reduction"],
        [
          "mass of silver electrode to decrease",
          "silver metal to deposit",
          "oxidation of silver ion",
          "formation of electrons as products",
        ],
        "B",
        {
          A: "Reduction deposits metal on the electrode.",
          C: "$\\mathrm{Ag^+}$ gains an electron, so it is reduced.",
          D: "Electrons are reactants, not products.",
        },
        [
          "Silver ion gains electron.",
          "Neutral silver atoms form.",
          "They plate out as metal.",
        ],
        "Reduction of silver ions deposits silver metal.",
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`In a galvanic cell, name the electrode at which oxidation occurs.`,
        1,
        ["anode"],
        singlePart("a", "Name the electrode.", 1),
        [
          "Oxidation is electron loss.",
          "Anode is the oxidation electrode.",
          "Use the name, not the sign.",
        ],
        [{ part: "a", explanation: "Oxidation occurs at the anode." }],
        ["Writing cathode because it sounds like cation."],
      ),
      frq(
        "vsaq",
        L`In a galvanic cell, name the electrode at which reduction occurs.`,
        1,
        ["cathode"],
        singlePart("a", "Name the electrode.", 1),
        [
          "Reduction is electron gain.",
          "Cathode is the reduction electrode.",
          "Use the process definition.",
        ],
        [{ part: "a", explanation: "Reduction occurs at the cathode." }],
        ["Writing anode because it is where electrons are produced."],
      ),
      frq(
        "saq",
        L`For the zinc-copper cell shown, write the anode and cathode half-reactions.`,
        4,
        ["galvanic_cell", "half_reactions"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the anode half-reaction.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Write the cathode half-reaction.",
            points: 2,
          },
        ],
        [
          "Zinc is oxidised.",
          "Copper(II) is reduced.",
          "Electrons appear on product side for oxidation and reactant side for reduction.",
        ],
        [
          {
            part: "a",
            explanation: "Anode: $\\mathrm{Zn\\rightarrow Zn^{2+}+2e^-}$.",
          },
          {
            part: "b",
            explanation: "Cathode: $\\mathrm{Cu^{2+}+2e^-\\rightarrow Cu}$.",
          },
        ],
        ["Writing both half-reactions as reductions."],
        simpleCellFigure,
      ),
      frq(
        "saq",
        L`Explain the role of the salt bridge in the cell shown.`,
        3,
        ["salt_bridge", "galvanic_cell"],
        [
          {
            letter: "a",
            promptMarkdown: "State why charge balance is needed.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "State what the salt bridge allows.",
            points: 2,
          },
        ],
        [
          "Oxidation and reduction change ion concentrations.",
          "Charge buildup would stop the cell.",
          "The bridge allows ions to migrate.",
        ],
        [
          {
            part: "a",
            explanation:
              "As oxidation and reduction occur, charge imbalance would build up in the half-cells if ions could not move.",
          },
          {
            part: "b",
            explanation:
              "The salt bridge allows ions to migrate and maintain electrical neutrality, completing the internal circuit.",
          },
        ],
        ["Saying electrons move through the salt bridge."],
        simpleCellFigure,
      ),
      frq(
        "laq",
        L`A cell has $\mathrm{Zn/Zn^{2+}}$ in one half-cell and $\mathrm{Ag^+/Ag}$ in the other. Zinc is oxidised and silver ion is reduced.`,
        5,
        ["electrode_process", "cell_reaction"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the oxidation half-reaction.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Write the reduction half-reaction.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Equalise electrons and write the net reaction.",
            points: 3,
          },
        ],
        [
          "Zinc loses two electrons.",
          "Each silver ion gains one electron.",
          "Use two silver ions per zinc atom.",
        ],
        [
          {
            part: "a",
            explanation: "$\\mathrm{Zn\\rightarrow Zn^{2+}+2e^-}$.",
          },
          { part: "b", explanation: "$\\mathrm{Ag^+ + e^-\\rightarrow Ag}$." },
          {
            part: "c",
            explanation:
              "Multiplying the silver half-reaction by 2 gives $\\mathrm{Zn+2Ag^+\\rightarrow Zn^{2+}+2Ag}$.",
          },
        ],
        [
          "Writing one silver ion per zinc atom and leaving electrons unmatched.",
        ],
      ),
      frq(
        "case",
        L`During cell operation, electrode X loses mass and electrode Y gains a metal coating. Electrons flow through the wire from X to Y.`,
        4,
        ["case_based", "electrode_identification"],
        [
          {
            letter: "a",
            promptMarkdown: "Which electrode is the anode?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Which electrode is the cathode?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Explain using oxidation and reduction.",
            points: 3,
          },
        ],
        [
          "Metal loss usually means atoms become ions.",
          "Metal coating means ions gain electrons.",
          "Electrons leave the anode and reach the cathode.",
        ],
        [
          { part: "a", explanation: "X is the anode." },
          { part: "b", explanation: "Y is the cathode." },
          {
            part: "c",
            explanation:
              "At X, metal atoms are oxidised and enter solution, so mass decreases. At Y, metal ions are reduced and deposit, so mass increases.",
          },
        ],
        ["Using electrode sign without using the described process."],
      ),
      frq(
        "saq",
        L`For $\mathrm{Cu^{2+}+2e^-\rightarrow Cu}$, state the electrode type in a galvanic cell and one visible change expected at that electrode.`,
        3,
        ["cathode_process", "deposition"],
        [
          {
            letter: "a",
            promptMarkdown: "Name the electrode type.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State the visible/mass change.",
            points: 2,
          },
        ],
        [
          "Electrons are consumed.",
          "Electron gain is reduction.",
          "Metal deposition increases electrode mass.",
        ],
        [
          { part: "a", explanation: "It is the cathode process." },
          {
            part: "b",
            explanation:
              "Copper metal deposits on the electrode, so its mass generally increases.",
          },
        ],
        ["Calling the cathode an oxidation electrode."],
      ),
      frq(
        "saq",
        L`A student says electrons move through the salt bridge from anode to cathode. Correct the statement.`,
        3,
        ["salt_bridge", "misconception_repair"],
        [
          {
            letter: "a",
            promptMarkdown: "State the path taken by electrons.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State what moves through the salt bridge.",
            points: 2,
          },
        ],
        [
          "Electrons move in the metal wire.",
          "The salt bridge conducts ions.",
          "Ion migration maintains neutrality.",
        ],
        [
          {
            part: "a",
            explanation:
              "Electrons move through the external wire from anode to cathode.",
          },
          {
            part: "b",
            explanation:
              "Ions move through the salt bridge to maintain electrical neutrality in the two half-cells.",
          },
        ],
        ["Treating the salt bridge as a metal wire."],
      ),
      frq(
        "case",
        L`The cell diagram shows zinc and copper electrodes in their salt solutions connected by a meter and salt bridge.`,
        4,
        ["case_based", "cell_diagram"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Which electrode is expected to supply electrons to the external circuit?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Write the corresponding half-reaction.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Name the process at the copper electrode.",
            points: 2,
          },
        ],
        [
          "Zinc is oxidised in the zinc-copper cell.",
          "Oxidation supplies electrons.",
          "Copper(II) ions are reduced at copper electrode.",
        ],
        [
          { part: "a", explanation: "The zinc electrode supplies electrons." },
          {
            part: "b",
            explanation: "$\\mathrm{Zn\\rightarrow Zn^{2+}+2e^-}$.",
          },
          {
            part: "c",
            explanation: "Reduction occurs at the copper electrode.",
          },
        ],
        [
          "Assuming copper supplies electrons because it is a better conductor.",
        ],
        simpleCellFigure,
      ),
      frq(
        "laq",
        L`Connect electrode processes with the overall reaction $\mathrm{Zn+Cu^{2+}\rightarrow Zn^{2+}+Cu}$.`,
        5,
        ["electrode_process", "overall_reaction"],
        [
          {
            letter: "a",
            promptMarkdown: "Identify anode and cathode species.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Write both half-reactions.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Show that adding them gives the overall reaction.",
            points: 2,
          },
        ],
        [
          "Anode is oxidation.",
          "Cathode is reduction.",
          "Electrons cancel when half-reactions are added.",
        ],
        [
          {
            part: "a",
            explanation:
              "Zn is oxidised at the anode; $\\mathrm{Cu^{2+}}$ is reduced at the cathode.",
          },
          {
            part: "b",
            explanation:
              "Half-reactions are $\\mathrm{Zn\\rightarrow Zn^{2+}+2e^-}$ and $\\mathrm{Cu^{2+}+2e^-\\rightarrow Cu}$.",
          },
          {
            part: "c",
            explanation:
              "Adding cancels $2e^-$ and gives $\\mathrm{Zn+Cu^{2+}\\rightarrow Zn^{2+}+Cu}$.",
          },
        ],
        ["Leaving electrons in the final overall reaction."],
      ),
    ],
  },
];

export const redoxReactionsTopics: Topic[] = topicSeeds.map(makeTopic);
