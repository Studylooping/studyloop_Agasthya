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
const UNIT = "u4-d-and-f-block-elements";
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
        /(^|[^\\])\b(mathrm|text|frac|Delta|delta|alpha|beta|gamma|times|cdot|approx|rightarrow|rightleftharpoons|le|ge|neq|mu|sqrt)\b/g,
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
  return `You chose ${choiceText}. Recheck the d/f-block definition, electronic configuration, oxidation state, colour, magnetism, or redox half-reaction before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        : "incorrect_cbse_class12_chemistry_d_f_block_reasoning",
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "memorises_a_d_block_fact_without_linking_it_to_configuration_or_oxidation_state",
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "states_a_property_without_configuration_redox_or_contraction_reasoning",
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
      description: `Completes part ${item.letter} with correct d- and f-block reasoning and supporting formula or example where required.`,
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

const dBlockPositionFigure: ItemFigure = {
  type: "svg",
  title: "Periodic-table block map",
  description:
    "A simplified periodic-table map shows the central shaded region and the separated lower rows used to locate d- and f-block elements.",
  svg: `<svg viewBox="0 0 720 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="420" fill="#ffffff"/>
  <text x="360" y="34" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="#111827">Simplified periodic-table blocks</text>
  <g font-family="Arial" font-size="12" fill="#334155" text-anchor="middle">
    <text x="62" y="76">1</text><text x="98" y="76">2</text><text x="494" y="76">13</text><text x="530" y="76">14</text><text x="566" y="76">15</text><text x="602" y="76">16</text><text x="638" y="76">17</text><text x="674" y="76">18</text>
    <text x="134" y="76">3</text><text x="170" y="76">4</text><text x="206" y="76">5</text><text x="242" y="76">6</text><text x="278" y="76">7</text><text x="314" y="76">8</text><text x="350" y="76">9</text><text x="386" y="76">10</text><text x="422" y="76">11</text><text x="458" y="76">12</text>
  </g>
  <g stroke="#cbd5e1" stroke-width="1.5">
    <rect x="44" y="90" width="72" height="180" fill="#dbeafe"/>
    <rect x="116" y="150" width="360" height="120" fill="#fde68a"/>
    <rect x="476" y="90" width="216" height="180" fill="#dcfce7"/>
    <rect x="116" y="306" width="504" height="72" fill="#f3e8ff"/>
  </g>
  <g font-family="Arial" font-size="16" font-weight="700" text-anchor="middle">
    <text x="80" y="184" fill="#1d4ed8">s</text>
    <text x="296" y="216" fill="#92400e">central block</text>
    <text x="584" y="184" fill="#166534">p</text>
    <text x="368" y="348" fill="#6b21a8">inner transition rows</text>
  </g>
  <g stroke="#94a3b8" stroke-width="1">
    <path d="M116 150 H476 M116 190 H476 M116 230 H476"/>
    <path d="M476 90 H692 M476 130 H692 M476 170 H692 M476 210 H692 M476 250 H692"/>
    <path d="M44 90 H116 M44 130 H116 M44 170 H116 M44 210 H116 M44 250 H116"/>
  </g>
</svg>`,
};

const oxidationStatesFigure: ItemFigure = {
  type: "svg",
  title: "Common oxidation states of first-row transition elements",
  description:
    "A data strip lists selected common oxidation states across the first transition series for trend interpretation.",
  svg: `<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="360" fill="#ffffff"/>
  <text x="380" y="34" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="#111827">Selected oxidation states in the first transition series</text>
  <g font-family="Arial" text-anchor="middle">
    <text x="74" y="82" font-size="15" fill="#334155">Ti</text><text x="144" y="82" font-size="15" fill="#334155">V</text><text x="214" y="82" font-size="15" fill="#334155">Cr</text><text x="284" y="82" font-size="15" fill="#334155">Mn</text><text x="354" y="82" font-size="15" fill="#334155">Fe</text><text x="424" y="82" font-size="15" fill="#334155">Co</text><text x="494" y="82" font-size="15" fill="#334155">Ni</text><text x="564" y="82" font-size="15" fill="#334155">Cu</text><text x="634" y="82" font-size="15" fill="#334155">Zn</text>
  </g>
  <line x1="48" y1="290" x2="686" y2="290" stroke="#334155" stroke-width="2"/>
  <line x1="48" y1="70" x2="48" y2="290" stroke="#334155" stroke-width="2"/>
  <g stroke="#e5e7eb" stroke-width="1">
    <line x1="48" y1="250" x2="686" y2="250"/><line x1="48" y1="210" x2="686" y2="210"/><line x1="48" y1="170" x2="686" y2="170"/><line x1="48" y1="130" x2="686" y2="130"/><line x1="48" y1="90" x2="686" y2="90"/>
  </g>
  <g font-family="Arial" font-size="13" fill="#475569" text-anchor="end">
    <text x="40" y="294">+1</text><text x="40" y="254">+2</text><text x="40" y="214">+3</text><text x="40" y="174">+4</text><text x="40" y="134">+5</text><text x="40" y="114">+6</text><text x="40" y="94">+7</text>
  </g>
  <g fill="#2563eb">
    <circle cx="74" cy="250" r="6"/><circle cx="74" cy="210" r="6"/><circle cx="74" cy="170" r="6"/>
    <circle cx="144" cy="250" r="6"/><circle cx="144" cy="210" r="6"/><circle cx="144" cy="170" r="6"/><circle cx="144" cy="130" r="6"/>
    <circle cx="214" cy="250" r="6"/><circle cx="214" cy="210" r="6"/><circle cx="214" cy="110" r="6"/>
    <circle cx="284" cy="250" r="6"/><circle cx="284" cy="170" r="6"/><circle cx="284" cy="90" r="6"/>
    <circle cx="354" cy="250" r="6"/><circle cx="354" cy="210" r="6"/>
    <circle cx="424" cy="250" r="6"/><circle cx="424" cy="210" r="6"/>
    <circle cx="494" cy="250" r="6"/>
    <circle cx="564" cy="290" r="6"/><circle cx="564" cy="250" r="6"/>
    <circle cx="634" cy="250" r="6"/>
  </g>
  <text x="380" y="332" text-anchor="middle" font-family="Arial" font-size="15" fill="#334155">Dots show selected common oxidation states, not every possible compound.</text>
