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
const UNIT = "u4-chemical-bonding-molecular-structure";
const VERSION = "0.1.4";
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

function hintLadder(items: readonly [string, string, string]): Hint[] {
  return items.map((body, index) => ({
    level: (index + 1) as Hint["level"],
    body: repairInlineLatex(body),
  }));
}

function repairInlineLatex(text: string): string {
  return text.replace(/\$[^$]*\$/g, (segment) =>
    segment
      .replace(/\t(?=imes|ext)/g, "\\t")
      .replace(/\r(?=ightarrow|ightleftharpoons)/g, "\\r")
      .replace(/\f(?=rac)/g, "\\f")
      .replace(/,mathrm/g, "\\,\\mathrm")
      .replace(
        /(^|[^\\])\b(mathrm|text|frac|Delta|sigma|pi|mu|circ|rightarrow|rightleftharpoons|approx)\b/g,
        "$1\\$2",
      ),
  );
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
  return `You chose ${choiceText}. Recheck the bonding model, electron count, shape, or orbital picture before choosing.${checkStep} The correct choice is ${correctText}.`;
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
        : "incorrect_cbse_class11_chemistry_bonding_reasoning",
    };
  });

  const choices = unletteredChoices.map((choice, choiceIndex) => ({
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
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_a_formula_without_checking_electron_pairs_or_orbital_occupancy",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter: choices.find((choice) => choice.isCorrect)?.letter ?? "A",
    hintLadder: hintLadder(seed.hints),
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
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_the_final_bond_type_or_shape_without_supporting_electron_pair_reasoning",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: seed.parts.map(repairPart),
    hintLadder: hintLadder(seed.hints),
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

function singleRubric(
  part: string,
  points: number,
  description: string,
): FrqRubric {
  return { maxPoints: points, criteria: [{ part, points, description }] };
}

const ionicTransferFigure: ItemFigure = {
  type: "svg",
  title: "Electron transfer between magnesium and oxygen",
  description:
    "A magnesium atom with two valence electrons transfers them to an oxygen atom with six valence electrons.",
  svg: `<svg viewBox="0 0 680 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="330" fill="#ffffff"/>
  <text x="340" y="32" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Kossel-Lewis electron transfer</text>
  <circle cx="125" cy="165" r="58" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <text x="125" y="174" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#1d4ed8">Mg</text>
  <circle cx="93" cy="113" r="6" fill="#1d4ed8"/>
  <circle cx="157" cy="217" r="6" fill="#1d4ed8"/>
  <circle cx="555" cy="165" r="58" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <text x="555" y="174" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="#991b1b">O</text>
  <g fill="#991b1b">
    <circle cx="523" cy="123" r="5"/><circle cx="514" cy="165" r="5"/><circle cx="523" cy="207" r="5"/>
    <circle cx="555" cy="112" r="5"/><circle cx="555" cy="218" r="5"/><circle cx="597" cy="165" r="5"/>
  </g>
  <path d="M180 128 C280 68 400 68 500 128" fill="none" stroke="#475569" stroke-width="3" marker-end="url(#arrow)"/>
  <path d="M180 202 C280 262 400 262 500 202" fill="none" stroke="#475569" stroke-width="3" marker-end="url(#arrow)"/>
  <text x="340" y="118" text-anchor="middle" font-family="Arial" font-size="15" fill="#334155">two electrons transferred</text>
  <text x="125" y="282" text-anchor="middle" font-family="Arial" font-size="16" fill="#1d4ed8">forms Mg<tspan baseline-shift="super" font-size="12">2+</tspan></text>
  <text x="555" y="282" text-anchor="middle" font-family="Arial" font-size="16" fill="#991b1b">forms O<tspan baseline-shift="super" font-size="12">2-</tspan></text>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#475569"/>
    </marker>
  </defs>
</svg>`,
};

const vseprShapesFigure: ItemFigure = {
  type: "svg",
  title: "Three electron-pair arrangements",
  description:
    "Three central atoms with different spatial arrangements of attached atoms.",
  svg: `<svg viewBox="0 0 720 340" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="340" fill="#ffffff"/>
  <text x="360" y="32" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Molecular shape cards</text>
  <g font-family="Arial" stroke="#334155" stroke-width="3" fill="none">
    <rect x="42" y="68" width="190" height="220" rx="8" stroke="#cbd5e1" fill="#f8fafc"/>
    <text x="137" y="96" text-anchor="middle" font-size="18" fill="#111827" stroke="none">I</text>
    <circle cx="137" cy="178" r="22" fill="#dbeafe" stroke="#2563eb"/>
    <text x="137" y="185" text-anchor="middle" font-size="18" fill="#1d4ed8" stroke="none">X</text>
    <line x1="137" y1="156" x2="137" y2="112"/><line x1="137" y1="200" x2="137" y2="244"/>
    <circle cx="137" cy="112" r="13" fill="#fee2e2" stroke="#dc2626"/><circle cx="137" cy="244" r="13" fill="#fee2e2" stroke="#dc2626"/>
    <rect x="265" y="68" width="190" height="220" rx="8" stroke="#cbd5e1" fill="#f8fafc"/>
    <text x="360" y="96" text-anchor="middle" font-size="18" fill="#111827" stroke="none">II</text>
    <circle cx="360" cy="178" r="22" fill="#dbeafe" stroke="#2563eb"/>
    <text x="360" y="185" text-anchor="middle" font-size="18" fill="#1d4ed8" stroke="none">X</text>
    <line x1="360" y1="156" x2="360" y2="116"/><line x1="342" y1="190" x2="305" y2="225"/><line x1="378" y1="190" x2="415" y2="225"/>
    <circle cx="360" cy="116" r="13" fill="#fee2e2" stroke="#dc2626"/><circle cx="305" cy="225" r="13" fill="#fee2e2" stroke="#dc2626"/><circle cx="415" cy="225" r="13" fill="#fee2e2" stroke="#dc2626"/>
    <rect x="488" y="68" width="190" height="220" rx="8" stroke="#cbd5e1" fill="#f8fafc"/>
    <text x="583" y="96" text-anchor="middle" font-size="18" fill="#111827" stroke="none">III</text>
    <circle cx="583" cy="178" r="22" fill="#dbeafe" stroke="#2563eb"/>
    <text x="583" y="185" text-anchor="middle" font-size="18" fill="#1d4ed8" stroke="none">X</text>
    <line x1="583" y1="156" x2="583" y2="118"/>
    <line x1="563" y1="184" x2="523" y2="202"/>
    <line x1="603" y1="184" x2="643" y2="202" stroke-dasharray="6 5"/>
    <path d="M573 194 L552 242 L592 210 Z" fill="#94a3b8" stroke="none"/>
    <line x1="583" y1="178" x2="573" y2="194"/>
    <circle cx="583" cy="118" r="13" fill="#fee2e2" stroke="#dc2626"/><circle cx="523" cy="202" r="13" fill="#fee2e2" stroke="#dc2626"/><circle cx="643" cy="202" r="13" fill="#fee2e2" stroke="#dc2626"/><circle cx="552" cy="242" r="13" fill="#fee2e2" stroke="#dc2626"/>
  </g>
</svg>`,
};

const sigmaPiOverlapFigure: ItemFigure = {
  type: "svg",
  title: "End-on and sidewise orbital overlap",
  description:
    "Two sketches compare end-on overlap along the internuclear axis with sidewise overlap above and below the axis.",
  svg: `<svg viewBox="0 0 720 340" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="340" fill="#ffffff"/>
  <text x="360" y="32" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Orbital overlap comparison</text>
  <line x1="70" y1="170" x2="310" y2="170" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 5"/>
  <ellipse cx="150" cy="170" rx="52" ry="24" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <ellipse cx="230" cy="170" rx="52" ry="24" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <text x="190" y="250" text-anchor="middle" font-family="Arial" font-size="16" fill="#1e3a8a">end-on overlap</text>
  <line x1="410" y1="170" x2="650" y2="170" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 5"/>
  <ellipse cx="490" cy="118" rx="32" ry="52" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <ellipse cx="570" cy="118" rx="32" ry="52" fill="#fecaca" stroke="#dc2626" stroke-width="3"/>
  <ellipse cx="490" cy="222" rx="32" ry="52" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <ellipse cx="570" cy="222" rx="32" ry="52" fill="#fecaca" stroke="#dc2626" stroke-width="3"/>
  <text x="530" y="292" text-anchor="middle" font-family="Arial" font-size="16" fill="#7f1d1d">sidewise overlap</text>
</svg>`,
};

const moOxygenFigure: ItemFigure = {
  type: "svg",
  title: "Valence molecular orbital filling for oxygen",
  description:
    "A simplified molecular orbital energy-level diagram for oxygen with valence electrons marked by arrows.",
  svg: `<svg viewBox="0 0 620 430" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="430" fill="#ffffff"/>
  <text x="310" y="30" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Simplified O2 valence MO filling</text>
  <line x1="130" y1="365" x2="490" y2="365" stroke="#334155" stroke-width="2"/>
  <text x="82" y="368" font-family="Arial" font-size="13" fill="#475569">low</text>
  <text x="78" y="72" font-family="Arial" font-size="13" fill="#475569">high</text>
  <g stroke="#334155" stroke-width="3">
    <line x1="230" y1="325" x2="390" y2="325"/><line x1="230" y1="285" x2="390" y2="285"/>
    <line x1="230" y1="225" x2="390" y2="225"/>
    <line x1="210" y1="165" x2="300" y2="165"/><line x1="320" y1="165" x2="410" y2="165"/>
    <line x1="210" y1="105" x2="300" y2="105"/><line x1="320" y1="105" x2="410" y2="105"/>
  </g>
  <g font-family="Arial" font-size="14" fill="#111827">
    <text x="405" y="330">sigma 2s</text>
    <text x="405" y="290">sigma* 2s</text>
    <text x="405" y="230">sigma 2p</text>
    <text x="418" y="170">pi 2p</text>
    <text x="418" y="110">pi* 2p</text>
  </g>
  <g font-family="Arial" font-size="22" fill="#2563eb">
    <text x="270" y="326">&#8593;&#8595;</text><text x="270" y="286">&#8593;&#8595;</text>
    <text x="270" y="226">&#8593;&#8595;</text>
    <text x="240" y="166">&#8593;&#8595;</text><text x="350" y="166">&#8593;&#8595;</text>
    <text x="245" y="106">&#8593;</text><text x="355" y="106">&#8593;</text>
  </g>
</svg>`,
};

const hydrogenBondFigure: ItemFigure = {
  type: "svg",
  title: "Dotted interaction between water molecules",
  description:
    "Two water molecules are shown with a dotted interaction from hydrogen of one molecule to oxygen of another.",
  svg: `<svg viewBox="0 0 640 320" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="320" fill="#ffffff"/>
  <text x="320" y="32" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="#111827">Dotted interaction between water molecules</text>
  <g font-family="Arial" font-size="18" font-weight="700">
    <circle cx="195" cy="170" r="32" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
    <text x="195" y="177" text-anchor="middle" fill="#991b1b">O</text>
    <circle cx="125" cy="132" r="22" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
    <text x="125" y="139" text-anchor="middle" fill="#1d4ed8">H</text>
    <circle cx="125" cy="208" r="22" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
    <text x="125" y="215" text-anchor="middle" fill="#1d4ed8">H</text>
    <line x1="168" y1="158" x2="142" y2="143" stroke="#334155" stroke-width="3"/>
    <line x1="168" y1="182" x2="142" y2="197" stroke="#334155" stroke-width="3"/>
    <circle cx="445" cy="170" r="32" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
    <text x="445" y="177" text-anchor="middle" fill="#991b1b">O</text>
    <circle cx="515" cy="132" r="22" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
    <text x="515" y="139" text-anchor="middle" fill="#1d4ed8">H</text>
    <circle cx="515" cy="208" r="22" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/>
    <text x="515" y="215" text-anchor="middle" fill="#1d4ed8">H</text>
    <line x1="472" y1="158" x2="498" y2="143" stroke="#334155" stroke-width="3"/>
    <line x1="472" y1="182" x2="498" y2="197" stroke="#334155" stroke-width="3"/>
  </g>
  <line x1="217" y1="170" x2="413" y2="170" stroke="#7c3aed" stroke-width="4" stroke-dasharray="8 8"/>
  <text x="320" y="205" text-anchor="middle" font-family="Arial" font-size="15" fill="#5b21b6">intermolecular attraction</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "4.1",
    title: "Kossel-Lewis Approach and Ionic Bonding",
    subtopic:
      "Octet idea, Lewis symbols, electron transfer, ionic or electrovalent bond formation and lattice-based reasoning",
    mc: [
      {
        questionLatex: L`A metal atom has outer configuration $3s^2$ and a non-metal atom needs two electrons to complete its octet. The most reasonable formula of the ionic compound is`,
        difficulty: 2,
        skillTags: ["ionic_formula", "octet_rule", "electron_transfer"],
        choices: [L`$MX$`, L`$M_2X$`, L`$MX_2$`, L`$M_2X_3$`],
        correctLetter: "A",
        rationales: {
          B: "This would give two $M^{2+}$ ions for one $X^{2-}$ ion, so charge would not balance.",
          C: "This would overbalance the charge with two $X^{2-}$ ions.",
          D: "The charges here are not $3+$ and $2-$.",
        },
        hints: [
          "The metal with $ns^2$ tends to form $M^{2+}$.",
          "The non-metal needing two electrons tends to form $X^{2-}$.",
          "Balance $2+$ and $2-$ in the simplest ratio.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The metal loses two electrons and the non-metal gains two electrons.",
            math: L`M\rightarrow M^{2+},\quad X+2e^-\rightarrow X^{2-}`,
          },
          {
            step: 2,
            explanation:
              "The charges balance in a 1:1 ratio, so the formula is $MX$.",
          },
        ],
      },
      {
        questionLatex: L`The figure shows electron transfer between magnesium and oxygen. The most accurate conclusion is that the solid is held mainly by`,
        figure: ionicTransferFigure,
        difficulty: 2,
        skillTags: ["ionic_bond", "kossel_lewis", "electron_transfer"],
        choices: [
          "a shared electron pair between two neutral atoms",
          "electrostatic attraction between oppositely charged ions",
          "overlap of half-filled orbitals only",
          "hydrogen bonds between molecules",
        ],
        correctLetter: "B",
        rationales: {
          A: "Shared electron pairs describe covalent bonding, not the electron-transfer picture shown.",
          C: "Orbital overlap is the valence-bond picture for covalent bonds.",
          D: "Hydrogen bonding needs H attached to N, O or F; this is not that situation.",
        },
        hints: [
          "Magnesium loses electrons; oxygen gains them.",
          "The species formed are ions.",
          "Ionic solids are held by electrostatic forces between ions.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Electron transfer forms $\\mathrm{Mg^{2+}}$ and $\\mathrm{O^{2-}}$.",
          },
          {
            step: 2,
            explanation:
              "The ionic bond is the electrostatic attraction between these oppositely charged ions.",
          },
        ],
      },
      {
        questionLatex: L`Which Lewis symbol correctly represents a neutral atom of oxygen in its valence shell?`,
        difficulty: 1,
        skillTags: ["lewis_symbol", "valence_electrons"],
        choices: [
          "O with two valence dots",
          "O with four valence dots",
          "O with six valence dots",
          "O with eight valence dots",
        ],
        correctLetter: "C",
        rationales: {
          A: "Oxygen is in group 16, so it has six valence electrons, not two.",
          B: "Four valence dots would fit group 14 elements.",
          D: "Eight dots represent a completed octet, not the neutral oxygen atom's starting valence shell.",
        },
        hints: [
          "Oxygen is a group 16 element.",
          "For main-group elements, group 16 corresponds to six valence electrons.",
          "A Lewis symbol shows valence electrons as dots.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Oxygen has valence configuration $2s^2 2p^4$, so it has six valence electrons.",
          },
          {
            step: 2,
            explanation: "Therefore its Lewis symbol has six dots.",
          },
        ],
      },
      {
        questionLatex: L`Calcium forms an ionic compound with fluorine. Which electron-transfer statement is consistent with the formula $\mathrm{CaF_2}$?`,
        difficulty: 3,
        skillTags: ["ionic_formula", "charge_balance", "electron_transfer"],
        choices: [
          "calcium gains one electron from each fluorine atom",
          "calcium and fluorine share two electron pairs equally",
          "calcium loses two electrons and each fluorine gains one electron",
          "each fluorine loses one electron to calcium",
        ],
        correctLetter: "C",
        rationales: {
          A: "Calcium is a group 2 metal and forms $\\mathrm{Ca^{2+}}$ by losing electrons.",
          B: "$\\mathrm{CaF_2}$ is primarily ionic, not equal covalent sharing.",
          D: "Fluorine is highly electronegative and gains one electron to form $\\mathrm{F^-}$.",
        },
        hints: [
          "Calcium is group 2.",
          "Fluorine is group 17.",
          "One calcium atom supplies one electron to each of two fluorine atoms.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Calcium loses two electrons to form $\\mathrm{Ca^{2+}}$.",
          },
          {
            step: 2,
            explanation:
              "Each fluorine gains one electron to form $\\mathrm{F^-}$, giving $\\mathrm{CaF_2}$.",
          },
        ],
      },
      {
        questionLatex: L`A student says an isolated $\mathrm{Na^+Cl^-}$ pair is the full picture of sodium chloride. Which correction is best?`,
        difficulty: 4,
        skillTags: ["ionic_lattice", "ionic_bonding_model"],
        choices: [
          "In solid sodium chloride, each ion is part of an extended lattice of oppositely charged ions.",
          "Sodium chloride is made of independent covalent molecules.",
          "The chloride ion becomes neutral inside the crystal.",
          "Only one sodium ion attracts only one chloride ion in the solid.",
        ],
        correctLetter: "A",
        rationales: {
          B: "Sodium chloride is not a molecular covalent solid.",
          C: "Ions retain their charges in the ionic lattice.",
          D: "An ion in an ionic lattice interacts with several surrounding oppositely charged ions.",
        },
        hints: [
          "Think of a crystal, not a single molecule.",
          "Ionic bonding is non-directional electrostatic attraction.",
          "The solid consists of an extended lattice.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "An ionic solid is not best represented as isolated molecules.",
          },
          {
            step: 2,
            explanation:
              "Sodium chloride is an extended lattice of $\\mathrm{Na^+}$ and $\\mathrm{Cl^-}$ ions held by electrostatic attraction.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`State one limitation of the octet rule.`,
        difficulty: 2,
        skillTags: ["octet_rule", "limitations"],
        parts: singlePart("a", "Give one clear limitation.", 2),
        hints: [
          "Think of molecules that do not have eight electrons around the central atom.",
          "Electron-deficient and expanded-octet cases are common limitations.",
          "One example with a reason is enough.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "States a valid limitation, such as electron-deficient molecules, odd-electron molecules, or expanded octets.",
        ),
        commonErrors: ["Saying the octet rule never works."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "One limitation is that some molecules are electron deficient; for example, boron in $\\mathrm{BF_3}$ has only six electrons around it.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Use Kossel-Lewis reasoning to explain the formation of $\mathrm{MgO}$.`,
        difficulty: 3,
        skillTags: ["ionic_bond", "electron_transfer", "lewis_reasoning"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the ions formed by Mg and O.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Explain why the formula is $\\mathrm{MgO}$.",
            points: 2,
          },
        ],
        hints: [
          "Magnesium has two valence electrons.",
          "Oxygen needs two electrons to complete its octet.",
          "Balance the charges of the ions formed.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Identifies $\\mathrm{Mg^{2+}}$ and $\\mathrm{O^{2-}}$.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Explains 1:1 charge balance and electrostatic attraction.",
            },
          ],
        },
        commonErrors: [
          "Writing $\\mathrm{Mg_2O}$ by counting only valence electrons.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Magnesium loses two electrons to form $\\mathrm{Mg^{2+}}$; oxygen gains two electrons to form $\\mathrm{O^{2-}}$.",
          },
          {
            part: "b",
            explanation:
              "The charges $2+$ and $2-$ balance in a 1:1 ratio, so the formula is $\\mathrm{MgO}$. The ions are held by electrostatic attraction.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Compare ionic bonding and covalent bonding in terms of electron involvement and directionality.`,
        difficulty: 3,
        skillTags: ["ionic_vs_covalent", "bonding_models"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "State how electrons are involved in each bond type.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "State which bond type is more directional and why.",
            points: 2,
          },
        ],
        hints: [
          "Ionic bonding involves transfer and ion formation.",
          "Covalent bonding involves sharing and orbital overlap.",
          "Orbital overlap has direction in space.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Compares transfer/ion formation with sharing of electron pair.",
            },
            {
              part: "b",
              points: 2,
              description:
                "States covalent bonds are directional due to orbital overlap.",
            },
          ],
        },
        commonErrors: ["Calling ionic bonds shared electron-pair bonds."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "In ionic bonding, electrons are transferred to form oppositely charged ions. In covalent bonding, atoms share one or more electron pairs.",
          },
          {
            part: "b",
            explanation:
              "Covalent bonding is more directional because it depends on overlap of particular orbitals in space. Ionic attraction is largely non-directional electrostatic attraction in a lattice.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A compound is formed between element $A$ with valence configuration $3s^1$ and element $B$ with valence configuration $3s^2\,3p^5$.`,
        difficulty: 4,
        skillTags: ["configuration_to_bonding", "ionic_formula", "octet"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Predict the ions formed.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Write the formula of the compound.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Explain the bond formation using the octet idea.",
            points: 2,
          },
        ],
        hints: [
          "$3s^1$ is an alkali-metal pattern.",
          "$3s^2 3p^5$ needs one electron for an octet.",
          "Balance the resulting charges.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 2, description: "Gives $A^+$ and $B^-$." },
            { part: "b", points: 1, description: "Gives $AB$." },
            {
              part: "c",
              points: 2,
              description:
                "Explains transfer of one electron and attainment of stable octets.",
            },
          ],
        },
        commonErrors: ["Writing $AB_2$ by confusing group 17 with charge 2-."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$A$ loses its one $3s$ electron to form $A^+$. $B$ gains one electron to complete $3s^2 3p^6$ and forms $B^-$.",
          },
          { part: "b", explanation: "The formula is $AB$." },
          {
            part: "c",
            explanation:
              "The electron transfer gives both species noble-gas-like outer shells, and the resulting ions attract electrostatically.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student compares three solids: sodium chloride, diamond and solid iodine. The student calls all of them ionic because all are solids at room temperature.`,
        difficulty: 4,
        skillTags: [
          "case_based",
          "bonding_classification",
          "structure_property",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Identify the bonding/structural type of sodium chloride.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Identify the bonding/structural type of diamond.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain why being solid is not enough evidence for ionic bonding.",
            points: 2,
          },
        ],
        hints: [
          "Sodium chloride contains ions.",
          "Diamond is a giant covalent network.",
          "Physical state alone does not identify bonding type.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "NaCl is ionic." },
            {
              part: "b",
              points: 2,
              description: "Diamond is a giant covalent/network solid.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Explains different bonding/forces can still give solids.",
            },
          ],
        },
        commonErrors: ["Using only physical state to infer ionic bonding."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Sodium chloride is an ionic solid made of $\\mathrm{Na^+}$ and $\\mathrm{Cl^-}$ ions.",
          },
          {
            part: "b",
            explanation:
              "Diamond is a giant covalent network in which carbon atoms are covalently bonded in a three-dimensional structure.",
          },
          {
            part: "c",
            explanation:
              "A solid can be ionic, covalent network, molecular or metallic. Therefore, physical state alone cannot prove ionic bonding.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.2",
    title: "Covalent Bonding, Lewis Structures and Bond Parameters",
    subtopic:
      "Shared electron pairs, Lewis structures, resonance, bond length, bond enthalpy, bond angle and dipole moment",
    mc: [
      {
        questionLatex: L`In the Lewis structure of $\mathrm{CO_2}$ that satisfies octets with zero formal charge on carbon, the number of double bonds around carbon is`,
        difficulty: 3,
        skillTags: ["lewis_structure", "carbon_dioxide", "octet"],
        choices: [L`$0$`, L`$1$`, L`$2$`, L`$3$`],
        correctLetter: "C",
        rationales: {
          A: "With no double bonds, carbon cannot complete its octet in $\\mathrm{CO_2}$.",
          B: "One double bond leaves one side electron-deficient or charge-separated in the usual octet structure.",
          D: "Carbon cannot form three double bonds to two oxygen atoms in $\\mathrm{CO_2}$.",
        },
        hints: [
          "Carbon is central in $\\mathrm{CO_2}$.",
          "Each oxygen completes octet most simply by forming a double bond.",
          "The structure is $\\mathrm{O=C=O}$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The octet-satisfying Lewis structure is $\\mathrm{O=C=O}$.",
          },
          {
            step: 2,
            explanation: "Therefore carbon has two double bonds.",
          },
        ],
      },
      {
        questionLatex: L`Which comparison of carbon-carbon bond length is most reasonable?`,
        difficulty: 2,
        skillTags: ["bond_length", "bond_order"],
        choices: [
          L`$\mathrm{C-C} < \mathrm{C=C} < \mathrm{C\equiv C}$`,
          L`$\mathrm{C\equiv C} < \mathrm{C=C} < \mathrm{C-C}$`,
          L`$\mathrm{C=C} < \mathrm{C-C} < \mathrm{C\equiv C}$`,
          "all three are equal because all are carbon-carbon bonds",
        ],
        correctLetter: "B",
        rationales: {
          A: "Higher bond order gives shorter bonds, so the triple bond should be shortest.",
          C: "A triple bond is shorter than a double bond.",
          D: "Bond length changes with bond order.",
        },
        hints: [
          "Bond order increases from single to double to triple.",
          "Greater bond order pulls nuclei closer.",
          "Triple is shortest; single is longest.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "As bond order increases, bond length generally decreases.",
          },
          {
            step: 2,
            explanation:
              "Thus $\\mathrm{C\\equiv C}<\\mathrm{C=C}<\\mathrm{C-C}$.",
          },
        ],
      },
      {
        questionLatex: L`The two $\mathrm{O-O}$ bonds in ozone are experimentally equal and intermediate between single and double bond lengths. The best explanation is`,
        difficulty: 4,
        skillTags: ["resonance", "ozone", "bond_parameters"],
        choices: [
          "rapid breaking and forming of two separate molecules",
          "one bond is always single and the other is always double",
          "resonance delocalises the bonding over the two oxygen-oxygen links",
          "ozone contains only ionic bonds",
        ],
        correctLetter: "C",
        rationales: {
          A: "Resonance does not mean different molecules are rapidly interconverting.",
          B: "That would predict unequal bond lengths, contrary to the observation.",
          D: "Ozone is a covalent molecule.",
        },
        hints: [
          "Equal intermediate bonds are a resonance clue.",
          "The actual molecule is not a single Lewis form.",
          "The bonding is delocalised.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Ozone has resonance structures with single and double bonds interchanged.",
          },
          {
            step: 2,
            explanation:
              "The real structure is a resonance hybrid, so both $\\mathrm{O-O}$ bonds are equal and intermediate.",
          },
        ],
      },
      {
        questionLatex: L`$\mathrm{CO_2}$ has polar $\mathrm{C=O}$ bonds but zero net dipole moment mainly because`,
        difficulty: 3,
        skillTags: ["dipole_moment", "molecular_shape", "carbon_dioxide"],
        choices: [
          "carbon and oxygen have identical electronegativity",
          "the molecule is linear and the two bond dipoles cancel",
          "double bonds can never be polar",
          "oxygen has no lone pairs in carbon dioxide",
        ],
        correctLetter: "B",
        rationales: {
          A: "Carbon and oxygen do not have identical electronegativity.",
          C: "A double bond can be polar when atoms differ in electronegativity.",
          D: "Each oxygen has lone pairs; the key point is molecular symmetry.",
        },
        hints: [
          "A molecule's dipole is a vector sum.",
          "$\\mathrm{CO_2}$ is linear.",
          "Equal and opposite bond dipoles cancel.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$\\mathrm{CO_2}$ is linear, with two equal $\\mathrm{C=O}$ bond dipoles in opposite directions.",
          },
          {
            step: 2,
            explanation: "The vector sum is zero.",
            math: L`\mu_{\text{net}}=0`,
          },
        ],
      },
      {
        questionLatex: L`Which set gives the correct number of lone pairs on the central atom in $\mathrm{NH_3}$ and $\mathrm{H_2O}$ respectively?`,
        difficulty: 3,
        skillTags: ["lone_pairs", "lewis_structure", "vsepr_connection"],
        choices: [L`$0,\ 1$`, L`$1,\ 2$`, L`$2,\ 1$`, L`$3,\ 2$`],
        correctLetter: "B",
        rationales: {
          A: "Nitrogen in ammonia retains one lone pair.",
          C: "The numbers are reversed.",
          D: "Nitrogen in ammonia does not have three lone pairs after forming three N-H bonds.",
        },
        hints: [
          "Nitrogen has five valence electrons and forms three bonds in $\\mathrm{NH_3}$.",
          "Oxygen has six valence electrons and forms two bonds in $\\mathrm{H_2O}$.",
          "Remaining electron pairs on the central atom are lone pairs.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In $\\mathrm{NH_3}$, nitrogen forms three bonds and has one lone pair.",
          },
          {
            step: 2,
            explanation:
              "In $\\mathrm{H_2O}$, oxygen forms two bonds and has two lone pairs.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Define bond enthalpy.`,
        difficulty: 1,
        skillTags: ["bond_enthalpy", "bond_parameters"],
        parts: singlePart("a", "Give the definition.", 2),
        hints: [
          "It is an energy term.",
          "It refers to breaking bonds.",
          "Mention gaseous state for the standard definition.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "Defines bond enthalpy as enthalpy needed to break one mole of specified bonds in gaseous molecules.",
        ),
        commonErrors: [
          "Defining it as energy released on forming one molecule only.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Bond enthalpy is the enthalpy required to break one mole of a specified type of bond in gaseous molecules.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Draw the Lewis structure of $\mathrm{NH_3}$ in words and use it to predict the number of bond pairs and lone pairs around nitrogen.`,
        difficulty: 3,
        skillTags: ["lewis_structure", "ammonia", "bond_pair_lone_pair"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State the bonding arrangement around nitrogen.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Give the number of bond pairs and lone pairs on nitrogen.",
            points: 2,
          },
        ],
        hints: [
          "Nitrogen has five valence electrons.",
          "Each N-H bond uses one electron from nitrogen.",
          "Two electrons remain as one lone pair.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "States N bonded to three H atoms by single bonds.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Gives three bond pairs and one lone pair on nitrogen.",
            },
          ],
        },
        commonErrors: [
          "Counting all N-H bond electrons as nitrogen lone pairs.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Nitrogen is the central atom and forms three single $\\mathrm{N-H}$ bonds.",
          },
          {
            part: "b",
            explanation:
              "Around nitrogen there are three bond pairs and one lone pair.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Explain why $\mathrm{H_2O}$ has a smaller bond angle than $\mathrm{NH_3}$.`,
        difficulty: 4,
        skillTags: ["bond_angle", "lone_pair_repulsion", "vsepr"],
        parts: singlePart("a", "Give the VSEPR explanation.", 4),
        hints: [
          "Both have four electron-pair domains around the central atom.",
          "$\\mathrm{H_2O}$ has two lone pairs; $\\mathrm{NH_3}$ has one.",
          "Lone pair-lone pair repulsion is stronger than lone pair-bond pair repulsion.",
        ],
        rubric: singleRubric(
          "a",
          4,
          "Compares lone-pair counts and explains stronger lone-pair repulsions compress the H-O-H angle more.",
        ),
        commonErrors: [
          "Saying oxygen is larger, without using electron-pair repulsion.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Both molecules have approximately tetrahedral electron-pair arrangement. $\\mathrm{NH_3}$ has one lone pair, while $\\mathrm{H_2O}$ has two. Since lone-pair repulsions are stronger than bond-pair repulsions, two lone pairs in water compress the bond angle more.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`For $\mathrm{CO_2}$ and $\mathrm{SO_2}$, compare Lewis-structure based shape and dipole moment.`,
        difficulty: 5,
        skillTags: ["lewis_structure", "dipole_moment", "shape_comparison"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "State the shape of $\\mathrm{CO_2}$ and its net dipole.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "State the shape of $\\mathrm{SO_2}$ and its net dipole.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain why polar bonds do not automatically mean a polar molecule.",
            points: 1,
          },
        ],
        hints: [
          "Carbon dioxide has two electron domains around carbon.",
          "Sulfur dioxide has a lone pair on sulfur in the usual VSEPR picture.",
          "Dipole moment depends on vector cancellation.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "$\\mathrm{CO_2}$ linear and non-polar.",
            },
            {
              part: "b",
              points: 2,
              description: "$\\mathrm{SO_2}$ bent and polar.",
            },
            {
              part: "c",
              points: 1,
              description: "Mentions vector cancellation/symmetry.",
            },
          ],
        },
        commonErrors: [
          "Calling every molecule with polar bonds polar without checking geometry.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\mathrm{CO_2}$ is linear. The two equal $\\mathrm{C=O}$ bond dipoles are opposite, so the net dipole is zero.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{SO_2}$ is bent because of electron-pair arrangement around sulfur. Its bond dipoles do not cancel, so it has a net dipole moment.",
          },
          {
            part: "c",
            explanation:
              "Molecular polarity depends on the vector sum of bond dipoles, not only on whether individual bonds are polar.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A laboratory note says: "Molecule P has equal bonds intermediate between single and double bonds. Molecule Q has polar bonds but no net dipole moment."`,
        difficulty: 4,
        skillTags: ["case_based", "resonance", "dipole_moment"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "What bonding idea explains the equal intermediate bonds in P?",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "What geometrical idea can explain zero dipole in Q?",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Give one example of Q.",
            points: 1,
          },
        ],
        hints: [
          "Intermediate equal bond lengths often point to resonance.",
          "Dipole moment is a vector sum.",
          "$\\mathrm{CO_2}$ is a standard linear example.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Identifies resonance/delocalisation.",
            },
            {
              part: "b",
              points: 2,
              description: "Explains cancellation due to symmetrical geometry.",
            },
            {
              part: "c",
              points: 1,
              description: "Gives $\\mathrm{CO_2}$ or another valid example.",
            },
          ],
        },
        commonErrors: [
          "Treating resonance as rapid flipping of separate molecules.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Equal intermediate bonds are explained by resonance: the actual structure is a delocalised resonance hybrid.",
          },
          {
            part: "b",
            explanation:
              "If the molecule is symmetrical, equal bond dipoles can cancel even when each bond is polar.",
          },
          { part: "c", explanation: "$\\mathrm{CO_2}$ is one such example." },
        ],
      },
    ],
  },
  {
    topicCode: "4.3",
    title: "VSEPR Theory and Molecular Shapes",
    subtopic:
      "Electron-pair repulsion, molecular geometry, lone-pair effects and shape prediction",
    mc: [
      {
        questionLatex: L`In VSEPR theory, the shape of $\mathrm{NH_3}$ is trigonal pyramidal rather than trigonal planar because nitrogen has`,
        difficulty: 3,
        skillTags: ["vsepr", "ammonia_shape", "lone_pair"],
        choices: [
          "three lone pairs and no bond pairs",
          "one lone pair and three bond pairs",
          "three double bonds",
          "no lone pair and three bond pairs",
        ],
        correctLetter: "B",
        rationales: {
          A: "Ammonia has three N-H bonds, so it has bond pairs.",
          C: "The N-H bonds in ammonia are single bonds.",
          D: "With no lone pair and three bond pairs, a trigonal planar shape would be expected.",
        },
        hints: [
          "Count valence electrons on nitrogen.",
          "Nitrogen forms three N-H bonds.",
          "One lone pair remains on nitrogen.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Nitrogen has three bond pairs and one lone pair.",
          },
          {
            step: 2,
            explanation:
              "The electron-pair arrangement is tetrahedral, but the molecular shape is trigonal pyramidal.",
          },
        ],
      },
      {
        questionLatex: L`Which card in the figure best represents a tetrahedral molecule of type $\mathrm{AX_4}$?`,
        figure: vseprShapesFigure,
        difficulty: 2,
        skillTags: ["vsepr_shape", "tetrahedral"],
        choices: ["I", "II", "III", "none of these"],
        correctLetter: "C",
        rationales: {
          A: "Card I shows two atoms arranged linearly around the central atom.",
          B: "Card II shows three surrounding atoms in one trigonal arrangement.",
          D: "Card III shows four surrounding atoms around the central atom.",
        },
        hints: [
          "$\\mathrm{AX_4}$ has four bonded atoms around the central atom.",
          "A tetrahedral sketch shows four surrounding positions.",
          "Look for the card with four attached atoms.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$\\mathrm{AX_4}$ has four bond pairs and no lone pair on the central atom.",
          },
          {
            step: 2,
            explanation: "Card III shows four surrounding atoms.",
          },
        ],
      },
      {
        questionLatex: L`The shape of $\mathrm{BF_3}$ according to VSEPR theory is`,
        difficulty: 2,
        skillTags: ["vsepr", "bf3", "trigonal_planar"],
        choices: [
          "tetrahedral",
          "linear",
          "trigonal planar",
          "trigonal pyramidal",
        ],
        correctLetter: "C",
        rationales: {
          A: "$\\mathrm{BF_3}$ has three bonding domains, not four.",
          B: "A linear shape would fit two electron domains.",
          D: "Trigonal pyramidal would require one lone pair on the central atom in addition to three bonds.",
        },
        hints: [
          "Boron is bonded to three fluorine atoms.",
          "There is no lone pair on boron in the usual $\\mathrm{BF_3}$ structure.",
          "Three electron domains give trigonal planar geometry.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Boron has three bond pairs and no lone pair.",
          },
          {
            step: 2,
            explanation:
              "Three electron domains arrange trigonal planar, so $\\mathrm{BF_3}$ is trigonal planar.",
          },
        ],
      },
      {
        questionLatex: L`Which ordering of repulsion strength is used in VSEPR theory?`,
        difficulty: 3,
        skillTags: ["vsepr_repulsion", "lone_pair_effect"],
        choices: [
          "bond pair-bond pair $>$ lone pair-bond pair $>$ lone pair-lone pair",
          "lone pair-lone pair $>$ lone pair-bond pair $>$ bond pair-bond pair",
          "lone pair-bond pair $>$ lone pair-lone pair $>$ bond pair-bond pair",
          "all repulsions are exactly equal",
        ],
        correctLetter: "B",
        rationales: {
          A: "Lone pairs occupy more space and repel more strongly than bond pairs.",
          C: "Lone pair-lone pair repulsion is stronger than lone pair-bond pair repulsion.",
          D: "VSEPR shape changes depend on unequal repulsions.",
        },
        hints: [
          "Lone pairs are closer to the central atom.",
          "More localised electron density repels more strongly.",
          "Start with lone pair-lone pair as the strongest.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The repulsion order is lone pair-lone pair greater than lone pair-bond pair greater than bond pair-bond pair.",
            math: L`lp-lp>lp-bp>bp-bp`,
          },
        ],
      },
      {
        questionLatex: L`A molecule has five electron pairs around the central atom, all of them bond pairs. Its expected geometry is`,
        difficulty: 3,
        skillTags: ["vsepr", "trigonal_bipyramidal", "electron_domains"],
        choices: ["tetrahedral", "octahedral", "trigonal bipyramidal", "bent"],
        correctLetter: "C",
        rationales: {
          A: "Tetrahedral geometry corresponds to four electron pairs.",
          B: "Octahedral geometry corresponds to six electron pairs.",
          D: "Bent geometry needs lone pairs and usually two bonded atoms.",
        },
        hints: [
          "Count electron-pair domains.",
          "Five domains arrange as trigonal bipyramidal.",
          "No lone pairs means the molecular shape matches the electron-pair geometry.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Five bond pairs and no lone pairs give trigonal bipyramidal geometry.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Name the molecular shape of $\mathrm{CH_4}$ according to VSEPR theory.`,
        difficulty: 1,
        skillTags: ["vsepr", "methane_shape"],
        parts: singlePart("a", "Give the shape.", 1),
        hints: [
          "Carbon is bonded to four hydrogen atoms.",
          "There are four bond pairs and no lone pair on carbon.",
          "Four equivalent bond pairs give a tetrahedral shape.",
        ],
        rubric: singleRubric("a", 1, "States tetrahedral."),
        commonErrors: [
          "Calling methane square planar because four atoms are attached.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\mathrm{CH_4}$ has four bond pairs and no lone pair on carbon, so its shape is tetrahedral.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Predict the shapes of $\mathrm{BeCl_2}$ and $\mathrm{BF_3}$ using VSEPR theory.`,
        difficulty: 3,
        skillTags: ["vsepr", "linear", "trigonal_planar"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Give the shape of $\\mathrm{BeCl_2}$ with reason.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Give the shape of $\\mathrm{BF_3}$ with reason.",
            points: 2,
          },
        ],
        hints: [
          "Count electron domains around the central atom.",
          "$\\mathrm{BeCl_2}$ has two bonding domains around Be.",
          "$\\mathrm{BF_3}$ has three bonding domains around B.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "$\\mathrm{BeCl_2}$ linear with two bond pairs.",
            },
            {
              part: "b",
              points: 2,
              description:
                "$\\mathrm{BF_3}$ trigonal planar with three bond pairs.",
            },
          ],
        },
        commonErrors: [
          "Adding lone pairs on the central atom without counting valence electrons.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\mathrm{BeCl_2}$ has two bond pairs around Be and no lone pair, so it is linear.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{BF_3}$ has three bond pairs around B and no lone pair, so it is trigonal planar.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Use VSEPR theory to explain why $\mathrm{NH_3}$ is not planar.`,
        difficulty: 3,
        skillTags: ["ammonia_shape", "vsepr_lone_pair"],
        parts: singlePart("a", "Explain using electron-pair arrangement.", 4),
        hints: [
          "Nitrogen has one lone pair.",
          "Four electron domains arrange tetrahedrally.",
          "Ignoring the lone pair gives the molecular shape.",
        ],
        rubric: singleRubric(
          "a",
          4,
          "Explains three bond pairs plus one lone pair, tetrahedral electron arrangement, and trigonal pyramidal molecular shape.",
        ),
        commonErrors: [
          "Drawing nitrogen and three hydrogens in a flat triangle without considering the lone pair.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Nitrogen in $\\mathrm{NH_3}$ has three bond pairs and one lone pair. Four electron domains arrange approximately tetrahedrally. Since one position is occupied by a lone pair, the observed molecular shape is trigonal pyramidal, not planar.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Compare $\mathrm{CH_4}$, $\mathrm{NH_3}$ and $\mathrm{H_2O}$ in terms of electron-pair arrangement, molecular shape and bond-angle change.`,
        difficulty: 5,
        skillTags: ["vsepr_synthesis", "bond_angle", "lone_pair_repulsion"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "State the electron-pair arrangement common to all three.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Give the molecular shape of each.",
            points: 3,
          },
          {
            letter: "c",
            promptMarkdown: "Explain the order of bond angles.",
            points: 2,
          },
        ],
        hints: [
          "Each central atom has four electron-pair domains.",
          "The number of lone pairs increases from methane to ammonia to water.",
          "More lone pairs compress bond angles more.",
        ],
        rubric: {
          maxPoints: 6,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Tetrahedral electron-pair arrangement.",
            },
            {
              part: "b",
              points: 3,
              description: "CH4 tetrahedral, NH3 trigonal pyramidal, H2O bent.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Explains $\\mathrm{CH_4} > \\mathrm{NH_3} > \\mathrm{H_2O}$ bond angle due to increasing lone pairs.",
            },
          ],
        },
        commonErrors: [
          "Treating electron-pair geometry and molecular shape as always identical.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "All three have four electron-pair domains around the central atom, so the electron-pair arrangement is tetrahedral.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{CH_4}$ is tetrahedral, $\\mathrm{NH_3}$ is trigonal pyramidal, and $\\mathrm{H_2O}$ is bent.",
          },
          {
            part: "c",
            explanation:
              "Lone-pair repulsions compress bond angles. Methane has no lone pair, ammonia has one, and water has two; hence the angle decreases in the order $\\mathrm{CH_4} > \\mathrm{NH_3} > \\mathrm{H_2O}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A worksheet gives three molecules: P has two bond pairs and no lone pair on the central atom; Q has three bond pairs and no lone pair; R has two bond pairs and two lone pairs.`,
        difficulty: 4,
        skillTags: ["case_based", "vsepr_prediction"],
        parts: [
          { letter: "a", promptMarkdown: "Predict the shape of P.", points: 1 },
          { letter: "b", promptMarkdown: "Predict the shape of Q.", points: 1 },
          {
            letter: "c",
            promptMarkdown:
              "Predict the shape of R and explain why it is not linear.",
            points: 3,
          },
        ],
        hints: [
          "Two bond pairs alone give a linear shape.",
          "Three bond pairs alone give trigonal planar shape.",
          "Two lone pairs strongly repel the bond pairs in R.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "P is linear." },
            { part: "b", points: 1, description: "Q is trigonal planar." },
            {
              part: "c",
              points: 3,
              description:
                "R is bent and explanation uses two lone pairs/tetrahedral electron arrangement.",
            },
          ],
        },
        commonErrors: [
          "Predicting R as linear because it has two bonded atoms.",
        ],
        workedSolution: [
          { part: "a", explanation: "P is linear." },
          { part: "b", explanation: "Q is trigonal planar." },
          {
            part: "c",
            explanation:
              "R has four electron domains: two bond pairs and two lone pairs. The electron-pair arrangement is tetrahedral, but the molecular shape is bent because two positions are occupied by lone pairs.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.4",
    title: "Valence Bond Theory, Hybridisation, Sigma and Pi Bonds",
    subtopic:
      "Orbital overlap, directional covalent bonds, hybrid orbitals and sigma/pi bond counting",
    mc: [
      {
        questionLatex: L`In valence bond theory, a covalent bond is formed mainly by`,
        difficulty: 2,
        skillTags: ["valence_bond_theory", "orbital_overlap"],
        choices: [
          "complete transfer of electrons from one atom to another",
          "overlap of half-filled atomic orbitals with pairing of electrons",
          "repulsion between two nuclei without electron density between them",
          "formation of only ions in a lattice",
        ],
        correctLetter: "B",
        rationales: {
          A: "Complete electron transfer describes ionic bonding.",
          C: "A bond requires stabilising electron density between nuclei.",
          D: "Ions in a lattice describe ionic solids, not VBT covalent bonding.",
        },
        hints: [
          "Valence bond theory is an orbital-overlap model.",
          "The overlapping orbitals contain unpaired electrons.",
          "The electrons pair with opposite spins in the bond.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In VBT, half-filled atomic orbitals overlap and their electrons pair.",
          },
          {
            step: 2,
            explanation:
              "Greater effective overlap generally gives a stronger covalent bond.",
          },
        ],
      },
      {
        questionLatex: L`Which molecule has an $sp^3$ hybridised central atom with no lone pair?`,
        difficulty: 2,
        skillTags: ["hybridisation", "sp3", "methane"],
        choices: [
          L`$\mathrm{BF_3}$`,
          L`$\mathrm{CH_4}$`,
          L`$\mathrm{CO_2}$`,
          L`$\mathrm{NH_3}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "$\\mathrm{BF_3}$ is $sp^2$ around boron.",
          C: "$\\mathrm{CO_2}$ is linear with $sp$ hybridised carbon.",
          D: "$\\mathrm{NH_3}$ has $sp^3$ electron arrangement but one lone pair.",
        },
        hints: [
          "$sp^3$ corresponds to four electron domains.",
          "No lone pair with four bonds gives methane-type tetrahedral geometry.",
          "Carbon in $\\mathrm{CH_4}$ forms four sigma bonds.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Carbon in $\\mathrm{CH_4}$ has four equivalent sigma bonds and no lone pair.",
          },
          {
            step: 2,
            explanation: "It is $sp^3$ hybridised.",
          },
        ],
      },
      {
        questionLatex: L`The sidewise overlap shown in the figure corresponds to formation of a`,
        figure: sigmaPiOverlapFigure,
        difficulty: 3,
        skillTags: ["pi_bond", "orbital_overlap"],
        choices: ["sigma bond", "pi bond", "ionic bond", "hydrogen bond"],
        correctLetter: "B",
        rationales: {
          A: "A sigma bond results from end-on overlap along the internuclear axis.",
          C: "Ionic bonding involves electrostatic attraction after electron transfer.",
          D: "Hydrogen bonding is an intermolecular or intramolecular attraction involving H attached to a highly electronegative atom.",
        },
        hints: [
          "Compare end-on and sidewise overlap.",
          "The electron density is above and below the internuclear axis.",
          "That is characteristic of a pi bond.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Sidewise overlap of parallel p orbitals gives a pi bond.",
          },
        ],
      },
      {
        questionLatex: L`The number of sigma and pi bonds in ethene, $\mathrm{C_2H_4}$, is respectively`,
        difficulty: 4,
        skillTags: ["sigma_pi_counting", "ethene"],
        choices: [L`$4,\ 2$`, L`$5,\ 1$`, L`$6,\ 0$`, L`$3,\ 2$`],
        correctLetter: "B",
        rationales: {
          A: "There are four C-H sigma bonds plus one C-C sigma bond.",
          C: "The C=C double bond includes one pi bond.",
          D: "This undercounts the four C-H sigma bonds.",
        },
        hints: [
          "Each single bond is one sigma bond.",
          "A double bond contains one sigma and one pi bond.",
          "Ethene has four C-H bonds and one C=C bond.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Four C-H bonds contribute four sigma bonds.",
          },
          {
            step: 2,
            explanation:
              "The C=C bond contributes one sigma and one pi bond, so total is five sigma and one pi.",
            math: L`\sigma=4+1=5,\quad \pi=1`,
          },
        ],
      },
      {
        questionLatex: L`A central atom has steric number $2$ in a molecule. The hybridisation expected in the usual hybridisation model is`,
        difficulty: 3,
        skillTags: ["hybridisation", "steric_number"],
        choices: [L`$sp$`, L`$sp^2$`, L`$sp^3$`, L`$sp^3d$`],
        correctLetter: "A",
        rationales: {
          B: "$sp^2$ corresponds to steric number 3.",
          C: "$sp^3$ corresponds to steric number 4.",
          D: "$sp^3d$ corresponds to steric number 5.",
        },
        hints: [
          "Steric number counts sigma bonds plus lone pairs.",
          "Two electron domains arrange linearly.",
          "Linear two-domain hybridisation is $sp$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Steric number 2 corresponds to two hybrid orbitals.",
          },
          { step: 2, explanation: "The hybridisation is $sp$." },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What type of orbital overlap gives a sigma bond?`,
        difficulty: 1,
        skillTags: ["sigma_bond", "orbital_overlap"],
        parts: singlePart("a", "Answer in one sentence.", 1),
        hints: [
          "Think about the internuclear axis.",
          "Sigma overlap is head-on.",
          "The electron density lies along the internuclear axis.",
        ],
        rubric: singleRubric(
          "a",
          1,
          "States head-on/end-on overlap along the internuclear axis.",
        ),
        commonErrors: ["Calling sidewise p-p overlap a sigma bond."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "A sigma bond is formed by end-on overlap of orbitals along the internuclear axis.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For $\mathrm{C_2H_2}$, find the number of sigma and pi bonds.`,
        difficulty: 3,
        skillTags: ["sigma_pi_counting", "ethyne"],
        parts: singlePart("a", "Show the count.", 3),
        hints: [
          "The structure is $\\mathrm{H-C\\equiv C-H}$.",
          "A triple bond contains one sigma and two pi bonds.",
          "Each C-H bond is sigma.",
        ],
        rubric: singleRubric(
          "a",
          3,
          "Counts two C-H sigma bonds, one C-C sigma bond, and two pi bonds; gives 3 sigma and 2 pi.",
        ),
        commonErrors: ["Counting a triple bond as three sigma bonds."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\mathrm{C_2H_2}$ has two C-H sigma bonds. The C$\\equiv$C bond has one sigma and two pi bonds. Therefore it has 3 sigma bonds and 2 pi bonds.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Explain the hybridisation and shape of the central atom in $\mathrm{BF_3}$.`,
        difficulty: 3,
        skillTags: ["hybridisation", "bf3", "shape"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State the hybridisation.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State the shape and reason.",
            points: 3,
          },
        ],
        hints: [
          "Boron forms three sigma bonds to fluorine.",
          "There is no lone pair on boron in the usual structure.",
          "Three electron domains correspond to $sp^2$ and trigonal planar shape.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "$sp^2$." },
            {
              part: "b",
              points: 3,
              description:
                "Trigonal planar, explained using three electron domains/three sigma bonds and no lone pair.",
            },
          ],
        },
        commonErrors: [
          "Calling $\\mathrm{BF_3}$ tetrahedral because it has four atoms total.",
        ],
        workedSolution: [
          { part: "a", explanation: "The boron atom is $sp^2$ hybridised." },
          {
            part: "b",
            explanation:
              "Boron forms three sigma bonds and has no lone pair, so the three electron domains arrange in a trigonal planar shape.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Compare the bonding descriptions of ethane, ethene and ethyne using hybridisation and sigma/pi bonds.`,
        difficulty: 5,
        skillTags: [
          "hybridisation_synthesis",
          "sigma_pi_bonds",
          "multiple_bonds",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State the carbon hybridisation in each molecule.",
            points: 3,
          },
          {
            letter: "b",
            promptMarkdown:
              "State the sigma/pi composition of the C-C bond in each molecule.",
            points: 3,
          },
        ],
        hints: [
          "Single, double and triple bonds correspond to different hybridisations.",
          "Every C-C bond has one sigma component.",
          "Additional components in multiple bonds are pi bonds.",
        ],
        rubric: {
          maxPoints: 6,
          criteria: [
            {
              part: "a",
              points: 3,
              description: "Ethane $sp^3$, ethene $sp^2$, ethyne $sp$.",
            },
            {
              part: "b",
              points: 3,
              description:
                "C-C single: 1 sigma; C=C: 1 sigma + 1 pi; C triple bond C: 1 sigma + 2 pi.",
            },
          ],
        },
        commonErrors: ["Saying a double bond contains two sigma bonds."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Carbon is $sp^3$ in ethane, $sp^2$ in ethene and $sp$ in ethyne.",
          },
          {
            part: "b",
            explanation:
              "The C-C bond in ethane is one sigma bond. The C=C bond in ethene is one sigma and one pi bond. The C$\\equiv$C bond in ethyne is one sigma and two pi bonds.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student draws two overlaps. In sketch P, orbitals overlap end-on along the internuclear axis. In sketch Q, parallel p orbitals overlap sidewise above and below the internuclear axis.`,
        difficulty: 4,
        skillTags: ["case_based", "sigma_pi_overlap", "vbt"],
        figure: sigmaPiOverlapFigure,
        parts: [
          {
            letter: "a",
            promptMarkdown: "Identify the bond type in P.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Identify the bond type in Q.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain why a pi bond usually appears along with a sigma bond in a double bond.",
            points: 3,
          },
        ],
        hints: [
          "End-on overlap gives sigma.",
          "Sidewise overlap gives pi.",
          "The first overlap between two atoms is along the internuclear axis.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "P is sigma." },
            { part: "b", points: 1, description: "Q is pi." },
            {
              part: "c",
              points: 3,
              description:
                "Explains sigma framework plus additional sidewise overlap for pi bond in multiple bonding.",
            },
          ],
        },
        commonErrors: ["Calling a double bond two independent sigma bonds."],
        workedSolution: [
          { part: "a", explanation: "P is a sigma bond." },
          { part: "b", explanation: "Q is a pi bond." },
          {
            part: "c",
            explanation:
              "A sigma bond forms by end-on overlap along the internuclear axis and gives the main bond framework. In a double bond, the second bond is formed by sidewise overlap of parallel p orbitals, giving one pi bond in addition to the sigma bond.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "4.5",
    title: "Molecular Orbital Theory and Hydrogen Bonding",
    subtopic:
      "Bond order, magnetic character of homonuclear diatomic molecules and inter-/intramolecular hydrogen bonding",
    mc: [
      {
        questionLatex: L`In molecular orbital theory, the bond order is calculated as`,
        difficulty: 2,
        skillTags: ["molecular_orbital_theory", "bond_order_formula"],
        choices: [
          L`$\frac{N_b-N_a}{2}$`,
          L`$N_b+N_a$`,
          L`$\frac{N_a-N_b}{2}$`,
          L`$2(N_b-N_a)$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Adding bonding and antibonding electrons gives total electrons, not bond order.",
          C: "This reverses bonding and antibonding electrons.",
          D: "Bond order uses half the difference, not twice the difference.",
        },
        hints: [
          "$N_b$ is the number of electrons in bonding molecular orbitals.",
          "$N_a$ is the number in antibonding molecular orbitals.",
          "Bond order is half the excess bonding occupancy.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Bond order is half the difference between bonding and antibonding electrons.",
            math: L`\text{bond order}=\frac{N_b-N_a}{2}`,
          },
        ],
      },
      {
        questionLatex: L`The molecular orbital diagram shown for $\mathrm{O_2}$ predicts that oxygen is`,
        figure: moOxygenFigure,
        difficulty: 4,
        skillTags: ["oxygen_mo", "paramagnetism", "molecular_orbital_theory"],
        choices: [
          "diamagnetic with bond order 1",
          "paramagnetic with bond order 2",
          "diamagnetic with bond order 3",
          "paramagnetic with bond order 0",
        ],
        correctLetter: "B",
        rationales: {
          A: "The diagram shows unpaired electrons, so oxygen is not diamagnetic.",
          C: "$\\mathrm{O_2}$ has two unpaired electrons in antibonding orbitals and bond order 2, not 3.",
          D: "The molecule is stable with bond order 2, not zero.",
        },
        hints: [
          "Look for unpaired electrons.",
          "Unpaired electrons imply paramagnetism.",
          "For $\\mathrm{O_2}$, bond order is 2.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The two unpaired electrons in antibonding pi orbitals make $\\mathrm{O_2}$ paramagnetic.",
          },
          {
            step: 2,
            explanation:
              "The bond order of $\\mathrm{O_2}$ is 2 in the MO description.",
          },
        ],
      },
      {
        questionLatex: L`According to molecular orbital theory, $\mathrm{He_2}$ is not stable because its bond order is`,
        difficulty: 3,
        skillTags: ["he2", "bond_order", "molecular_orbital_theory"],
        choices: [L`$0$`, L`$1$`, L`$2$`, L`$3$`],
        correctLetter: "A",
        rationales: {
          B: "For $\\mathrm{He_2}$, bonding and antibonding electrons cancel.",
          C: "A bond order of 2 would indicate a stable double bond-like situation, not helium dimer instability.",
          D: "There are not enough electrons for such a bond order.",
        },
        hints: [
          "$\\mathrm{He_2}$ has four electrons.",
          "Two fill bonding $\\sigma 1s$ and two fill antibonding $\\sigma^*1s$.",
          "Use $\\frac{N_b-N_a}{2}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "For $\\mathrm{He_2}$, $N_b=2$ and $N_a=2$.",
            math: L`\text{bond order}=\frac{2-2}{2}=0`,
          },
          {
            step: 2,
            explanation: "Zero bond order means no net bond stability.",
          },
        ],
      },
      {
        questionLatex: L`The dotted interaction in the water figure is best classified as`,
        figure: hydrogenBondFigure,
        difficulty: 2,
        skillTags: ["hydrogen_bonding", "water"],
        choices: [
          "a covalent O-H bond inside one water molecule",
          "a metallic bond",
          "a hydrogen bond between molecules",
          "an ionic bond formed by electron transfer",
        ],
        correctLetter: "C",
        rationales: {
          A: "The dotted line is between two molecules, not the covalent O-H bond within one molecule.",
          B: "Water does not show metallic bonding.",
          D: "No electron transfer to form ions is shown.",
        },
        hints: [
          "The dotted line connects two different water molecules.",
          "Hydrogen is attached to oxygen, a highly electronegative atom.",
          "This is intermolecular hydrogen bonding.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A hydrogen atom bonded to oxygen in one molecule is attracted to oxygen of another molecule.",
          },
          {
            step: 2,
            explanation: "This is an intermolecular hydrogen bond.",
          },
        ],
      },
      {
        questionLatex: L`Which substance is expected to show significant intermolecular hydrogen bonding in the liquid state?`,
        difficulty: 3,
        skillTags: ["hydrogen_bonding", "intermolecular_forces"],
        choices: [
          L`$\mathrm{CH_4}$`,
          L`$\mathrm{H_2S}$`,
          L`$\mathrm{HCl}$`,
          L`$\mathrm{NH_3}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "C-H bonds do not normally give strong hydrogen bonding of the NCERT type.",
          B: "Sulfur is not electronegative enough for strong hydrogen bonding compared with N, O or F.",
          C: "Hydrogen bonding is strongest and classically expected when H is attached to N, O or F.",
        },
        hints: [
          "Look for hydrogen bonded to a highly electronegative small atom.",
          "N, O and F are the standard atoms for strong hydrogen bonding.",
          "$\\mathrm{NH_3}$ has N-H bonds and a lone pair on nitrogen.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$\\mathrm{NH_3}$ contains N-H bonds and lone pairs on nitrogen.",
          },
          {
            step: 2,
            explanation: "It can therefore form intermolecular hydrogen bonds.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What does a bond order of zero indicate in molecular orbital theory?`,
        difficulty: 2,
        skillTags: ["bond_order", "molecular_orbital_theory"],
        parts: singlePart("a", "Give the implication.", 2),
        hints: [
          "Bonding and antibonding effects cancel.",
          "There is no net stabilisation.",
          "Such a species is not expected to be stable as a molecule.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "States that zero bond order means no net bond and the molecule is not stable under ordinary bonding description.",
        ),
        commonErrors: ["Saying zero bond order means a weak single bond."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "A bond order of zero means bonding and antibonding occupancies cancel, so there is no net covalent bond and the molecule is not expected to be stable.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Use molecular orbital theory to compare $\mathrm{H_2}$ and $\mathrm{He_2}$ in terms of bond order and stability.`,
        difficulty: 4,
        skillTags: ["h2_he2", "bond_order", "stability"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Calculate bond order of $\\mathrm{H_2}$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Calculate bond order of $\\mathrm{He_2}$ and state the stability conclusion.",
            points: 3,
          },
        ],
        hints: [
          "$\\mathrm{H_2}$ has two electrons in $\\sigma 1s$.",
          "$\\mathrm{He_2}$ has two electrons in $\\sigma 1s$ and two in $\\sigma^*1s$.",
          "Use $\\frac{N_b-N_a}{2}$.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "$\\mathrm{H_2}$ bond order 1.",
            },
            {
              part: "b",
              points: 3,
              description:
                "$\\mathrm{He_2}$ bond order 0 and hence not stable.",
            },
          ],
        },
        commonErrors: ["Using total electrons divided by two as bond order."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For $\\mathrm{H_2}$, $N_b=2$ and $N_a=0$, so bond order $=(2-0)/2=1$.",
          },
          {
            part: "b",
            explanation:
              "For $\\mathrm{He_2}$, $N_b=2$ and $N_a=2$, so bond order $=(2-2)/2=0$. Therefore $\\mathrm{He_2}$ is not stable in the ordinary MO picture.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Explain why $\mathrm{O_2}$ is paramagnetic according to molecular orbital theory.`,
        difficulty: 4,
        skillTags: ["oxygen_mo", "paramagnetism"],
        figure: moOxygenFigure,
        parts: singlePart("a", "Use the MO occupancy idea.", 4),
        hints: [
          "Paramagnetism requires unpaired electrons.",
          "Look at the antibonding pi orbitals in the diagram.",
          "$\\mathrm{O_2}$ has two unpaired electrons there.",
        ],
        rubric: singleRubric(
          "a",
          4,
          "States that O2 has two unpaired electrons in antibonding pi molecular orbitals, so it is paramagnetic.",
        ),
        commonErrors: [
          "Using Lewis structure only and predicting all electrons paired.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "In the MO diagram of $\\mathrm{O_2}$, the antibonding $\\pi^*2p$ orbitals contain two unpaired electrons. Species with unpaired electrons are paramagnetic, so $\\mathrm{O_2}$ is paramagnetic.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Hydrogen bonding affects physical properties. Use $\mathrm{H_2O}$, $\mathrm{NH_3}$ and $\mathrm{CH_4}$ to answer.`,
        difficulty: 5,
        skillTags: ["hydrogen_bonding", "property_reasoning", "comparison"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Which of the three can form intermolecular hydrogen bonds?",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Explain why $\\mathrm{CH_4}$ does not show such hydrogen bonding.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain qualitatively why hydrogen bonding raises boiling point.",
            points: 2,
          },
        ],
        hints: [
          "Hydrogen bonding needs H bonded to N, O or F.",
          "Methane has C-H bonds, not N-H/O-H/F-H bonds.",
          "Stronger intermolecular attraction requires more energy to separate molecules.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Identifies water and ammonia.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Explains carbon is not sufficiently electronegative/small for strong hydrogen bonding of this type.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Links stronger intermolecular attraction to more energy needed and higher boiling point.",
            },
          ],
        },
        commonErrors: [
          "Assuming every compound containing hydrogen forms hydrogen bonds.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\mathrm{H_2O}$ and $\\mathrm{NH_3}$ can form intermolecular hydrogen bonds because they have H bonded to O or N.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{CH_4}$ has C-H bonds; carbon is not sufficiently electronegative for the strong hydrogen bonding described here.",
          },
          {
            part: "c",
            explanation:
              "Hydrogen bonds add stronger intermolecular attraction. More energy is needed to separate molecules, so boiling point increases.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A learner uses molecular orbital theory for three species. Species P has $N_b=2$, $N_a=0$; species Q has $N_b=2$, $N_a=2$; species R has two unpaired electrons in antibonding orbitals.`,
        difficulty: 4,
        skillTags: ["case_based", "molecular_orbital_theory", "magnetism"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the bond order of P.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the bond order of Q and state whether it is expected to be stable.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "What magnetic behaviour is expected for R?",
            points: 2,
          },
        ],
        hints: [
          "Use $\\frac{N_b-N_a}{2}$.",
          "Zero bond order indicates no net bond.",
          "Unpaired electrons imply paramagnetism.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "P has bond order 1." },
            {
              part: "b",
              points: 2,
              description:
                "Q has bond order 0 and is not expected to be stable.",
            },
            {
              part: "c",
              points: 2,
              description: "R is paramagnetic due to unpaired electrons.",
            },
          ],
        },
        commonErrors: [
          "Calling a species diamagnetic just because it has an even total electron count.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "For P, bond order $=(2-0)/2=1$.",
          },
          {
            part: "b",
            explanation:
              "For Q, bond order $=(2-2)/2=0$. A zero bond order means no net bond, so Q is not expected to be stable.",
          },
          {
            part: "c",
            explanation: "R has unpaired electrons, so it is paramagnetic.",
          },
        ],
      },
    ],
  },
];

function extraMc(
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  choices: readonly [string, string, string, string],
  correctLetter: McLetter,
  rationales: Partial<Record<McLetter, string>>,
  hints: readonly [string, string, string],
  solutionText: string,
  solutionMath?: string,
): McSeed {
  return {
    questionLatex,
    difficulty,
    skillTags,
    choices,
    correctLetter,
    rationales,
    hints,
    solution: [
      {
        step: 1,
        explanation: solutionText,
        ...(solutionMath ? { math: solutionMath } : {}),
      },
    ],
  };
}

function extraFrq(
  responseType: ResponseType,
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  parts: readonly FrqPart[],
  hints: readonly [string, string, string],
  workedSolution: readonly FrqSolutionPart[],
  commonErrors: readonly string[],
): ConstructedSeed {
  return {
    responseType,
    questionLatex,
    difficulty,
    skillTags,
    parts,
    hints,
    rubric: {
      maxPoints: parts.reduce((total, part) => total + part.points, 0),
      criteria: parts.map((part) => ({
        part: part.letter,
        points: part.points,
        description: `Completes part ${part.letter} with correct bonding reasoning and notation.`,
      })),
    },
    commonErrors,
    workedSolution,
  };
}

const largeTopicExpansions: Record<
  string,
  { mc: readonly McSeed[]; constructed: readonly ConstructedSeed[] }
> = {
  "4.1": {
    mc: [
      extraMc(
        L`When magnesium forms $\mathrm{MgCl_2}$, the electron-transfer picture is best described as`,
        2,
        ["ionic_bond", "electron_transfer"],
        [
          L`Mg gains two electrons and each Cl loses one electron.`,
          L`Mg loses two electrons and two Cl atoms gain one electron each.`,
          L`Mg and Cl share one electron pair equally.`,
          L`Mg forms $\mathrm{Mg^-}$ and chlorine forms $\mathrm{Cl^+}$.`,
        ],
        "B",
        {
          A: "Magnesium is electropositive and loses electrons.",
          C: "Equal sharing describes a non-polar covalent bond, not the ionic model here.",
          D: "The ion charges are reversed.",
        },
        [
          "Magnesium is a group 2 metal.",
          "Each chlorine atom needs one electron.",
          "Charge balance gives one $\\mathrm{Mg^{2+}}$ and two $\\mathrm{Cl^-}$ ions.",
        ],
        L`Magnesium loses two valence electrons to form $\mathrm{Mg^{2+}}$; each chlorine atom gains one electron to form $\mathrm{Cl^-}$.`,
      ),
      extraMc(
        L`The formula of the ionic compound formed by $\mathrm{Al^{3+}}$ and $\mathrm{O^{2-}}$ is`,
        2,
        ["ionic_formula", "charge_balance"],
        [
          L`$\mathrm{AlO}$`,
          L`$\mathrm{Al_2O_3}$`,
          L`$\mathrm{Al_3O_2}$`,
          L`$\mathrm{AlO_2}$`,
        ],
        "B",
        {
          A: "The charges $+3$ and $-2$ do not cancel in a 1:1 ratio.",
          C: "This reverses the charge-balancing subscripts.",
          D: "This gives net negative charge.",
        },
        [
          "Total positive charge must equal total negative charge.",
          "LCM of 3 and 2 is 6.",
          "Use two aluminium ions and three oxide ions.",
        ],
        L`Two $\mathrm{Al^{3+}}$ ions give $+6$ and three $\mathrm{O^{2-}}$ ions give $-6$, so the formula is $\mathrm{Al_2O_3}$.`,
      ),
      extraMc(
        L`Among the following, the compound expected to have the greatest lattice enthalpy magnitude is`,
        4,
        ["lattice_enthalpy", "ionic_size_charge"],
        [
          L`$\mathrm{NaCl}$`,
          L`$\mathrm{MgO}$`,
          L`$\mathrm{KBr}$`,
          L`$\mathrm{RbI}$`,
        ],
        "B",
        {
          A: "NaCl has singly charged ions, so the attraction is weaker than in MgO.",
          C: "KBr has larger singly charged ions.",
          D: "RbI has large singly charged ions and weaker attraction.",
        },
        [
          "Lattice enthalpy increases with ionic charge.",
          "It also increases when ions are smaller.",
          "$\\mathrm{Mg^{2+}}$ and $\\mathrm{O^{2-}}$ give strong attraction.",
        ],
        L`$\mathrm{MgO}$ has doubly charged, relatively small ions, so its ionic attraction and lattice enthalpy magnitude are greatest in the list.`,
      ),
      extraMc(
        L`Solid sodium chloride does not conduct electricity, but molten sodium chloride does because`,
        2,
        ["ionic_properties", "conductivity"],
        [
          "electrons become free only in solid state",
          "ions are fixed in the solid but mobile in the melt",
          "covalent bonds appear on melting",
          "neutral molecules become metallic atoms",
        ],
        "B",
        {
          A: "Electrical conduction in molten ionic compounds is mainly due to mobile ions.",
          C: "Melting does not turn NaCl into a covalent molecule.",
          D: "It does not become a metal.",
        },
        [
          "Conductivity needs mobile charge carriers.",
          "In an ionic crystal, ions are locked in a lattice.",
          "In the molten state, ions can move.",
        ],
        "Molten sodium chloride conducts because its ions are free to move and carry charge.",
      ),
      extraMc(
        L`A high melting point of an ionic solid is mainly due to`,
        2,
        ["ionic_properties", "electrostatic_force"],
        [
          "weak van der Waals forces",
          "strong electrostatic attraction between oppositely charged ions",
          "free movement of electrons",
          "low coordination in every crystal",
        ],
        "B",
        {
          A: "Ionic solids are not held mainly by weak van der Waals forces.",
          C: "Free electrons are a metallic-bonding idea.",
          D: "Coordination alone is not the main reason.",
        },
        [
          "Melting separates particles from fixed lattice positions.",
          "Oppositely charged ions attract strongly.",
          "Large energy is needed to weaken the lattice.",
        ],
        "Strong electrostatic attraction in the ionic lattice requires high energy to overcome, so ionic solids often have high melting points.",
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`Explain the formation of $\mathrm{Na_2O}$ using electron transfer.`,
        3,
        ["ionic_bond", "electron_transfer"],
        [
          { letter: "a", promptMarkdown: "State the ions formed.", points: 2 },
          {
            letter: "b",
            promptMarkdown: "Explain why the formula is $\\mathrm{Na_2O}$.",
            points: 2,
          },
        ],
        [
          "Sodium loses one electron.",
          "Oxygen gains two electrons.",
          "Two sodium atoms are needed for one oxygen atom.",
        ],
        [
          {
            part: "a",
            explanation:
              "Each sodium atom forms $\\mathrm{Na^+}$ and oxygen forms $\\mathrm{O^{2-}}$.",
          },
          {
            part: "b",
            explanation:
              "Two $\\mathrm{Na^+}$ ions balance one $\\mathrm{O^{2-}}$ ion, so the formula is $\\mathrm{Na_2O}$.",
          },
        ],
        ["Writing $\\mathrm{NaO}$ without balancing charges."],
      ),
      extraFrq(
        "vsaq",
        L`Why are ionic compounds generally brittle?`,
        2,
        ["ionic_properties", "brittleness"],
        singlePart("a", "Give the lattice-level reason.", 2),
        [
          "Think of layers of ions.",
          "A shift can bring like charges beside each other.",
          "Like charges repel.",
        ],
        [
          {
            part: "a",
            explanation:
              "When layers in an ionic crystal are displaced, ions of like charge may come close. Strong repulsion then causes the crystal to split, so it is brittle.",
          },
        ],
        ["Saying brittleness is due only to hardness."],
      ),
      extraFrq(
        "saq",
        L`Compare $\mathrm{NaCl}$ and $\mathrm{MgO}$ with respect to lattice enthalpy magnitude.`,
        4,
        ["lattice_enthalpy", "ionic_charge_radius"],
        [
          {
            letter: "a",
            promptMarkdown: "Which has larger lattice enthalpy magnitude?",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Give two reasons.", points: 3 },
        ],
        [
          "Compare ionic charges first.",
          "Compare approximate ionic sizes next.",
          "Stronger charge attraction gives larger magnitude.",
        ],
        [
          {
            part: "a",
            explanation:
              "$\\mathrm{MgO}$ has the larger lattice enthalpy magnitude.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{Mg^{2+}}$ and $\\mathrm{O^{2-}}$ have higher charges than $\\mathrm{Na^+}$ and $\\mathrm{Cl^-}$, and the ions are relatively small, giving stronger electrostatic attraction.",
          },
        ],
        ["Using only formula mass to compare lattice enthalpy."],
      ),
      extraFrq(
        "laq",
        L`A metal M forms $\mathrm{M^{2+}}$ and a non-metal X forms $\mathrm{X^-}$. Predict the formula and two properties expected for the compound.`,
        4,
        ["ionic_formula", "ionic_properties"],
        [
          { letter: "a", promptMarkdown: "Write the formula.", points: 1 },
          { letter: "b", promptMarkdown: "State the type of bond.", points: 1 },
          {
            letter: "c",
            promptMarkdown: "State two expected physical properties.",
            points: 3,
          },
        ],
        [
          "Two $X^-$ ions balance one $M^{2+}$ ion.",
          "Metal plus non-metal usually forms ionic bonding.",
          "Think of melting point and conductivity.",
        ],
        [
          { part: "a", explanation: "The formula is $\\mathrm{MX_2}$." },
          {
            part: "b",
            explanation:
              "The bond is ionic, formed by electron transfer and electrostatic attraction.",
          },
          {
            part: "c",
            explanation:
              "It is expected to have high melting point and conduct electricity in molten or aqueous state, but not as a solid.",
          },
        ],
        [
          "Writing $\\mathrm{M_2X}$ by swapping charges in the wrong direction.",
        ],
      ),
      extraFrq(
        "case",
        L`Samples A and B are crystalline solids. A conducts electricity only when molten. B conducts in solid as well as molten state.`,
        4,
        ["case_based", "bond_type_from_properties"],
        [
          {
            letter: "a",
            promptMarkdown: "Which sample is more likely ionic?",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Give the reason.", points: 2 },
          {
            letter: "c",
            promptMarkdown: "What bonding type is suggested for B?",
            points: 2,
          },
        ],
        [
          "Ionic solids need mobile ions to conduct.",
          "Molten ionic compounds have mobile ions.",
          "Solid-state conduction suggests metallic bonding.",
        ],
        [
          { part: "a", explanation: "A is more likely ionic." },
          {
            part: "b",
            explanation:
              "It does not conduct as a solid because ions are fixed, but it conducts when molten because ions become mobile.",
          },
          {
            part: "c",
            explanation:
              "B suggests metallic bonding because conduction occurs even in the solid state.",
          },
        ],
        ["Assuming every crystalline solid has the same bonding."],
      ),
    ],
  },
  "4.2": {
    mc: [
      extraMc(
        L`The Lewis structure of $\mathrm{CO_2}$ is best represented as`,
        3,
        ["lewis_structure", "octet_rule"],
        [
          L`$\mathrm{O-C-O}$ with only single bonds`,
          L`$\mathrm{O=C=O}$`,
          L`$\mathrm{C=O-O}$ with carbon having six electrons`,
          L`$\mathrm{O\equiv C-O}$ as the normal structure`,
        ],
        "B",
        {
          A: "Single bonds leave carbon electron-deficient unless formal charges are introduced.",
          C: "This does not give the usual symmetric octet structure.",
          D: "The usual Lewis structure has two equivalent C=O double bonds.",
        },
        [
          "Count valence electrons: $4+6+6=16$.",
          "Carbon is central.",
          "Two double bonds complete octets without formal charge.",
        ],
        L`The standard Lewis structure of carbon dioxide is linear $\mathrm{O=C=O}$ with octets on all atoms.`,
      ),
      extraMc(
        L`In $\mathrm{NO_3^-}$, the three N-O bonds are experimentally equivalent mainly because of`,
        3,
        ["resonance", "bond_order"],
        [
          "coordinate bonding only",
          "resonance among equivalent structures",
          "complete transfer of all electrons to oxygen",
          "hydrogen bonding",
        ],
        "B",
        {
          A: "Coordinate-bond language does not explain equivalence of all three bonds here.",
          C: "Complete electron transfer is not the bonding model for nitrate.",
          D: "No hydrogen is present.",
        },
        [
          "One Lewis structure alone gives unequal single/double bonds.",
          "Equivalent canonical forms contribute.",
          "The actual ion is a resonance hybrid.",
        ],
        "Resonance delocalises the pi bonding over all three N-O links, so the observed bonds are equivalent.",
      ),
      extraMc(
        L`The formal charge on nitrogen in $\mathrm{NH_4^+}$ is`,
        3,
        ["formal_charge", "lewis_structure"],
        ["-1", "0", "+1", "+2"],
        "C",
        {
          A: "Nitrogen is not electron-rich in ammonium.",
          B: "A neutral formal charge would not account for the ion charge.",
          D: "Nitrogen does not lose two formal electrons in this structure.",
        },
        [
          "Use formal charge = valence electrons - nonbonding electrons - half bonding electrons.",
          "Nitrogen has four N-H bonds and no lone pair.",
          "$5-0-4=+1$.",
        ],
        L`For nitrogen in $\mathrm{NH_4^+}$, formal charge $=5-0-4=+1$.`,
      ),
      extraMc(
        L`The average bond order of each N-O bond in $\mathrm{NO_3^-}$ is`,
        4,
        ["resonance", "bond_order"],
        ["1", L`$\frac{4}{3}$`, L`$\frac{3}{2}$`, "2"],
        "B",
        {
          A: "There is one double-bond contribution spread over three bonds, so it is more than 1.",
          C: "$3/2$ is typical for some two-bond resonance cases, not nitrate.",
          D: "Each bond is not a pure double bond.",
        },
        [
          "In one canonical form, one N=O and two N-O bonds appear.",
          "Total bond order across three N-O links is $2+1+1=4$.",
          "Average is $4/3$.",
        ],
        L`Average N-O bond order in nitrate $=(2+1+1)/3=4/3$.`,
      ),
      extraMc(
        L`The species that is an exception to the octet rule because the central atom has an incomplete octet is`,
        3,
        ["octet_rule_exception", "lewis_structure"],
        [
          L`$\mathrm{BF_3}$`,
          L`$\mathrm{CH_4}$`,
          L`$\mathrm{NH_3}$`,
          L`$\mathrm{H_2O}$`,
        ],
        "A",
        {
          B: "Carbon completes an octet in methane.",
          C: "Nitrogen completes an octet in ammonia.",
          D: "Oxygen completes an octet in water.",
        },
        [
          "Boron has three valence electrons.",
          "Three B-F bonds give six electrons around B.",
          "That is an incomplete octet.",
        ],
        L`In $\mathrm{BF_3}$, boron has only six electrons around it in the simple Lewis structure.`,
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`Draw the Lewis electron-dot structure of $\mathrm{H_2O}$ and state the number of bond pairs and lone pairs on oxygen.`,
        3,
        ["lewis_structure", "lone_pairs"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Write the electron-pair arrangement around oxygen.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "State bond pairs and lone pairs.",
            points: 2,
          },
        ],
        [
          "Oxygen has six valence electrons.",
          "It forms two O-H single bonds.",
          "Two pairs remain non-bonding on oxygen.",
        ],
        [
          {
            part: "a",
            explanation:
              "Oxygen is central with two O-H single bonds and two lone pairs.",
          },
          {
            part: "b",
            explanation:
              "There are two bond pairs and two lone pairs on oxygen.",
          },
        ],
        ["Forgetting one lone pair on oxygen."],
      ),
      extraFrq(
        "vsaq",
        L`A molecule cannot be described completely by one Lewis structure, although several valid canonical structures can be drawn. What bonding idea is being used?`,
        2,
        ["resonance_definition"],
        singlePart("a", "Name and define the bonding idea.", 2),
        [
          "It involves more than one valid Lewis structure.",
          "The actual molecule is not rapidly switching.",
          "The real structure is a hybrid.",
        ],
        [
          {
            part: "a",
            explanation:
              "Resonance is the representation of a molecule or ion by two or more valid canonical structures when no single Lewis structure describes it fully; the actual structure is a resonance hybrid.",
          },
        ],
        ["Saying resonance means the molecule oscillates between structures."],
      ),
      extraFrq(
        "saq",
        L`Using formal charge, explain why the usual Lewis structure of $\mathrm{CO_2}$ has two C=O double bonds.`,
        4,
        ["formal_charge", "lewis_structure"],
        [
          {
            letter: "a",
            promptMarkdown: "State the usual structure.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Give the formal-charge reason.",
            points: 3,
          },
        ],
        [
          "The usual structure is $\\mathrm{O=C=O}$.",
          "Formal charges are minimized.",
          "All atoms complete octets.",
        ],
        [
          {
            part: "a",
            explanation: "The usual Lewis structure is $\\mathrm{O=C=O}$.",
          },
          {
            part: "b",
            explanation:
              "With two double bonds, carbon and both oxygen atoms have octets and formal charge zero, making it the preferred simple Lewis structure.",
          },
        ],
        ["Choosing a single-bond structure without checking formal charge."],
      ),
      extraFrq(
        "laq",
        L`For $\mathrm{NO_3^-}$, explain why a single Lewis structure is not enough to describe the ion.`,
        4,
        ["resonance", "bond_equivalence"],
        [
          {
            letter: "a",
            promptMarkdown:
              "State what one canonical structure suggests about N-O bonds.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Explain the observed equivalence.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State the average N-O bond order.",
            points: 1,
          },
        ],
        [
          "One structure has one double and two single N-O bonds.",
          "Equivalent structures can be drawn by moving the double bond.",
          "Average bond order is $4/3$.",
        ],
        [
          {
            part: "a",
            explanation:
              "A single canonical structure shows one N=O bond and two N-O bonds.",
          },
          {
            part: "b",
            explanation:
              "Three equivalent canonical structures contribute, so the actual ion is a resonance hybrid with three equivalent N-O bonds.",
          },
          { part: "c", explanation: "Average bond order is $(2+1+1)/3=4/3$." },
        ],
        ["Treating one canonical structure as the actual fixed structure."],
      ),
      extraFrq(
        "case",
        L`A student draws $\mathrm{BF_3}$ with three B-F single bonds and no lone pair on B.`,
        3,
        ["case_based", "octet_exception"],
        [
          {
            letter: "a",
            promptMarkdown: "How many electrons surround B in this drawing?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Does B complete an octet?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Name the type of octet-rule exception.",
            points: 2,
          },
        ],
        [
          "Each single bond counts as two shared electrons around B.",
          "Three bonds give six electrons.",
          "Six is less than eight.",
        ],
        [
          { part: "a", explanation: "Boron is surrounded by six electrons." },
          { part: "b", explanation: "No, boron does not complete an octet." },
          {
            part: "c",
            explanation:
              "$\\mathrm{BF_3}$ is an incomplete-octet electron-deficient species.",
          },
        ],
        ["Assuming every stable compound must show an octet at every atom."],
      ),
    ],
  },
  "4.3": {
    mc: [
      extraMc(
        L`For a molecule of type $\mathrm{AX_3E}$, the electron-pair geometry and molecular shape respectively are`,
        2,
        ["vsepr_notation", "molecular_shape"],
        [
          "trigonal planar and trigonal planar",
          "tetrahedral and trigonal pyramidal",
          "trigonal bipyramidal and T-shaped",
          "linear and bent",
        ],
        "B",
        {
          A: "Three bond pairs plus one lone pair make four electron domains, not three.",
          C: "Trigonal bipyramidal requires five electron domains.",
          D: "Linear electron-pair geometry requires two domains.",
        },
        [
          "$\\mathrm{AX_3E}$ has four electron domains.",
          "Four domains give tetrahedral electron-pair geometry.",
          "One lone pair leaves three atoms in a trigonal pyramidal shape.",
        ],
        L`$\mathrm{AX_3E}$ has tetrahedral electron-pair geometry and trigonal pyramidal molecular shape.`,
      ),
      extraMc(
        L`The H-O-H bond angle in water is less than the tetrahedral angle mainly because`,
        3,
        ["vsepr", "bond_angle"],
        [
          "lone pair-lone pair and lone pair-bond pair repulsions compress the bond angle",
          "oxygen has no lone pair",
          "hydrogen atoms repel less than lone pairs, so angle expands to 180 degrees",
          "water is ionic",
        ],
        "A",
        {
          B: "Oxygen has two lone pairs in water.",
          C: "The angle is bent and smaller than $109.5^\\circ$.",
          D: "Water is a covalent molecule.",
        },
        [
          "Water has two bond pairs and two lone pairs.",
          "Lone pairs repel more strongly than bond pairs.",
          "Bond pairs are pushed closer together.",
        ],
        L`Lone-pair repulsions on oxygen compress the H-O-H angle to about $104.5^\circ$.`,
      ),
      extraMc(
        L`A molecule of type $\mathrm{AX_2E_2}$ has the molecular shape`,
        3,
        ["vsepr_notation", "shape_prediction"],
        ["linear", "bent", "trigonal planar", "octahedral"],
        "B",
        {
          A: "Linear shape is typical for $\\mathrm{AX_2}$ with no lone pairs or some $\\mathrm{AX_2E_3}$ cases.",
          C: "Trigonal planar has three bonded atoms and no lone pair.",
          D: "Octahedral requires six electron domains.",
        },
        [
          "$\\mathrm{AX_2E_2}$ has four electron domains.",
          "Two are lone pairs.",
          "The visible atom positions form a bent shape.",
        ],
        L`$\mathrm{AX_2E_2}$ has tetrahedral electron-pair geometry but bent molecular shape.`,
      ),
      extraMc(
        L`The order of repulsion strength used in VSEPR theory is`,
        3,
        ["vsepr_repulsion"],
        [
          "bond pair-bond pair > lone pair-bond pair > lone pair-lone pair",
          "lone pair-lone pair > lone pair-bond pair > bond pair-bond pair",
          "all repulsions are equal",
          "lone pairs do not repel",
        ],
        "B",
        {
          A: "This reverses the usual VSEPR order.",
          C: "Different electron domains occupy different volumes.",
          D: "Lone pairs repel strongly.",
        },
        [
          "Lone pairs are localized more near the central atom.",
          "They occupy more space than bonding pairs.",
          "Thus lone pair-lone pair repulsion is strongest.",
        ],
        "The VSEPR repulsion order is lone pair-lone pair > lone pair-bond pair > bond pair-bond pair.",
      ),
      extraMc(
        L`The shape of $\mathrm{CO_2}$ is linear because the central carbon has`,
        2,
        ["vsepr", "linear_shape"],
        [
          "two electron domains and no lone pair",
          "four lone pairs",
          "three bond pairs and one lone pair",
          "two lone pairs and two bond pairs",
        ],
        "A",
        {
          B: "Carbon in CO2 has no lone pair in the usual structure.",
          C: "That pattern gives trigonal pyramidal shape.",
          D: "That pattern gives a bent shape.",
        },
        [
          "Each double bond counts as one electron domain.",
          "Carbon has two C=O domains.",
          "Two domains arrange at $180^\\circ$.",
        ],
        L`In $\mathrm{CO_2}$, carbon has two bonding domains and no lone pair, so the molecule is linear.`,
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`Use VSEPR theory to compare the shapes of $\mathrm{CO_2}$ and $\mathrm{SO_2}$.`,
        3,
        ["vsepr", "shape_prediction"],
        [
          {
            letter: "a",
            promptMarkdown: "State shape of $\\mathrm{CO_2}$.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "State shape of $\\mathrm{SO_2}$.",
            points: 2,
          },
        ],
        [
          "A double bond counts as one electron domain in VSEPR.",
          "$\\mathrm{CO_2}$ has two domains and no lone pair on carbon.",
          "$\\mathrm{SO_2}$ has two bonding domains and one lone pair on sulfur in the simple VSEPR picture.",
        ],
        [
          {
            part: "a",
            explanation:
              "$\\mathrm{CO_2}$ is linear because carbon has two bonding domains and no lone pair.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{SO_2}$ is bent because sulfur has three electron domains with one lone pair.",
          },
        ],
        ["Counting each double bond as two separate VSEPR domains."],
      ),
      extraFrq(
        "vsaq",
        L`State the molecular shape of $\mathrm{NH_3}$ and the reason for its deviation from a tetrahedral molecule.`,
        3,
        ["vsepr", "lone_pair_effect"],
        singlePart("a", "Give shape and reason.", 3),
        [
          "Nitrogen has one lone pair.",
          "The electron-pair geometry is tetrahedral.",
          "The shape considers only atom positions.",
        ],
        [
          {
            part: "a",
            explanation:
              "$\\mathrm{NH_3}$ is trigonal pyramidal because nitrogen has three bond pairs and one lone pair; the lone pair occupies one tetrahedral position and repels bond pairs more strongly.",
          },
        ],
        [
          "Calling the molecular shape tetrahedral without excluding the lone pair.",
        ],
      ),
      extraFrq(
        "saq",
        L`Compare the bond angles of $\mathrm{CH_4}$, $\mathrm{NH_3}$ and $\mathrm{H_2O}$ qualitatively.`,
        4,
        ["vsepr", "bond_angle_comparison"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the decreasing order of bond angles.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Explain the role of lone pairs.",
            points: 2,
          },
        ],
        [
          "$\\mathrm{CH_4}$ has no lone pair.",
          "$\\mathrm{NH_3}$ has one lone pair.",
          "$\\mathrm{H_2O}$ has two lone pairs.",
        ],
        [
          {
            part: "a",
            explanation: "Decreasing order: $\\mathrm{CH_4>NH_3>H_2O}$.",
          },
          {
            part: "b",
            explanation:
              "More lone pairs on the central atom increase repulsion on bond pairs and compress the bond angle.",
          },
        ],
        [
          "Assuming all tetrahedral electron-pair arrangements have identical bond angles.",
        ],
      ),
      extraFrq(
        "laq",
        L`A molecule has one central atom, three surrounding atoms and one lone pair on the central atom. Predict its electron-pair geometry, molecular shape and approximate bond angle relation.`,
        4,
        ["vsepr_notation", "shape_reasoning"],
        [
          { letter: "a", promptMarkdown: "Write its VSEPR type.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "State electron-pair geometry.",
            points: 1,
          },
          { letter: "c", promptMarkdown: "State molecular shape.", points: 1 },
          {
            letter: "d",
            promptMarkdown: "Compare its bond angle with $109.5^\\circ$.",
            points: 2,
          },
        ],
        [
          "Three surrounding atoms plus one lone pair gives four electron domains.",
          "Four domains have tetrahedral electron-pair geometry.",
          "One lone pair makes the shape pyramidal and compresses the angle.",
        ],
        [
          { part: "a", explanation: "The type is $\\mathrm{AX_3E}$." },
          {
            part: "b",
            explanation: "The electron-pair geometry is tetrahedral.",
          },
          {
            part: "c",
            explanation: "The molecular shape is trigonal pyramidal.",
          },
          {
            part: "d",
            explanation:
              "The bond angle is less than $109.5^\\circ$ because lone pair-bond pair repulsion is stronger than bond pair-bond pair repulsion.",
          },
        ],
        ["Confusing electron-pair geometry with molecular shape."],
      ),
      extraFrq(
        "case",
        L`Molecules P, Q and R have central-atom electron domains as follows: P has two bond pairs and no lone pair; Q has three bond pairs and no lone pair; R has two bond pairs and two lone pairs.`,
        4,
        ["case_based", "vsepr"],
        [
          { letter: "a", promptMarkdown: "Predict shape of P.", points: 1 },
          { letter: "b", promptMarkdown: "Predict shape of Q.", points: 1 },
          { letter: "c", promptMarkdown: "Predict shape of R.", points: 1 },
          {
            letter: "d",
            promptMarkdown:
              "Which one is expected to have the smallest listed bond angle? Why?",
            points: 2,
          },
        ],
        [
          "Two domains with no lone pair give linear.",
          "Three domains with no lone pair give trigonal planar.",
          "Two lone pairs compress angles strongly.",
        ],
        [
          { part: "a", explanation: "P is linear." },
          { part: "b", explanation: "Q is trigonal planar." },
          { part: "c", explanation: "R is bent." },
          {
            part: "d",
            explanation:
              "R has the smallest angle among these because two lone pairs compress the bond angle.",
          },
        ],
        ["Ignoring lone pairs when naming molecular shape."],
      ),
    ],
  },
  "4.4": {
    mc: [
      extraMc(
        L`In ethene, $\mathrm{C_2H_4}$, each carbon atom is`,
        3,
        ["hybridisation", "ethene"],
        [
          L`$sp$ hybridised`,
          L`$sp^2$ hybridised`,
          L`$sp^3$ hybridised`,
          L`$dsp^2$ hybridised`,
        ],
        "B",
        {
          A: "$sp$ hybridisation is associated with two electron domains, as in ethyne carbon.",
          C: "$sp^3$ carbon has four sigma domains, as in ethane.",
          D: "$dsp^2$ is not used for ethene carbon in the CBSE valence-bond treatment.",
        },
        [
          "Each carbon in ethene has three sigma domains.",
          "One unhybridised p orbital forms the pi bond.",
          "Three sigma domains imply $sp^2$.",
        ],
        L`Each carbon in $\mathrm{C_2H_4}$ forms three sigma bonds and one pi bond, so it is $sp^2$ hybridised.`,
      ),
      extraMc(
        L`The number of sigma and pi bonds in $\mathrm{HC\equiv CH}$ is`,
        3,
        ["sigma_pi_bonds", "ethyne"],
        [
          L`$2\sigma,2\pi$`,
          L`$3\sigma,2\pi$`,
          L`$4\sigma,1\pi$`,
          L`$5\sigma,0\pi$`,
        ],
        "B",
        {
          A: "The two C-H bonds are sigma bonds and the C-C triple bond contributes one sigma bond.",
          C: "A triple bond contains two pi bonds, not one.",
          D: "A triple bond contains pi bonds.",
        },
        [
          "Each single bond is sigma.",
          "A triple bond has one sigma and two pi bonds.",
          "There are two C-H sigma bonds.",
        ],
        L`Ethyne has two C-H $\sigma$ bonds plus one C-C $\sigma$ bond and two C-C $\pi$ bonds: $3\sigma,2\pi$.`,
      ),
      extraMc(
        L`The hybridisation of carbon in $\mathrm{CO_2}$ is`,
        3,
        ["hybridisation", "linear_molecule"],
        [L`$sp$`, L`$sp^2$`, L`$sp^3$`, L`$sp^3d$`],
        "A",
        {
          B: "$sp^2$ would correspond to three electron domains.",
          C: "$sp^3$ would correspond to four electron domains.",
          D: "Carbon does not use $sp^3d$ in CO2.",
        },
        [
          "Carbon has two double-bond domains.",
          "Two domains give linear geometry.",
          "Linear carbon is $sp$ hybridised.",
        ],
        L`In $\mathrm{CO_2}$, carbon has two electron domains and linear arrangement, so it is $sp$ hybridised.`,
      ),
      extraMc(
        L`A $\pi$ bond is formed by`,
        2,
        ["orbital_overlap", "pi_bond"],
        [
          "end-on overlap along internuclear axis",
          "sidewise overlap of parallel orbitals",
          "complete electron transfer",
          "attraction between ions only",
        ],
        "B",
        {
          A: "End-on overlap forms a sigma bond.",
          C: "Electron transfer describes ionic bonding.",
          D: "Ion attraction is not pi bonding.",
        },
        [
          "Sigma overlap is head-on.",
          "Pi overlap occurs above and below the internuclear axis.",
          "It is sidewise overlap.",
        ],
        "A pi bond is produced by sidewise overlap of parallel p orbitals.",
      ),
      extraMc(
        L`The geometry associated with $sp^3$ hybridisation is generally`,
        2,
        ["hybridisation", "geometry"],
        ["linear", "trigonal planar", "tetrahedral", "square planar"],
        "C",
        {
          A: "Linear geometry is linked with $sp$.",
          B: "Trigonal planar geometry is linked with $sp^2$.",
          D: "Square planar is not the simple $sp^3$ geometry.",
        },
        [
          "$sp^3$ gives four equivalent hybrid orbitals.",
          "They arrange as far apart as possible.",
          "The arrangement is tetrahedral.",
        ],
        "$sp^3$ hybrid orbitals point toward the corners of a tetrahedron.",
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`Compare the hybridisation of carbon atoms in ethane, ethene and ethyne.`,
        4,
        ["hybridisation", "organic_examples"],
        [
          {
            letter: "a",
            promptMarkdown: "State hybridisation in ethane.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State hybridisation in ethene.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State hybridisation in ethyne.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Link each to number of electron domains.",
            points: 2,
          },
        ],
        [
          "Ethane carbon forms four sigma bonds.",
          "Ethene carbon has three sigma domains.",
          "Ethyne carbon has two sigma domains.",
        ],
        [
          { part: "a", explanation: "Ethane carbon is $sp^3$ hybridised." },
          { part: "b", explanation: "Ethene carbon is $sp^2$ hybridised." },
          { part: "c", explanation: "Ethyne carbon is $sp$ hybridised." },
          {
            part: "d",
            explanation:
              "The corresponding sigma-domain counts are four, three and two respectively.",
          },
        ],
        ["Counting pi bonds as separate hybrid-orbital domains."],
      ),
      extraFrq(
        "vsaq",
        L`State one difference between a sigma bond and a pi bond.`,
        2,
        ["sigma_pi_bonds"],
        singlePart("a", "Give one clear difference.", 2),
        [
          "Think about overlap direction.",
          "Sigma bond has electron density along the internuclear axis.",
          "Pi bond has electron density above and below the axis.",
        ],
        [
          {
            part: "a",
            explanation:
              "A sigma bond is formed by end-on overlap along the internuclear axis, whereas a pi bond is formed by sidewise overlap of parallel orbitals.",
          },
        ],
        ["Saying pi bonds are stronger than sigma bonds in general."],
      ),
      extraFrq(
        "saq",
        L`Find the number of sigma and pi bonds in $\mathrm{CH_2=CH-CH=CH_2}$.`,
        4,
        ["sigma_pi_count", "bond_counting"],
        [
          { letter: "a", promptMarkdown: "Count the sigma bonds.", points: 2 },
          { letter: "b", promptMarkdown: "Count the pi bonds.", points: 2 },
        ],
        [
          "Every C-H bond is sigma.",
          "Each C-C single bond is sigma.",
          "Each C=C double bond has one sigma and one pi bond.",
        ],
        [
          {
            part: "a",
            explanation:
              "There are six C-H sigma bonds and three C-C sigma bonds, so total sigma bonds are 9.",
          },
          {
            part: "b",
            explanation:
              "There are two C=C double bonds, so there are two pi bonds.",
          },
        ],
        ["Counting each double bond as two sigma bonds."],
      ),
      extraFrq(
        "laq",
        L`Use valence bond ideas to explain bonding in $\mathrm{BF_3}$.`,
        4,
        ["hybridisation", "bf3"],
        [
          {
            letter: "a",
            promptMarkdown: "State hybridisation of boron.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State molecular geometry.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Explain the sigma bond formation.",
            points: 3,
          },
        ],
        [
          "Boron forms three sigma bonds.",
          "Three domains imply $sp^2$.",
          "The molecule is trigonal planar.",
        ],
        [
          { part: "a", explanation: "Boron is $sp^2$ hybridised." },
          { part: "b", explanation: "$\\mathrm{BF_3}$ is trigonal planar." },
          {
            part: "c",
            explanation:
              "Three $sp^2$ hybrid orbitals of boron overlap with suitable orbitals of fluorine to form three B-F sigma bonds in one plane.",
          },
        ],
        [
          "Calling boron $sp^3$ hybridised because three bonds look like a tetrahedral fragment.",
        ],
      ),
      extraFrq(
        "case",
        L`Molecule P has a carbon atom with two electron domains; molecule Q has a carbon atom with three electron domains; molecule R has a carbon atom with four electron domains.`,
        4,
        ["case_based", "hybridisation"],
        [
          {
            letter: "a",
            promptMarkdown: "State hybridisation of carbon in P.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State hybridisation of carbon in Q.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State hybridisation of carbon in R.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Match these to linear, trigonal planar and tetrahedral arrangements.",
            points: 2,
          },
        ],
        [
          "Two domains correspond to $sp$.",
          "Three domains correspond to $sp^2$.",
          "Four domains correspond to $sp^3$.",
        ],
        [
          { part: "a", explanation: "P is $sp$ hybridised." },
          { part: "b", explanation: "Q is $sp^2$ hybridised." },
          { part: "c", explanation: "R is $sp^3$ hybridised." },
          {
            part: "d",
            explanation:
              "$sp$ is linear, $sp^2$ is trigonal planar, and $sp^3$ is tetrahedral.",
          },
        ],
        [
          "Matching hybridisation only by the number of atoms attached, not electron domains.",
        ],
      ),
    ],
  },
  "4.5": {
    mc: [
      extraMc(
        L`The bond order of $\mathrm{N_2}$ according to simple molecular orbital theory is`,
        3,
        ["molecular_orbital_theory", "bond_order"],
        ["1", "2", "3", "0"],
        "C",
        {
          A: "A bond order of 1 would be a single bond.",
          B: "Nitrogen molecule is stronger than a double-bond description.",
          D: "Zero bond order would mean no stable molecule.",
        },
        [
          "$\\mathrm{N_2}$ has ten valence electrons.",
          "The bonding-antibonding difference is six in the simple filling.",
          "Bond order is $3$.",
        ],
        L`For $\mathrm{N_2}$, bond order is $3$, matching its very strong triple bond.`,
      ),
      extraMc(
        L`The species expected to be unstable by bond-order argument is`,
        3,
        ["molecular_orbital_theory", "stability"],
        [
          L`$\mathrm{H_2}$`,
          L`$\mathrm{He_2}$`,
          L`$\mathrm{O_2}$`,
          L`$\mathrm{N_2}$`,
        ],
        "B",
        {
          A: "$\\mathrm{H_2}$ has bond order 1.",
          C: "$\\mathrm{O_2}$ has positive bond order.",
          D: "$\\mathrm{N_2}$ has positive bond order.",
        },
        [
          "A stable molecule needs positive bond order.",
          "$\\mathrm{He_2}$ has equal bonding and antibonding electrons.",
          "Bond order becomes zero.",
        ],
        L`$\mathrm{He_2}$ has bond order $(2-2)/2=0$, so it is not expected to be stable.`,
      ),
      extraMc(
        L`The paramagnetism of $\mathrm{O_2}$ is explained by`,
        3,
        ["molecular_orbital_theory", "magnetism"],
        [
          "absence of electrons",
          "two unpaired electrons in antibonding molecular orbitals",
          "complete ionic character",
          "hydrogen bonding between oxygen molecules",
        ],
        "B",
        {
          A: "Oxygen has electrons; the issue is whether they are paired.",
          C: "Paramagnetism is not explained by ionic character here.",
          D: "Oxygen molecules do not show hydrogen bonding.",
        },
        [
          "Paramagnetic species have unpaired electrons.",
          "MO filling of oxygen leaves two unpaired electrons.",
          "They occupy antibonding pi orbitals.",
        ],
        L`Molecular orbital theory predicts two unpaired electrons in $\pi^*$ orbitals of $\mathrm{O_2}$, explaining paramagnetism.`,
      ),
      extraMc(
        L`Hydrogen bonding is strongest when hydrogen is bonded to`,
        2,
        ["hydrogen_bonding"],
        ["C, Si or P", "N, O or F", "Na, Mg or Al", "Cl, Br or I only"],
        "B",
        {
          A: "These atoms are not sufficiently small and electronegative for strong classical hydrogen bonding.",
          C: "Metals do not produce the described hydrogen bonding.",
          D: "Halides can accept hydrogen bonds, but H bonded directly to F, O or N is the standard strong donor condition.",
        },
        [
          "Hydrogen bonding needs a strongly polar H-X bond.",
          "X must be small and highly electronegative.",
          "N, O and F satisfy this best.",
        ],
        "Strong hydrogen bonding occurs when hydrogen is attached to N, O or F.",
      ),
      extraMc(
        L`Compared with $\mathrm{H_2S}$, water has an unusually high boiling point mainly due to`,
        3,
        ["hydrogen_bonding", "boiling_point"],
        [
          "lower molar mass",
          "intermolecular hydrogen bonding",
          "metallic bonding",
          "zero dipole moment",
        ],
        "B",
        {
          A: "Lower molar mass alone would not raise the boiling point.",
          C: "Water is not metallic.",
          D: "Water is polar, not zero-dipole.",
        },
        [
          "O-H bonds are highly polar.",
          "Water molecules form intermolecular hydrogen bonds.",
          "Extra attraction raises boiling point.",
        ],
        "Water has strong intermolecular hydrogen bonding, so more energy is needed to separate molecules.",
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`Use molecular orbital theory to explain why $\mathrm{He_2}$ is not stable.`,
        3,
        ["molecular_orbital_theory", "bond_order"],
        [
          {
            letter: "a",
            promptMarkdown: "Write the bond-order expression.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find bond order for $\\mathrm{He_2}$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State the stability conclusion.",
            points: 1,
          },
        ],
        [
          "There are two bonding and two antibonding electrons.",
          "Use $(N_b-N_a)/2$.",
          "Zero bond order means no net bond.",
        ],
        [
          { part: "a", explanation: "Bond order $=(N_b-N_a)/2$." },
          {
            part: "b",
            explanation: "For $\\mathrm{He_2}$, bond order $=(2-2)/2=0$.",
          },
          {
            part: "c",
            explanation:
              "Zero bond order means $\\mathrm{He_2}$ is not expected to be stable.",
          },
        ],
        ["Counting only bonding electrons and ignoring antibonding electrons."],
      ),
      extraFrq(
        "vsaq",
        L`Why is $\mathrm{O_2}$ paramagnetic?`,
        2,
        ["paramagnetism", "molecular_orbital_theory"],
        singlePart("a", "Give the MO-based reason.", 2),
        [
          "Paramagnetism requires unpaired electrons.",
          "MO filling of oxygen leaves two unpaired electrons.",
          "They are in antibonding pi orbitals.",
        ],
        [
          {
            part: "a",
            explanation:
              "$\\mathrm{O_2}$ is paramagnetic because it has two unpaired electrons in antibonding molecular orbitals.",
          },
        ],
        [
          "Saying oxygen is diamagnetic because its Lewis structure pairs all electrons.",
        ],
      ),
      extraFrq(
        "saq",
        L`Compare intermolecular hydrogen bonding in $\mathrm{H_2O}$ and $\mathrm{CH_4}$.`,
        3,
        ["hydrogen_bonding", "comparison"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Which molecule shows strong intermolecular hydrogen bonding?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Give the structural reason.",
            points: 3,
          },
        ],
        [
          "Hydrogen must be bonded to N, O or F.",
          "Water has O-H bonds.",
          "Methane has C-H bonds.",
        ],
        [
          {
            part: "a",
            explanation:
              "$\\mathrm{H_2O}$ shows strong intermolecular hydrogen bonding.",
          },
          {
            part: "b",
            explanation:
              "Water has H bonded to highly electronegative oxygen and oxygen has lone pairs. Methane has C-H bonds, and carbon is not electronegative enough for strong hydrogen bonding of this type.",
          },
        ],
        [
          "Assuming every hydrogen-containing molecule forms strong hydrogen bonds.",
        ],
      ),
      extraFrq(
        "laq",
        L`For $\mathrm{N_2}$ and $\mathrm{O_2}$, compare bond order and magnetic behaviour using molecular orbital ideas.`,
        5,
        ["molecular_orbital_theory", "bond_order", "magnetism"],
        [
          {
            letter: "a",
            promptMarkdown: "State bond order of $\\mathrm{N_2}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State bond order of $\\mathrm{O_2}$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Compare their relative bond strengths.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "State magnetic behaviour of $\\mathrm{O_2}$ with reason.",
            points: 2,
          },
        ],
        [
          "$\\mathrm{N_2}$ has bond order 3.",
          "$\\mathrm{O_2}$ has bond order 2.",
          "Unpaired electrons cause paramagnetism.",
        ],
        [
          { part: "a", explanation: "$\\mathrm{N_2}$ has bond order 3." },
          { part: "b", explanation: "$\\mathrm{O_2}$ has bond order 2." },
          {
            part: "c",
            explanation:
              "$\\mathrm{N_2}$ has the stronger and shorter bond because its bond order is higher.",
          },
          {
            part: "d",
            explanation:
              "$\\mathrm{O_2}$ is paramagnetic because it contains two unpaired electrons in antibonding molecular orbitals.",
          },
        ],
        ["Using only Lewis structures to decide oxygen magnetism."],
      ),
      extraFrq(
        "case",
        L`Three liquids have similar molar masses. Liquid A has O-H bonds, liquid B has C-H bonds only, and liquid C has H-Cl bonds.`,
        4,
        ["case_based", "hydrogen_bonding_properties"],
        [
          {
            letter: "a",
            promptMarkdown:
              "Which liquid is most likely to show strongest hydrogen bonding?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Which is least likely to show strong hydrogen bonding?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Predict the qualitative boiling-point effect for A.",
            points: 3,
          },
        ],
        [
          "Strong hydrogen bonding needs H bonded to N, O or F.",
          "O-H satisfies this condition.",
          "Stronger intermolecular attraction raises boiling point.",
        ],
        [
          {
            part: "a",
            explanation: "A is most likely to show strongest hydrogen bonding.",
          },
          {
            part: "b",
            explanation: "B is least likely because it has only C-H bonds.",
          },
          {
            part: "c",
            explanation:
              "A should have a relatively higher boiling point because hydrogen bonding increases intermolecular attraction.",
          },
        ],
        [
          "Treating all polar H-X bonds as equally strong hydrogen-bond donors.",
        ],
      ),
    ],
  },
};

const expandedTopicSeeds: readonly TopicSeed[] = topicSeeds.map((seed) => {
  const extra = largeTopicExpansions[seed.topicCode];
  if (!extra) return seed;

  return {
    ...seed,
    mc: [...seed.mc, ...extra.mc],
    constructed: [...seed.constructed, ...extra.constructed],
  };
});

export const chemicalBondingTopics: Topic[] = expandedTopicSeeds.map(makeTopic);
