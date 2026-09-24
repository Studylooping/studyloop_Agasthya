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
import { calibrateCbsePhysicsDifficulty } from "../../../lib/content/difficulty-calibration.mjs";

const COURSE = "cbse-physics-12";
const UNIT = "u8-atoms-nuclei";
const VERSION = "0.2.1";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

type McLetter = (typeof LETTERS)[number];
type Difficulty = 1 | 2 | 3 | 4 | 5;
type ResponseType = "vsaq" | "saq" | "laq" | "case";
type McSolutionStep = Omit<SolutionStep, "step"> &
  Partial<Pick<SolutionStep, "step">>;

interface TopicMeta {
  topicCode: string;
  title: string;
  subtopic: string;
}

interface McSeed {
  questionLatex: string;
  difficulty: Difficulty;
  calculatorAllowed?: boolean;
  skillTags: string[];
  commonMisconceptions?: string[];
  figure?: ItemFigure;
  choices: readonly [string, string, string, string];
  correctLetter: McLetter;
  rationales: Partial<Record<McLetter, string>>;
  misconceptionTags?: Partial<Record<McLetter, string>>;
  hints: readonly [string, string, string];
  solution: readonly McSolutionStep[];
}

interface ConstructedSeed {
  responseType: ResponseType;
  questionLatex: string;
  difficulty: Difficulty;
  calculatorAllowed?: boolean;
  skillTags: string[];
  commonMisconceptions?: string[];
  figure?: ItemFigure;
  parts: readonly FrqPart[];
  hints: readonly [string, string, string];
  rubric: FrqRubric;
  commonErrors: readonly string[];
  workedSolution: readonly FrqSolutionPart[];
}

interface TopicSeed extends TopicMeta {
  mc: readonly [McSeed, McSeed, McSeed, McSeed, McSeed];
  constructed: readonly [
    ConstructedSeed,
    ConstructedSeed,
    ConstructedSeed,
    ConstructedSeed,
    ConstructedSeed,
  ];
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

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck whether the question is about Rutherford scattering, Bohr energy levels, spectral transitions, nuclear size, mass defect, binding energy, fission, or fusion.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const unletteredChoices = LETTERS.map((seedLetter, choiceIndex) => {
    const isCorrect = seedLetter === seed.correctLetter;
    return {
      text: seed.choices[choiceIndex],
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : (seed.rationales[seedLetter] ??
          fallbackWrongRationale(seed, seedLetter)),
      misconceptionTag: isCorrect
        ? null
        : (seed.misconceptionTags?.[seedLetter] ??
          "incorrect_cbse_class12_physics_atoms_nuclei_reasoning"),
    };
  });

