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
const UNIT = "u2-electrochemistry";
const VERSION = "0.1.6";
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
        /(^|[^\\])\b(mathrm|text|frac|Delta|delta|Pi|pi|alpha|beta|gamma|lambda|Lambda|times|cdot|approx|rightarrow|rightleftharpoons|le|ge|neq|circ|Omega)\b/g,
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
  return `You chose ${choiceText}. Recheck oxidation and reduction sides, electron count, units, and whether the cell is galvanic or electrolytic.${checkStep} The correct choice is ${correctText}.`;
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
        : "incorrect_cbse_class12_chemistry_electrochemistry_reasoning",
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
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "uses_a_formula_without_checking_electron_flow_or_units",
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
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "states_an_electrochemistry_answer_without_balancing_charge_or_units",
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
      description: `Completes part ${item.letter} with correct electrochemistry reasoning, charge balance and units.`,
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
    hints,
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

const daniellCellFigure: ItemFigure = {
  type: "svg",
  title: "Daniell cell setup",
  description:
    "A zinc half-cell and copper half-cell are connected by a salt bridge and external wire, with ions labelled but electrode roles not given.",
  svg: `<svg viewBox="0 0 760 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="430" fill="#ffffff"/>
  <text x="380" y="36" text-anchor="middle" font-family="Arial" font-size="21" font-weight="700" fill="#111827">Zinc-copper galvanic cell</text>
  <rect x="88" y="138" width="230" height="220" rx="10" fill="#eff6ff" stroke="#334155" stroke-width="3"/>
  <rect x="442" y="138" width="230" height="220" rx="10" fill="#fef3c7" stroke="#334155" stroke-width="3"/>
  <rect x="176" y="86" width="26" height="215" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
  <rect x="552" y="86" width="26" height="215" fill="#f97316" stroke="#9a3412" stroke-width="2"/>
  <text x="189" y="74" text-anchor="middle" font-family="Arial" font-size="17" fill="#0f172a">Zn(s) rod</text>
  <text x="565" y="74" text-anchor="middle" font-family="Arial" font-size="17" fill="#0f172a">Cu(s) rod</text>
  <text x="203" y="276" text-anchor="middle" font-family="Arial" font-size="18" fill="#1e3a8a">Zn<tspan baseline-shift="super" font-size="12">2+</tspan> solution</text>
  <text x="557" y="276" text-anchor="middle" font-family="Arial" font-size="18" fill="#92400e">Cu<tspan baseline-shift="super" font-size="12">2+</tspan> solution</text>
  <path d="M202 98 H342 Q380 98 418 98 H552" fill="none" stroke="#111827" stroke-width="4"/>
  <circle cx="380" cy="98" r="30" fill="#ffffff" stroke="#111827" stroke-width="3"/>
  <text x="380" y="104" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#111827">V</text>
  <path d="M318 180 C356 120 402 120 442 180" fill="none" stroke="#16a34a" stroke-width="18" stroke-linecap="round"/>
  <text x="380" y="150" text-anchor="middle" font-family="Arial" font-size="15" fill="#166534">salt bridge</text>
  <text x="203" y="392" text-anchor="middle" font-family="Arial" font-size="15" fill="#475569">left half-cell</text>
  <text x="557" y="392" text-anchor="middle" font-family="Arial" font-size="15" fill="#475569">right half-cell</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "2.1",
    title: "Electrochemical Cells and Electrode Potentials",
    subtopic:
      "Galvanic cells, anode-cathode roles, standard potentials and cell notation.",
    mc: [
      mc(
        L`In the zinc-copper galvanic cell shown, the spontaneous oxidation occurs at the`,
        2,
        ["galvanic_cell", "anode_cathode", "oxidation_reduction"],
        [
          L`zinc electrode`,
          L`copper electrode`,
          L`salt bridge`,
          L`voltmeter terminal`,
        ],
        "A",
        {
          B: L`Copper ions are reduced at the copper electrode in the Daniell cell.`,
          C: L`The salt bridge completes the circuit by ion movement; it is not where metal oxidation occurs.`,
          D: L`The voltmeter measures potential difference and is not an electrode reaction site.`,
        },
        [
          L`Oxidation occurs at the anode in a galvanic cell.`,
          L`Compare standard reduction potentials of zinc and copper.`,
          L`Zinc has the more negative reduction potential and is more easily oxidised.`,
        ],
        [
          {
            step: 1,
            explanation: L`In a Daniell cell, zinc is oxidised and copper ions are reduced.`,
            math: L`\mathrm{Zn(s)\rightarrow Zn^{2+}(aq)+2e^-}`,
          },
        ],
        daniellCellFigure,
      ),
      mc(
        L`Given $E^\circ_{\mathrm{Cu^{2+}/Cu}}=+0.34\,\mathrm{V}$ and $E^\circ_{\mathrm{Zn^{2+}/Zn}}=-0.76\,\mathrm{V}$, the standard emf of the Daniell cell is`,
        2,
        ["standard_cell_potential", "electrode_potential", "daniell_cell"],
        [
          L`$-1.10\,\mathrm{V}$`,
          L`$+0.42\,\mathrm{V}$`,
          L`$+1.10\,\mathrm{V}$`,
          L`$+0.76\,\mathrm{V}$`,
        ],
        "C",
        {
          A: L`This reverses cathode and anode in $E^\circ_{cell}=E^\circ_{cathode}-E^\circ_{anode}$.`,
          B: L`This adds the signed values incorrectly.`,
          D: L`This uses only the zinc potential and ignores copper.`,
        },
        [
          L`Copper is the cathode; zinc is the anode.`,
          L`Use $E^\circ_{cell}=E^\circ_{cathode}-E^\circ_{anode}$.`,
          L`Subtract $-0.76$ from $+0.34$.`,
        ],
        [
          {
            step: 1,
            explanation: L`For the Daniell cell, copper is reduced and zinc is oxidised.`,
            math: L`E^\circ_{cell}=0.34-(-0.76)=1.10\,\mathrm{V}`,
          },
        ],
      ),
      mc(
        L`The correct cell notation for the spontaneous Daniell cell is`,
        2,
        ["cell_notation", "galvanic_cell", "daniell_cell"],
        [
          L`$\mathrm{Cu|Cu^{2+}||Zn^{2+}|Zn}$`,
          L`$\mathrm{Zn|Zn^{2+}||Cu^{2+}|Cu}$`,
          L`$\mathrm{Zn^{2+}|Zn||Cu|Cu^{2+}}$`,
          L`$\mathrm{Cu^{2+}|Cu||Zn|Zn^{2+}}$`,
        ],
        "B",
        {
          A: L`This puts the cathode half-cell on the left; cell notation writes anode on the left.`,
          C: L`Within each half-cell, metal and ion order is reversed for standard notation.`,
          D: L`This reverses both half-cells and places oxidation incorrectly.`,
        },
        [
          L`The anode half-cell is written on the left.`,
          L`Zinc is oxidised, so zinc is the left half-cell.`,
          L`The cathode half-cell is written on the right.`,
        ],
        [
          {
            step: 1,
            explanation: L`In the spontaneous Daniell cell, zinc is the anode and copper is the cathode.`,
            math: L`\mathrm{Zn|Zn^{2+}||Cu^{2+}|Cu}`,
          },
        ],
      ),
      mc(
        L`Among $\mathrm{Ag^+}$, $\mathrm{Cu^{2+}}$, $\mathrm{Fe^{2+}}$ and $\mathrm{Zn^{2+}}$, the strongest oxidising agent is the ion with the highest standard reduction potential. Using $E^\circ$ values $+0.80$, $+0.34$, $-0.44$ and $-0.76\,\mathrm{V}$ respectively, it is`,
        3,
        ["oxidising_agent", "standard_reduction_potential", "ranking"],
        [
          L`$\mathrm{Ag^+}$`,
          L`$\mathrm{Cu^{2+}}$`,
          L`$\mathrm{Fe^{2+}}$`,
          L`$\mathrm{Zn^{2+}}$`,
        ],
        "A",
        {
          B: L`$\mathrm{Cu^{2+}}$ is an oxidising agent here, but its reduction potential is lower than that of $\mathrm{Ag^+}$.`,
          C: L`A negative reduction potential makes reduction less favourable under standard conditions.`,
          D: L`$\mathrm{Zn^{2+}}$ has the lowest reduction potential among the listed ions.`,
        },
        [
          L`An oxidising agent itself gets reduced.`,
          L`The more positive the reduction potential, the stronger the oxidising agent.`,
          L`Choose the ion with $E^\circ=+0.80\,\mathrm{V}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The strongest oxidising agent is reduced most readily, so it has the highest standard reduction potential. That is $\mathrm{Ag^+}$.`,
          },
        ],
      ),
      mc(
        L`Assertion (A): In a galvanic cell, the cathode is positive. Reason (R): Reduction occurs at the cathode and electrons are consumed there.`,
        3,
        ["assertion_reason", "galvanic_cell", "cathode"],
        [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        "A",
        {
          B: L`The reason explains why the cathode draws electrons through the external circuit and is positive in a galvanic cell.`,
          C: L`Reduction does occur at the cathode in both galvanic and electrolytic cells.`,
          D: L`The assertion is true specifically for galvanic cells.`,
        },
        [
          L`Remember the sign convention for a galvanic cell.`,
          L`Electrons are produced at the anode and consumed at the cathode.`,
          L`That electron pull is associated with the positive cathode in a galvanic cell.`,
        ],
        [
          {
            step: 1,
            explanation: L`In a galvanic cell, oxidation at the anode supplies electrons and reduction at the cathode consumes them. Thus electrons flow toward the positive cathode.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State one function of the salt bridge in a galvanic cell.`,
        1,
        ["salt_bridge", "galvanic_cell", "conceptual_definition"],
        parts([["a", L`Give one correct function.`, 1]]),
        [
          L`A salt bridge does not supply electrons.`,
          L`It allows ion movement between half-cells.`,
          L`This maintains electrical neutrality and completes the internal circuit.`,
        ],
        [
          {
            part: "a",
            explanation: L`The salt bridge permits ion migration between the two half-cells, maintaining electrical neutrality and completing the circuit.`,
          },
        ],
        [
          L`Saying electrons pass through the salt bridge.`,
          L`Calling it a source of emf rather than an ion-conducting connection.`,
        ],
      ),
      frq(
        "saq",
        L`Write the oxidation half-reaction, reduction half-reaction and overall reaction for the Daniell cell.`,
        3,
        ["half_reactions", "daniell_cell", "redox_balancing"],
        parts([
          ["a", L`Write the oxidation half-reaction.`, 1],
          ["b", L`Write the reduction half-reaction.`, 1],
          ["c", L`Write the overall cell reaction.`, 1],
        ]),
        [
          L`Zinc is oxidised in the Daniell cell.`,
          L`Copper ions are reduced.`,
          L`Add the two half-reactions after cancelling electrons.`,
        ],
        [
          {
            part: "a",
            explanation: L`At the anode, zinc loses electrons.`,
            math: L`\mathrm{Zn(s)\rightarrow Zn^{2+}(aq)+2e^-}`,
          },
          {
            part: "b",
            explanation: L`At the cathode, copper ions gain electrons.`,
            math: L`\mathrm{Cu^{2+}(aq)+2e^-\rightarrow Cu(s)}`,
          },
          {
            part: "c",
            explanation: L`Adding the two half-reactions gives the cell reaction.`,
            math: L`\mathrm{Zn(s)+Cu^{2+}(aq)\rightarrow Zn^{2+}(aq)+Cu(s)}`,
          },
        ],
        [
          L`Writing reduction at zinc and oxidation at copper.`,
          L`Forgetting to cancel the two electrons.`,
        ],
      ),
      frq(
        "saq",
        L`Using $E^\circ_{\mathrm{Ag^+/Ag}}=+0.80\,\mathrm{V}$ and $E^\circ_{\mathrm{Cu^{2+}/Cu}}=+0.34\,\mathrm{V}$, calculate $E^\circ_{cell}$ for the reaction $\mathrm{Cu(s)+2Ag^+(aq)\rightarrow Cu^{2+}(aq)+2Ag(s)}$.`,
        2,
        ["standard_cell_potential", "redox_reaction", "numerical_calculation"],
        parts([["a", L`Calculate the standard cell potential.`, 2]]),
        [
          L`Identify which species is reduced.`,
          L`$\mathrm{Ag^+}$ is reduced and copper is oxidised.`,
          L`Use $E^\circ_{cell}=E^\circ_{cathode}-E^\circ_{anode}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Silver ion is reduced at the cathode and copper is oxidised at the anode.`,
            math: L`E^\circ_{cell}=0.80-0.34=0.46\,\mathrm{V}`,
          },
        ],
        [
          L`Multiplying electrode potentials by stoichiometric coefficients.`,
          L`Subtracting in the reverse order.`,
        ],
      ),
      frq(
        "laq",
        L`The figure shows a zinc-copper galvanic cell under standard conditions.`,
        4,
        ["figure_based", "galvanic_cell", "cell_notation", "electron_flow"],
        parts([
          ["a", L`Identify the anode and cathode.`, 1],
          [
            "b",
            L`State the direction of electron flow in the external circuit.`,
            1,
          ],
          ["c", L`Write the cell notation.`, 1],
          [
            "d",
            L`Calculate $E^\circ_{cell}$ using $E^\circ_{\mathrm{Cu^{2+}/Cu}}=+0.34\,\mathrm{V}$ and $E^\circ_{\mathrm{Zn^{2+}/Zn}}=-0.76\,\mathrm{V}$.`,
            1,
          ],
        ]),
        [
          L`The metal with lower reduction potential is oxidised.`,
          L`Electrons flow from anode to cathode outside the cell.`,
          L`Write anode on the left in cell notation.`,
        ],
        [
          {
            part: "a",
            explanation: L`Zinc is the anode and copper is the cathode because zinc is oxidised and copper ions are reduced.`,
          },
          {
            part: "b",
            explanation: L`Electrons flow from the zinc electrode to the copper electrode through the external circuit.`,
          },
          {
            part: "c",
            explanation: L`The cell notation is`,
            math: L`\mathrm{Zn|Zn^{2+}||Cu^{2+}|Cu}`,
          },
          {
            part: "d",
            explanation: L`Use cathode minus anode standard reduction potentials.`,
            math: L`E^\circ_{cell}=0.34-(-0.76)=1.10\,\mathrm{V}`,
          },
        ],
        [
          L`Labelling copper as the anode just because copper is on the right in the figure.`,
          L`Saying electrons move through the salt bridge.`,
        ],
        daniellCellFigure,
      ),
      frq(
        "case",
        L`A table of standard reduction potentials is given: $\mathrm{Ag^+/Ag}=+0.80\,\mathrm{V}$, $\mathrm{Cu^{2+}/Cu}=+0.34\,\mathrm{V}$, $\mathrm{Fe^{2+}/Fe}=-0.44\,\mathrm{V}$ and $\mathrm{Zn^{2+}/Zn}=-0.76\,\mathrm{V}$.`,
        4,
        ["case_based", "standard_potential", "spontaneity", "ranking"],
        parts([
          [
            "a",
            L`Identify the strongest reducing metal among Ag, Cu, Fe and Zn.`,
            1,
          ],
          [
            "b",
            L`Will $\mathrm{Zn(s)}$ reduce $\mathrm{Cu^{2+}(aq)}$ spontaneously?`,
            1,
          ],
          ["c", L`Calculate $E^\circ_{cell}$ for part (b).`, 1],
          ["d", L`Write the strongest oxidising ion from the table.`, 1],
        ]),
        [
          L`A stronger reducing metal is more easily oxidised.`,
          L`The metal with the most negative reduction potential is the strongest reducing agent.`,
          L`For spontaneity, $E^\circ_{cell}$ should be positive.`,
        ],
        [
          {
            part: "a",
            explanation: L`Zinc is the strongest reducing metal because its reduction potential is most negative, so zinc is most readily oxidised.`,
          },
          {
            part: "b",
            explanation: L`Yes. Zinc can reduce $\mathrm{Cu^{2+}}$ spontaneously.`,
          },
          {
            part: "c",
            explanation: L`Copper ion is reduced and zinc is oxidised.`,
            math: L`E^\circ_{cell}=0.34-(-0.76)=1.10\,\mathrm{V}`,
          },
          {
            part: "d",
            explanation: L`$\mathrm{Ag^+}$ is the strongest oxidising ion because it has the highest reduction potential.`,
          },
        ],
        [
          L`Choosing the metal with the highest reduction potential as the strongest reducing agent.`,
          L`Forgetting that a positive $E^\circ_{cell}$ indicates spontaneity.`,
        ],
      ),
    ],
  },
  {
    topicCode: "2.2",
    title: "Nernst Equation, Equilibrium and Gibbs Energy",
    subtopic:
      "Non-standard emf, concentration cells, equilibrium constant and $\\Delta G$ relation.",
    mc: [
      mc(
        L`For $\mathrm{Zn(s)+Cu^{2+}(aq)\rightarrow Zn^{2+}(aq)+Cu(s)}$, $E^\circ_{cell}=1.10\,\mathrm{V}$. At $298\,\mathrm{K}$, if $[\mathrm{Zn^{2+}}]=1.0\,\mathrm{M}$ and $[\mathrm{Cu^{2+}}]=0.010\,\mathrm{M}$, the cell potential is closest to`,
        4,
        ["nernst_equation", "nonstandard_emf", "daniell_cell"],
        [
          L`$1.16\,\mathrm{V}$`,
          L`$1.10\,\mathrm{V}$`,
          L`$1.04\,\mathrm{V}$`,
          L`$0.98\,\mathrm{V}$`,
        ],
        "C",
        {
          A: L`This uses the sign of the Nernst correction incorrectly; here $Q>1$ lowers the emf.`,
          B: L`This ignores the non-standard concentration ratio.`,
          D: L`This doubles the Nernst correction.`,
        },
        [
          L`Write $Q=[\mathrm{Zn^{2+}}]/[\mathrm{Cu^{2+}}]$.`,
          L`Here $Q=100$ and $n=2$.`,
          L`Use $E=E^\circ-\frac{0.0591}{n}\log Q$.`,
        ],
        [
          {
            step: 1,
            explanation: L`For the Daniell reaction, $Q=1.0/0.010=100$ and $n=2$.`,
            math: L`E=1.10-\frac{0.0591}{2}\log 100=1.10-0.0591=1.04\,\mathrm{V}`,
          },
        ],
      ),
      mc(
        L`For a reaction with $E^\circ_{cell}=0.80\,\mathrm{V}$ and $n=2$, if $Q=10^{-2}$ at $298\,\mathrm{K}$, then $E_{cell}$ is`,
        3,
        ["nernst_equation", "reaction_quotient", "cell_potential"],
        [
          L`$0.741\,\mathrm{V}$`,
          L`$0.800\,\mathrm{V}$`,
          L`$0.859\,\mathrm{V}$`,
          L`$0.918\,\mathrm{V}$`,
        ],
        "C",
        {
          A: L`This treats $\log Q$ as positive; for $Q=10^{-2}$, $\log Q=-2$.`,
          B: L`This ignores the reaction quotient.`,
          D: L`This uses $n=1$ instead of $n=2$.`,
        },
        [
          L`Use $\log(10^{-2})=-2$.`,
          L`Substitute into $E=E^\circ-\frac{0.0591}{n}\log Q$.`,
          L`A reaction quotient less than $1$ raises the cell potential.`,
        ],
        [
          {
            step: 1,
            explanation: L`The Nernst correction is negative because $\log Q=-2$.`,
            math: L`E=0.80-\frac{0.0591}{2}(-2)=0.859\,\mathrm{V}`,
          },
        ],
      ),
      mc(
        L`At $298\,\mathrm{K}$, a cell reaction has $E^\circ_{cell}=0.40\,\mathrm{V}$ and involves $2$ electrons. The value of $\log K$ is closest to`,
        3,
        ["equilibrium_constant", "standard_emf", "nernst_equation"],
        [L`$6.8$`, L`$13.5$`, L`$27.1$`, L`$0.80$`],
        "B",
        {
          A: L`This uses $n=1$ instead of $n=2$.`,
          C: L`This doubles the electron factor again.`,
          D: L`This multiplies $nE^\circ$ without dividing by $0.0591$.`,
        },
        [
          L`At equilibrium, $E=0$ and $Q=K$.`,
          L`Use $E^\circ=\frac{0.0591}{n}\log K$.`,
          L`So $\log K=nE^\circ/0.0591$.`,
        ],
        [
          {
            step: 1,
            explanation: L`For $n=2$ and $E^\circ=0.40\,\mathrm{V}$,`,
            math: L`\log K=\frac{2\times0.40}{0.0591}=13.5`,
          },
        ],
      ),
      mc(
        L`For a galvanic cell with $E_{cell}=1.10\,\mathrm{V}$ and $n=2$, the Gibbs energy change is approximately $(F=96500\,\mathrm{C\,mol^{-1}})$`,
        3,
        ["gibbs_energy", "cell_potential", "thermodynamics"],
        [
          L`$-212\,\mathrm{kJ\,mol^{-1}}$`,
          L`$+212\,\mathrm{kJ\,mol^{-1}}$`,
          L`$-106\,\mathrm{kJ\,mol^{-1}}$`,
          L`$+106\,\mathrm{kJ\,mol^{-1}}$`,
        ],
        "A",
        {
          B: L`A spontaneous galvanic cell has positive $E$ and negative $\Delta G$.`,
          C: L`This omits the factor $n=2$.`,
          D: L`This both omits $n$ and uses the wrong sign.`,
        },
        [
          L`Use $\Delta G=-nFE$.`,
          L`Keep joules first, then convert to kilojoules.`,
          L`Positive cell potential gives negative Gibbs energy.`,
        ],
        [
          {
            step: 1,
            explanation: L`The cell performs electrical work, so the Gibbs energy change is negative.`,
            math: L`\Delta G=-2\times96500\times1.10=-2.12\times10^5\,\mathrm{J\,mol^{-1}}=-212\,\mathrm{kJ\,mol^{-1}}`,
          },
        ],
      ),
      mc(
        L`A concentration cell is made with two $\mathrm{Cu^{2+}/Cu}$ half-cells, one containing $0.010\,\mathrm{M}\ \mathrm{Cu^{2+}}$ and the other $1.0\,\mathrm{M}\ \mathrm{Cu^{2+}}$. At $298\,\mathrm{K}$, its emf is closest to`,
        4,
        ["concentration_cell", "nernst_equation", "electrode_concentration"],
        [
          L`$0.000\,\mathrm{V}$`,
          L`$0.030\,\mathrm{V}$`,
          L`$0.059\,\mathrm{V}$`,
          L`$0.118\,\mathrm{V}$`,
        ],
        "C",
        {
          A: L`The concentrations differ, so the cell has a non-zero potential.`,
          B: L`This accounts for only one ten-fold concentration difference; the ratio is $100$.`,
          D: L`This uses $n=1$ instead of $n=2$ for $\mathrm{Cu^{2+}+2e^-\rightarrow Cu}$.`,
        },
        [
          L`For a concentration cell, $E^\circ=0$.`,
          L`Use $E=\frac{0.0591}{n}\log\frac{C_{high}}{C_{low}}$.`,
          L`Here $n=2$ and the concentration ratio is $100$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The higher-concentration side is the cathode. The ratio is $1.0/0.010=100$.`,
            math: L`E=\frac{0.0591}{2}\log 100=0.0591\,\mathrm{V}`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why is $E_{cell}=0$ when an electrochemical cell reaction reaches equilibrium?`,
        1,
        ["equilibrium", "cell_potential", "conceptual_reasoning"],
        parts([["a", L`Explain in one or two sentences.`, 1]]),
        [
          L`At equilibrium, there is no net tendency for the reaction to proceed.`,
          L`No net driving force means no maximum electrical work.`,
          L`Therefore the cell potential becomes zero.`,
        ],
        [
          {
            part: "a",
            explanation: L`At equilibrium, the forward and reverse tendencies balance, so the reaction can no longer deliver net electrical work. Hence the cell potential is zero.`,
          },
        ],
        [
          L`Saying the electrodes disappear at equilibrium.`,
          L`Confusing zero current under open circuit with zero equilibrium potential.`,
        ],
      ),
      frq(
        "saq",
        L`For $\mathrm{Cu^{2+}+2e^-\rightarrow Cu}$, calculate the reduction potential at $298\,\mathrm{K}$ when $[\mathrm{Cu^{2+}}]=0.010\,\mathrm{M}$. Use $E^\circ=+0.34\,\mathrm{V}$.`,
        2,
        ["nernst_equation", "electrode_potential", "numerical_calculation"],
        parts([["a", L`Calculate the electrode potential.`, 2]]),
        [
          L`For a reduction electrode, $E=E^\circ+\frac{0.0591}{n}\log[\mathrm{M^{n+}}]$.`,
          L`Here $n=2$ and $\log(0.010)=-2$.`,
          L`The lower ion concentration reduces the reduction potential.`,
        ],
        [
          {
            part: "a",
            explanation: L`For $\mathrm{Cu^{2+}+2e^-\rightarrow Cu}$, the solid copper activity is one.`,
            math: L`E=0.34+\frac{0.0591}{2}\log(0.010)=0.34-0.0591=0.281\,\mathrm{V}`,
          },
        ],
        [
          L`Using $\log 100$ instead of $\log 0.010$ for the reduction potential.`,
          L`Forgetting that two electrons are involved.`,
        ],
      ),
      frq(
        "saq",
        L`A cell has $E^\circ_{cell}=0.75\,\mathrm{V}$ and $n=2$. Calculate $\Delta G^\circ$ in $\mathrm{kJ\,mol^{-1}}$. Use $F=96500\,\mathrm{C\,mol^{-1}}$.`,
        2,
        ["gibbs_energy", "standard_cell_potential", "numerical_calculation"],
        parts([["a", L`Calculate $\Delta G^\circ$.`, 2]]),
        [
          L`Use $\Delta G^\circ=-nFE^\circ$.`,
          L`Substitute $n=2$ and $E^\circ=0.75\,\mathrm{V}$.`,
          L`Convert joules to kilojoules.`,
        ],
        [
          {
            part: "a",
            explanation: L`The standard Gibbs energy change is`,
            math: L`\Delta G^\circ=-2\times96500\times0.75=-144750\,\mathrm{J\,mol^{-1}}=-145\,\mathrm{kJ\,mol^{-1}}`,
          },
        ],
        [
          L`Reporting a positive value for a positive-emf galvanic cell.`,
          L`Forgetting to convert joules to kilojoules.`,
        ],
      ),
      frq(
        "laq",
        L`For a cell reaction involving two electrons, $E^\circ_{cell}=0.30\,\mathrm{V}$ at $298\,\mathrm{K}$.`,
        4,
        ["equilibrium_constant", "nernst_equation", "gibbs_energy"],
        parts([
          ["a", L`Calculate $\log K$.`, 2],
          ["b", L`Find whether $K$ is greater or less than $1$.`, 1],
          [
            "c",
            L`Calculate $\Delta G^\circ$ using $F=96500\,\mathrm{C\,mol^{-1}}$.`,
            1,
          ],
        ]),
        [
          L`Use $E^\circ=\frac{0.0591}{n}\log K$.`,
          L`A positive standard emf gives $K>1$.`,
          L`Use $\Delta G^\circ=-nFE^\circ$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Substitute $n=2$ and $E^\circ=0.30\,\mathrm{V}$.`,
            math: L`\log K=\frac{2\times0.30}{0.0591}=10.2`,
          },
          {
            part: "b",
            explanation: L`Since $\log K$ is positive, $K$ is much greater than $1$.`,
          },
          {
            part: "c",
            explanation: L`The standard Gibbs energy change is negative for positive $E^\circ_{cell}$.`,
            math: L`\Delta G^\circ=-2\times96500\times0.30=-57.9\,\mathrm{kJ\,mol^{-1}}`,
          },
        ],
        [
          L`Using $0.0591nE^\circ$ instead of $nE^\circ/0.0591$.`,
          L`Leaving $\Delta G^\circ$ in joules while writing kilojoules.`,
        ],
      ),
      frq(
        "case",
        L`A concentration cell is made using $\mathrm{Ag^+/Ag}$ electrodes. The left half-cell contains $0.0010\,\mathrm{M}\ \mathrm{Ag^+}$ and the right half-cell contains $0.10\,\mathrm{M}\ \mathrm{Ag^+}$ at $298\,\mathrm{K}$.`,
        4,
        ["case_based", "concentration_cell", "nernst_equation"],
        parts([
          ["a", L`Which half-cell acts as cathode?`, 1],
          [
            "b",
            L`State the direction of electron flow through the external wire.`,
            1,
          ],
          ["c", L`Calculate the cell emf.`, 2],
        ]),
        [
          L`Reduction is favoured at the higher ion concentration electrode.`,
          L`Electrons flow from anode to cathode.`,
          L`For silver, $n=1$. The concentration ratio is $100$.`,
        ],
        [
          {
            part: "a",
            explanation: L`The right half-cell acts as cathode because it has the higher $\mathrm{Ag^+}$ concentration.`,
          },
          {
            part: "b",
            explanation: L`Electrons flow from the dilute left half-cell to the concentrated right half-cell.`,
          },
          {
            part: "c",
            explanation: L`For a concentration cell, $E^\circ=0$ and $n=1$.`,
            math: L`E=0.0591\log\frac{0.10}{0.0010}=0.0591\times2=0.118\,\mathrm{V}`,
          },
        ],
        [
          L`Choosing the dilute side as cathode because it has lower ion concentration.`,
          L`Using $n=2$ for $\mathrm{Ag^+/Ag}$.`,
        ],
      ),
    ],
  },
  {
    topicCode: "2.3",
    title: "Conductance and Kohlrausch's Law",
    subtopic:
      "Conductivity, molar conductivity, dilution trends, cell constant and limiting molar conductivity.",
    mc: [
      mc(
        L`A conductivity cell has cell constant $1.00\,\mathrm{cm^{-1}}$ and the measured resistance of the solution is $50.0\,\Omega$. The conductivity is`,
        2,
        ["conductivity", "cell_constant", "resistance"],
        [
          L`$0.020\,\mathrm{S\,cm^{-1}}$`,
          L`$0.050\,\mathrm{S\,cm^{-1}}$`,
          L`$50.0\,\mathrm{S\,cm^{-1}}$`,
          L`$1.00\,\mathrm{S\,cm^{-1}}$`,
        ],
        "A",
        {
          B: L`This treats resistance as conductance without taking reciprocal correctly.`,
          C: L`This uses resistance directly as conductivity.`,
          D: L`This ignores the measured resistance.`,
        },
        [
          L`Conductance is $G=1/R$.`,
          L`Conductivity is $\kappa=G\times$ cell constant.`,
          L`Here $G=1/50.0\,\mathrm{S}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The conductance is reciprocal of resistance.`,
            math: L`\kappa=\frac{1}{50.0}\times1.00=0.020\,\mathrm{S\,cm^{-1}}`,
          },
        ],
      ),
      mc(
        L`For a $0.100\,\mathrm{M}$ solution, $\kappa=0.0120\,\mathrm{S\,cm^{-1}}$. Its molar conductivity is`,
        2,
        ["molar_conductivity", "conductivity", "unit_conversion"],
        [
          L`$1.20\,\mathrm{S\,cm^2\,mol^{-1}}$`,
          L`$12.0\,\mathrm{S\,cm^2\,mol^{-1}}$`,
          L`$120\,\mathrm{S\,cm^2\,mol^{-1}}$`,
          L`$1200\,\mathrm{S\,cm^2\,mol^{-1}}$`,
        ],
        "C",
        {
          A: L`This misses the factor $1000$ for concentration in $\mathrm{mol\,L^{-1}}$.`,
          B: L`This still misses one factor of ten in the unit conversion.`,
          D: L`This uses $0.0100\,\mathrm{M}$ instead of $0.100\,\mathrm{M}$.`,
        },
        [
          L`Use $\Lambda_m=\kappa\times1000/C$ when $\kappa$ is in $\mathrm{S\,cm^{-1}}$.`,
          L`Here $C=0.100\,\mathrm{mol\,L^{-1}}$.`,
          L`Compute $0.0120\times1000/0.100$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Substitute into the molar conductivity formula.`,
            math: L`\Lambda_m=\frac{0.0120\times1000}{0.100}=120\,\mathrm{S\,cm^2\,mol^{-1}}`,
          },
        ],
      ),
      mc(
        L`Using Kohlrausch's law, $\Lambda_m^\circ$ for acetic acid is closest to $\lambda^\circ_{\mathrm{H^+}}+\lambda^\circ_{\mathrm{CH_3COO^-}}$. Given $349.6$ and $40.9\,\mathrm{S\,cm^2\,mol^{-1}}$, the value is`,
        2,
        ["kohlrausch_law", "limiting_molar_conductivity", "weak_electrolyte"],
        [
          L`$308.7\,\mathrm{S\,cm^2\,mol^{-1}}$`,
          L`$390.5\,\mathrm{S\,cm^2\,mol^{-1}}$`,
          L`$349.6\,\mathrm{S\,cm^2\,mol^{-1}}$`,
          L`$40.9\,\mathrm{S\,cm^2\,mol^{-1}}$`,
        ],
        "B",
        {
          A: L`Limiting molar conductivities of ions add; they are not subtracted.`,
          C: L`This includes only the hydrogen ion contribution.`,
          D: L`This includes only the acetate ion contribution.`,
        },
        [
          L`At infinite dilution, ions contribute independently.`,
          L`Add cation and anion limiting ionic conductivities.`,
          L`Do not subtract the anion value.`,
        ],
        [
          {
            step: 1,
            explanation: L`Kohlrausch's law gives the sum of limiting ionic conductivities.`,
            math: L`\Lambda_m^\circ=349.6+40.9=390.5\,\mathrm{S\,cm^2\,mol^{-1}}`,
          },
        ],
      ),
      mc(
        L`A weak acid has $\Lambda_m=39.0\,\mathrm{S\,cm^2\,mol^{-1}}$ at a certain concentration and $\Lambda_m^\circ=390\,\mathrm{S\,cm^2\,mol^{-1}}$. Its degree of dissociation is`,
        3,
        ["degree_of_dissociation", "molar_conductivity", "weak_electrolyte"],
        [L`$0.010$`, L`$0.050$`, L`$0.100$`, L`$0.390$`],
        "C",
        {
          A: L`This divides by $3900$ rather than by $\Lambda_m^\circ=390$.`,
          B: L`This would correspond to $\Lambda_m=19.5$.`,
          D: L`This confuses molar conductivity with degree of dissociation.`,
        },
        [
          L`For a weak electrolyte, $\alpha=\Lambda_m/\Lambda_m^\circ$.`,
          L`Divide $39.0$ by $390$.`,
          L`The answer should be a fraction, not a conductivity unit.`,
        ],
        [
          {
            step: 1,
            explanation: L`The degree of dissociation is`,
            math: L`\alpha=\frac{39.0}{390}=0.100`,
          },
        ],
      ),
      mc(
        L`On dilution of an aqueous electrolyte solution, which trend is generally correct?`,
        3,
        ["dilution_trend", "conductivity", "molar_conductivity"],
        [
          L`Conductivity decreases, while molar conductivity increases.`,
          L`Both conductivity and molar conductivity decrease.`,
          L`Conductivity increases, while molar conductivity decreases.`,
          L`Both remain unchanged because ion charge is unchanged.`,
        ],
        "A",
        {
          B: L`Molar conductivity usually increases on dilution because interionic interactions decrease and dissociation may increase.`,
          C: L`Conductivity decreases because the number of ions per unit volume falls.`,
          D: L`Ion charge is not the only factor; concentration and interionic effects matter.`,
        },
        [
          L`Conductivity depends on ions per unit volume.`,
          L`Molar conductivity is conductance due to one mole of electrolyte.`,
          L`Dilution reduces ions per volume but improves ionic mobility or dissociation.`,
        ],
        [
          {
            step: 1,
            explanation: L`On dilution, ions per unit volume decrease, so conductivity decreases. Molar conductivity increases because ions are farther apart and, for weak electrolytes, dissociation increases.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Define the cell constant of a conductivity cell.`,
        1,
        ["cell_constant", "conductance", "definition"],
        parts([["a", L`Give the definition and expression.`, 1]]),
        [
          L`It depends on geometry of the conductance cell.`,
          L`Use distance between electrodes and electrode area.`,
          L`Write the expression $l/A$.`,
        ],
        [
          {
            part: "a",
            explanation: L`The cell constant is the ratio of distance between electrodes to the effective area of the electrodes.`,
            math: L`\mathrm{cell\ constant}=\frac{l}{A}`,
          },
        ],
        [
          L`Defining cell constant as resistance of the solution.`,
          L`Forgetting that it is a geometry-dependent quantity.`,
        ],
      ),
      frq(
        "saq",
        L`A conductivity cell filled with a solution has resistance $200\,\Omega$. Its cell constant is $0.80\,\mathrm{cm^{-1}}$. Calculate the conductivity of the solution.`,
        2,
        ["conductivity", "resistance", "cell_constant"],
        parts([["a", L`Calculate $\kappa$.`, 2]]),
        [
          L`First find conductance $G=1/R$.`,
          L`Then multiply by cell constant.`,
          L`Keep the unit $\mathrm{S\,cm^{-1}}$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Conductance is $1/200=0.0050\,\mathrm{S}$.`,
            math: L`\kappa=0.0050\times0.80=0.0040\,\mathrm{S\,cm^{-1}}`,
          },
        ],
        [
          L`Multiplying resistance by cell constant.`,
          L`Leaving the answer in siemens instead of conductivity units.`,
        ],
      ),
      frq(
        "saq",
        L`The conductivity of $0.020\,\mathrm{M}\ \mathrm{KCl}$ solution is $0.0028\,\mathrm{S\,cm^{-1}}$. Calculate its molar conductivity.`,
        2,
        ["molar_conductivity", "conductivity", "unit_conversion"],
        parts([["a", L`Calculate $\Lambda_m$.`, 2]]),
        [
          L`Use $\Lambda_m=\kappa\times1000/C$.`,
          L`The concentration is in $\mathrm{mol\,L^{-1}}$, so the factor $1000$ is needed.`,
          L`Substitute $C=0.020$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Using the standard unit conversion,`,
            math: L`\Lambda_m=\frac{0.0028\times1000}{0.020}=140\,\mathrm{S\,cm^2\,mol^{-1}}`,
          },
        ],
        [L`Using $C=20$ instead of $0.020$.`, L`Omitting the factor $1000$.`],
      ),
      frq(
        "laq",
        L`For acetic acid at $298\,\mathrm{K}$, $\Lambda_m^\circ=390\,\mathrm{S\,cm^2\,mol^{-1}}$. A $0.010\,\mathrm{M}$ solution has $\Lambda_m=19.5\,\mathrm{S\,cm^2\,mol^{-1}}$.`,
        4,
        ["weak_electrolyte", "degree_of_dissociation", "dissociation_constant"],
        parts([
          ["a", L`Calculate the degree of dissociation.`, 1],
          ["b", L`Calculate the concentration of dissociated acid.`, 1],
          ["c", L`Estimate $K_a$ using $K_a=\frac{C\alpha^2}{1-\alpha}$.`, 2],
        ]),
        [
          L`For weak electrolytes, $\alpha=\Lambda_m/\Lambda_m^\circ$.`,
          L`Dissociated acid concentration is $C\alpha$.`,
          L`Substitute $C=0.010$ and $\alpha=0.050$ in the $K_a$ expression.`,
        ],
        [
          {
            part: "a",
            explanation: L`The degree of dissociation is`,
            math: L`\alpha=\frac{19.5}{390}=0.050`,
          },
          {
            part: "b",
            explanation: L`The concentration of dissociated acid is $0.010\times0.050=5.0\times10^{-4}\,\mathrm{M}$.`,
          },
          {
            part: "c",
            explanation: L`Using the weak-acid expression,`,
            math: L`K_a=\frac{0.010(0.050)^2}{1-0.050}=2.63\times10^{-5}`,
          },
        ],
        [
          L`Using $\Lambda_m^\circ/\Lambda_m$ for $\alpha$.`,
          L`Forgetting the denominator $1-\alpha$ in $K_a$.`,
        ],
      ),
      frq(
        "case",
        L`A student measures the resistance of a $0.050\,\mathrm{M}$ electrolyte solution as $80.0\,\Omega$ in a conductance cell of cell constant $1.20\,\mathrm{cm^{-1}}$.`,
        4,
        ["case_based", "conductivity", "molar_conductivity"],
        parts([
          ["a", L`Calculate the conductance.`, 1],
          ["b", L`Calculate the conductivity.`, 1],
          ["c", L`Calculate the molar conductivity.`, 2],
        ]),
        [
          L`Conductance is reciprocal of resistance.`,
          L`Conductivity equals conductance times cell constant.`,
          L`Molar conductivity equals $\kappa\times1000/C$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Conductance is reciprocal of resistance.`,
            math: L`G=\frac{1}{80.0}=0.0125\,\mathrm{S}`,
          },
          {
            part: "b",
            explanation: L`Multiply conductance by cell constant.`,
            math: L`\kappa=0.0125\times1.20=0.0150\,\mathrm{S\,cm^{-1}}`,
          },
          {
            part: "c",
            explanation: L`Use concentration in $\mathrm{mol\,L^{-1}}$.`,
            math: L`\Lambda_m=\frac{0.0150\times1000}{0.050}=300\,\mathrm{S\,cm^2\,mol^{-1}}`,
          },
        ],
        [
          L`Using resistance instead of conductance in the conductivity step.`,
          L`Omitting the $1000$ factor for molar conductivity.`,
        ],
      ),
    ],
  },
  {
    topicCode: "2.4",
    title: "Electrolysis and Faraday's Laws",
    subtopic:
      "Charge, equivalents, mass deposition, gas liberation and current efficiency.",
    mc: [
      mc(
        L`The charge carried by $0.0100\,\mathrm{mol}$ electrons is approximately $(F=96500\,\mathrm{C\,mol^{-1}})$`,
        1,
        ["faraday_constant", "charge", "electron_moles"],
        [
          L`$965\,\mathrm{C}$`,
          L`$9650\,\mathrm{C}$`,
          L`$96.5\,\mathrm{C}$`,
          L`$9.65\,\mathrm{C}$`,
        ],
        "A",
        {
          B: L`This corresponds to $0.100\,\mathrm{mol}$ electrons.`,
          C: L`This is smaller by a factor of ten.`,
          D: L`This is smaller by a factor of hundred.`,
        },
        [
          L`Charge equals moles of electrons times Faraday constant.`,
          L`Use $Q=nF$.`,
          L`Multiply $0.0100$ by $96500$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The charge is proportional to moles of electrons.`,
            math: L`Q=0.0100\times96500=965\,\mathrm{C}`,
          },
        ],
      ),
      mc(
        L`During electrolysis of $\mathrm{CuSO_4}$ solution using inert electrodes, a current of $2.00\,\mathrm{A}$ is passed for $965\,\mathrm{s}$. The mass of copper deposited is closest to $(M_{\mathrm{Cu}}=63.5)$`,
        3,
        ["faraday_law", "copper_deposition", "electrolysis"],
        [
          L`$0.318\,\mathrm{g}$`,
          L`$0.635\,\mathrm{g}$`,
          L`$1.27\,\mathrm{g}$`,
          L`$63.5\,\mathrm{g}$`,
        ],
        "B",
        {
          A: L`This uses half the charge or treats the electron requirement incorrectly.`,
          C: L`This treats one electron as sufficient for one copper ion.`,
          D: L`This assumes one full mole of copper is deposited.`,
        },
        [
          L`Find charge: $Q=It$.`,
          L`Moles of electrons are $Q/F$.`,
          L`$\mathrm{Cu^{2+}+2e^-\rightarrow Cu}$, so divide electron moles by $2$.`,
        ],
        [
          {
            step: 1,
            explanation: L`The charge passed is $2.00\times965=1930\,\mathrm{C}$, which is $0.0200\,\mathrm{mol}$ electrons.`,
            math: L`n_{\mathrm{Cu}}=\frac{0.0200}{2}=0.0100,\quad m=0.0100\times63.5=0.635\,\mathrm{g}`,
          },
        ],
      ),
      mc(
        L`On passing $2F$ of charge through acidified water, the volumes of $\mathrm{H_2}$ and $\mathrm{O_2}$ liberated at STP are respectively`,
        3,
        ["electrolysis_of_water", "gas_volume", "faraday_law"],
        [
          L`$22.4\,\mathrm{L}$ and $11.2\,\mathrm{L}$`,
          L`$11.2\,\mathrm{L}$ and $22.4\,\mathrm{L}$`,
          L`$22.4\,\mathrm{L}$ and $22.4\,\mathrm{L}$`,
          L`$44.8\,\mathrm{L}$ and $22.4\,\mathrm{L}$`,
        ],
        "A",
        {
          B: L`Hydrogen volume is double oxygen volume for water electrolysis.`,
          C: L`Equal volumes would not match the reaction stoichiometry.`,
          D: L`This corresponds to $4F$ for hydrogen, not $2F$.`,
        },
        [
          L`At cathode, $2F$ produces $1\,\mathrm{mol}\ \mathrm{H_2}$.`,
          L`At anode, $4F$ produces $1\,\mathrm{mol}\ \mathrm{O_2}$.`,
          L`At STP, $1\,\mathrm{mol}$ gas occupies $22.4\,\mathrm{L}$.`,
        ],
        [
          {
            step: 1,
            explanation: L`$2F$ gives $1\,\mathrm{mol}\ \mathrm{H_2}$ and $0.5\,\mathrm{mol}\ \mathrm{O_2}$.`,
            math: L`V_{\mathrm{H_2}}=22.4\,\mathrm{L},\quad V_{\mathrm{O_2}}=11.2\,\mathrm{L}`,
          },
        ],
      ),
      mc(
        L`The same charge deposits $0.3175\,\mathrm{g}$ copper from $\mathrm{Cu^{2+}}$ solution. The mass of silver deposited from $\mathrm{Ag^+}$ solution in series is closest to $(M_{\mathrm{Cu}}=63.5,\ M_{\mathrm{Ag}}=108)$`,
        4,
        ["electrochemical_equivalent", "series_electrolysis", "faraday_law"],
        [
          L`$0.54\,\mathrm{g}$`,
          L`$1.08\,\mathrm{g}$`,
          L`$2.16\,\mathrm{g}$`,
          L`$0.3175\,\mathrm{g}$`,
        ],
        "B",
        {
          A: L`This uses half the required silver moles.`,
          C: L`This doubles the silver mass; $\mathrm{Ag^+}$ needs only one electron per silver atom.`,
          D: L`Equal charge deposits equal equivalents, not equal masses.`,
        },
        [
          L`Find moles of copper deposited.`,
          L`Copper deposition uses two electrons per copper atom.`,
          L`The same electron moles deposit the same moles of silver because $\mathrm{Ag^+}$ uses one electron.`,
        ],
        [
          {
            step: 1,
            explanation: L`Moles of copper deposited are $0.3175/63.5=0.00500$. This required $0.0100\,\mathrm{mol}$ electrons.`,
            math: L`n_{\mathrm{Ag}}=0.0100,\quad m_{\mathrm{Ag}}=0.0100\times108=1.08\,\mathrm{g}`,
          },
        ],
      ),
      mc(
        L`A copper voltameter theoretically should deposit $3.175\,\mathrm{g}$ copper for a given charge. If current efficiency is $80\%$, the actual mass deposited is`,
        2,
        ["current_efficiency", "faraday_law", "electrolysis"],
        [
          L`$0.635\,\mathrm{g}$`,
          L`$2.54\,\mathrm{g}$`,
          L`$3.97\,\mathrm{g}$`,
          L`$3.175\,\mathrm{g}$`,
        ],
        "B",
        {
          A: L`This takes $20\%$ of the theoretical mass, not $80\%$.`,
          C: L`This divides by $0.80$ instead of multiplying by it.`,
          D: L`This ignores the current efficiency.`,
        },
        [
          L`Current efficiency tells the fraction of charge effectively used for deposition.`,
          L`Actual mass equals efficiency fraction times theoretical mass.`,
          L`Compute $0.80\times3.175$.`,
        ],
        [
          {
            step: 1,
            explanation: L`Only $80\%$ of the theoretical deposition occurs.`,
            math: L`m=0.80\times3.175=2.54\,\mathrm{g}`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`State Faraday's first law of electrolysis.`,
        1,
        ["faraday_first_law", "definition", "electrolysis"],
        parts([["a", L`State the law.`, 1]]),
        [
          L`The law connects deposited mass with charge passed.`,
          L`At fixed substance, more charge deposits more mass.`,
          L`Use proportional wording.`,
        ],
        [
          {
            part: "a",
            explanation: L`Faraday's first law states that the mass of substance deposited or liberated at an electrode is directly proportional to the quantity of electricity passed through the electrolyte.`,
          },
        ],
        [
          L`Saying mass is proportional to current only, without including time or charge.`,
          L`Confusing the first law with the equivalent-mass comparison of the second law.`,
        ],
      ),
      frq(
        "saq",
        L`Calculate the mass of silver deposited when a current of $1.00\,\mathrm{A}$ is passed through $\mathrm{AgNO_3}$ solution for $965\,\mathrm{s}$. Use $M_{\mathrm{Ag}}=108$ and $F=96500\,\mathrm{C\,mol^{-1}}$.`,
        2,
        ["silver_deposition", "faraday_law", "numerical_calculation"],
        parts([["a", L`Calculate the mass of silver.`, 2]]),
        [
          L`Find charge from $Q=It$.`,
          L`For $\mathrm{Ag^+ + e^-\rightarrow Ag}$, one mole electrons deposits one mole silver.`,
          L`Convert moles of silver to mass.`,
        ],
        [
          {
            part: "a",
            explanation: L`The charge passed is $965\,\mathrm{C}$, so electron moles are $965/96500=0.0100$.`,
            math: L`m_{\mathrm{Ag}}=0.0100\times108=1.08\,\mathrm{g}`,
          },
        ],
        [
          L`Dividing by two as if silver ion were divalent.`,
          L`Using time as charge without multiplying by current.`,
        ],
      ),
      frq(
        "saq",
        L`How long must a current of $2.00\,\mathrm{A}$ be passed through molten $\mathrm{NaCl}$ to produce $2.30\,\mathrm{g}$ sodium? Use $M_{\mathrm{Na}}=23.0$ and $F=96500\,\mathrm{C\,mol^{-1}}$.`,
        3,
        ["electrolysis", "time_calculation", "sodium_deposition"],
        parts([["a", L`Calculate the required time.`, 3]]),
        [
          L`Find moles of sodium required.`,
          L`$\mathrm{Na^+ + e^-\rightarrow Na}$ requires one mole electron per mole sodium.`,
          L`Use $Q=It=nF$.`,
        ],
        [
          {
            part: "a",
            explanation: L`Moles of sodium required are $2.30/23.0=0.100\,\mathrm{mol}$, requiring $0.100\,\mathrm{mol}$ electrons.`,
            math: L`Q=0.100\times96500=9650\,\mathrm{C}`,
          },
          {
            part: "a",
            explanation: L`Time is charge divided by current.`,
            math: L`t=\frac{9650}{2.00}=4825\,\mathrm{s}`,
          },
        ],
        [
          L`Using two electrons per sodium ion.`,
          L`Dividing by Faraday constant after already finding charge.`,
        ],
      ),
      frq(
        "laq",
        L`A current of $5.00\,\mathrm{A}$ is passed through $\mathrm{CuSO_4}$ solution using copper electrodes for $1930\,\mathrm{s}$. Use $M_{\mathrm{Cu}}=63.5$ and $F=96500\,\mathrm{C\,mol^{-1}}$.`,
        4,
        ["copper_electrolysis", "faraday_law", "electrode_mass_change"],
        parts([
          ["a", L`Calculate the charge passed.`, 1],
          ["b", L`Find the mass of copper deposited at the cathode.`, 2],
          ["c", L`State the mass change at the copper anode.`, 1],
        ]),
        [
          L`Use $Q=It$.`,
          L`Copper deposition uses two electrons per copper atom.`,
          L`With copper electrodes, copper dissolves at the anode at the same molar rate.`,
        ],
        [
          {
            part: "a",
            explanation: L`The charge passed is`,
            math: L`Q=5.00\times1930=9650\,\mathrm{C}`,
          },
          {
            part: "b",
            explanation: L`This is $9650/96500=0.100\,\mathrm{mol}$ electrons, so copper moles are $0.100/2=0.0500$.`,
            math: L`m_{\mathrm{Cu}}=0.0500\times63.5=3.18\,\mathrm{g}`,
          },
          {
            part: "c",
            explanation: L`For copper electrodes, copper dissolves from the anode. The anode loses $3.18\,\mathrm{g}$ copper, assuming $100\%$ current efficiency.`,
          },
        ],
        [
          L`Using one electron per copper atom.`,
          L`Saying the anode mass is unchanged when copper electrodes are used.`,
        ],
      ),
      frq(
        "case",
        L`Three electrolytic cells are connected in series, containing $\mathrm{AgNO_3}$, $\mathrm{CuSO_4}$ and acidified water respectively. The same charge passes through all cells.`,
        4,
        ["case_based", "series_electrolysis", "faraday_law"],
        parts([
          [
            "a",
            L`If $0.0100\,\mathrm{mol}$ electrons pass, find moles of silver deposited.`,
            1,
          ],
          ["b", L`Find moles of copper deposited.`, 1],
          ["c", L`Find moles of hydrogen gas liberated.`, 1],
          ["d", L`Explain why the three amounts are not equal.`, 1],
        ]),
        [
          L`Each cell receives the same electron moles.`,
          L`Use each cathode half-reaction.`,
          L`Compare electron requirement per mole product.`,
        ],
        [
          {
            part: "a",
            explanation: L`$\mathrm{Ag^+}$ requires one electron per silver atom, so $0.0100\,\mathrm{mol}$ silver is deposited.`,
          },
          {
            part: "b",
            explanation: L`$\mathrm{Cu^{2+}}$ requires two electrons per copper atom, so $0.00500\,\mathrm{mol}$ copper is deposited.`,
          },
          {
            part: "c",
            explanation: L`Hydrogen formation requires two electrons per $\mathrm{H_2}$ molecule, so $0.00500\,\mathrm{mol}\ \mathrm{H_2}$ is liberated.`,
          },
          {
            part: "d",
            explanation: L`The same charge means the same moles of electrons, but different products require different numbers of electrons per mole.`,
          },
        ],
        [
          L`Assuming equal charge deposits equal moles of all products.`,
          L`Forgetting the electron stoichiometry in gas liberation.`,
        ],
      ),
    ],
  },
  {
    topicCode: "2.5",
    title: "Batteries, Fuel Cells and Corrosion",
    subtopic:
      "Primary and secondary cells, lead storage battery, fuel cells, rusting and corrosion protection.",
    mc: [
      mc(
        L`A lead storage battery is classified as a secondary cell because it`,
        1,
        ["secondary_battery", "lead_storage_battery", "conceptual_recall"],
        [
          L`can be recharged by passing current in the reverse direction`,
          L`uses only one electrode`,
          L`cannot produce current repeatedly`,
          L`contains no electrolyte`,
        ],
        "A",
        {
          B: L`A lead storage battery has both anode and cathode materials.`,
          C: L`This describes a primary cell more closely.`,
          D: L`Sulphuric acid electrolyte is essential in a lead storage battery.`,
        },
        [
          L`Secondary cells are rechargeable.`,
          L`Charging reverses the discharge reaction.`,
          L`Lead storage batteries are common rechargeable batteries.`,
        ],
        [
          {
            step: 1,
            explanation: L`A secondary cell can be recharged because the cell reaction can be driven in the reverse direction by an external current.`,
          },
        ],
      ),
      mc(
        L`During discharge of a lead storage battery, the density of sulphuric acid`,
        2,
        ["lead_storage_battery", "discharge", "battery_chemistry"],
        [
          L`increases because acid is produced`,
          L`decreases because sulphuric acid is consumed`,
          L`remains constant because water alone reacts`,
          L`becomes zero immediately after current starts`,
        ],
        "B",
        {
          A: L`Sulphuric acid is consumed during discharge, not produced.`,
          C: L`Sulphate ions participate in forming lead sulphate at both electrodes.`,
          D: L`The acid concentration decreases gradually; it does not instantly vanish.`,
        },
        [
          L`Both electrodes form $\mathrm{PbSO_4}$ during discharge.`,
          L`Sulphuric acid is consumed in the overall reaction.`,
          L`Lower acid concentration means lower density.`,
        ],
        [
          {
            step: 1,
            explanation: L`During discharge, sulphuric acid is consumed as lead sulphate forms, so the acid density decreases.`,
          },
        ],
      ),
      mc(
        L`In a hydrogen-oxygen fuel cell, the overall reaction is`,
        2,
        ["fuel_cell", "overall_reaction", "clean_energy"],
        [
          L`$\mathrm{2H_2+O_2\rightarrow 2H_2O}$`,
          L`$\mathrm{2H_2O\rightarrow 2H_2+O_2}$`,
          L`$\mathrm{H_2+O_2\rightarrow H_2O_2}$`,
          L`$\mathrm{O_2+4e^-\rightarrow 2O^{2-}}$`,
        ],
        "A",
        {
          B: L`This is decomposition of water, not fuel-cell discharge.`,
          C: L`Hydrogen peroxide is not the overall product of the standard hydrogen-oxygen fuel cell.`,
          D: L`This is not the overall cell reaction and is not balanced with hydrogen.`,
        },
        [
          L`Hydrogen is the fuel and oxygen is the oxidant.`,
          L`The useful product is water.`,
          L`Balance hydrogen and oxygen atoms.`,
        ],
        [
          {
            step: 1,
            explanation: L`A hydrogen-oxygen fuel cell converts the reaction of hydrogen with oxygen into electrical energy.`,
            math: L`\mathrm{2H_2+O_2\rightarrow 2H_2O}`,
          },
        ],
      ),
      mc(
        L`In rusting of iron under neutral moist conditions, the anodic reaction is`,
        3,
        ["corrosion", "rusting", "anodic_reaction"],
        [
          L`$\mathrm{Fe\rightarrow Fe^{2+}+2e^-}$`,
          L`$\mathrm{O_2+2H_2O+4e^-\rightarrow 4OH^-}$`,
          L`$\mathrm{Fe^{2+}+2e^-\rightarrow Fe}$`,
          L`$\mathrm{2H_2O\rightarrow O_2+4H^++4e^-}$`,
        ],
        "A",
        {
          B: L`This is the common cathodic oxygen-reduction reaction in neutral moist corrosion.`,
          C: L`This is reduction of iron ions, not oxidation of iron metal.`,
          D: L`This is not the anodic iron-dissolution step in rusting.`,
        },
        [
          L`At the anode, oxidation occurs.`,
          L`Iron metal is oxidised to ferrous ions.`,
          L`Write electrons on the product side.`,
        ],
        [
          {
            step: 1,
            explanation: L`Rusting begins with oxidation of iron at anodic regions.`,
            math: L`\mathrm{Fe\rightarrow Fe^{2+}+2e^-}`,
          },
        ],
      ),
      mc(
        L`Galvanisation protects iron mainly because zinc`,
        3,
        ["corrosion_protection", "galvanisation", "sacrificial_anode"],
        [
          L`forms a more noble cathode than iron`,
          L`acts as a sacrificial anode and is oxidised preferentially`,
          L`prevents oxygen from ever touching the surface even if scratched`,
          L`converts iron into stainless steel`,
        ],
        "B",
        {
          A: L`Zinc is less noble than iron and is oxidised preferentially.`,
          C: L`Barrier protection helps, but sacrificial protection is the key reason zinc still protects when scratched.`,
          D: L`Galvanisation coats iron with zinc; it does not make stainless steel.`,
        },
        [
          L`Compare zinc and iron tendency to oxidise.`,
          L`Zinc has a more negative reduction potential than iron.`,
          L`The metal oxidised preferentially protects iron.`,
        ],
        [
          {
            step: 1,
            explanation: L`Zinc is more easily oxidised than iron, so it acts as a sacrificial anode and protects iron from corrosion.`,
          },
        ],
      ),
    ],
    constructed: [
      frq(
        "vsaq",
        L`Why is a dry cell called a primary cell?`,
        1,
        ["primary_cell", "dry_cell", "conceptual_recall"],
        parts([["a", L`Give the reason.`, 1]]),
        [
          L`Primary cells are not designed for recharging.`,
          L`Their discharge reaction is not conveniently reversible.`,
          L`Use this to explain the dry cell.`,
        ],
        [
          {
            part: "a",
            explanation: L`A dry cell is called a primary cell because its cell reaction is not practically reversible, so it cannot be efficiently recharged after discharge.`,
          },
        ],
        [
          L`Saying primary means it gives the highest voltage.`,
          L`Confusing a dry cell with a lead storage battery.`,
        ],
      ),
      frq(
        "saq",
        L`Write the overall reaction for a hydrogen-oxygen fuel cell and state one advantage of fuel cells over thermal combustion engines.`,
        2,
        ["fuel_cell", "overall_reaction", "application"],
        parts([
          ["a", L`Write the overall reaction.`, 1],
          ["b", L`State one advantage.`, 1],
        ]),
        [
          L`Hydrogen reacts with oxygen to form water.`,
          L`Fuel cells convert chemical energy directly into electrical energy.`,
          L`Direct conversion avoids much of the heat-loss pathway of combustion engines.`,
        ],
        [
          {
            part: "a",
            explanation: L`The overall reaction is`,
            math: L`\mathrm{2H_2+O_2\rightarrow 2H_2O}`,
          },
          {
            part: "b",
            explanation: L`One advantage is higher efficiency because chemical energy is converted directly into electrical energy. Another acceptable advantage is that water is the main product in a hydrogen-oxygen fuel cell.`,
          },
        ],
        [
          L`Writing water decomposition instead of fuel-cell discharge.`,
          L`Stating only that fuel cells are modern without a chemical advantage.`,
        ],
      ),
      frq(
        "saq",
        L`Explain how cathodic protection prevents corrosion of an underground iron pipeline.`,
        2,
        ["cathodic_protection", "corrosion", "sacrificial_anode"],
        parts([["a", L`Explain the method.`, 2]]),
        [
          L`Iron is protected by forcing it to behave as cathode.`,
          L`A more reactive metal such as magnesium or zinc is attached.`,
          L`The attached metal oxidises preferentially.`,
        ],
        [
          {
            part: "a",
            explanation: L`In cathodic protection, iron is connected to a more reactive metal such as magnesium or zinc. The attached metal acts as a sacrificial anode and is oxidised, while the iron pipeline remains cathodic and is protected from oxidation.`,
          },
        ],
        [
          L`Saying iron is protected by making it the anode.`,
          L`Choosing copper as a sacrificial anode for iron.`,
        ],
      ),
      frq(
        "laq",
        L`For a lead storage battery during discharge, the electrode reactions may be represented as follows: at one electrode $\mathrm{Pb+SO_4^{2-}\rightarrow PbSO_4+2e^-}$ and at the other $\mathrm{PbO_2+SO_4^{2-}+4H^++2e^-\rightarrow PbSO_4+2H_2O}$.`,
        3,
        ["lead_storage_battery", "secondary_cell", "electrode_reactions"],
        parts([
          ["a", L`Identify the anode reaction.`, 1],
          ["b", L`Identify the cathode reaction.`, 1],
          ["c", L`Write the overall discharge reaction.`, 1],
          [
            "d",
            L`State what happens to acid concentration during discharge.`,
            1,
          ],
        ]),
        [
          L`Anode means oxidation and electrons appear on product side.`,
          L`Cathode means reduction and electrons appear on reactant side.`,
          L`Add the two reactions and cancel electrons.`,
        ],
        [
          {
            part: "a",
            explanation: L`The anode reaction is oxidation of lead.`,
            math: L`\mathrm{Pb+SO_4^{2-}\rightarrow PbSO_4+2e^-}`,
          },
          {
            part: "b",
            explanation: L`The cathode reaction is reduction of lead dioxide.`,
            math: L`\mathrm{PbO_2+SO_4^{2-}+4H^++2e^-\rightarrow PbSO_4+2H_2O}`,
          },
          {
            part: "c",
            explanation: L`Adding the two half-reactions gives the overall discharge reaction.`,
            math: L`\mathrm{Pb+PbO_2+2H_2SO_4\rightarrow 2PbSO_4+2H_2O}`,
          },
          {
            part: "d",
            explanation: L`Sulphuric acid is consumed during discharge, so acid concentration and density decrease.`,
          },
        ],
        [
          L`Calling the electron-producing reaction the cathode reaction.`,
          L`Forgetting that sulphuric acid is consumed during discharge.`,
        ],
      ),
      frq(
        "case",
        L`A painted iron gate develops a scratch. After rainwater remains on the scratched region, rusting begins near the exposed iron. Zinc coating on another gate continues to protect iron even when a small scratch appears.`,
        3,
        ["case_based", "corrosion", "galvanisation", "rusting"],
        parts([
          ["a", L`Write the anodic reaction for rusting of iron.`, 1],
          [
            "b",
            L`Write the cathodic oxygen-reduction reaction in neutral medium.`,
            1,
          ],
          [
            "c",
            L`Explain why zinc coating protects scratched iron better than ordinary paint.`,
            1,
          ],
          ["d", L`Name the protection principle involved in zinc coating.`, 1],
        ]),
        [
          L`Rusting is electrochemical corrosion.`,
          L`Iron is oxidised at anodic regions.`,
          L`Zinc is oxidised preferentially because it is more reactive than iron.`,
        ],
        [
          {
            part: "a",
            explanation: L`At anodic regions, iron dissolves as ferrous ions.`,
            math: L`\mathrm{Fe\rightarrow Fe^{2+}+2e^-}`,
          },
          {
            part: "b",
            explanation: L`In neutral moist conditions, oxygen is reduced at cathodic regions.`,
            math: L`\mathrm{O_2+2H_2O+4e^-\rightarrow 4OH^-}`,
          },
          {
            part: "c",
            explanation: L`Ordinary paint mainly gives barrier protection and fails locally when scratched. Zinc also provides sacrificial protection because zinc oxidises preferentially and protects iron.`,
          },
          {
            part: "d",
            explanation: L`The principle is sacrificial anodic protection, also called cathodic protection of iron.`,
          },
        ],
        [
          L`Writing the oxygen-reduction reaction as the anodic reaction.`,
          L`Saying zinc protects only by blocking air, ignoring sacrificial protection.`,
        ],
      ),
    ],
  },
];

export const electrochemistryTopics: Topic[] = topicSeeds.map(makeTopic);