</svg>`,
};

const lanthanoidContractionFigure: ItemFigure = {
  type: "svg",
  title: "Lanthanoid contraction trend",
  description:
    "A line trend shows the gradual decrease in trivalent lanthanoid ionic radii from La to Lu.",
  svg: `<svg viewBox="0 0 720 400" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="400" fill="#ffffff"/>
  <text x="360" y="34" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="#111827">Trend in Ln<tspan baseline-shift="super" font-size="13">3+</tspan> ionic radius</text>
  <line x1="80" y1="320" x2="650" y2="320" stroke="#334155" stroke-width="3"/>
  <line x1="80" y1="320" x2="80" y2="70" stroke="#334155" stroke-width="3"/>
  <g stroke="#e5e7eb" stroke-width="1">
    <line x1="80" y1="260" x2="650" y2="260"/><line x1="80" y1="200" x2="650" y2="200"/><line x1="80" y1="140" x2="650" y2="140"/><line x1="80" y1="80" x2="650" y2="80"/>
  </g>
  <polyline points="100,105 185,128 270,154 355,181 440,210 525,238 610,265" fill="none" stroke="#7c3aed" stroke-width="4"/>
  <g fill="#7c3aed">
    <circle cx="100" cy="105" r="6"/><circle cx="185" cy="128" r="6"/><circle cx="270" cy="154" r="6"/><circle cx="355" cy="181" r="6"/><circle cx="440" cy="210" r="6"/><circle cx="525" cy="238" r="6"/><circle cx="610" cy="265" r="6"/>
  </g>
  <g font-family="Arial" font-size="14" fill="#111827" text-anchor="middle">
    <text x="100" y="345">La</text><text x="185" y="345">Ce</text><text x="270" y="345">Nd</text><text x="355" y="345">Sm</text><text x="440" y="345">Gd</text><text x="525" y="345">Dy</text><text x="610" y="345">Lu</text>
  </g>
  <text x="360" y="382" text-anchor="middle" font-family="Arial" font-size="15" fill="#334155">Across the series, shielding by 4f electrons is poor, so Ln<tspan baseline-shift="super" font-size="10">3+</tspan> becomes smaller.</text>
  <text x="28" y="200" transform="rotate(-90 28 200)" text-anchor="middle" font-family="Arial" font-size="16" fill="#111827">ionic radius</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "4.1",
    title: "Position and Electronic Configuration",
    subtopic:
      "Location of d- and f-block elements, transition-element definition, and exceptional first-series configurations.",
    mc: [
      mc(
        L`In the figure, the shaded central region of the periodic table corresponds mainly to`,
        2,
        ["periodic_table", "d_block", "block_position"],
        [
          L`the $\mathrm{s}$-block`,
          L`the $\mathrm{p}$-block`,
          L`the $\mathrm{d}$-block`,
          L`the separated $\mathrm{f}$-block only`,
        ],
        "C",
        {
          A: L`The $\mathrm{s}$-block is the left two-group region, not the central transition region.`,
          B: L`The $\mathrm{p}$-block lies on the right side of the table.`,
          D: L`The separated inner rows are the $\mathrm{f}$-block, not the central shaded region.`,
        },
        [
          L`Use the group numbers shown at the top.`,
          L`The central region covers groups $3$ to $12$.`,
          L`Groups $3$ to $12$ are the $\mathrm{d}$-block elements.`,
        ],
        [
          {
            step: 1,
            explanation: L`The central region of groups $3$ to $12$ is the $\mathrm{d}$-block.`,
          },
        ],
        dBlockPositionFigure,
      ),
      mc(
        L`The outer electronic configuration that explains the exceptional stability of chromium is`,
        2,
        ["electronic_configuration", "chromium", "half_filled_d"],
        [
          L`$[\mathrm{Ar}]\,3d^4\,4s^2$`,
          L`$[\mathrm{Ar}]\,3d^5\,4s^1$`,
          L`$[\mathrm{Ar}]\,3d^6\,4s^0$`,
          L`$[\mathrm{Ar}]\,3d^3\,4s^3$`,
        ],
        "B",
        {
          A: L`This is the simple filling prediction, but chromium shifts one electron to make a half-filled $3d$ subshell.`,
          C: L`Chromium does not have six $3d$ electrons in the ground state.`,
          D: L`The $4s$ subshell cannot hold three electrons.`,
        },
        [
          L`Chromium has atomic number $24$.`,
          L`Half-filled $d^5$ has extra stability.`,
          L`One $4s$ electron is promoted to $3d$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Chromium adopts a half-filled $3d$ subshell.`,
            math: L`[\mathrm{Ar}]\,3d^5\,4s^1`,
          },
        ],
      ),
      mc(
        L`Which ion is expected to be colourless mainly because it has a $\mathrm{d^0}$ configuration?`,
        2,
        ["d_configuration", "colour", "transition_ions"],
        [
          L`$\mathrm{Ti^{4+}}$`,
          L`$\mathrm{V^{3+}}$`,
          L`$\mathrm{Cr^{3+}}$`,
          L`$\mathrm{Mn^{2+}}$`,
        ],
        "A",
        {
          B: L`$\mathrm{V^{3+}}$ is $3d^2$, so $\mathrm{d-d}$ transitions are possible.`,
          C: L`$\mathrm{Cr^{3+}}$ is $3d^3$, not $\mathrm{d^0}$.`,
          D: L`$\mathrm{Mn^{2+}}$ is $3d^5$, not $\mathrm{d^0}$.`,
        },
        [
          L`Remove $4s$ electrons before $3d$ electrons for transition-metal ions.`,
          L`Titanium is $[\mathrm{Ar}]\,3d^2\,4s^2$.`,
          L`$\mathrm{Ti^{4+}}$ loses four valence electrons and becomes $3d^0$.`,
        ],
        [
          {
            step: 1,
            explanation: L`$\mathrm{Ti^{4+}}$ has no $d$ electron, so ordinary $\mathrm{d-d}$ transitions are absent.`,
            math: L`\mathrm{Ti^{4+}}:[\mathrm{Ar}]\,3d^0`,
          },
        ],
      ),
      mc(
        L`Zinc is usually not regarded as a transition element because`,
        2,
        ["transition_element_definition", "zinc", "d10"],
        [
          L`both $\mathrm{Zn}$ and $\mathrm{Zn^{2+}}$ have a completely filled $3d$ subshell`,
          L`zinc occurs only in the $\mathrm{p}$-block`,
          L`zinc cannot form any compound`,
          L`zinc has no electrons outside argon`,
        ],
        "A",
        {
          B: L`Zinc is placed in the $\mathrm{d}$-block, but strict transition-element definition needs partly filled $d$ subshells.`,
          C: L`Zinc forms many compounds, especially in the $+2$ oxidation state.`,
          D: L`Zinc has electrons beyond argon; its configuration includes $3d^{10}4s^2$.`,
        },
        [
          L`Recall the strict transition-element definition.`,
          L`Look at the $3d$ occupancy of zinc and zinc ion.`,
          L`$\mathrm{Zn^{2+}}$ remains $3d^{10}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`A transition element has an incomplete $d$ subshell in the atom or a common ion; zinc does not satisfy this in the usual $+2$ state.`,
            math: L`\mathrm{Zn}:[\mathrm{Ar}]\,3d^{10}4s^2,\quad \mathrm{Zn^{2+}}:[\mathrm{Ar}]\,3d^{10}`,
          },
        ],
      ),
      mc(
        L`Assertion (A): Chromium and copper show exceptional electronic configurations. Reason (R): The energy difference between $3d$ and $4s$ subshells is small, and half-filled or completely filled $3d$ subshells gain stability.`,
        3,
        ["assertion_reason", "chromium_copper", "electronic_configuration"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The reason directly explains the exceptional $3d^5 4s^1$ and $3d^{10}4s^1$ arrangements.`,
          C: L`The stability of half-filled and filled $d$ subshells is a valid reason.`,
          D: L`The assertion is true for chromium and copper.`,
        },
        [
          L`Write the expected and observed configurations mentally.`,
          L`Half-filled $3d^5$ and filled $3d^{10}$ are stabilised.`,
          L`A small $3d$-$4s$ energy gap allows the electron shift.`,
        ],
        [
          {
            step: 1,
            explanation: L`The reason correctly explains why chromium and copper deviate from the simple filling order.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Define a transition element using the electronic-configuration criterion.`,
        1,
        ["definition", "transition_element", "d_subshell"],
        parts([["a", L`Give the definition.`, 1]]),
        [
          L`Do not define it only by table position.`,
          L`Mention incomplete $d$ subshell.`,
          L`The atom or at least one common ion may have the incomplete $d$ subshell.`,
        ],
        [
          {
            part: "a",
            explanation: L`A transition element is an element whose atom or common ion has a partially filled $d$ subshell.`,
          },
        ],
        [
          L`Saying every $\mathrm{d}$-block element is automatically a transition element.`,
          L`Forgetting to include common ions in the definition.`,
        ],
      ),
      frq(
        "saq",
        L`Write the electronic configurations of $\mathrm{Fe^{2+}}$ and $\mathrm{Fe^{3+}}$. Then state which ion has the more stable half-filled $3d$ subshell.`,
        2,
        ["iron_ions", "electronic_configuration", "half_filled_d"],
        parts([
          [
            "a",
            L`Write configurations of $\mathrm{Fe^{2+}}$ and $\mathrm{Fe^{3+}}$.`,
            2,
          ],
          ["b", L`Identify the half-filled ion.`, 1],
        ]),
        [
          L`Iron is $[\mathrm{Ar}]3d^6 4s^2$.`,
          L`Remove $4s$ electrons before $3d$ electrons.`,
          L`A half-filled $3d$ subshell is $3d^5$.`,
        ],
        [
          {
            part: "a",
            explanation: L`After removing the two $4s$ electrons, $\mathrm{Fe^{2+}}$ is $3d^6$; removing one more $3d$ electron gives $\mathrm{Fe^{3+}}$ as $3d^5$.`,
            math: L`\mathrm{Fe^{2+}}:[\mathrm{Ar}]\,3d^6,\quad \mathrm{Fe^{3+}}:[\mathrm{Ar}]\,3d^5`,
          },
          {
            part: "b",
            explanation: L`$\mathrm{Fe^{3+}}$ has the more stable half-filled $3d^5$ configuration.`,
          },
        ],
        [
          L`Removing $3d$ electrons before $4s$ electrons.`,
          L`Calling $3d^6$ half-filled.`,
        ],
      ),
      frq(
        "saq",
        L`Explain why copper has configuration $[\mathrm{Ar}]3d^{10}4s^1$ rather than $[\mathrm{Ar}]3d^94s^2$.`,
        2,
        ["copper_configuration", "filled_d_subshell", "stability"],
        parts([["a", L`Give the reason in terms of subshell stability.`, 2]]),
        [
          L`Compare $3d^9$ and $3d^{10}$.`,
          L`A completely filled $d$ subshell is especially stable.`,
          L`The $3d$ and $4s$ energy difference is small enough for rearrangement.`,
        ],
        [
          {
            part: "a",
            explanation: L`One $4s$ electron shifts to the $3d$ subshell because $3d^{10}$ is completely filled and gains extra stability.`,
            math: L`\mathrm{Cu}:[\mathrm{Ar}]\,3d^{10}4s^1`,
          },
        ],
        [
          L`Saying $4s$ can hold only one electron.`,
          L`Ignoring the stability of a completely filled $d$ subshell.`,
        ],
      ),
      frq(
        "laq",
        L`Four elements have outer configurations: I: $3d^14s^2$, II: $3d^{10}4s^2$, III: $3d^64s^2$, and IV: $4f^75d^16s^2$.`,
        3,
        ["classification", "d_block", "f_block", "transition_definition"],
        parts([
          ["a", L`Identify the $\mathrm{f}$-block element.`, 1],
          [
            "b",
            L`Which one is a $\mathrm{d}$-block element but not a transition element by strict definition?`,
            1,
          ],
          ["c", L`Give one reason why I and III are transition elements.`, 2],
        ]),
        [
          L`Look for $4f$ electrons to identify the $\mathrm{f}$-block member.`,
          L`A filled $d^{10}$ atom and common ion is the zinc-like exception.`,
          L`Partly filled $d$ subshells indicate transition behaviour.`,
        ],
        [
          {
            part: "a",
            explanation: L`IV contains $4f$ electrons and is the $\mathrm{f}$-block element.`,
          },
          {
            part: "b",
            explanation: L`II is $3d^{10}4s^2$, zinc-like, and is not a transition element by the strict definition.`,
          },
          {
            part: "c",
            explanation: L`I and III have incomplete $3d$ subshells in their atoms, so they satisfy the transition-element criterion.`,
          },
        ],
        [
          L`Classifying Q as a transition element only because it lies in the $\mathrm{d}$-block.`,
          L`Mistaking $4f$ occupancy for $\mathrm{p}$-block behaviour.`,
        ],
      ),
      frq(
        "case",
        L`A lab handout lists three ions: $\mathrm{Sc^{3+}}$, $\mathrm{Ti^{3+}}$ and $\mathrm{Zn^{2+}}$. Their $3d$ electron counts are $0$, $1$ and $10$ respectively.`,
        3,
        ["case_based", "d_electron_count", "colour_transition_definition"],
        parts([
          [
            "a",
            L`Which ion is most likely to show colour due to a $\mathrm{d-d}$ transition?`,
            1,
          ],
          [
            "b",
            L`Which two ions are usually colourless by the simple $d^0/d^{10}$ criterion?`,
            1,
          ],
          [
            "c",
            L`Why does $\mathrm{Zn^{2+}}$ not support zinc being called a transition element?`,
            1,
          ],
        ]),
        [
          L`A $\mathrm{d-d}$ transition needs at least one $d$ electron and at least one vacancy.`,
          L`$\mathrm{d^0}$ and $\mathrm{d^{10}}$ cases do not fit that simple condition.`,
          L`A common ion with $d^{10}$ is not partially filled.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{Ti^{3+}}$ is $3d^1$, so a $\mathrm{d-d}$ transition is possible.`,
          },
          {
            part: "b",
            explanation: L`$\mathrm{Sc^{3+}}$ is $d^0$ and $\mathrm{Zn^{2+}}$ is $d^{10}$; both are usually colourless by this simple criterion.`,
          },
          {
            part: "c",
            explanation: L`$\mathrm{Zn^{2+}}$ has a completely filled $3d^{10}$ subshell, not a partially filled one.`,
          },
        ],
        [
          L`Calling every metal ion coloured.`,
          L`Ignoring the difference between $\mathrm{d}$-block placement and transition-element definition.`,
        ],
      ),
    ],
  },
  {
    topicCode: "4.2",
    title: "General Properties of Transition Elements",
    subtopic:
      "Variable oxidation states, colour, magnetic behaviour, catalysis, alloy formation and interstitial compounds.",
    mc: [
      mc(
        L`The spin-only magnetic moment of a $\mathrm{d^5}$ high-spin ion is closest to`,
        3,
        ["magnetic_moment", "unpaired_electrons", "d5"],
        [
          L`$1.73\,\mathrm{BM}$`,
          L`$2.83\,\mathrm{BM}$`,
          L`$3.87\,\mathrm{BM}$`,
          L`$5.92\,\mathrm{BM}$`,
        ],
        "D",
        {
          A: L`This corresponds to one unpaired electron, not five.`,
          B: L`This corresponds to two unpaired electrons.`,
          C: L`This corresponds to three unpaired electrons.`,
        },
        [
          L`A high-spin $\mathrm{d^5}$ ion has five unpaired electrons.`,
          L`Use $\mu=\sqrt{n(n+2)}\,\mathrm{BM}$.`,
          L`Substitute $n=5$.`,
        ],
        [
          {
            step: 1,
            explanation: L`For $n=5$ unpaired electrons,`,
            math: L`\mu=\sqrt{5(5+2)}=\sqrt{35}=5.92\,\mathrm{BM}`,
          },
        ],
      ),
      mc(
        L`In the first transition series, manganese shows a particularly high oxidation state because`,
        2,
        ["oxidation_states", "manganese", "transition_series"],
        [
          L`it can use both $3d$ and $4s$ electrons in bonding`,
          L`it has no $3d$ electrons`,
          L`it is a noble gas`,
          L`its only stable state is $+2$`,
        ],
        "A",
        {
          B: L`Manganese has several $3d$ electrons, not none.`,
          C: L`Manganese is a transition metal, not a noble gas.`,
          D: L`Manganese shows several oxidation states, including high states such as $+7$.`,
        },
        [
          L`Variable oxidation states arise from comparable $3d$ and $4s$ energies.`,
          L`Manganese can access many valence electrons.`,
          L`This explains compounds such as permanganate.`,
        ],
        [
          {
            step: 1,
            explanation: L`Manganese can involve both $3d$ and $4s$ electrons, so high oxidation states such as $+7$ are possible.`,
          },
        ],
      ),
      mc(
        L`Transition-metal ions are often coloured mainly because of`,
        2,
        ["colour", "d_d_transition", "transition_metal_ions"],
        [
          L`complete removal of all electrons`,
          L`electronic transitions between split $\mathrm{d}$ orbitals`,
          L`only nuclear reactions inside the ion`,
          L`the absence of any vacant orbital`,
        ],
        "B",
        {
          A: L`Colour is not due to removing all electrons.`,
          C: L`Ordinary colour of transition-metal ions is an electronic effect, not a nuclear reaction.`,
          D: L`A $\mathrm{d-d}$ transition requires available split $\mathrm{d}$ levels.`,
        },
        [
          L`Think about partially filled $\mathrm{d}$ subshells.`,
          L`Ligands split the energies of the $\mathrm{d}$ orbitals.`,
          L`Absorption of visible light can promote a $\mathrm{d}$ electron.`,
        ],
        [
          {
            step: 1,
            explanation: L`Partially filled $\mathrm{d}$ subshells can absorb visible light through $\mathrm{d-d}$ transitions.`,
          },
        ],
      ),
      mc(
        L`Transition metals commonly act as catalysts because they can`,
        2,
        ["catalysis", "variable_oxidation_state", "surface_adsorption"],
        [
          L`show variable oxidation states and provide adsorption sites`,
          L`exist only as gases at room temperature`,
          L`avoid all intermediate formation`,
          L`never change oxidation state in a reaction`,
        ],
        "A",
        {
          B: L`Most transition metals are solids at room temperature.`,
          C: L`Catalytic action often involves intermediate adsorption or redox steps.`,
          D: L`Variable oxidation state is one reason transition metals are useful catalysts.`,
        },
        [
          L`Recall common catalysts such as iron, nickel and vanadium compounds.`,
          L`A metal surface can adsorb reactants.`,
          L`Variable oxidation states can help electron transfer.`,
        ],
        [
          {
            step: 1,
            explanation: L`Variable oxidation states and adsorption at metal surfaces support catalytic activity.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): Transition metals form many interstitial compounds. Reason (R): Transition metals often show variable oxidation states.`,
        3,
        ["assertion_reason", "interstitial_compounds", "transition_metals"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "B",
        {
          A: L`Variable oxidation state is true, but it is not the cause of interstitial-compound formation.`,
          C: L`Variable oxidation states are also a true transition-metal property.`,
          D: L`The assertion is true for many transition metals.`,
        },
        [
          L`Judge the assertion first: interstitial compounds are a real transition-metal property.`,
          L`Judge the reason separately: variable oxidation states are also common for transition metals.`,
          L`Now ask whether variable oxidation states explain small atoms entering lattice holes.`,
        ],
        [
          {
            step: 1,
            explanation: L`The assertion is true because small atoms such as $\mathrm{H}$, $\mathrm{B}$, $\mathrm{C}$ or $\mathrm{N}$ can occupy holes in transition-metal lattices.`,
          },
          {
            step: 2,
            explanation: L`The reason is also true, but variable oxidation state is a different transition-metal property and does not explain interstitial-compound formation.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State why transition metals are good alloy-forming elements.`,
        1,
        ["alloys", "atomic_size", "transition_metals"],
        parts([["a", L`Give one reason.`, 1]]),
        [
          L`Alloy formation needs similar-sized atoms.`,
          L`Transition metals in a series have comparable radii.`,
          L`Atoms can substitute for each other in the lattice.`,
        ],
        [
          {
            part: "a",
            explanation: L`Transition metals have similar atomic sizes, so atoms of one metal can replace another in the metallic lattice to form alloys.`,
          },
        ],
        [
          L`Saying alloys form because transition metals are gases.`,
          L`Ignoring comparable atomic size.`,
        ],
      ),
      frq(
        "saq",
        L`Compare $\mathrm{Ti^{4+}}$ and $\mathrm{V^{3+}}$ in terms of $d$ electron count and expected colour.`,
        2,
        ["colour", "d_electron_count", "transition_ions"],
        parts([
          ["a", L`Give the $d$ electron count of each ion.`, 2],
          ["b", L`State which is more likely to be coloured.`, 1],
        ]),
        [
          L`Titanium loses four valence electrons in $\mathrm{Ti^{4+}}$.`,
          L`Vanadium is $[\mathrm{Ar}]3d^34s^2$ before ionisation.`,
          L`A partially filled $d$ subshell allows $\mathrm{d-d}$ transitions.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{Ti^{4+}}$ is $d^0$ and $\mathrm{V^{3+}}$ is $d^2$.`,
          },
          {
            part: "b",
            explanation: L`$\mathrm{V^{3+}}$ is more likely to be coloured because it has a partially filled $d$ subshell.`,
          },
        ],
        [
          L`Counting $4s$ electrons after ion formation.`,
          L`Calling a $d^0$ ion coloured by ordinary $\mathrm{d-d}$ transitions.`,
        ],
      ),
      frq(
        "saq",
        L`An ion has three unpaired $\mathrm{d}$ electrons. Calculate its spin-only magnetic moment.`,
        3,
        ["magnetic_moment", "spin_only", "unpaired_electrons"],
        parts([["a", L`Calculate $\mu$ in $\mathrm{BM}$.`, 2]]),
        [
          L`Use the spin-only formula.`,
          L`Here $n=3$.`,
          L`Compute $\sqrt{3(3+2)}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Using the spin-only expression,`,
            math: L`\mu=\sqrt{n(n+2)}=\sqrt{3(5)}=\sqrt{15}\approx3.87\,\mathrm{BM}`,
          },
        ],
        [
          L`Using the number of total $d$ electrons instead of unpaired electrons.`,
          L`Forgetting the square root.`,
        ],
      ),
      frq(
        "laq",
        L`Use the oxidation-state data in the figure to discuss why manganese and zinc behave differently in the first transition series.`,
        4,
        ["oxidation_state_trend", "manganese", "zinc"],
        parts([
          ["a", L`State the highest oxidation state shown for manganese.`, 1],
          ["b", L`State the common oxidation state shown for zinc.`, 1],
          ["c", L`Explain the difference using electronic configuration.`, 2],
        ]),
        [
          L`Read the top dot for manganese.`,
          L`Read the dot for zinc.`,
          L`Manganese has several accessible $3d$ and $4s$ electrons; zinc is $3d^{10}4s^2$.`,
        ],
        [
          {
            part: "a",
            explanation: L`The figure shows manganese reaching $+7$.`,
          },
          {
            part: "b",
            explanation: L`The figure shows zinc mainly as $+2$.`,
          },
          {
            part: "c",
            explanation: L`Manganese can use several $3d$ and $4s$ electrons in bonding, whereas zinc commonly forms $\mathrm{Zn^{2+}}$ with a stable $3d^{10}$ configuration.`,
          },
        ],
        [
          L`Assuming all first-row transition elements show the same maximum oxidation state.`,
          L`Ignoring the filled $3d^{10}$ configuration of $\mathrm{Zn^{2+}}$.`,
        ],
        oxidationStatesFigure,
      ),
      frq(
        "case",
        L`A catalyst sample contains finely divided nickel. In one experiment it speeds up hydrogenation of an alkene. In another observation, small carbon atoms enter a transition-metal lattice to produce a hard solid.`,
        3,
        ["case_based", "catalysis", "interstitial_compounds"],
        parts([
          [
            "a",
            L`Name the transition-metal property involved in hydrogenation.`,
            1,
          ],
          [
            "b",
            L`What type of compound is suggested by carbon atoms entering lattice holes?`,
            1,
          ],
          [
            "c",
            L`Give one reason transition metals can show catalytic activity.`,
            1,
          ],
        ]),
        [
          L`Nickel is a common surface catalyst.`,
          L`Small atoms entering lattice holes suggest interstitial compounds.`,
          L`Catalysis can involve adsorption and variable oxidation states.`,
        ],
        [
          {
            part: "a",
            explanation: L`Catalytic activity of a transition metal is involved.`,
          },
          {
            part: "b",
            explanation: L`The hard solid is an interstitial compound.`,
          },
          {
            part: "c",
            explanation: L`Transition metals can adsorb reactants on their surfaces and may also use variable oxidation states.`,
          },
        ],
        [
          L`Calling the carbon-containing solid an ionic salt only because carbon is present.`,
          L`Saying nickel is consumed stoichiometrically in hydrogenation.`,
        ],
      ),
    ],
  },
  {
    topicCode: "4.3",
    title: "Important Compounds of Transition Elements",
    subtopic:
      "Chromate-dichromate equilibrium, potassium dichromate, potassium permanganate and their oxidising actions.",
    mc: [
      mc(
        L`When an aqueous chromate solution is acidified, the main colour change is`,
        2,
        ["chromate_dichromate", "acid_base_equilibrium", "colour"],
        [
          L`yellow chromate changes to orange dichromate`,
          L`orange dichromate changes to colourless zinc ion`,
          L`purple permanganate changes to green chromate`,
          L`green chromium(III) changes to yellow sulphur`,
        ],
        "A",
        {
          B: L`Zinc ions are not part of the chromate-dichromate equilibrium.`,
          C: L`Permanganate is a manganese species, not the chromate-dichromate pair.`,
          D: L`This mixes unrelated species and colours.`,
        },
        [
          L`Chromate is $\mathrm{CrO_4^{2-}}$.`,
          L`Dichromate is $\mathrm{Cr_2O_7^{2-}}$.`,
          L`Acid favours the orange dichromate form.`,
        ],
        [
          {
            step: 1,
            explanation: L`Acid shifts chromate to dichromate.`,
            math: L`2\mathrm{CrO_4^{2-}}+2\mathrm{H^+}\rightleftharpoons \mathrm{Cr_2O_7^{2-}}+\mathrm{H_2O}`,
          },
        ],
      ),
      mc(
        L`In acidic medium, the half-reaction $\mathrm{Cr_2O_7^{2-}\rightarrow Cr^{3+}}$ involves how many electrons?`,
        3,
        ["dichromate", "redox_half_reaction", "electron_count"],
        [L`$3$`, L`$5$`, L`$6$`, L`$7$`],
        "C",
        {
          A: L`Each chromium changes from $+6$ to $+3$, but there are two chromium atoms.`,
          B: L`Five electrons is the acidic permanganate reduction count.`,
          D: L`Seven is not the electron change for dichromate to chromium(III).`,
        },
        [
          L`Find the oxidation state of chromium in dichromate.`,
          L`Each chromium goes from $+6$ to $+3$.`,
          L`There are two chromium atoms, so total electron gain is $6$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Two chromium atoms each gain three electrons.`,
            math: L`\mathrm{Cr_2O_7^{2-}}+14\mathrm{H^+}+6e^-\rightarrow2\mathrm{Cr^{3+}}+7\mathrm{H_2O}`,
          },
        ],
      ),
      mc(
        L`In acidic medium, $\mathrm{MnO_4^-}$ is reduced to`,
        2,
        ["permanganate", "acidic_medium", "redox_product"],
        [
          L`$\mathrm{Mn^{2+}}$`,
          L`$\mathrm{MnO_2}$`,
          L`$\mathrm{MnO_4^{2-}}$`,
          L`$\mathrm{MnO_2^-}$`,
        ],
        "A",
        {
          B: L`$\mathrm{MnO_2}$ is typical in neutral or mildly basic conditions, not strongly acidic medium.`,
          C: L`Manganate, $\mathrm{MnO_4^{2-}}$, is not the usual acidic reduction product.`,
          D: L`This is not the standard acidic reduction product of permanganate.`,
        },
        [
          L`Permanganate is a strong oxidising agent.`,
          L`The product depends on medium.`,
          L`In acidic medium, manganese reaches the $+2$ state.`,
        ],
        [
          {
            step: 1,
            explanation: L`In acidic medium, permanganate is reduced to $\mathrm{Mn^{2+}}$.`,
            math: L`\mathrm{MnO_4^-}+8\mathrm{H^+}+5e^-\rightarrow\mathrm{Mn^{2+}}+4\mathrm{H_2O}`,
          },
        ],
      ),
      mc(
        L`In acidic solution, one mole of $\mathrm{MnO_4^-}$ oxidises how many moles of $\mathrm{Fe^{2+}}$ to $\mathrm{Fe^{3+}}$?`,
        3,
        ["permanganate", "iron_ii", "redox_stoichiometry"],
        [L`$1$`, L`$3$`, L`$5$`, L`$8$`],
        "C",
        {
          A: L`This ignores the five-electron change of permanganate in acid.`,
          B: L`Three electrons is not the acidic permanganate electron gain.`,
          D: L`Eight $\mathrm{H^+}$ are used in the half-reaction, not eight iron(II) ions.`,
        },
        [
          L`$\mathrm{MnO_4^-}$ gains $5$ electrons in acidic medium.`,
          L`Each $\mathrm{Fe^{2+}}$ loses one electron.`,
          L`Therefore five $\mathrm{Fe^{2+}}$ ions are needed.`,
        ],
        [
          {
            step: 1,
            explanation: L`One permanganate ion accepts five electrons; each iron(II) ion supplies one electron.`,
            math: L`\mathrm{MnO_4^-}+8\mathrm{H^+}+5\mathrm{Fe^{2+}}\rightarrow\mathrm{Mn^{2+}}+4\mathrm{H_2O}+5\mathrm{Fe^{3+}}`,
          },
        ],
      ),
      mc(
        L`Assertion (A): Acidified potassium dichromate acts as an oxidising agent. Reason (R): In acid, chromium in dichromate is oxidised from $+3$ to $+6$.`,
        3,
        ["assertion_reason", "dichromate", "oxidising_agent"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "C",
        {
          A: L`The assertion is true, but the reason reverses the chromium redox change.`,
          B: L`The reason is false, so both statements cannot be true.`,
          D: L`Acidified potassium dichromate is a standard oxidising agent.`,
        },
        [
          L`An oxidising agent is itself reduced.`,
          L`Find chromium oxidation state in $\mathrm{Cr_2O_7^{2-}}$.`,
          L`In acid, chromium goes from $+6$ in dichromate to $+3$, so the stated direction is false.`,
        ],
        [
          {
            step: 1,
            explanation: L`The assertion is true: acidified dichromate is an oxidising agent.`,
          },
          {
            step: 2,
            explanation: L`The reason is false because chromium is reduced from $+6$ to $+3$ in acidic dichromate reactions, not oxidised from $+3$ to $+6$.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "saq",
        L`Write the chromate-dichromate equilibrium in acidic solution and mention the colours of the two ions.`,
        2,
        ["chromate_dichromate", "equilibrium", "colour"],
        parts([["a", L`Give equation and colours.`, 2]]),
        [
          L`Chromate ion is yellow.`,
          L`Dichromate ion is orange.`,
          L`Add acid to shift chromate to dichromate.`,
        ],
        [
          {
            part: "a",
            explanation: L`Yellow chromate changes to orange dichromate in acidic solution.`,
            math: L`2\mathrm{CrO_4^{2-}}+2\mathrm{H^+}\rightleftharpoons\mathrm{Cr_2O_7^{2-}}+\mathrm{H_2O}`,
          },
        ],
        [
          L`Reversing the colours of chromate and dichromate.`,
          L`Forgetting that acid appears on the chromate side.`,
        ],
      ),
      frq(
        "saq",
        L`Balance the acidic ionic equation for oxidation of $\mathrm{Fe^{2+}}$ by dichromate to $\mathrm{Fe^{3+}}$ and $\mathrm{Cr^{3+}}$.`,
        3,
        ["dichromate", "redox_balancing", "iron_ii"],
        parts([["a", L`Write the balanced ionic equation.`, 3]]),
        [
          L`Use the dichromate half-reaction with $6$ electrons.`,
          L`Each $\mathrm{Fe^{2+}}$ gives one electron.`,
          L`Use $14\mathrm{H^+}$ and $7\mathrm{H_2O}$ for oxygen and hydrogen balance.`,
        ],
        [
          {
            part: "a",
            explanation: L`The balanced equation is`,
            math: L`\mathrm{Cr_2O_7^{2-}}+14\mathrm{H^+}+6\mathrm{Fe^{2+}}\rightarrow2\mathrm{Cr^{3+}}+7\mathrm{H_2O}+6\mathrm{Fe^{3+}}`,
          },
        ],
        [
          L`Using five $\mathrm{Fe^{2+}}$ ions, which belongs to permanganate.`,
          L`Forgetting to balance charge with $\mathrm{H^+}$.`,
        ],
      ),
      frq(
        "saq",
        L`Describe how potassium permanganate can be prepared from $\mathrm{MnO_2}$ in outline.`,
        2,
        ["permanganate_preparation", "manganate", "oxidation"],
        parts([
          [
            "a",
            L`Name the intermediate formed on fusion with alkali and oxidising agent.`,
            1,
          ],
          ["b", L`State how it is converted to permanganate.`, 1],
        ]),
        [
          L`$\mathrm{MnO_2}$ is pyrolusite.`,
          L`Fusion with $\mathrm{KOH}$ and an oxidising agent gives manganate.`,
          L`Manganate is converted to permanganate by oxidation or disproportionation.`,
        ],
        [
          {
            part: "a",
            explanation: L`Potassium manganate, $\mathrm{K_2MnO_4}$, is formed first.`,
          },
          {
            part: "b",
            explanation: L`$\mathrm{K_2MnO_4}$ is converted to $\mathrm{KMnO_4}$ by oxidation, or by disproportionation under suitable conditions.`,
          },
        ],
        [
          L`Saying $\mathrm{MnO_2}$ directly becomes $\mathrm{KMnO_4}$ without manganate.`,
          L`Confusing manganate $\mathrm{MnO_4^{2-}}$ with permanganate $\mathrm{MnO_4^-}$.`,
        ],
      ),
      frq(
        "laq",
        L`In acidic medium, potassium permanganate oxidises oxalate ion to carbon dioxide. Construct the balanced ionic equation.`,
        4,
        ["permanganate", "oxalate", "redox_balancing"],
        parts([
          [
            "a",
            L`Write the reduction half-reaction for permanganate in acid.`,
            1,
          ],
          ["b", L`Write the oxidation half-reaction for oxalate.`, 1],
          ["c", L`Combine them into the net ionic equation.`, 2],
        ]),
        [
          L`Permanganate accepts $5$ electrons in acid.`,
          L`Oxalate loses $2$ electrons per oxalate ion.`,
          L`Use LCM $10$ for electron balance.`,
        ],
        [
          {
            part: "a",
            explanation: L`The acidic permanganate reduction is`,
            math: L`\mathrm{MnO_4^-}+8\mathrm{H^+}+5e^-\rightarrow\mathrm{Mn^{2+}}+4\mathrm{H_2O}`,
          },
          {
            part: "b",
            explanation: L`Oxalate is oxidised to carbon dioxide.`,
            math: L`\mathrm{C_2O_4^{2-}}\rightarrow2\mathrm{CO_2}+2e^-`,
          },
          {
            part: "c",
            explanation: L`Multiplying the first half-reaction by $2$ and the second by $5$ gives`,
            math: L`2\mathrm{MnO_4^-}+16\mathrm{H^+}+5\mathrm{C_2O_4^{2-}}\rightarrow2\mathrm{Mn^{2+}}+8\mathrm{H_2O}+10\mathrm{CO_2}`,
          },
        ],
        [
          L`Using the neutral-medium product $\mathrm{MnO_2}$ instead of $\mathrm{Mn^{2+}}$.`,
          L`Forgetting to equalise electrons before adding half-reactions.`,
        ],
      ),
      frq(
        "case",
        L`A student has two oxidising reagents: acidified $\mathrm{K_2Cr_2O_7}$ and acidified $\mathrm{KMnO_4}$. The student must oxidise $\mathrm{Fe^{2+}}$ in separate tests and compare the mole ratios of oxidant to $\mathrm{Fe^{2+}}$.`,
        4,
        ["case_based", "dichromate", "permanganate", "redox_stoichiometry"],
        parts([
          [
            "a",
            L`How many moles of $\mathrm{Fe^{2+}}$ are oxidised by $1$ mole of $\mathrm{Cr_2O_7^{2-}}$ in acid?`,
            1,
          ],
          [
            "b",
            L`How many moles of $\mathrm{Fe^{2+}}$ are oxidised by $1$ mole of $\mathrm{MnO_4^-}$ in acid?`,
            1,
          ],
          ["c", L`Give the electron-count reason for the difference.`, 1],
        ]),
        [
          L`Dichromate accepts $6$ electrons per ion.`,
          L`Permanganate accepts $5$ electrons per ion in acid.`,
          L`Each $\mathrm{Fe^{2+}}$ loses one electron.`,
        ],
        [
          {
            part: "a",
            explanation: L`One dichromate ion oxidises six $\mathrm{Fe^{2+}}$ ions.`,
          },
          {
            part: "b",
            explanation: L`One permanganate ion oxidises five $\mathrm{Fe^{2+}}$ ions.`,
          },
          {
            part: "c",
            explanation: L`$\mathrm{Cr_2O_7^{2-}}$ gains $6$ electrons, whereas $\mathrm{MnO_4^-}$ gains $5$ electrons in acidic medium.`,
          },
        ],
        [
          L`Using the same coefficient for both oxidants.`,
          L`Counting oxygen atoms instead of electron transfer.`,
        ],
      ),
    ],
  },
  {
    topicCode: "4.4",
    title: "Lanthanoids",
    subtopic:
      "Electronic configuration, common oxidation states, lanthanoid contraction and its consequences.",
    mc: [
      mc(
        L`The most common oxidation state of lanthanoids is`,
        1,
        ["lanthanoids", "oxidation_state", "f_block"],
        [L`$+2$`, L`$+3$`, L`$+4$`, L`$+7$`],
        "B",
        {
          A: L`Some lanthanoids can show $+2$, but it is not the most common state.`,
          C: L`Some cases such as cerium can show $+4$, but $+3$ is most common.`,
          D: L`$+7$ is not a common lanthanoid oxidation state.`,
        },
        [
          L`Lanthanoids commonly lose two $6s$ electrons and one more electron.`,
          L`Their chemistry is dominated by trivalent ions.`,
          L`Exceptions such as $\mathrm{Ce^{4+}}$ and $\mathrm{Eu^{2+}}$ do not replace the general rule.`,
        ],
        [
          {
            step: 1,
            explanation: L`The common oxidation state of lanthanoids is $+3$.`,
          },
        ],
      ),
      mc(
        L`Lanthanoid contraction is mainly due to`,
        2,
        ["lanthanoid_contraction", "shielding", "4f_electrons"],
        [
          L`poor shielding by $4f$ electrons`,
          L`complete absence of nuclear charge`,
          L`increase in principal quantum number across the series`,
          L`loss of all $4f$ electrons at the start of the series`,
        ],
        "A",
        {
          B: L`Nuclear charge increases across the lanthanoid series.`,
          C: L`The differentiating electrons enter the same $4f$ level; principal shell increase is not the cause across the series.`,
          D: L`The $4f$ subshell is progressively filled; electrons are not all lost at the start.`,
        },
        [
          L`Across the series, nuclear charge increases.`,
          L`Added $4f$ electrons shield poorly.`,
          L`Effective nuclear attraction increases, so ionic radii decrease.`,
        ],
        [
          {
            step: 1,
            explanation: L`Poor shielding by $4f$ electrons causes a steady increase in effective nuclear attraction and hence contraction.`,
          },
        ],
      ),
      mc(
        L`A major consequence of lanthanoid contraction is that`,
        2,
        ["lanthanoid_contraction", "zirconium_hafnium", "consequence"],
        [
          L`$\mathrm{Zr}$ and $\mathrm{Hf}$ have very similar radii and chemistry`,
          L`all lanthanoids become noble gases`,
          L`the $+3$ oxidation state disappears completely`,
          L`atomic size suddenly increases from La to Lu`,
        ],
        "A",
        {
          B: L`Lanthanoid contraction does not make elements noble gases.`,
          C: L`The $+3$ state remains the dominant lanthanoid state.`,
          D: L`The trend is a gradual decrease, not an increase.`,
        },
        [
          L`The contraction affects elements after the lanthanoid series too.`,
          L`Compare $4d$ and $5d$ congeners.`,
          L`$\mathrm{Zr}$ and $\mathrm{Hf}$ are a standard example.`,
        ],
        [
          {
            step: 1,
            explanation: L`Lanthanoid contraction makes $\mathrm{Zr}$ and $\mathrm{Hf}$ unusually similar in size and chemistry.`,
          },
        ],
      ),
      mc(
        L`$\mathrm{Ce^{4+}}$ is relatively stable among lanthanoid ions because it has`,
        2,
        ["cerium", "oxidation_state", "f0"],
        [
          L`an empty $4f$ subshell`,
          L`a half-filled $3d$ subshell`,
          L`a $4f^{14}$ configuration`,
          L`no nuclear charge`,
        ],
        "A",
        {
          B: L`Cerium is an $\mathrm{f}$-block element; this statement refers to a $3d$ subshell.`,
          C: L`$4f^{14}$ stability is more relevant to ions such as $\mathrm{Yb^{2+}}$.`,
          D: L`Cerium has nuclear charge; ions are not nuclei-free.`,
        },
        [
          L`Cerium can lose four electrons.`,
          L`$\mathrm{Ce^{4+}}$ reaches a noble-gas-like $4f^0$ arrangement.`,
          L`Empty and completely filled subshells are stabilising patterns.`,
        ],
        [
          {
            step: 1,
            explanation: L`$\mathrm{Ce^{4+}}$ has an empty $4f^0$ subshell, giving relative stability.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): The basic character of lanthanoid hydroxides decreases from $\mathrm{La(OH)_3}$ to $\mathrm{Lu(OH)_3}$. Reason (R): Lanthanoid contraction decreases the size of $\mathrm{Ln^{3+}}$ ions across the series.`,
        3,
        ["assertion_reason", "lanthanoid_contraction", "basicity"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The decreasing ionic size explains stronger polarising power and lower basicity.`,
          C: L`Lanthanoid contraction is a real decrease in $\mathrm{Ln^{3+}}$ size.`,
          D: L`The basicity trend is correctly stated.`,
        },
        [
          L`Move from La to Lu across the lanthanoid series.`,
          L`$\mathrm{Ln^{3+}}$ radius decreases.`,
          L`Smaller cations polarise $\mathrm{OH^-}$ more strongly, decreasing basicity.`,
        ],
        [
          {
            step: 1,
            explanation: L`The contraction decreases ionic size, increasing polarising power and decreasing hydroxide basicity.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why do $\mathrm{Zr}$ and $\mathrm{Hf}$ have very similar atomic radii even though they are in different periods?`,
        2,
        ["lanthanoid_contraction", "periodic_trend", "atomic_radius"],
        parts([["a", L`Give the reason in one sentence.`, 1]]),
        [
          L`Look between the two elements in the periodic table.`,
          L`The lanthanoid series lies between them.`,
          L`Poor $4f$ shielding causes contraction after lanthanoids.`,
        ],
        [
          {
            part: "a",
            explanation: L`Due to lanthanoid contraction, the atomic size after lanthanoids decreases enough that $\mathrm{Hf}$ becomes nearly similar in size to $\mathrm{Zr}$.`,
          },
        ],
        [
          L`Saying same group alone explains the close radii.`,
          L`Forgetting the contraction caused by poor $4f$ shielding.`,
        ],
      ),
      frq(
        "saq",
        L`State the general outer electronic configuration of lanthanoids and their most common oxidation state.`,
        2,
        ["lanthanoids", "configuration", "oxidation_state"],
        parts([
          ["a", L`Write the general configuration pattern.`, 1],
          ["b", L`State the most common oxidation state.`, 1],
        ]),
        [
          L`Lanthanoids involve filling of $4f$ orbitals.`,
          L`The outer shells include $5d$ and $6s$.`,
          L`Their chemistry is mainly trivalent.`,
        ],
        [
          {
            part: "a",
            explanation: L`A useful general pattern is`,
            math: L`[\mathrm{Xe}]\,4f^{1-14}5d^{0-1}6s^2`,
          },
          {
            part: "b",
            explanation: L`The most common oxidation state is $+3$.`,
          },
        ],
        [
          L`Writing a $3d$ configuration for lanthanoids.`,
          L`Claiming $+7$ is the common lanthanoid state.`,
        ],
      ),
      frq(
        "saq",
        L`Explain why $\mathrm{Eu^{2+}}$ and $\mathrm{Ce^{4+}}$ are notable exceptions to the common $+3$ lanthanoid state.`,
        3,
        ["lanthanoid_exceptions", "europium", "cerium"],
        parts([
          ["a", L`Explain $\mathrm{Eu^{2+}}$.`, 1],
          ["b", L`Explain $\mathrm{Ce^{4+}}$.`, 1],
        ]),
        [
          L`Look for especially stable $4f$ counts.`,
          L`Half-filled $4f^7$ is stable.`,
          L`Empty $4f^0$ is also stable.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{Eu^{2+}}$ is favoured because it has a stable half-filled $4f^7$ configuration.`,
          },
          {
            part: "b",
            explanation: L`$\mathrm{Ce^{4+}}$ is favoured because it reaches a stable empty $4f^0$ configuration.`,
          },
        ],
        [
          L`Explaining both ions only by atomic size.`,
          L`Confusing $4f^7$ with a filled subshell.`,
        ],
      ),
      frq(
        "laq",
        L`Use lanthanoid contraction to explain two consequences observed in periodic properties and separation chemistry.`,
        3,
        ["lanthanoid_contraction", "consequences", "separation"],
        parts([
          ["a", L`State the cause of lanthanoid contraction.`, 1],
          [
            "b",
            L`Give one consequence involving $\mathrm{Zr}$ and $\mathrm{Hf}$.`,
            1,
          ],
          [
            "c",
            L`Give one consequence involving separation or hydroxide basicity.`,
            1,
          ],
        ]),
        [
          L`The cause is poor shielding by $4f$ electrons.`,
          L`The contraction affects sizes of later $5d$ elements.`,
          L`Lanthanoids have very similar chemistry, making separation difficult.`,
        ],
        [
          {
            part: "a",
            explanation: L`It is caused by poor shielding of increasing nuclear charge by $4f$ electrons.`,
          },
          {
            part: "b",
            explanation: L`$\mathrm{Zr}$ and $\mathrm{Hf}$ have very similar radii and hence very similar chemical behaviour.`,
          },
          {
            part: "c",
            explanation: L`The similar sizes and common $+3$ state make lanthanoids difficult to separate; also, hydroxide basicity decreases from La to Lu.`,
          },
        ],
        [
          L`Saying contraction is due to good shielding by $4f$ electrons.`,
          L`Claiming separation is easy because all lanthanoids differ greatly in size.`,
        ],
      ),
      frq(
        "case",
        L`The graph shows a steady decrease in $\mathrm{Ln^{3+}}$ ionic radius from La to Lu.`,
        3,
        ["case_based", "lanthanoid_contraction", "graph_interpretation"],
        parts([
          ["a", L`Name the trend shown.`, 1],
          ["b", L`Identify the electronic reason for the trend.`, 1],
          ["c", L`State one chemical consequence of the trend.`, 1],
        ]),
        [
          L`The graph is about $\mathrm{Ln^{3+}}$ radius.`,
          L`Think of poor shielding by $4f$ electrons.`,
          L`Consequences include similar $\mathrm{Zr/Hf}$ radii and decreasing hydroxide basicity.`,
        ],
        [
          {
            part: "a",
            explanation: L`The trend is lanthanoid contraction.`,
          },
          {
            part: "b",
            explanation: L`Poor shielding by $4f$ electrons allows effective nuclear charge to increase across the series.`,
          },
          {
            part: "c",
            explanation: L`One consequence is that $\mathrm{Zr}$ and $\mathrm{Hf}$ have very similar sizes and chemistry.`,
          },
        ],
        [
          L`Reading the graph as an increase in radius.`,
          L`Attributing the trend to a change from $n=4$ to $n=5$ across the lanthanoid series.`,
        ],
        lanthanoidContractionFigure,
      ),
    ],
  },
  {
    topicCode: "4.5",
    title: "Actinoids and Applications of d- and f-Block Elements",
    subtopic:
      "Actinoid electronic features, comparison with lanthanoids, radioactivity, and important applications.",
    mc: [
      mc(
        L`Actinoids show a wider range of oxidation states than lanthanoids mainly because`,
        2,
        ["actinoids", "oxidation_states", "5f_6d_7s"],
        [
          L`$5f$, $6d$ and $7s$ subshell energies are comparable`,
          L`actinoids have no valence electrons`,
          L`all actinoids are noble gases`,
          L`lanthanoids have more variable oxidation states than actinoids`,
        ],
        "A",
        {
          B: L`Actinoids have valence electrons in $5f$, $6d$ and $7s$ levels.`,
          C: L`Actinoids are not noble gases.`,
          D: L`Actinoids generally show wider oxidation-state variation.`,
        },
        [
          L`Compare $4f$ lanthanoids with $5f$ actinoids.`,
          L`The $5f$, $6d$ and $7s$ orbitals are close in energy.`,
          L`This permits more electrons to participate in bonding.`,
        ],
        [
          {
            step: 1,
            explanation: L`Comparable $5f$, $6d$ and $7s$ energies allow actinoids to show many oxidation states.`,
          },
        ],
      ),
      mc(
        L`A key difference between actinoids and lanthanoids is that`,
        2,
        ["actinoids", "lanthanoids", "radioactivity"],
        [
          L`actinoids are generally radioactive`,
          L`lanthanoids do not contain any $f$ electrons`,
          L`actinoids are all non-metals with no oxidation states`,
          L`lanthanoids show no contraction at all`,
        ],
        "A",
        {
          B: L`Lanthanoids involve filling of $4f$ orbitals.`,
          C: L`Actinoids are metals and show oxidation states.`,
          D: L`Lanthanoid contraction is a major feature of lanthanoids.`,
        },
        [
          L`Actinoids are heavy elements.`,
          L`Radioactivity is a key feature of actinoids.`,
          L`Lanthanoids are also $\mathrm{f}$-block elements but are not generally described the same way.`,
        ],
        [
          {
            step: 1,
            explanation: L`Actinoids are generally radioactive, unlike the usual treatment of lanthanoids.`,
          },
        ],
      ),
      mc(
        L`Which use is correctly matched with a transition metal or its compound?`,
        2,
        ["applications", "transition_metal_catalysts", "d_block"],
        [
          L`$\mathrm{V_2O_5}$ as catalyst in the Contact process`,
          L`$\mathrm{Zn^{2+}}$ as the purple oxidant in acid`,
          L`$\mathrm{NaCl}$ as an $\mathrm{f}$-block laser material`,
          L`helium as a transition-metal alloy`,
        ],
        "A",
        {
          B: L`The purple oxidant in acid is permanganate, not $\mathrm{Zn^{2+}}$.`,
          C: L`Sodium chloride is not an $\mathrm{f}$-block laser material.`,
          D: L`Helium is a noble gas, not a transition-metal alloy.`,
        },
        [
          L`Recall common d-block catalysts.`,
          L`The Contact process involves oxidation of sulphur dioxide.`,
          L`Vanadium(V) oxide is the standard catalyst.`,
        ],
        [
          {
            step: 1,
            explanation: L`$\mathrm{V_2O_5}$ is used as a catalyst in the Contact process.`,
          },
        ],
      ),
      mc(
        L`The $\mathrm{f}$-block of the periodic table consists mainly of`,
        1,
        ["f_block", "lanthanoids", "actinoids"],
        [
          L`lanthanoids and actinoids`,
          L`alkali metals and alkaline earth metals only`,
          L`halogens and noble gases only`,
          L`only zinc, cadmium and mercury`,
        ],
        "A",
        {
          B: L`Alkali and alkaline earth metals are in the $\mathrm{s}$-block.`,
          C: L`Halogens and noble gases are in the $\mathrm{p}$-block.`,
          D: L`Zinc, cadmium and mercury are in the $\mathrm{d}$-block.`,
        },
        [
          L`The inner transition elements are shown separately below the main table.`,
          L`They involve filling of $f$ orbitals.`,
          L`The two main series are lanthanoids and actinoids.`,
        ],
        [
          {
            step: 1,
            explanation: L`The $\mathrm{f}$-block consists mainly of the lanthanoid and actinoid series.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): Actinoids show actinoid contraction. Reason (R): The shielding by $5f$ electrons is poor, so effective nuclear charge increases across the series.`,
        3,
        ["assertion_reason", "actinoid_contraction", "5f_shielding"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`Poor shielding by $5f$ electrons is the reason for actinoid contraction.`,
          C: L`The reason correctly states the shielding problem.`,
          D: L`Actinoid contraction is a real trend.`,
        },
        [
          L`Actinoid contraction parallels lanthanoid contraction.`,
          L`The relevant electrons are $5f$ electrons.`,
          L`Poor shielding increases effective nuclear attraction.`,
        ],
        [
          {
            step: 1,
            explanation: L`Actinoid contraction occurs because $5f$ electrons shield poorly as nuclear charge increases.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why do actinoids show a wider range of oxidation states than lanthanoids?`,
        2,
        ["actinoids", "oxidation_states", "orbital_energy"],
        parts([["a", L`Give one orbital-energy reason.`, 1]]),
        [
          L`Compare the valence orbitals in actinoids.`,
          L`The $5f$, $6d$ and $7s$ orbitals are close in energy.`,
          L`More orbitals can participate in bonding and oxidation-state changes.`,
        ],
        [
          {
            part: "a",
            explanation: L`In actinoids, the $5f$, $6d$ and $7s$ orbitals have comparable energies, so different numbers of electrons can participate in bonding, giving variable oxidation states.`,
          },
        ],
        [
          L`Saying only $+3$ is important for actinoids.`,
          L`Ignoring the comparable energies of $5f$, $6d$ and $7s$ orbitals.`,
        ],
      ),
      frq(
        "saq",
        L`Compare lanthanoids and actinoids in terms of oxidation states and radioactivity.`,
        2,
        ["lanthanoids", "actinoids", "comparison"],
        parts([
          ["a", L`Compare oxidation states.`, 1],
          ["b", L`Compare radioactivity.`, 1],
        ]),
        [
          L`Lanthanoids are mainly $+3$.`,
          L`Actinoids show a wider range of oxidation states.`,
          L`Actinoids are generally radioactive.`,
        ],
        [
          {
            part: "a",
            explanation: L`Lanthanoids are dominated by the $+3$ oxidation state, while actinoids show more variable oxidation states.`,
          },
          {
            part: "b",
            explanation: L`Actinoids are generally radioactive; lanthanoids are not generally characterised that way in the same syllabus discussion.`,
          },
        ],
        [
          L`Claiming lanthanoids have no oxidation states.`,
          L`Ignoring the radioactivity of actinoids.`,
        ],
      ),
      frq(
        "saq",
        L`Give two applications of d-block elements or their compounds and link each to a property.`,
        2,
        ["applications", "d_block", "catalysis"],
        parts([["a", L`Give two application-property pairs.`, 2]]),
        [
          L`Catalytic activity is a common transition-metal property.`,
          L`Alloy formation is another important application route.`,
          L`Use named examples, not vague statements.`,
        ],
        [
          {
            part: "a",
            explanation: L`Examples: $\mathrm{V_2O_5}$ is used as a catalyst in the Contact process because vanadium changes oxidation state; nickel is used in hydrogenation because its surface adsorbs reactants; transition metals form alloys because their atomic sizes are similar.`,
          },
        ],
        [
          L`Giving applications without linking to a property.`,
          L`Using an unrelated $\mathrm{s}$-block salt as the example.`,
        ],
      ),
      frq(
        "laq",
        L`A student says, "Actinoids are just heavier lanthanoids, so their chemistry is exactly the same." Evaluate this statement using three points.`,
        3,
        ["comparison", "actinoids", "lanthanoids"],
        parts([
          ["a", L`State one similarity.`, 1],
          ["b", L`State one difference in oxidation states.`, 1],
          [
            "c",
            L`State one difference involving radioactivity or orbital participation.`,
            1,
          ],
        ]),
        [
          L`Both are $\mathrm{f}$-block series.`,
          L`Both show contraction due to poor $f$ shielding.`,
          L`Actinoids have more variable oxidation states and are generally radioactive.`,
        ],
        [
          {
            part: "a",
            explanation: L`Both series involve filling of $f$ orbitals and show contraction across the series.`,
          },
          {
            part: "b",
            explanation: L`Lanthanoids are mainly $+3$, whereas actinoids show a wider range of oxidation states.`,
          },
          {
            part: "c",
            explanation: L`Actinoids are generally radioactive, and their $5f$, $6d$ and $7s$ orbitals have comparable energies, so their chemistry is not exactly the same as lanthanoids.`,
          },
        ],
        [
          L`Saying same block means identical chemistry.`,
          L`Forgetting variable oxidation states in actinoids.`,
        ],
      ),
      frq(
        "case",
        L`A materials lab chooses $\mathrm{V_2O_5}$ for an oxidation process, nickel for hydrogenation, and a lanthanoid-containing alloy for lighter flints. The teacher asks students to justify why d- and f-block elements appear in useful materials.`,
        3,
        ["case_based", "applications", "d_f_block"],
        parts([
          [
            "a",
            L`Which example illustrates catalytic use of a transition-metal compound?`,
            1,
          ],
          ["b", L`Which example illustrates surface catalysis by a metal?`, 1],
          [
            "c",
            L`Give one general reason d- and f-block elements have many applications.`,
            1,
          ],
        ]),
        [
          L`$\mathrm{V_2O_5}$ is a transition-metal oxide catalyst.`,
          L`Nickel surface is used in hydrogenation.`,
          L`Many applications come from variable oxidation states, adsorption, alloy formation, and magnetic/optical behaviour.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{V_2O_5}$ illustrates catalytic use of a transition-metal compound.`,
          },
          {
            part: "b",
            explanation: L`Nickel illustrates surface catalysis by a transition metal in hydrogenation.`,
          },
          {
            part: "c",
            explanation: L`Their variable oxidation states, surface activity, alloy formation and characteristic electronic properties make d- and f-block elements useful in materials and catalysts.`,
          },
        ],
        [
          L`Treating every application as radioactive use.`,
          L`Not connecting application to a chemical or physical property.`,
        ],
      ),
    ],
  },
];

export const dAndFBlockElementsTopics: Topic[] = topicSeeds.map(makeTopic);