  const topicNumber = Number(meta.topicCode.split(".")[1] ?? 0);
  const rotation = (2 * topicNumber + 2 * index) % LETTERS.length;
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
  const correctLetter =
    choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u8.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbsePhysicsDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
      skillTags: seed.skillTags,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "confuses_atomic_energy_level_formula_with_nuclear_binding_energy",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map((step, stepIndex) => ({
      ...step,
      step: step.step ?? stepIndex + 1,
    })) as SolutionStep[],
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
    contentId: `${COURSE}.u8.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbsePhysicsDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
      skillTags: seed.skillTags,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_a_formula_without_checking_atomic_or_nuclear_context",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: [...seed.parts],
    hintLadder: hints(seed.hints),
    rubric: seed.rubric,
    commonErrors: [...seed.commonErrors],
    workedSolution: [...seed.workedSolution],
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

function part(letter: string, promptMarkdown: string, points: number): FrqPart {
  return { letter, promptMarkdown, points };
}

function onePart(promptMarkdown: string, points: number): readonly FrqPart[] {
  return [part("a", promptMarkdown, points)];
}

function rubric(
  criteria: readonly { part: string; points: number; description: string }[],
): FrqRubric {
  return {
    maxPoints: criteria.reduce((total, item) => total + item.points, 0),
    criteria: [...criteria],
  };
}

const rutherfordScatteringFigure: ItemFigure = {
  type: "svg",
  title: "Alpha-particle scattering paths",
  description:
    "A thin gold foil is struck by alpha particles. Most paths are nearly straight, a few are deflected, and one path is scattered backward.",
  svg: `<svg viewBox="0 0 700 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="390" fill="#ffffff"/>
  <defs>
    <marker id="alpha-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#2563eb"/>
    </marker>
    <marker id="alpha-back" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#dc2626"/>
    </marker>
  </defs>
  <rect x="335" y="60" width="20" height="270" rx="4" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>
  <g stroke="#2563eb" stroke-width="3" fill="none" marker-end="url(#alpha-arrow)">
    <path d="M65 110 H610"/>
    <path d="M65 155 H610"/>
    <path d="M65 205 H610"/>
    <path d="M65 250 C170 250 275 250 344 250 C410 252 505 282 610 323"/>
    <path d="M65 295 C172 295 260 292 344 288 C420 282 502 242 610 170"/>
  </g>
  <path d="M65 72 C170 72 276 75 344 86 C405 96 410 145 350 178 C295 206 210 205 115 180" stroke="#dc2626" stroke-width="3.5" fill="none" marker-end="url(#alpha-back)"/>
  <g fill="#0f172a" font-family="Arial, sans-serif" font-size="17">
    <text x="52" y="48">alpha particles</text>
    <text x="306" y="352">thin gold foil</text>
    <text x="494" y="54">scattered paths</text>
  </g>
</svg>`,
};

const bohrEnergyLevelFigure: ItemFigure = {
  type: "svg",
  title: "Hydrogen atom energy levels",
  description:
    "Hydrogen energy levels for n = 1 to n = 4 are drawn with energies in electron-volts. Three downward transitions are shown without naming the spectral series.",
  svg: `<svg viewBox="0 0 680 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="420" fill="#ffffff"/>
  <defs>
    <marker id="level-arrow" markerWidth="10" markerHeight="10" refX="5" refY="9" orient="auto">
      <path d="M0 0 L10 0 L5 10 Z" fill="#dc2626"/>
    </marker>
  </defs>
  <g stroke="#334155" stroke-width="3">
    <line x1="120" y1="330" x2="560" y2="330"/>
    <line x1="120" y1="190" x2="560" y2="190"/>
    <line x1="120" y1="130" x2="560" y2="130"/>
    <line x1="120" y1="98" x2="560" y2="98"/>
    <line x1="120" y1="72" x2="560" y2="72" stroke-dasharray="8 6"/>
  </g>
  <g stroke="#dc2626" stroke-width="3" marker-end="url(#level-arrow)">
    <line x1="230" y1="98" x2="230" y2="182"/>
    <line x1="340" y1="130" x2="340" y2="322"/>
    <line x1="455" y1="190" x2="455" y2="322"/>
  </g>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="17">
    <text x="70" y="336">n = 1</text>
    <text x="570" y="336">-13.6 eV</text>
    <text x="70" y="196">n = 2</text>
    <text x="570" y="196">-3.40 eV</text>
    <text x="70" y="136">n = 3</text>
    <text x="570" y="136">-1.51 eV</text>
    <text x="70" y="104">n = 4</text>
    <text x="570" y="104">-0.85 eV</text>
    <text x="70" y="77">n = &#8734;</text>
    <text x="570" y="77">0 eV</text>
    <text x="205" y="64">A</text>
    <text x="318" y="64">B</text>
    <text x="432" y="64">C</text>
  </g>
</svg>`,
};

const nuclearRadiusFigure: ItemFigure = {
  type: "svg",
  title: "Nuclear radius trend",
  description:
    "A straight-line plot of nuclear radius R against A to the power one-third, showing the proportionality used in the nuclear radius formula.",
  svg: `<svg viewBox="0 0 660 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="380" fill="#ffffff"/>
  <defs>
    <marker id="radius-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="95" y1="290" x2="575" y2="290"/>
    <line x1="95" y1="235" x2="575" y2="235"/>
    <line x1="95" y1="180" x2="575" y2="180"/>
    <line x1="95" y1="125" x2="575" y2="125"/>
    <line x1="95" y1="70" x2="575" y2="70"/>
    <line x1="170" y1="55" x2="170" y2="305"/>
    <line x1="245" y1="55" x2="245" y2="305"/>
    <line x1="320" y1="55" x2="320" y2="305"/>
    <line x1="395" y1="55" x2="395" y2="305"/>
    <line x1="470" y1="55" x2="470" y2="305"/>
  </g>
  <line x1="85" y1="305" x2="600" y2="305" stroke="#334155" stroke-width="2.5" marker-end="url(#radius-axis)"/>
  <line x1="95" y1="315" x2="95" y2="45" stroke="#334155" stroke-width="2.5" marker-end="url(#radius-axis)"/>
  <line x1="95" y1="305" x2="525" y2="75" stroke="#2563eb" stroke-width="4"/>
  <circle cx="245" cy="225" r="5" fill="#2563eb"/>
  <circle cx="395" cy="145" r="5" fill="#2563eb"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="17">
    <text x="602" y="310">A<tspan baseline-shift="super" font-size="12">1/3</tspan></text>
    <text x="44" y="52">R</text>
    <text x="245" y="249">X</text>
    <text x="395" y="128">Y</text>
  </g>
</svg>`,
};

const bindingEnergyCurveFigure: ItemFigure = {
  type: "svg",
  title: "Binding energy per nucleon curve",
  description:
    "A standard qualitative curve of binding energy per nucleon against mass number, rising steeply for light nuclei, peaking near medium nuclei, and slowly falling for heavy nuclei.",
  svg: `<svg viewBox="0 0 700 410" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="410" fill="#ffffff"/>
  <defs>
    <marker id="be-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="95" y1="320" x2="600" y2="320"/>
    <line x1="95" y1="260" x2="600" y2="260"/>
    <line x1="95" y1="200" x2="600" y2="200"/>
    <line x1="95" y1="140" x2="600" y2="140"/>
    <line x1="95" y1="80" x2="600" y2="80"/>
    <line x1="190" y1="65" x2="190" y2="335"/>
    <line x1="300" y1="65" x2="300" y2="335"/>
    <line x1="410" y1="65" x2="410" y2="335"/>
    <line x1="520" y1="65" x2="520" y2="335"/>
  </g>
  <line x1="85" y1="335" x2="625" y2="335" stroke="#334155" stroke-width="2.5" marker-end="url(#be-axis)"/>
  <line x1="95" y1="345" x2="95" y2="50" stroke="#334155" stroke-width="2.5" marker-end="url(#be-axis)"/>
  <path d="M105 318 C130 248 155 166 210 112 C258 68 322 73 360 82 C435 99 512 123 595 150" fill="none" stroke="#2563eb" stroke-width="4"/>
  <circle cx="305" cy="76" r="6" fill="#16a34a"/>
  <circle cx="555" cy="138" r="6" fill="#dc2626"/>
  <circle cx="145" cy="211" r="6" fill="#f97316"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="16">
    <text x="628" y="341">mass number A</text>
    <text x="18" y="48">binding energy per nucleon</text>
    <text x="126" y="235">L</text>
    <text x="292" y="57">M</text>
    <text x="564" y="131">H</text>
  </g>
</svg>`,
};

const topics: readonly TopicSeed[] = [
  {
    topicCode: "8.1",
    title: "Rutherford Scattering and Atomic Model",
    subtopic:
      "Alpha-particle scattering observations, nuclear atom, limitations of Rutherford's model",
    mc: [
      {
        questionLatex: L`In Rutherford's alpha-particle scattering experiment, most alpha particles passed through the gold foil nearly undeflected. This observation mainly shows that`,
        difficulty: 2,
        skillTags: ["rutherford_scattering", "atomic_structure"],
        choices: [
          L`most of the atom is empty space`,
          L`all positive charge is spread uniformly through the atom`,
          L`electrons carry most of the mass of the atom`,
          L`the nucleus occupies nearly the whole atom`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Uniformly spread positive charge was Thomson's idea; Rutherford's result contradicted it.`,
          C: L`The experiment points to a small massive nucleus, not massive electrons.`,
          D: L`If the nucleus filled most of the atom, most particles would be strongly deflected.`,
        },
        hints: [
          L`Focus on the word "most".`,
          L`If most particles do not meet concentrated charge, what does that imply?`,
          L`The atom's size is much larger than the nucleus's size.`,
        ],
        solution: [
          {
            explanation: L`Most alpha particles suffered almost no deflection.`,
          },
          {
            explanation: L`Therefore most of the atom must be empty space, with the positive charge concentrated in a very small region.`,
          },
        ],
      },
      {
        questionLatex: L`The figure shows representative paths in Rutherford scattering. The rare backward scattering of an alpha particle is best explained by`,
        difficulty: 2,
        skillTags: ["rutherford_scattering", "nuclear_charge"],
        figure: rutherfordScatteringFigure,
        choices: [
          L`collision with an atomic electron of nearly equal mass`,
          L`repulsion from a small, massive, positively charged nucleus`,
          L`attraction by the negative charge spread over the atom`,
          L`loss of energy due to heating of the gold foil`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`An electron is far too light to reverse an alpha particle effectively.`,
          C: L`Alpha particles are positive; backward scattering comes from strong repulsion by concentrated positive charge.`,
          D: L`Heating does not explain a large-angle deflection in a definite path.`,
        },
        hints: [
          L`Backward scattering requires a strong force over a small distance.`,
          L`The alpha particle is positively charged.`,
          L`A small positive nucleus can strongly repel it.`,
        ],
        solution: [
          {
            explanation: L`A few alpha particles came very close to the concentrated positive charge of the atom.`,
          },
          {
            explanation: L`Strong electrostatic repulsion by the small massive nucleus can produce large-angle or backward scattering.`,
          },
        ],
      },
      {
        questionLatex: L`Rutherford's nuclear model could not explain the stability of atoms because, according to classical electromagnetic theory, an orbiting electron should`,
        difficulty: 2,
        skillTags: ["rutherford_model_limitation", "atomic_stability"],
        choices: [
          L`emit radiation continuously and spiral into the nucleus`,
          L`have zero charge while in orbit`,
          L`remain at rest at all points of its orbit`,
          L`make the nucleus negatively charged`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The electron's charge does not vanish in Rutherford's model.`,
          C: L`The electron is accelerated in circular motion, not at rest.`,
          D: L`The nucleus remains positively charged in the model.`,
        },
        hints: [
          L`Circular motion involves acceleration.`,
          L`Classically, accelerated charges radiate energy.`,
          L`Losing energy would shrink the orbit.`,
        ],
        solution: [
          {
            explanation: L`An electron moving around the nucleus is accelerated.`,
          },
          {
            explanation: L`Classically, an accelerated charge radiates energy, so the electron should lose energy and spiral into the nucleus. This contradicts atomic stability.`,
          },
        ],
      },
      {
        questionLatex: L`In Rutherford's model, if the atomic radius is of the order $10^{-10}\,\text{m}$ and the nuclear radius is of the order $10^{-15}\,\text{m}$, the ratio of atomic radius to nuclear radius is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["atomic_size", "nuclear_size"],
        choices: [L`$10^3$`, L`$10^5$`, L`$10^{10}$`, L`$10^{-5}$`],
        correctLetter: "B",
        rationales: {
          A: L`This misses two powers of ten.`,
          C: L`This compares areas or counts powers incorrectly; use radius ratio only.`,
          D: L`This is the inverse ratio.`,
        },
        hints: [
          L`Take the ratio $10^{-10}/10^{-15}$.`,
          L`Subtract exponents when dividing powers of ten.`,
          L`$-10-(-15)=5$.`,
        ],
        solution: [
          {
            explanation: L`The ratio is`,
            math: L`\frac{10^{-10}}{10^{-15}}=10^5`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Rutherford's experiment suggested that nearly all the mass of the atom is concentrated in the nucleus. Reason (R): A very small fraction of alpha particles were scattered through large angles. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "rutherford_scattering"],
        choices: [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The rare large-angle scattering is exactly the evidence for a small massive centre.`,
          C: L`The reason is true: only a very small fraction were strongly scattered.`,
          D: L`The assertion is true in Rutherford's nuclear model.`,
        },
        hints: [
          L`Large deflection means a strong interaction near a small region.`,
          L`Only a small fraction had such encounters.`,
          L`This points to a tiny massive nucleus.`,
        ],
        solution: [
          {
            explanation: L`The large-angle scattering of a few alpha particles showed that positive charge and mass are concentrated in a tiny nucleus.`,
          },
          {
            explanation: L`Thus both statements are true, and the reason explains the assertion.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`State one conclusion of Rutherford's alpha-particle scattering experiment about the structure of the atom.`,
        difficulty: 1,
        skillTags: ["rutherford_scattering", "atomic_model"],
        parts: onePart("Write any one valid conclusion.", 1),
        hints: [
          L`Think about where the positive charge is located.`,
          L`Think about why most particles passed straight through.`,
          L`Either empty space or small massive nucleus is acceptable.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States a correct conclusion such as most of atom is empty space or positive charge/mass is concentrated in a tiny nucleus.",
          },
        ]),
        commonErrors: [
          "Saying positive charge is uniformly spread throughout the atom.",
          "Saying electrons are inside the nucleus.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`One conclusion is that nearly all the positive charge and mass of the atom are concentrated in a very small nucleus, while most of the atom is empty space.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Using Rutherford's scattering observations, explain why the atom must contain a small positively charged nucleus.`,
        difficulty: 3,
        skillTags: ["rutherford_scattering", "nuclear_model"],
        figure: rutherfordScatteringFigure,
        parts: [
          part(
            "a",
            "Explain the significance of most alpha particles passing undeflected.",
            1,
          ),
          part(
            "b",
            "Explain the significance of a few alpha particles being deflected through large angles.",
            2,
          ),
        ],
        hints: [
          L`Most undeflected particles indicate empty space.`,
          L`Large-angle scattering needs a concentrated repulsive charge.`,
          L`The alpha particle is positively charged.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Connects undeflected particles to empty space.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Connects rare large deflections to a small, massive, positive nucleus.",
          },
        ]),
        commonErrors: [
          "Attributing large deflection to electrons.",
          "Missing that the nucleus is positively charged.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Since most alpha particles passed nearly straight through, most of the atom must be empty space.`,
          },
          {
            part: "b",
            explanation: L`A few alpha particles were scattered through large angles. Such strong repulsion can occur only when a positive alpha particle approaches a small region containing concentrated positive charge and mass. This region is the nucleus.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Rutherford's model resembles a planetary model. Explain why this model was not sufficient to describe stable atoms.`,
        difficulty: 3,
        skillTags: ["rutherford_model_limitation", "atomic_stability"],
        parts: onePart(
          "Give the classical argument against stability and mention the contradiction.",
          3,
        ),
        hints: [
          L`An electron in an orbit is accelerated.`,
          L`Classically, accelerated charges radiate energy.`,
          L`Loss of energy would make the orbit shrink.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States that orbiting electron is accelerated.",
          },
          {
            part: "a",
            points: 1,
            description:
              "States that accelerated charge should radiate energy classically.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Concludes electron should spiral into nucleus, contrary to stable atoms.",
          },
        ]),
        commonErrors: [
          "Saying Rutherford model failed because it had no nucleus.",
          "Ignoring radiation from accelerated charges.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`In Rutherford's model, electrons revolve around the nucleus and therefore have centripetal acceleration.`,
          },
          {
            part: "a",
            explanation: L`According to classical electromagnetic theory, an accelerated charge should emit radiation and lose energy.`,
          },
          {
            part: "a",
            explanation: L`The electron would then spiral into the nucleus, so the atom would be unstable. Since atoms are stable, Rutherford's model was incomplete.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`An alpha-particle scattering experiment gives the following qualitative observations: nearly all particles pass straight through the foil; some are deflected by small angles; about one in many thousands is scattered backward.`,
        difficulty: 3,
        skillTags: ["rutherford_scattering", "evidence_reasoning"],
        parts: [
          part("a", "What does the first observation imply?", 1),
          part(
            "b",
            "What does backward scattering imply about charge and mass distribution?",
            2,
          ),
          part(
            "c",
            "Why could electrons not be responsible for the backward scattering?",
            2,
          ),
        ],
        hints: [
          L`Start from the size of empty space in the atom.`,
          L`Backward scattering requires a strong repulsive centre.`,
          L`Compare the mass of alpha particle and electron.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States most of atom is empty space.",
          },
          {
            part: "b",
            points: 2,
            description: "Identifies small massive positively charged nucleus.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Explains electrons are too light and negatively charged to cause such repulsive backscattering.",
          },
        ]),
        commonErrors: [
          "Confusing alpha particles with electrons.",
          "Claiming backward scattering is due to attraction.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The first observation implies that most of the atom is empty space.`,
          },
          {
            part: "b",
            explanation: L`Backward scattering of a few positive alpha particles implies a small, massive, positively charged centre that can strongly repel them.`,
          },
          {
            part: "c",
            explanation: L`Electrons are negatively charged and much less massive than alpha particles, so they cannot produce strong repulsive backward scattering of alpha particles.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student compares two atomic models after studying alpha-particle scattering. Model P has positive charge spread throughout a sphere. Model Q has positive charge concentrated in a tiny central nucleus.`,
        difficulty: 3,
        skillTags: [
          "case_study",
          "rutherford_model",
          "thomson_model_comparison",
        ],
        parts: [
          part(
            "a",
            "Which model is consistent with rare large-angle scattering?",
            1,
          ),
          part(
            "b",
            "Which observation supports the statement that most of the atom is empty space?",
            1,
          ),
          part("c", "Name one limitation that still remains in model Q.", 2),
        ],
        hints: [
          L`Large scattering needs concentrated charge.`,
          L`Empty space is inferred from undeflected alpha particles.`,
          L`Think about classical radiation from orbiting electrons.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Chooses model Q.",
          },
          {
            part: "b",
            points: 1,
            description: "Mentions most alpha particles pass undeflected.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Explains Rutherford model cannot explain atomic stability or line spectra.",
          },
        ]),
        commonErrors: [
          "Choosing the uniform positive-charge model for backward scattering.",
          "Forgetting that Rutherford model itself was incomplete.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Model Q is consistent with rare large-angle scattering because it has concentrated positive charge in a tiny nucleus.`,
          },
          {
            part: "b",
            explanation: L`The observation that most alpha particles pass through undeflected supports the idea that most of the atom is empty space.`,
          },
          {
            part: "c",
            explanation: L`A limitation of model Q is that classically orbiting electrons should radiate energy and collapse into the nucleus. It also does not explain discrete line spectra.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "8.2",
    title: "Bohr Model of Hydrogen Atom",
    subtopic:
      "Bohr postulates, radius, velocity and energy of electron in nth orbit",
    mc: [
      {
        questionLatex: L`In Bohr's model of hydrogen, the radius of the nth orbit is proportional to`,
        difficulty: 2,
        skillTags: ["bohr_radius", "hydrogen_atom"],
        choices: [L`$n$`, L`$n^2$`, L`$1/n$`, L`$1/n^2$`],
        correctLetter: "B",
        rationales: {
          A: L`Bohr radius grows with the square of the principal quantum number, not linearly.`,
          C: L`This has the trend reversed; outer orbits are larger.`,
          D: L`This is the trend for energy magnitude, not radius.`,
        },
        hints: [
          L`Recall $r_n=a_0 n^2$ for hydrogen.`,
          L`Compare $n=1$ and $n=2$.`,
          L`The second orbit has four times the first radius.`,
        ],
        solution: [
          {
            explanation: L`For hydrogen in Bohr's model,`,
            math: L`r_n=a_0 n^2`,
          },
          {
            explanation: L`Thus radius is proportional to $n^2$.`,
          },
        ],
      },
      {
        questionLatex: L`If the radius of the first Bohr orbit of hydrogen is $a_0$, the radius of the third orbit is`,
        difficulty: 2,
        skillTags: ["bohr_radius", "orbit_scaling"],
        choices: [L`$3a_0$`, L`$9a_0$`, L`$a_0/3$`, L`$a_0/9$`],
        correctLetter: "B",
        rationales: {
          A: L`This uses linear scaling with n instead of $n^2$.`,
          C: L`Radius increases with n, not decreases.`,
          D: L`This is the inverse-square trend.`,
        },
        hints: [L`Use $r_n=a_0 n^2$.`, L`Put $n=3$.`, L`$3^2=9$.`],
        solution: [
          {
            explanation: L`The radius of the nth orbit is`,
            math: L`r_n=a_0 n^2`,
          },
          {
            explanation: L`For $n=3$,`,
            math: L`r_3=9a_0`,
          },
        ],
      },
      {
        questionLatex: L`The total energy of an electron in the second Bohr orbit of hydrogen is`,
        difficulty: 2,
        skillTags: ["bohr_energy", "hydrogen_atom"],
        choices: [
          L`$-13.6\,\text{eV}$`,
          L`$-3.4\,\text{eV}$`,
          L`$+3.4\,\text{eV}$`,
          L`$-54.4\,\text{eV}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`This is the ground-state energy for $n=1$.`,
          C: L`Bound-state energy is negative when zero is chosen at infinity.`,
          D: L`This multiplies by $n^2$ instead of dividing by it.`,
        },
        hints: [
          L`Use $E_n=-13.6/n^2$ eV.`,
          L`Here $n=2$.`,
          L`Divide $13.6$ by $4$.`,
        ],
        solution: [
          {
            explanation: L`Bohr energy levels for hydrogen are`,
            math: L`E_n=-\frac{13.6}{n^2}\,\text{eV}`,
          },
          {
            explanation: L`For $n=2$,`,
            math: L`E_2=-\frac{13.6}{4}=-3.4\,\text{eV}`,
          },
        ],
      },
      {
        questionLatex: L`In Bohr's model of hydrogen, the electron speed in the nth orbit varies as`,
        difficulty: 2,
        skillTags: ["bohr_velocity", "orbit_scaling"],
        choices: [L`$n$`, L`$n^2$`, L`$1/n$`, L`$1/n^2$`],
        correctLetter: "C",
        rationales: {
          A: L`This reverses the trend; speed is smaller in higher orbits.`,
          B: L`This is the scaling for radius, not speed.`,
          D: L`Energy magnitude scales as $1/n^2$; speed scales as $1/n$.`,
        },
        hints: [
          L`Recall $v_n=v_1/n$.`,
          L`The electron is slower in higher orbits.`,
          L`Speed is inversely proportional to $n$.`,
        ],
        solution: [
          {
            explanation: L`In Bohr's hydrogen atom, electron speed in the nth orbit is`,
            math: L`v_n=\frac{v_1}{n}`,
          },
          {
            explanation: L`Therefore $v_n\propto1/n$.`,
          },
        ],
      },
      {
        questionLatex: L`A hydrogen atom already in the $n=2$ state absorbs a photon of energy $2.55\,\text{eV}$. Using $E_n=-13.6/n^2\,\text{eV}$, the atom can be excited to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["bohr_energy", "excitation_energy", "hydrogen_transition"],
        choices: [
          L`$n=3$`,
          L`$n=4$`,
          L`$n=\infty$`,
          L`no allowed Bohr level`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`The $n=2$ to $n=3$ gap is only about $1.89\,\text{eV}$, not $2.55\,\text{eV}$.`,
          C: L`Ionising from $n=2$ would require $3.40\,\text{eV}$.`,
          D: L`The added energy exactly matches the $n=2$ to $n=4$ gap.`,
        },
        hints: [
          L`Find the initial energy $E_2$.`,
          L`Add the absorbed photon energy to $E_2$.`,
          L`Check which $E_n$ equals the final energy.`,
        ],
        solution: [
          {
            explanation: L`For $n=2$,`,
            math: L`E_2=-\frac{13.6}{4}=-3.40\,\text{eV}`,
          },
          {
            explanation: L`After absorbing the photon, the final energy is`,
            math: L`E_f=-3.40+2.55=-0.85\,\text{eV}`,
          },
          {
            explanation: L`Since $E_4=-13.6/16=-0.85\,\text{eV}$, the atom reaches $n=4$.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write the expression for the radius of the nth Bohr orbit of hydrogen.`,
        difficulty: 1,
        skillTags: ["bohr_radius", "formula"],
        parts: onePart("State the formula.", 1),
        hints: [
          L`The first orbit radius is $a_0$.`,
          L`Radius grows as $n^2$.`,
          L`Write $r_n=a_0 n^2$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States rn = a0 n^2 for hydrogen.",
          },
        ]),
        commonErrors: [
          "Writing radius proportional to n only.",
          "Using the energy formula instead of the radius formula.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For hydrogen, the nth Bohr orbit radius is`,
            math: L`r_n=a_0 n^2`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For hydrogen, $r_1=0.53\times10^{-10}\,\text{m}$ in Bohr's model.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["bohr_radius", "orbit_scaling"],
        parts: [
          part("a", "Find the radius of the fourth orbit.", 1),
          part(
            "b",
            "Compare the electron speed in the fourth orbit with that in the first orbit.",
            1,
          ),
        ],
        hints: [
          L`Use $r_n=r_1n^2$.`,
          L`Use $v_n=v_1/n$.`,
          L`For $n=4$, square for radius and divide for speed.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Computes r4 = 16 r1 = 8.48 x 10^-10 m.",
          },
          {
            part: "b",
            points: 1,
            description: "States v4 = v1/4.",
          },
        ]),
        commonErrors: [
          "Using $4r_1$ instead of $16r_1$.",
          "Saying speed increases in higher orbit.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The radius of the nth orbit is $r_n=r_1n^2$.`,
            math: L`r_4=0.53\times16\times10^{-10}=8.48\times10^{-10}\,\text{m}`,
          },
          {
            part: "b",
            explanation: L`Since $v_n=v_1/n$,`,
            math: L`v_4=\frac{v_1}{4}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Use Bohr's energy formula $E_n=-13.6/n^2\,\text{eV}$ for hydrogen.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["bohr_energy", "excitation_energy"],
        parts: [
          part("a", "Find $E_3$.", 1),
          part(
            "b",
            "Find the energy needed to excite hydrogen from $n=1$ to $n=3$.",
            2,
          ),
        ],
        hints: [
          L`Substitute $n=3$ in the energy expression.`,
          L`Excitation energy is final energy minus initial energy.`,
          L`Remember the energies are negative.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Finds E3 about -1.51 eV.",
          },
          {
            part: "b",
            points: 2,
            description: "Uses E3 - E1 to get about 12.09 eV.",
          },
        ]),
        commonErrors: [
          "Dropping the negative sign before finding the difference.",
          "Adding magnitudes incorrectly.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For $n=3$,`,
            math: L`E_3=-\frac{13.6}{9}=-1.51\,\text{eV}`,
          },
          {
            part: "b",
            explanation: L`The excitation energy from $n=1$ to $n=3$ is`,
            math: L`\Delta E=E_3-E_1=(-1.51)-(-13.6)=12.09\,\text{eV}`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`State Bohr's main postulates for the hydrogen atom and use them to explain why atomic spectra are discrete.`,
        difficulty: 3,
        skillTags: ["bohr_postulates", "hydrogen_spectrum"],
        parts: [
          part("a", "State the postulate about stationary orbits.", 2),
          part("b", "State the angular-momentum quantisation condition.", 1),
          part("c", "Explain the origin of a spectral line.", 2),
        ],
        hints: [
          L`Stationary orbits do not radiate energy.`,
          L`Angular momentum is quantised in units of $h/(2\pi)$.`,
          L`Radiation is emitted or absorbed during transitions between allowed levels.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "States electrons revolve in certain stable stationary orbits without radiating.",
          },
          {
            part: "b",
            points: 1,
            description: "States mvr = nh/2pi.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Connects transition energy difference to photon frequency h nu = Ei - Ef.",
          },
        ]),
        commonErrors: [
          "Saying electrons radiate continuously in allowed orbits.",
          "Missing the energy difference condition for spectral lines.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Bohr proposed that an electron can revolve only in certain stationary orbits around the nucleus and does not radiate energy while it remains in one of these orbits.`,
          },
          {
            part: "b",
            explanation: L`The allowed orbits satisfy angular-momentum quantisation.`,
            math: L`mvr=\frac{nh}{2\pi},\qquad n=1,2,3,\ldots`,
          },
          {
            part: "c",
            explanation: L`A spectral line is produced when an electron jumps between two allowed energy levels and a photon is emitted or absorbed.`,
            math: L`h\nu=|E_i-E_f|`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A hydrogen atom initially in the ground state absorbs a photon of energy $12.75\,\text{eV}$ and reaches an allowed Bohr orbit. Use $E_n=-13.6/n^2\,\text{eV}$, $r_n=a_0n^2$, and $v_n=v_1/n$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: [
          "case_study",
          "bohr_scaling",
          "excitation_energy",
          "hydrogen_transition",
        ],
        parts: [
          part("a", "Identify the final orbit.", 2),
          part(
            "b",
            "Find the ratio of the final orbital radius to the first-orbit radius.",
            1,
          ),
          part(
            "c",
            "Find the ratio of the final electron speed to the first-orbit speed.",
            1,
          ),
          part(
            "d",
            "If the electron then falls directly to $n=2$, find the emitted photon energy.",
            2,
          ),
        ],
        hints: [
          L`Add the absorbed energy to $E_1=-13.6\,\text{eV}$.`,
          L`Match the resulting energy with $E_n=-13.6/n^2$.`,
          L`For the later emission, subtract the $n=2$ energy from the final-level energy in magnitude.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Shows final energy is -0.85 eV and identifies n = 4.",
          },
          {
            part: "b",
            points: 1,
            description: "Gives radius ratio 16.",
          },
          {
            part: "c",
            points: 1,
            description: "Gives speed ratio 1/4.",
          },
          {
            part: "d",
            points: 2,
            description:
              "Finds emitted photon energy 2.55 eV for n = 4 to n = 2.",
          },
        ]),
        commonErrors: [
          "Treating 12.75 eV as the final energy instead of an absorbed energy.",
          "Using radius scaling for electron speed.",
          "Subtracting energy levels without taking the emitted photon's positive magnitude.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The ground-state energy is $E_1=-13.6\,\text{eV}$. After absorption,`,
            math: L`E_f=-13.6+12.75=-0.85\,\text{eV}`,
          },
          {
            part: "a",
            explanation: L`Since $E_4=-13.6/16=-0.85\,\text{eV}$, the final orbit is $n=4$.`,
          },
          {
            part: "b",
            explanation: L`The radius ratio is`,
            math: L`\frac{r_4}{r_1}=4^2=16`,
          },
          {
            part: "c",
            explanation: L`The speed ratio is`,
            math: L`\frac{v_4}{v_1}=\frac14`,
          },
          {
            part: "d",
            explanation: L`For the direct transition from $n=4$ to $n=2$,`,
            math: L`E_\gamma=|-0.85-(-3.40)|=2.55\,\text{eV}`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "8.3",
    title: "Hydrogen Energy Levels and Spectrum",
    subtopic:
      "Energy-level transitions and qualitative hydrogen spectral series",
    mc: [
      {
        questionLatex: L`In the energy-level figure for hydrogen, transition C ends at $n=1$ from $n=2$. The emitted photon energy is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["energy_level_diagram", "hydrogen_transition"],
        figure: bohrEnergyLevelFigure,
        choices: [
          L`$1.89\,\text{eV}$`,
          L`$2.55\,\text{eV}$`,
          L`$10.2\,\text{eV}$`,
          L`$13.6\,\text{eV}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`This is the $n=3$ to $n=2$ energy difference, not $n=2$ to $n=1$.`,
          B: L`This is the $n=4$ to $n=2$ energy difference.`,
          D: L`This is ionisation energy from ground state, not this transition.`,
        },
        hints: [
          L`Read $E_2$ and $E_1$ from the diagram.`,
          L`Photon energy is the magnitude of the energy difference.`,
          L`Compute $|-3.40-(-13.6)|$.`,
        ],
        solution: [
          {
            explanation: L`From the diagram, $E_2=-3.40\,\text{eV}$ and $E_1=-13.6\,\text{eV}$.`,
          },
          {
            explanation: L`The emitted photon energy is`,
            math: L`|E_2-E_1|=|-3.40+13.6|=10.2\,\text{eV}`,
          },
        ],
      },
      {
        questionLatex: L`In hydrogen, transitions ending at $n=1$ form the`,
        difficulty: 1,
        skillTags: ["hydrogen_spectrum", "spectral_series"],
        choices: [
          L`Balmer series`,
          L`Lyman series`,
          L`Paschen series`,
          L`Brackett series`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`Balmer transitions end at $n=2$.`,
          C: L`Paschen transitions end at $n=3$.`,
          D: L`Brackett transitions end at $n=4$.`,
        },
        hints: [
          L`The first spectral series of hydrogen ends at the ground state.`,
          L`The Balmer series ends at $n=2$.`,
          L`The series ending at $n=1$ is Lyman.`,
        ],
        solution: [
          {
            explanation: L`Hydrogen transitions ending at $n=1$ are in the Lyman series.`,
          },
        ],
      },
      {
        questionLatex: L`Which transition shown in the energy-level diagram corresponds to the smallest emitted photon energy?`,
        difficulty: 2,
        skillTags: ["energy_level_diagram", "transition_energy"],
        figure: bohrEnergyLevelFigure,
        choices: [L`A`, L`B`, L`C`, L`All three have equal energy`],
        correctLetter: "A",
        rationales: {
          B: L`Transition B spans a larger energy gap than A.`,
          C: L`Transition C ends at $n=1$ and has a much larger energy gap.`,
          D: L`The energy-level spacings are not equal.`,
        },
        hints: [
          L`Compare vertical gaps between the initial and final levels.`,
          L`The smallest gap gives the smallest photon energy.`,
          L`Transition A is from $n=4$ to $n=2$.`,
        ],
        solution: [
          {
            explanation: L`Photon energy equals the energy-level gap.`,
          },
          {
            explanation: L`From the diagram, A is $n=4$ to $n=2$, with energy $|-0.85-(-3.40)|=2.55\,\text{eV}$. B and C have larger gaps.`,
          },
        ],
      },
      {
        questionLatex: L`For hydrogen, the energy levels become closer together as n increases. This explains why spectral lines in a series`,
        difficulty: 2,
        skillTags: ["hydrogen_spectrum", "series_limit"],
        choices: [
          L`become equally spaced at high frequency`,
          L`converge toward a series limit`,
          L`disappear because electrons stop moving`,
          L`all have the same wavelength`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`The energy levels are not equally spaced; the lines crowd together.`,
          C: L`Electrons do not stop moving in higher Bohr orbits.`,
          D: L`Different transitions have different energy gaps and wavelengths.`,
        },
        hints: [
          L`Look at how the levels approach $E=0$.`,
          L`Higher levels get closer together.`,
          L`The corresponding spectral lines crowd toward a limiting value.`,
        ],
        solution: [
          {
            explanation: L`As $n$ increases, hydrogen energy levels approach zero and become closer together.`,
          },
          {
            explanation: L`Therefore the spectral lines in a given series converge toward a series limit.`,
          },
        ],
      },
      {
        questionLatex: L`A hydrogen atom emits a photon when its electron jumps from $n=3$ to $n=2$. Using the energy levels in the figure, the photon energy is closest to`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["energy_level_diagram", "balmer_transition"],
        figure: bohrEnergyLevelFigure,
        choices: [
          L`$1.89\,\text{eV}$`,
          L`$10.2\,\text{eV}$`,
          L`$12.09\,\text{eV}$`,
          L`$13.6\,\text{eV}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This is the $n=2$ to $n=1$ gap.`,
          C: L`This is the $n=3$ to $n=1$ gap.`,
          D: L`This is the ionisation energy from the ground state.`,
        },
        hints: [
          L`Read $E_3$ and $E_2$ from the diagram.`,
          L`The emitted photon energy is the difference in energies.`,
          L`Compute $|-1.51-(-3.40)|$.`,
        ],
        solution: [
          {
            explanation: L`From the diagram, $E_3=-1.51\,\text{eV}$ and $E_2=-3.40\,\text{eV}$.`,
          },
          {
            explanation: L`The energy emitted is`,
            math: L`|-1.51-(-3.40)|=1.89\,\text{eV}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Name the hydrogen spectral series whose transitions end at $n=2$.`,
        difficulty: 1,
        skillTags: ["hydrogen_spectrum", "balmer_series"],
        parts: onePart("Write the name of the series.", 1),
        hints: [
          L`Lyman ends at $n=1$.`,
          L`The visible hydrogen series ends at $n=2$.`,
          L`That series is Balmer.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Names Balmer series.",
          },
        ]),
        commonErrors: [
          "Writing Lyman for transitions ending at n=2.",
          "Naming the series from the starting level instead of the final level.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Transitions ending at $n=2$ form the Balmer series.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Use the energy-level diagram of hydrogen.`,
        difficulty: 3,
        skillTags: ["energy_level_diagram", "transition_energy"],
        figure: bohrEnergyLevelFigure,
        parts: [
          part(
            "a",
            "Find the energy of the photon emitted in transition B.",
            2,
          ),
          part(
            "b",
            "State whether this transition ends in the Lyman or Balmer series.",
            1,
          ),
        ],
        hints: [
          L`Read the initial and final levels for transition B.`,
          L`Subtract the two energy values.`,
          L`A transition ending at $n=1$ is Lyman; at $n=2$ is Balmer.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Uses E3 and E1 to get 12.09 eV.",
          },
          {
            part: "b",
            points: 1,
            description: "Identifies Lyman series.",
          },
        ]),
        commonErrors: [
          "Using the lower energy value alone as photon energy.",
          "Calling any visible transition Lyman.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Transition B is from $n=3$ to $n=1$.`,
            math: L`E_\gamma=|-1.51-(-13.6)|=12.09\,\text{eV}`,
          },
          {
            part: "b",
            explanation: L`Since it ends at $n=1$, it belongs to the Lyman series.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An electron in hydrogen goes from $n=4$ to $n=2$ and emits a photon. Using $E_4=-0.85\,\text{eV}$ and $E_2=-3.40\,\text{eV}$, answer the following.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["hydrogen_transition", "photon_energy"],
        parts: [
          part("a", "Find the photon energy.", 1),
          part(
            "b",
            "Is this an absorption or emission transition? Give a reason.",
            1,
          ),
        ],
        hints: [
          L`The electron moves to a lower energy level.`,
          L`Photon energy is the magnitude of the difference.`,
          L`Moving downward emits energy.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Computes 2.55 eV.",
          },
          {
            part: "b",
            points: 1,
            description:
              "Identifies emission because electron goes to lower energy.",
          },
        ]),
        commonErrors: [
          "Reporting a negative photon energy.",
          "Calling downward transition absorption.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The photon energy is`,
            math: L`E_\gamma=|-0.85-(-3.40)|=2.55\,\text{eV}`,
          },
          {
            part: "b",
            explanation: L`This is emission because the electron moves from a higher level to a lower level and releases the energy difference.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Explain qualitatively how Bohr's model accounts for the line spectrum of hydrogen.`,
        difficulty: 3,
        skillTags: ["hydrogen_spectrum", "bohr_model"],
        parts: [
          part("a", "Why are only certain photon energies emitted?", 2),
          part(
            "b",
            "Why do lines in a series get closer near the series limit?",
            2,
          ),
          part(
            "c",
            "Why is a continuous spectrum not expected from isolated hydrogen atoms in this model?",
            1,
          ),
        ],
        hints: [
          L`Allowed electron energies are discrete.`,
          L`Photon energy equals the difference between two allowed levels.`,
          L`The levels crowd together as $n$ becomes large.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Connects discrete levels and transitions to discrete photon energies.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Explains convergence because high-n levels are closer.",
          },
          {
            part: "c",
            points: 1,
            description:
              "States arbitrary photon energies are not possible for isolated atoms.",
          },
        ]),
        commonErrors: [
          "Explaining line spectra using continuously changing electron radius.",
          "Treating all transitions as having equal energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`In Bohr's model, the electron can occupy only certain stationary energy levels. A photon is emitted only when the electron jumps from one allowed level to another, so only specific energy differences are possible.`,
          },
          {
            part: "b",
            explanation: L`For large $n$, the energy levels approach zero and become closer together. Hence the spectral lines corresponding to those transitions crowd together near a series limit.`,
          },
          {
            part: "c",
            explanation: L`A continuous spectrum is not expected because the isolated hydrogen atom cannot emit photons of arbitrary energy; it emits only energies equal to differences between allowed levels.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student observes hydrogen spectral lines and represents possible transitions using the energy-level diagram.`,
        difficulty: 3,
        skillTags: ["case_study", "energy_levels", "hydrogen_spectrum"],
        figure: bohrEnergyLevelFigure,
        parts: [
          part(
            "a",
            "Which shown transition emits the highest-energy photon?",
            1,
          ),
          part("b", "Which shown transition belongs to the Balmer series?", 1),
          part(
            "c",
            "Explain why transition A has lower photon energy than transition C.",
            2,
          ),
        ],
        hints: [
          L`Photon energy depends on vertical energy gap.`,
          L`Balmer transitions end at $n=2$.`,
          L`Compare the endpoints of A and C.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Identifies B.",
          },
          {
            part: "b",
            points: 1,
            description: "Identifies A.",
          },
          {
            part: "c",
            points: 2,
            description: "Compares energy gaps correctly.",
          },
        ]),
        commonErrors: [
          "Choosing the longest arrow label by name rather than energy gap.",
          "Calling any downward transition Balmer.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Transition B has the largest energy drop among the three shown transitions, so it emits the highest-energy photon.`,
          },
          {
            part: "b",
            explanation: L`Transition A ends at $n=2$, so it belongs to the Balmer series.`,
          },
          {
            part: "c",
            explanation: L`Transition A is from $n=4$ to $n=2$, while C is from $n=2$ to $n=1$. The $n=2$ to $n=1$ gap is much larger than the $n=4$ to $n=2$ gap, so C has higher photon energy.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "8.4",
    title: "Nuclear Composition, Size, and Mass Defect",
    subtopic:
      "Nucleons, isotopes, isobars, nuclear radius relation, nuclear force, and mass defect",
    mc: [
      {
        questionLatex: L`The nucleus $_{17}^{35}\text{Cl}$ contains`,
        difficulty: 2,
        skillTags: ["nuclear_composition", "mass_number"],
        choices: [
          L`17 protons and 18 neutrons`,
          L`18 protons and 17 neutrons`,
          L`35 protons and 17 neutrons`,
          L`17 protons and 35 neutrons`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Atomic number gives protons, so chlorine has 17 protons, not 18.`,
          C: L`Mass number is total nucleons, not number of protons.`,
          D: L`Neutrons equal $A-Z$, not $A$.`,
        },
        hints: [
          L`In $_Z^AX$, $Z$ is proton number and $A$ is total nucleon number.`,
          L`Neutron number is $A-Z$.`,
          L`Compute $35-17$.`,
        ],
        solution: [
          {
            explanation: L`For $_{17}^{35}\text{Cl}$, $Z=17$ and $A=35$.`,
          },
          {
            explanation: L`Number of neutrons is`,
            math: L`N=A-Z=35-17=18`,
          },
        ],
      },
      {
        questionLatex: L`The nuclear radius is given by $R=R_0A^{1/3}$. If the mass number changes from $A$ to $8A$, the nuclear radius becomes`,
        difficulty: 2,
        skillTags: ["nuclear_radius", "scaling"],
        choices: [L`$2R$`, L`$4R$`, L`$8R$`, L`$R/2$`],
        correctLetter: "A",
        rationales: {
          B: L`Radius scales with the cube root of mass number, not the square root.`,
          C: L`This treats radius as directly proportional to mass number.`,
          D: L`Increasing mass number increases radius.`,
        },
        hints: [
          L`Use the cube-root dependence.`,
          L`$(8A)^{1/3}=2A^{1/3}$.`,
          L`So the radius doubles.`,
        ],
        solution: [
          {
            explanation: L`Using the radius relation,`,
            math: L`R'=R_0(8A)^{1/3}=2R_0A^{1/3}=2R`,
          },
        ],
      },
      {
        questionLatex: L`Which pair represents isotopes?`,
        difficulty: 2,
        skillTags: ["isotopes", "nuclear_composition"],
        choices: [
          L`$_6^{12}\text{C}$ and $_6^{14}\text{C}$`,
          L`$_6^{14}\text{C}$ and $_7^{14}\text{N}$`,
          L`$_1^2\text{H}$ and $_2^4\text{He}$`,
          L`$_8^{16}\text{O}$ and $_7^{16}\text{N}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`These have the same mass number but different atomic numbers, so they are isobars.`,
          C: L`These have different atomic numbers and different mass numbers.`,
          D: L`These have the same mass number but different atomic numbers, so they are isobars.`,
        },
        hints: [
          L`Isotopes have the same atomic number.`,
          L`They have different mass numbers.`,
          L`Look for the same lower number but different upper number.`,
        ],
        solution: [
          {
            explanation: L`Isotopes have the same atomic number but different mass numbers.`,
          },
          {
            explanation: L`$_6^{12}\text{C}$ and $_6^{14}\text{C}$ both have $Z=6$ but different $A$, so they are isotopes.`,
          },
        ],
      },
      {
        questionLatex: L`The nuclear force is best described as`,
        difficulty: 2,
        skillTags: ["nuclear_force", "nuclear_properties"],
        choices: [
          L`long-ranged and purely electric`,
          L`short-ranged, strong, and nearly charge independent between nucleons`,
          L`weaker than gravitational force at nuclear distances`,
          L`acting only between protons and never between neutrons`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`The nuclear force is not an electric force and is short-ranged.`,
          C: L`At nuclear distances, nuclear force is much stronger than gravity.`,
          D: L`It acts between nucleons, including neutron-neutron and proton-neutron pairs.`,
        },
        hints: [
          L`It must overcome proton-proton electrostatic repulsion inside nuclei.`,
          L`It acts only over nuclear distances.`,
          L`It is not simply Coulomb's force.`,
        ],
        solution: [
          {
            explanation: L`The nuclear force is a short-range, very strong attractive force between nucleons and is approximately charge independent.`,
          },
        ],
      },
      {
        questionLatex: L`For a nucleus of mass number $56$, the mass of separated nucleons is $56.450\,\text{u}$ and the actual nuclear mass is $55.934\,\text{u}$. Using $1\,\text{u}=931\,\text{MeV}/c^2$, its binding energy per nucleon is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["mass_defect", "binding_energy_per_nucleon"],
        choices: [
          L`$0.516\,\text{MeV}$`,
          L`$8.58\,\text{MeV}$`,
          L`$480\,\text{MeV}$`,
          L`$56.0\,\text{MeV}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`This leaves the mass defect in u and does not convert to energy or divide correctly.`,
          C: L`This is the total binding energy, not the value per nucleon.`,
          D: L`This divides by an incorrect factor after conversion.`,
        },
        hints: [
          L`First find the mass defect.`,
          L`Convert the defect from u to MeV.`,
          L`Divide total binding energy by mass number 56.`,
        ],
        solution: [
          {
            explanation: L`The mass defect is`,
            math: L`\Delta m=56.450-55.934=0.516\,\text{u}`,
          },
          {
            explanation: L`The total binding energy is`,
            math: L`B=0.516\times931\approx480.4\,\text{MeV}`,
          },
          {
            explanation: L`Therefore the binding energy per nucleon is`,
            math: L`\frac{B}{A}=\frac{480.4}{56}\approx8.58\,\text{MeV}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What is meant by mass defect of a nucleus?`,
        difficulty: 1,
        skillTags: ["mass_defect", "definition"],
        parts: onePart("Define mass defect.", 1),
        hints: [
          L`Compare the nucleus with its separated nucleons.`,
          L`The nucleus has lower mass.`,
          L`Mass defect is the difference.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Defines mass defect as difference between total mass of separated nucleons and actual mass of nucleus.",
          },
        ]),
        commonErrors: [
          "Calling mass defect the total mass of the nucleus.",
          "Reversing the subtraction and making the mass defect negative.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Mass defect is the difference between the total mass of the separated protons and neutrons of a nucleus and the actual mass of the bound nucleus.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For the nucleus $_{11}^{23}\text{Na}$, find the number of protons and neutrons.`,
        difficulty: 2,
        skillTags: ["nuclear_composition", "mass_number"],
        parts: onePart("Find proton number and neutron number.", 2),
        hints: [
          L`The lower number is atomic number.`,
          L`The upper number is mass number.`,
          L`Neutron number is $A-Z$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Identifies 11 protons.",
          },
          {
            part: "a",
            points: 1,
            description: "Computes 12 neutrons.",
          },
        ]),
        commonErrors: [
          "Taking mass number as proton number.",
          "Forgetting to subtract to find neutrons.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Here $Z=11$ and $A=23$.`,
          },
          {
            part: "a",
            explanation: L`So protons are $11$ and neutrons are`,
            math: L`N=A-Z=23-11=12`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Using $R=R_0A^{1/3}$, compare the radii of nuclei with mass numbers $27$ and $216$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["nuclear_radius", "scaling"],
        parts: onePart("Find the ratio $R_{216}/R_{27}$.", 2),
        hints: [
          L`Radius ratio is cube root of mass-number ratio.`,
          L`Use $216/27=8$.`,
          L`Cube root of 8 is 2.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Sets up radius ratio using cube-root relation.",
          },
          {
            part: "a",
            points: 1,
            description: "Obtains ratio 2.",
          },
        ]),
        commonErrors: [
          "Using direct ratio 216/27 = 8 as radius ratio.",
          "Taking square root instead of cube root.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The ratio is`,
            math: L`\frac{R_{216}}{R_{27}}=\left(\frac{216}{27}\right)^{1/3}=8^{1/3}=2`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A nucleus of mass number $16$ has actual mass $15.990\,\text{u}$. The total mass of its separated nucleons is $16.130\,\text{u}$. Use $1\,\text{u}=931\,\text{MeV}/c^2$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["mass_defect", "binding_energy", "binding_energy_per_nucleon"],
        parts: [
          part("a", "Find the mass defect.", 1),
          part("b", "Find the binding energy in MeV.", 2),
          part("c", "Find the binding energy per nucleon and state what it indicates.", 2),
        ],
        hints: [
          L`Subtract actual mass from separated-nucleon mass.`,
          L`Convert u to MeV using 931 MeV per u.`,
          L`Divide the total binding energy by mass number to compare stability.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Computes mass defect 0.140 u.",
          },
          {
            part: "b",
            points: 2,
            description: "Multiplies by 931 to get about 130 MeV.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Finds about 8.15 MeV per nucleon and connects it to average nuclear binding/stability.",
          },
        ]),
        commonErrors: [
          "Subtracting in the reverse order.",
          "Stopping at total binding energy when the question asks per nucleon.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The mass defect is`,
            math: L`\Delta m=16.130-15.990=0.140\,\text{u}`,
          },
          {
            part: "b",
            explanation: L`The binding energy is`,
            math: L`B=0.140\times931\approx130\,\text{MeV}`,
          },
          {
            part: "c",
            explanation: L`The binding energy per nucleon is`,
            math: L`\frac{130.3}{16}\approx8.15\,\text{MeV per nucleon}`,
          },
          {
            part: "c",
            explanation: L`This indicates the average energy needed per nucleon to separate the nucleus, so it is used to compare relative nuclear stability.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A graph of nuclear radius $R$ against $A^{1/3}$ is shown for several nuclei.`,
        difficulty: 3,
        skillTags: ["case_study", "nuclear_radius", "graph_interpretation"],
        figure: nuclearRadiusFigure,
        parts: [
          part(
            "a",
            "What does the straight-line graph imply about the relation between $R$ and $A$?",
            1,
          ),
          part(
            "b",
            "If the mass number becomes $64$ times larger, how does the radius change?",
            1,
          ),
          part(
            "c",
            "What does this imply about the approximate density of nuclei?",
            2,
          ),
        ],
        hints: [
          L`The graph is linear in $A^{1/3}$.`,
          L`Cube root of $64$ is $4$.`,
          L`Mass is proportional to $A$, while volume is proportional to $R^3$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States R proportional to A^(1/3).",
          },
          {
            part: "b",
            points: 1,
            description: "States radius becomes 4 times.",
          },
          {
            part: "c",
            points: 2,
            description: "Explains nuclear density is roughly constant.",
          },
        ]),
        commonErrors: [
          "Saying radius is directly proportional to A.",
          "Missing the density implication.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The straight-line graph of $R$ versus $A^{1/3}$ implies`,
            math: L`R=R_0A^{1/3}`,
          },
          {
            part: "b",
            explanation: L`If $A$ becomes $64A$, then radius becomes`,
            math: L`R'=R_0(64A)^{1/3}=4R`,
          },
          {
            part: "c",
            explanation: L`Since nuclear mass is roughly proportional to $A$ and volume is proportional to $R^3\propto A$, the density is approximately constant for nuclei.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "8.5",
    title: "Binding Energy, Fission, and Fusion",
    subtopic:
      "Binding energy per nucleon curve, stability, fission and fusion energy release",
    mc: [
      {
        questionLatex: L`A nucleus has binding energy $160\,\text{MeV}$ and mass number $20$. Its binding energy per nucleon is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["binding_energy_per_nucleon", "nuclear_stability"],
        choices: [
          L`$4\,\text{MeV}$`,
          L`$8\,\text{MeV}$`,
          L`$20\,\text{MeV}$`,
          L`$160\,\text{MeV}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`This divides by 40 implicitly; divide by the mass number 20.`,
          C: L`This is the mass number, not energy per nucleon.`,
          D: L`This is total binding energy, not per nucleon.`,
        },
        hints: [
          L`Binding energy per nucleon is total binding energy divided by $A$.`,
          L`Divide $160$ by $20$.`,
          L`The unit remains MeV per nucleon.`,
        ],
        solution: [
          {
            explanation: L`Binding energy per nucleon is`,
            math: L`\frac{B}{A}=\frac{160}{20}=8\,\text{MeV per nucleon}`,
          },
        ],
      },
      {
        questionLatex: L`From the binding-energy-per-nucleon curve, energy is released in fusion of light nuclei because the product nucleus generally moves`,
        difficulty: 2,
        skillTags: ["binding_energy_curve", "nuclear_fusion"],
        figure: bindingEnergyCurveFigure,
        choices: [
          L`toward lower binding energy per nucleon`,
          L`toward higher binding energy per nucleon`,
          L`to zero binding energy per nucleon`,
          L`to a state with no mass defect`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`Moving to lower binding energy per nucleon would require energy, not release it.`,
          C: L`A stable product does not have zero binding energy per nucleon.`,
          D: L`Energy release is associated with mass defect, not absence of it.`,
        },
        hints: [
          L`Look at the left side of the binding energy curve.`,
          L`Light nuclei gain stability by moving upward on the curve.`,
          L`Higher binding energy per nucleon means more tightly bound products.`,
        ],
        solution: [
          {
            explanation: L`Fusion of light nuclei can form a product with higher binding energy per nucleon.`,
          },
          {
            explanation: L`The increase in binding energy appears as released energy.`,
          },
        ],
      },
      {
        questionLatex: L`Nuclear fission of a very heavy nucleus releases energy mainly because the fragments have`,
        difficulty: 2,
        skillTags: ["nuclear_fission", "binding_energy_curve"],
        figure: bindingEnergyCurveFigure,
        choices: [
          L`smaller total charge than the original nucleus`,
          L`higher binding energy per nucleon than the original heavy nucleus`,
          L`zero binding energy`,
          L`larger mass than the original nucleus by exactly one neutron mass`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`Energy release is explained by increased binding energy per nucleon, not simply smaller charge.`,
          C: L`The fragments are bound nuclei, not zero-binding systems.`,
          D: L`The products have slightly lower total mass-energy, not larger by one neutron mass.`,
        },
        hints: [
          L`Heavy nuclei lie on the falling right side of the curve.`,
          L`Medium-mass fragments lie closer to the high-binding region.`,
          L`Energy release comes from the increase in total binding energy.`,
        ],
        solution: [
          {
            explanation: L`A heavy nucleus split into medium-mass fragments can move toward the higher binding-energy-per-nucleon region.`,
          },
          {
            explanation: L`The increased binding energy is released as energy in fission.`,
          },
        ],
      },
      {
        questionLatex: L`A fission event has total initial mass $236.0526\,\text{u}$ and total final mass $235.8667\,\text{u}$. Using $1\,\text{u}=931\,\text{MeV}/c^2$, the energy released is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["mass_energy_relation", "nuclear_fission", "energy_release"],
        choices: [
          L`$17.3\,\text{MeV}$`,
          L`$86.6\,\text{MeV}$`,
          L`$173\,\text{MeV}$`,
          L`$931\,\text{MeV}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`This loses one decimal place in the mass-energy conversion.`,
          B: L`This uses roughly half the mass defect.`,
          D: L`This is the energy equivalent of $1\,\text{u}$, not the small mass defect here.`,
        },
        hints: [
          L`Find the mass defect: initial mass minus final mass.`,
          L`Convert the mass defect from u to MeV.`,
          L`Multiply by $931$.`,
        ],
        solution: [
          {
            explanation: L`The mass defect is`,
            math: L`\Delta m=236.0526-235.8667=0.1859\,\text{u}`,
          },
          {
            explanation: L`The energy released is`,
            math: L`E=0.1859\times931\approx173\,\text{MeV}`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Binding energy per nucleon is a useful measure of nuclear stability. Reason (R): It gives the average energy needed per nucleon to separate the nucleus completely. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "binding_energy_per_nucleon"],
        choices: [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The reason directly explains why larger average binding indicates greater stability.`,
          C: L`The reason is true: it is an average separation energy per nucleon.`,
          D: L`The assertion is true; binding energy per nucleon compares stability across nuclei.`,
        },
        hints: [
          L`Think of binding energy as separation energy.`,
          L`Per nucleon makes comparison fair for different mass numbers.`,
          L`A larger value means more tightly bound nucleons on average.`,
        ],
        solution: [
          {
            explanation: L`Binding energy per nucleon measures average binding of nucleons in a nucleus.`,
          },
          {
            explanation: L`Thus it is useful for comparing nuclear stability. Both statements are true, and R explains A.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What does a high value of binding energy per nucleon indicate about a nucleus?`,
        difficulty: 1,
        skillTags: ["binding_energy_per_nucleon", "nuclear_stability"],
        parts: onePart("State the physical meaning.", 1),
        hints: [
          L`Binding energy is separation energy.`,
          L`Per nucleon gives average binding.`,
          L`High average binding means greater stability.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States that nucleons are more tightly bound and the nucleus is relatively more stable.",
          },
        ]),
        commonErrors: [
          "Saying high binding energy per nucleon means the nucleus is easy to break.",
          "Comparing nuclei by total binding energy instead of binding energy per nucleon.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`A high binding energy per nucleon means the nucleons are strongly bound on average, so the nucleus is relatively stable.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A nucleus has mass number $40$ and total binding energy $340\,\text{MeV}$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["binding_energy_per_nucleon"],
        parts: [
          part("a", "Find the binding energy per nucleon.", 1),
          part("b", "What does this value help us compare?", 1),
        ],
        hints: [
          L`Divide total binding energy by mass number.`,
          L`The result is an average binding per nucleon.`,
          L`This helps compare stability of nuclei of different sizes.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Calculates 8.5 MeV per nucleon.",
          },
          {
            part: "b",
            points: 1,
            description: "States it helps compare nuclear stability.",
          },
        ]),
        commonErrors: [
          "Multiplying binding energy by mass number.",
          "Comparing total binding energy directly across different nuclei.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The binding energy per nucleon is`,
            math: L`\frac{340}{40}=8.5\,\text{MeV per nucleon}`,
          },
          {
            part: "b",
            explanation: L`This value helps compare the relative stability of nuclei with different mass numbers.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A reaction has initial total mass $4.0320\,\text{u}$ and final total mass $4.0026\,\text{u}$. Use $1\,\text{u}=931\,\text{MeV}/c^2$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["mass_energy_relation", "energy_release"],
        parts: [
          part("a", "Find the mass defect.", 1),
          part("b", "Find the energy released in MeV.", 2),
        ],
        hints: [
          L`Mass defect is initial mass minus final mass for an energy-releasing reaction.`,
          L`Convert u to MeV using 931.`,
          L`Keep three significant figures if needed.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Computes 0.0294 u.",
          },
          {
            part: "b",
            points: 2,
            description: "Computes about 27.4 MeV.",
          },
        ]),
        commonErrors: [
          "Using final minus initial and getting a negative release.",
          "Forgetting the 931 MeV conversion.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The mass defect is`,
            math: L`\Delta m=4.0320-4.0026=0.0294\,\text{u}`,
          },
          {
            part: "b",
            explanation: L`The energy released is`,
            math: L`E=0.0294\times931\approx27.4\,\text{MeV}`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Use the binding-energy-per-nucleon curve to explain why both fusion of light nuclei and fission of heavy nuclei can release energy.`,
        difficulty: 4,
        skillTags: ["binding_energy_curve", "fission", "fusion"],
        figure: bindingEnergyCurveFigure,
        parts: [
          part("a", "Explain energy release in fusion of light nuclei.", 2),
          part("b", "Explain energy release in fission of heavy nuclei.", 2),
          part("c", "State what happens to total mass-energy in each case.", 1),
        ],
        hints: [
          L`Energy is released when products are more tightly bound.`,
          L`Light nuclei move upward on the left side of the curve by fusion.`,
          L`Heavy nuclei move toward medium masses by fission.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Explains fusion products have higher binding energy per nucleon.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Explains fission fragments have higher binding energy per nucleon than very heavy nucleus.",
          },
          {
            part: "c",
            points: 1,
            description:
              "Connects energy release with decrease in mass-energy.",
          },
        ]),
        commonErrors: [
          "Saying any splitting of any nucleus releases energy.",
          "Saying energy release occurs when binding energy per nucleon decreases.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For light nuclei, fusion can produce a nucleus with higher binding energy per nucleon, moving upward on the left side of the curve. The increase in binding energy is released.`,
          },
          {
            part: "b",
            explanation: L`For very heavy nuclei, fission produces medium-mass fragments closer to the high-binding-energy region of the curve. Their average binding energy per nucleon is higher, so energy is released.`,
          },
          {
            part: "c",
            explanation: L`In both cases, the final products have slightly lower total mass-energy than the initial system. The mass difference appears as released energy.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`The labelled points L, M and H on the binding-energy-per-nucleon curve represent light, medium and heavy nuclei respectively. A heavy nucleus near H has $A=236$ and binding energy per nucleon $7.6\,\text{MeV}$. It splits into fragments with the same total mass number and average binding energy per nucleon $8.5\,\text{MeV}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: [
          "case_study",
          "binding_energy_curve",
          "nuclear_fission",
          "energy_release",
        ],
        figure: bindingEnergyCurveFigure,
        parts: [
          part(
            "a",
            "Which labelled point represents the most stable region?",
            1,
          ),
          part(
            "b",
            "Find the increase in binding energy per nucleon in the fission described.",
            1,
          ),
          part(
            "c",
            "Estimate the total energy released in this fission event.",
            2,
          ),
          part(
            "d",
            "Use the curve to explain why this fission releases energy.",
            2,
          ),
        ],
        hints: [
          L`Most stability corresponds to maximum binding energy per nucleon.`,
          L`Subtract the initial binding energy per nucleon from the final average value.`,
          L`Multiply the increase per nucleon by the total number of nucleons.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Identifies M.",
          },
          {
            part: "b",
            points: 1,
            description: "Finds increase 0.9 MeV per nucleon.",
          },
          {
            part: "c",
            points: 2,
            description: "Estimates energy release about 212 MeV.",
          },
          {
            part: "d",
            points: 2,
            description:
              "Explains fragments move toward higher binding energy per nucleon, so mass-energy is released.",
          },
        ]),
        commonErrors: [
          "Using total mass number as the energy released directly.",
          "Saying fission releases energy because binding energy per nucleon decreases.",
          "Forgetting to multiply the per-nucleon increase by the number of nucleons.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The most stable region is near the maximum of binding energy per nucleon, labelled M.`,
          },
          {
            part: "b",
            explanation: L`The increase in binding energy per nucleon is`,
            math: L`8.5-7.6=0.9\,\text{MeV per nucleon}`,
          },
          {
            part: "c",
            explanation: L`The total increase in binding energy is approximately`,
            math: L`0.9\times236\approx212\,\text{MeV}`,
          },
          {
            part: "d",
            explanation: L`The heavy nucleus moves from the lower-binding heavy side of the curve toward fragments with higher binding energy per nucleon. The increase in binding energy appears as released energy, with a corresponding decrease in total mass-energy.`,
          },
        ],
      },
    ],
  },
];

export const atomsNucleiTopics: Topic[] = topics.map(makeTopic);
