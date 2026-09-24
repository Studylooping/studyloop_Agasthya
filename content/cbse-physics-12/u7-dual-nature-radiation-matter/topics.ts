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
const UNIT = "u7-dual-nature-radiation-matter";
const VERSION = "0.1.4";
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
  mc: readonly McSeed[];
  constructed: readonly ConstructedSeed[];
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
  return `You chose ${choiceText}. Recheck whether the question is about photon energy, work function, stopping potential, intensity, frequency, or de Broglie wavelength.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class12_physics_dual_nature_reasoning"),
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
    contentId: `${COURSE}.u7.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "confuses_photon_energy_with_intensity_or_stopping_potential",
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
    contentId: `${COURSE}.u7.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "states_a_formula_without_linking_it_to_the_observation_or_graph",
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

type ReindexKind = "mc" | ResponseType | "frq";

function itemId(topicCode: string, kind: ReindexKind, index: number) {
  return `${COURSE}.u7.t${topicSlug(topicCode)}.${kind}.${String(index + 1).padStart(3, "0")}`;
}

function reindexTopic(topic: Topic): Topic {
  const counters: Partial<Record<ReindexKind, number>> = {};
  return {
    ...topic,
    items: topic.items.map((item) => {
      if (item.kind === "mc_single") {
        const index = counters.mc ?? 0;
        counters.mc = index + 1;
        return {
          ...item,
          topic: topic.topicCode,
          contentId: itemId(topic.topicCode, "mc", index),
        };
      }

      if (item.kind === "frq") {
        const responseType: ReindexKind = item.responseType ?? "frq";
        const index = counters[responseType] ?? 0;
        counters[responseType] = index + 1;
        return {
          ...item,
          topic: topic.topicCode,
          contentId: itemId(topic.topicCode, responseType, index),
        };
      }

      return {
        ...item,
        topic: topic.topicCode,
      };
    }),
  };
}

function relocateDualNatureItems(topics: Topic[]): Topic[] {
  const byCode = new Map(
    topics.map((topic) => [
      topic.topicCode,
      { ...topic, items: [...topic.items] },
    ]),
  );
  const source = byCode.get("7.1");
  const target = byCode.get("7.3");

  const stemsToMove = [
    "A metal has threshold wavelength",
    "A metal of work function $2.3",
    "Two clean metal plates A and B have work functions",
  ];

  for (const stem of stemsToMove) {
    const index =
      source?.items.findIndex((item) => item.questionLatex.startsWith(stem)) ??
      -1;
    if (source && target && index >= 0) {
      const [item] = source.items.splice(index, 1);
      target.items.push(item);
    }
  }

  return topics.map((topic) =>
    reindexTopic(byCode.get(topic.topicCode) ?? topic),
  );
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

const photoCurrentGraphFigure: ItemFigure = {
  type: "svg",
  title: "Photoelectric current versus collector potential",
  description:
    "Two photoelectric-current curves for the same incident frequency. Curve A saturates at 40 microampere and curve B saturates at 20 microampere; both meet the voltage axis at the same marked retarding potential.",
  svg: `<svg viewBox="0 0 680 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="390" fill="#ffffff"/>
  <defs>
    <marker id="arrow-photo-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="100" y1="300" x2="585" y2="300"/>
    <line x1="100" y1="240" x2="585" y2="240"/>
    <line x1="100" y1="180" x2="585" y2="180"/>
    <line x1="100" y1="120" x2="585" y2="120"/>
    <line x1="165" y1="65" x2="165" y2="320"/>
    <line x1="260" y1="65" x2="260" y2="320"/>
    <line x1="355" y1="65" x2="355" y2="320"/>
    <line x1="450" y1="65" x2="450" y2="320"/>
    <line x1="545" y1="65" x2="545" y2="320"/>
  </g>
  <line x1="85" y1="320" x2="605" y2="320" stroke="#334155" stroke-width="2.5" marker-end="url(#arrow-photo-axis)"/>
  <line x1="260" y1="330" x2="260" y2="52" stroke="#334155" stroke-width="2.5" marker-end="url(#arrow-photo-axis)"/>
  <path d="M145 320 C170 318 198 300 222 255 C246 205 280 135 330 112 C388 86 474 86 560 86" fill="none" stroke="#2563eb" stroke-width="4"/>
  <path d="M145 320 C176 316 205 301 232 270 C260 237 296 203 352 188 C406 174 480 174 560 174" fill="none" stroke="#16a34a" stroke-width="4"/>
  <line x1="145" y1="320" x2="145" y2="342" stroke="#64748b" stroke-width="2"/>
  <line x1="260" y1="174" x2="570" y2="174" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="6 5"/>
  <line x1="260" y1="86" x2="570" y2="86" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="6 5"/>
  <g font-family="Arial, sans-serif" fill="#0f172a">
    <text x="608" y="326" font-size="17">collector potential V</text>
    <text x="120" y="58" font-size="17">photoelectric current</text>
    <text x="132" y="365" font-size="16">-V<tspan baseline-shift="sub" font-size="12">0</tspan></text>
    <text x="248" y="352" font-size="16">0</text>
    <text x="575" y="91" font-size="15" fill="#2563eb">curve A</text>
    <text x="575" y="179" font-size="15" fill="#16a34a">curve B</text>
    <text x="32" y="91" font-size="15">40 microA</text>
    <text x="32" y="179" font-size="15">20 microA</text>
    <text x="315" y="46" font-size="15" fill="#475569">same incident frequency</text>
  </g>
</svg>`,
};

const stoppingPotentialGraphFigure: ItemFigure = {
  type: "svg",
  title: "Stopping potential versus frequency",
  description:
    "A straight-line graph of stopping potential against incident frequency. The x-intercept is marked as threshold frequency and two data points are shown.",
  svg: `<svg viewBox="0 0 680 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="390" fill="#ffffff"/>
  <defs>
    <marker id="arrow-vf-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="105" y1="300" x2="600" y2="300"/>
    <line x1="105" y1="245" x2="600" y2="245"/>
    <line x1="105" y1="190" x2="600" y2="190"/>
    <line x1="105" y1="135" x2="600" y2="135"/>
    <line x1="105" y1="80" x2="600" y2="80"/>
    <line x1="165" y1="65" x2="165" y2="320"/>
    <line x1="250" y1="65" x2="250" y2="320"/>
    <line x1="335" y1="65" x2="335" y2="320"/>
    <line x1="420" y1="65" x2="420" y2="320"/>
    <line x1="505" y1="65" x2="505" y2="320"/>
    <line x1="590" y1="65" x2="590" y2="320"/>
  </g>
  <line x1="95" y1="300" x2="620" y2="300" stroke="#334155" stroke-width="2.5" marker-end="url(#arrow-vf-axis)"/>
  <line x1="105" y1="325" x2="105" y2="50" stroke="#334155" stroke-width="2.5" marker-end="url(#arrow-vf-axis)"/>
  <line x1="250" y1="300" x2="565" y2="96" stroke="#2563eb" stroke-width="4"/>
  <circle cx="250" cy="300" r="5" fill="#2563eb"/>
  <circle cx="420" cy="190" r="5" fill="#2563eb"/>
  <circle cx="505" cy="135" r="5" fill="#2563eb"/>
  <line x1="250" y1="300" x2="250" y2="332" stroke="#64748b" stroke-width="2"/>
  <line x1="420" y1="190" x2="420" y2="300" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <line x1="105" y1="190" x2="420" y2="190" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5 5"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="16">
    <text x="622" y="306">frequency &#957;</text>
    <text x="48" y="56">V<tspan baseline-shift="sub" font-size="12">0</tspan></text>
    <text x="225" y="354">&#957;<tspan baseline-shift="sub" font-size="12">0</tspan> = 5.0 &#215; 10<tspan baseline-shift="super" font-size="12">14</tspan> Hz</text>
    <text x="380" y="182">data point</text>
    <text x="324" y="38" fill="#475569">same clean metal surface</text>
  </g>
</svg>`,
};

const deBroglieGraphFigure: ItemFigure = {
  type: "svg",
  title: "de Broglie wavelength versus momentum",
  description:
    "A curve of de Broglie wavelength against particle momentum, with two marked observations showing the decreasing trend.",
  svg: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="360" fill="#ffffff"/>
  <defs>
    <marker id="arrow-db-axis" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="95" y1="285" x2="560" y2="285"/>
    <line x1="95" y1="230" x2="560" y2="230"/>
    <line x1="95" y1="175" x2="560" y2="175"/>
    <line x1="95" y1="120" x2="560" y2="120"/>
    <line x1="95" y1="65" x2="560" y2="65"/>
    <line x1="170" y1="55" x2="170" y2="300"/>
    <line x1="245" y1="55" x2="245" y2="300"/>
    <line x1="320" y1="55" x2="320" y2="300"/>
    <line x1="395" y1="55" x2="395" y2="300"/>
    <line x1="470" y1="55" x2="470" y2="300"/>
  </g>
  <line x1="85" y1="300" x2="585" y2="300" stroke="#334155" stroke-width="2.5" marker-end="url(#arrow-db-axis)"/>
  <line x1="95" y1="310" x2="95" y2="45" stroke="#334155" stroke-width="2.5" marker-end="url(#arrow-db-axis)"/>
  <path d="M120 70 C155 105 190 145 230 182 C285 232 380 266 540 286" fill="none" stroke="#2563eb" stroke-width="4"/>
  <circle cx="170" cy="120" r="5" fill="#2563eb"/>
  <circle cx="320" cy="245" r="5" fill="#2563eb"/>
  <g font-family="Arial, sans-serif" fill="#0f172a" font-size="17">
    <text x="590" y="306">momentum p</text>
    <text x="42" y="50">wavelength &#955;</text>
    <text x="240" y="42" fill="#475569">matter-wave trend</text>
  </g>
</svg>`,
};

const topics: readonly TopicSeed[] = [
  {
    topicCode: "7.1",
    title: "Photon Energy and Work Function",
    subtopic:
      "Energy quantum, work function, threshold frequency, threshold wavelength, and eV conversion",
    mc: [
      {
        questionLatex: L`A metal begins to emit photoelectrons only when incident light has frequency at least $5.0\times 10^{14}\,\text{Hz}$. Using $h=6.63\times 10^{-34}\,\text{J s}$ and $1\,\text{eV}=1.6\times 10^{-19}\,\text{J}$, its work function is closest to`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["threshold_frequency", "work_function", "ev_conversion"],
        choices: [
          L`$2.07\,\text{eV}$`,
          L`$3.31\,\text{eV}$`,
          L`$0.48\,\text{eV}$`,
          L`$5.00\,\text{eV}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This is the energy in $10^{-19}\,\text{J}$, not in electron-volts.`,
          C: L`This inverts the conversion; divide joules by $1.6\times 10^{-19}$ to get eV.`,
          D: L`The threshold frequency is not numerically equal to the work function in eV.`,
        },
        hints: [
          L`At threshold, $h\nu_0=\phi$.`,
          L`First find the energy in joules.`,
          L`Convert joules to eV by dividing by $1.6\times 10^{-19}$.`,
        ],
        solution: [
          {
            explanation: L`At threshold, the photon energy is just equal to the work function.`,
            math: L`\phi=h\nu_0`,
          },
          {
            explanation: L`Substitute the given frequency.`,
            math: L`\phi=6.63\times 10^{-34}\times 5.0\times 10^{14}=3.315\times 10^{-19}\,\text{J}`,
          },
          {
            explanation: L`Convert to electron-volts.`,
            math: L`\phi=\frac{3.315\times 10^{-19}}{1.6\times 10^{-19}}\approx 2.07\,\text{eV}`,
          },
        ],
      },
      {
        questionLatex: L`Light of wavelength $400\,\text{nm}$ falls on a metal whose work function is $2.0\,\text{eV}$. Taking $hc=1240\,\text{eV nm}$, the maximum kinetic energy of emitted photoelectrons is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["photon_energy", "photoelectric_equation"],
        choices: [
          L`$0.80\,\text{eV}$`,
          L`$1.10\,\text{eV}$`,
          L`$2.00\,\text{eV}$`,
          L`$3.10\,\text{eV}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`This subtracts from an incorrect photon energy; use $E=1240/400$.`,
          C: L`This is the work function, not the remaining kinetic energy.`,
          D: L`This is the photon energy before subtracting the work function.`,
        },
        hints: [
          L`Find photon energy from $E=hc/\lambda$.`,
          L`Use the photoelectric equation $K_{\max}=E-\phi$.`,
          L`The answer in eV is also the stopping potential in volts if asked later.`,
        ],
        solution: [
          {
            explanation: L`The incident photon energy is`,
            math: L`E=\frac{1240}{400}=3.10\,\text{eV}`,
          },
          {
            explanation: L`Only the energy left after overcoming the work function becomes maximum kinetic energy.`,
            math: L`K_{\max}=3.10-2.00=1.10\,\text{eV}`,
          },
        ],
      },
      {
        questionLatex: L`Two monochromatic beams fall on identical photocathodes. The beams carry the same power through the same area, but beam II has twice the frequency of beam I. The number of photons incident per second in beam II is`,
        difficulty: 3,
        skillTags: ["photon_flux", "energy_quantum", "intensity"],
        choices: [
          L`twice that in beam I`,
          L`the same as in beam I`,
          L`half that in beam I`,
          L`one-fourth that in beam I`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`Doubling frequency doubles energy per photon, so the same power cannot contain twice as many photons.`,
          B: L`Equal power does not mean equal photon count when photon energies differ.`,
          D: L`The energy per photon only doubles, so the photon rate is divided by $2$, not by $4$.`,
        },
        hints: [
          L`Power is energy delivered per second.`,
          L`Each photon has energy $h\nu$.`,
          L`Photon rate is $P/(h\nu)$.`,
        ],
        solution: [
          {
            explanation: L`For a fixed power $P$, the photon rate is inversely proportional to photon energy.`,
            math: L`N=\frac{P}{h\nu}`,
          },
          {
            explanation: L`If the frequency doubles while power stays the same, the photon rate halves.`,
            math: L`N_2=\frac{P}{h(2\nu_1)}=\frac{N_1}{2}`,
          },
        ],
      },
      {
        questionLatex: L`A metal has threshold wavelength $600\,\text{nm}$. If light of wavelength $450\,\text{nm}$ is incident on it, the stopping potential is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["threshold_wavelength", "stopping_potential"],
        choices: [
          L`$0.34\,\text{V}$`,
          L`$0.69\,\text{V}$`,
          L`$1.38\,\text{V}$`,
          L`$2.76\,\text{V}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`This is about half the correct energy difference; compare both photon energies carefully.`,
          C: L`This doubles the energy difference.`,
          D: L`This doubles again and treats photon energy difference incorrectly.`,
        },
        hints: [
          L`Use $E=1240/\lambda$ in eV for wavelength in nm.`,
          L`The threshold photon energy equals the work function.`,
          L`$V_0$ in volts equals $K_{\max}$ in eV numerically.`,
        ],
        solution: [
          {
            explanation: L`The photon energy and threshold energy are`,
            math: L`E=\frac{1240}{450}=2.756\,\text{eV},\qquad \phi=\frac{1240}{600}=2.067\,\text{eV}`,
          },
          {
            explanation: L`The maximum kinetic energy is the difference.`,
            math: L`K_{\max}=2.756-2.067=0.689\,\text{eV}`,
          },
          {
            explanation: L`Therefore the stopping potential is approximately`,
            math: L`V_0\approx 0.69\,\text{V}`,
          },
        ],
      },
      {
        questionLatex: L`A photosensitive surface has work function $2.48\,\text{eV}$. Taking $h=4.14\times10^{-15}\,\text{eV s}$, its threshold frequency is closest to`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["work_function", "threshold_frequency"],
        choices: [
          L`$4.0\times10^{14}\,\text{Hz}$`,
          L`$6.0\times10^{14}\,\text{Hz}$`,
          L`$8.0\times10^{14}\,\text{Hz}$`,
          L`$1.2\times10^{15}\,\text{Hz}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`This is too small; divide the work function by Planck's constant in eV s.`,
          C: L`This overestimates the quotient $2.48/4.14$.`,
          D: L`This is roughly double the correct threshold frequency.`,
        },
        hints: [
          L`At threshold, $h\nu_0=\phi$.`,
          L`Use eV units consistently so no joule conversion is needed.`,
          L`Compute $\nu_0=2.48/(4.14\times10^{-15})$.`,
        ],
        solution: [
          {
            explanation: L`At threshold, the photon energy just equals the work function.`,
            math: L`h\nu_0=\phi`,
          },
          {
            explanation: L`Hence`,
            math: L`\nu_0=\frac{2.48}{4.14\times10^{-15}}\approx6.0\times10^{14}\,\text{Hz}`,
          },
        ],
      },
      {
        questionLatex: L`The work function of a metal is $2.4\,\text{eV}$. Which radiation cannot cause photoelectric emission from this metal? Take $hc=1240\,\text{eV nm}$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["threshold_wavelength", "photoelectric_emission_condition"],
        choices: [
          L`$650\,\text{nm}$`,
          L`$500\,\text{nm}$`,
          L`$400\,\text{nm}$`,
          L`$300\,\text{nm}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`At $500\,\text{nm}$ the photon energy is $2.48\,\text{eV}$, just above the work function.`,
          C: L`Shorter wavelength means larger photon energy; $400\,\text{nm}$ can emit electrons.`,
          D: L`This has the largest photon energy among the choices, so it can emit electrons.`,
        },
        hints: [
          L`Find the threshold wavelength from $\lambda_0=hc/\phi$.`,
          L`Longer wavelength means smaller photon energy.`,
          L`Photoemission fails for $\lambda>\lambda_0$.`,
        ],
        solution: [
          {
            explanation: L`The threshold wavelength is`,
            math: L`\lambda_0=\frac{1240}{2.4}\approx 517\,\text{nm}`,
          },
          {
            explanation: L`Only wavelengths shorter than this can eject electrons. The $650\,\text{nm}$ radiation is too low in photon energy.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A metal has work function $3.3\,\text{eV}$. Estimate its threshold frequency. Use $h=6.63\times10^{-34}\,\text{J s}$ and $1\,\text{eV}=1.6\times10^{-19}\,\text{J}$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["threshold_frequency", "work_function"],
        parts: onePart("Calculate the threshold frequency in Hz.", 2),
        hints: [
          L`Convert the work function to joules first.`,
          L`At threshold, $h\nu_0=\phi$.`,
          L`Divide the work function in joules by Planck's constant.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Converts the work function to joules.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Uses nu0 = phi/h and obtains the correct order of magnitude.",
          },
        ]),
        commonErrors: [
          "Using 3.3 directly as joules.",
          "Multiplying by h instead of dividing by h.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Convert $3.3\,\text{eV}$ to joules.`,
            math: L`\phi=3.3\times1.6\times10^{-19}=5.28\times10^{-19}\,\text{J}`,
          },
          {
            part: "a",
            explanation: L`At threshold, $\nu_0=\phi/h$.`,
            math: L`\nu_0=\frac{5.28\times10^{-19}}{6.63\times10^{-34}}\approx 8.0\times10^{14}\,\text{Hz}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A surface of work function $2.2\,\text{eV}$ is illuminated by light of wavelength $500\,\text{nm}$. Take $hc=1240\,\text{eV nm}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: [
          "photon_energy",
          "emission_condition",
          "photoelectric_equation",
        ],
        parts: [
          part("a", "Decide whether photoelectric emission occurs.", 1),
          part(
            "b",
            "Find the maximum kinetic energy of the emitted electrons, if any.",
            2,
          ),
        ],
        hints: [
          L`Find the photon energy from $E=hc/\lambda$.`,
          L`Compare photon energy with the work function.`,
          L`If emission occurs, $K_{\max}=E-\phi$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Compares photon energy with work function and concludes emission occurs.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Computes photon energy and subtracts the work function correctly.",
          },
        ]),
        commonErrors: [
          "Treating the work function as the kinetic energy.",
          "Using wavelength directly without converting it through photon energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The photon energy is`,
            math: L`E=\frac{1240}{500}=2.48\,\text{eV}`,
          },
          {
            part: "a",
            explanation: L`Since $2.48\,\text{eV}>2.2\,\text{eV}$, emission occurs.`,
          },
          {
            part: "b",
            explanation: L`The maximum kinetic energy is the excess energy.`,
            math: L`K_{\max}=2.48-2.20=0.28\,\text{eV}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A $3.0\,\text{mW}$ source emits monochromatic light of wavelength $600\,\text{nm}$. Estimate the number of photons emitted per second. Use $h=6.63\times10^{-34}\,\text{J s}$ and $c=3.0\times10^8\,\text{m s}^{-1}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["photon_rate", "photon_energy"],
        parts: onePart("Find the photon emission rate.", 3),
        hints: [
          L`Power is energy emitted per second.`,
          L`Energy per photon is $hc/\lambda$.`,
          L`Photon rate is $P/(hc/\lambda)=P\lambda/(hc)$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Uses photon energy hc/lambda.",
          },
          {
            part: "a",
            points: 1,
            description: "Uses power divided by energy per photon.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Handles SI units and obtains about 9.1 x 10^15 photons per second.",
          },
        ]),
        commonErrors: [
          "Forgetting to convert mW to W.",
          "Using wavelength in nm without converting to metres.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The photon rate is`,
            math: L`N=\frac{P}{hc/\lambda}=\frac{P\lambda}{hc}`,
          },
          {
            part: "a",
            explanation: L`Substitute SI values.`,
            math: L`N=\frac{3.0\times10^{-3}\times600\times10^{-9}}{6.63\times10^{-34}\times3.0\times10^8}`,
          },
          {
            part: "a",
            explanation: L`This gives`,
            math: L`N\approx 9.1\times10^{15}\,\text{photons s}^{-1}`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A metal of work function $2.3\,\text{eV}$ is illuminated by radiation of wavelength $350\,\text{nm}$. Take $hc=1240\,\text{eV nm}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: [
          "threshold_wavelength",
          "stopping_potential",
          "photoelectric_equation",
        ],
        parts: [
          part("a", "Find the threshold wavelength of the metal.", 2),
          part(
            "b",
            "Find the maximum kinetic energy of the emitted electrons.",
            2,
          ),
          part("c", "Find the stopping potential.", 1),
        ],
        hints: [
          L`The threshold wavelength is $hc/\phi$.`,
          L`Find photon energy at $350\,\text{nm}$ before subtracting the work function.`,
          L`In eV, the numerical value of $K_{\max}$ equals $V_0$ in volts.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Computes the threshold wavelength using hc/phi.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Computes incident photon energy and subtracts work function.",
          },
          {
            part: "c",
            points: 1,
            description:
              "States the stopping potential corresponding to Kmax/e.",
          },
        ]),
        commonErrors: [
          "Comparing wavelength directly with work function.",
          "Reporting kinetic energy as the incident photon energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`At threshold, photon energy equals work function.`,
            math: L`\lambda_0=\frac{1240}{2.3}\approx 539\,\text{nm}`,
          },
          {
            part: "b",
            explanation: L`The photon energy at $350\,\text{nm}$ is`,
            math: L`E=\frac{1240}{350}=3.54\,\text{eV}`,
          },
          {
            part: "b",
            explanation: L`So the maximum kinetic energy is`,
            math: L`K_{\max}=3.54-2.30=1.24\,\text{eV}`,
          },
          {
            part: "c",
            explanation: L`Since $eV_0=K_{\max}$,`,
            math: L`V_0=1.24\,\text{V}`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Two metals P and Q have threshold wavelengths $620\,\text{nm}$ and $414\,\text{nm}$ respectively. Take $hc=1240\,\text{eV nm}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: [
          "threshold_wavelength",
          "work_function",
          "threshold_frequency",
        ],
        parts: [
          part("a", "Find the work function of each metal in eV.", 2),
          part(
            "b",
            "Which metal has the larger threshold frequency? Give the ratio.",
            2,
          ),
          part(
            "c",
            L`If $500\,\text{nm}$ light falls separately on both metals, decide which metal emits photoelectrons.`,
            2,
          ),
        ],
        hints: [
          L`Use $\phi=hc/\lambda_0$.`,
          L`Threshold frequency is inversely proportional to threshold wavelength.`,
          L`For $500\,\text{nm}$ light, compare photon energy with each work function.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Computes both work functions using hc/lambda0.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Identifies Q and gives the threshold-frequency ratio about 1.5.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Compares 500 nm photon energy with both work functions.",
          },
        ]),
        commonErrors: [
          "Thinking larger threshold wavelength means larger work function.",
          "Comparing wavelength directly without converting to photon energy or threshold wavelength logic.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For metal P,`,
            math: L`\phi_P=\frac{1240}{620}=2.00\,\text{eV}`,
          },
          {
            part: "a",
            explanation: L`For metal Q,`,
            math: L`\phi_Q=\frac{1240}{414}\approx3.00\,\text{eV}`,
          },
          {
            part: "b",
            explanation: L`Since $\nu_0=c/\lambda_0$, the shorter threshold wavelength has the larger threshold frequency.`,
            math: L`\frac{\nu_{0Q}}{\nu_{0P}}=\frac{\lambda_{0P}}{\lambda_{0Q}}=\frac{620}{414}\approx1.50`,
          },
          {
            part: "c",
            explanation: L`The photon energy at $500\,\text{nm}$ is`,
            math: L`E=\frac{1240}{500}=2.48\,\text{eV}`,
          },
          {
            part: "c",
            explanation: L`Thus P emits because $2.48>2.00$, while Q does not because $2.48<3.00$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Two clean metal plates A and B have work functions $1.8\,\text{eV}$ and $2.5\,\text{eV}$ respectively. They are separately illuminated with light of wavelengths $500\,\text{nm}$ and $400\,\text{nm}$. Use $hc=1240\,\text{eV nm}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: [
          "case_study",
          "work_function",
          "threshold_condition",
          "stopping_potential",
        ],
        parts: [
          part(
            "a",
            L`For $500\,\text{nm}$ light, state which plate emits photoelectrons.`,
            2,
          ),
          part(
            "b",
            L`For $400\,\text{nm}$ light, find the stopping potential for plate B.`,
            2,
          ),
          part(
            "c",
            L`For $400\,\text{nm}$ light, which plate gives faster maximum photoelectrons? Justify briefly.`,
            1,
          ),
        ],
        hints: [
          L`Compute photon energies for $500\,\text{nm}$ and $400\,\text{nm}$.`,
          L`Emission occurs only if $E\geq\phi$.`,
          L`The larger $E-\phi$ gives larger maximum kinetic energy.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Correctly compares 2.48 eV with both work functions.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Computes 400 nm photon energy and stopping potential for plate B.",
          },
          {
            part: "c",
            points: 1,
            description:
              "Identifies plate A because its work function is smaller.",
          },
        ]),
        commonErrors: [
          "Assuming both metals behave the same for the same incident wavelength.",
          "Choosing the higher work function as giving higher kinetic energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For $500\,\text{nm}$ light,`,
            math: L`E=\frac{1240}{500}=2.48\,\text{eV}`,
          },
          {
            part: "a",
            explanation: L`Plate A emits because $2.48>1.8$. Plate B does not, because $2.48<2.5$.`,
          },
          {
            part: "b",
            explanation: L`For $400\,\text{nm}$ light,`,
            math: L`E=\frac{1240}{400}=3.10\,\text{eV}`,
          },
          {
            part: "b",
            explanation: L`For plate B,`,
            math: L`K_{\max}=3.10-2.50=0.60\,\text{eV},\qquad V_0=0.60\,\text{V}`,
          },
          {
            part: "c",
            explanation: L`Plate A gives faster maximum photoelectrons because for the same photon energy it leaves more excess energy: $3.10-1.80=1.30\,\text{eV}$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A source of fixed optical power is used with two filters that transmit monochromatic light of wavelengths $400\,\text{nm}$ and $800\,\text{nm}$. A photosensitive metal has work function $2.0\,\text{eV}$. Use $hc=1240\,\text{eV nm}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: [
          "case_study",
          "photon_energy",
          "photon_rate",
          "work_function",
        ],
        parts: [
          part("a", L`Find the photon energy for $400\,\text{nm}$ light.`, 1),
          part("b", L`Find the photon energy for $800\,\text{nm}$ light.`, 1),
          part(
            "c",
            "Which filter can produce photoelectric emission from the metal?",
            1,
          ),
          part(
            "d",
            "For the same optical power, compare the photon arrival rates for the two filters.",
            2,
          ),
        ],
        hints: [
          L`Use $E=hc/\lambda$.`,
          L`Photoemission requires photon energy at least equal to the work function.`,
          L`At fixed power, photon rate is inversely proportional to photon energy.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Computes 400 nm photon energy.",
          },
          {
            part: "b",
            points: 1,
            description: "Computes 800 nm photon energy.",
          },
          {
            part: "c",
            points: 1,
            description: "Identifies only 400 nm as above the work function.",
          },
          {
            part: "d",
            points: 2,
            description:
              "Uses inverse proportionality of photon rate to photon energy at fixed power.",
          },
        ]),
        commonErrors: [
          "Assuming same power means same number of photons per second.",
          "Treating longer wavelength as higher photon energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For $400\,\text{nm}$ light,`,
            math: L`E_{400}=\frac{1240}{400}=3.10\,\text{eV}`,
          },
          {
            part: "b",
            explanation: L`For $800\,\text{nm}$ light,`,
            math: L`E_{800}=\frac{1240}{800}=1.55\,\text{eV}`,
          },
          {
            part: "c",
            explanation: L`Only the $400\,\text{nm}$ light can emit photoelectrons because $3.10\,\text{eV}>2.0\,\text{eV}$, while $1.55\,\text{eV}<2.0\,\text{eV}$.`,
          },
          {
            part: "d",
            explanation: L`At fixed power, photon rate is $P/E$. Since $800\,\text{nm}$ photons have half the energy of $400\,\text{nm}$ photons, their arrival rate is twice as large.`,
            math: L`N_{800}:N_{400}=2:1`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "7.2",
    title: "Photoelectric Observations",
    subtopic:
      "Hertz-Lenard observations, intensity, frequency, saturation current, threshold frequency, and stopping potential",
    mc: [
      {
        questionLatex: L`The graph shows photoelectric current versus collector potential for the same incident frequency but two intensities. Which conclusion follows from the graph?`,
        difficulty: 2,
        skillTags: ["photoelectric_graph", "intensity", "stopping_potential"],
        figure: photoCurrentGraphFigure,
        choices: [
          L`Higher intensity gives larger saturation current but the same stopping potential.`,
          L`Higher intensity gives a larger stopping potential.`,
          L`Changing intensity leaves saturation current unchanged.`,
          L`A sufficiently intense beam can eject electrons even below threshold frequency.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The two curves cut the voltage axis at the same point, so stopping potential is unchanged.`,
          C: L`The upper curve has a larger saturation current, so intensity does affect current.`,
          D: L`The graph is for frequency above threshold; intensity cannot remove the threshold condition.`,
        },
        hints: [
          L`Saturation current is the flat high-current value.`,
          L`Stopping potential is where current just becomes zero.`,
          L`Compare the two curves at these two features.`,
        ],
        solution: [
          {
            explanation: L`Both curves meet the voltage axis at the same negative potential.`,
          },
          {
            explanation: L`The higher-intensity curve reaches a larger saturation current.`,
          },
          {
            explanation: L`Thus intensity controls the number of emitted electrons per second, not their maximum kinetic energy.`,
          },
        ],
      },
      {
        questionLatex: L`In a photoelectric experiment, the incident photon flux is kept unchanged while the frequency is increased above threshold. The main direct change is that`,
        difficulty: 2,
        skillTags: ["frequency_effect", "photoelectric_observations"],
        choices: [
          L`the work function of the metal increases`,
          L`the stopping potential increases`,
          L`the threshold frequency decreases`,
          L`photoemission stops immediately`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`Work function is a property of the metal surface, not of the incident frequency.`,
          C: L`Threshold frequency is fixed by the metal.`,
          D: L`Increasing frequency above threshold increases maximum kinetic energy; it does not stop emission.`,
        },
        hints: [
          L`Frequency changes photon energy.`,
          L`Stopping potential measures maximum kinetic energy.`,
          L`Use $eV_0=h\nu-\phi$.`,
        ],
        solution: [
          {
            explanation: L`For the same metal, $\phi$ is fixed.`,
            math: L`eV_0=h\nu-\phi`,
          },
          {
            explanation: L`When $\nu$ increases above threshold, $K_{\max}$ and hence $V_0$ increase.`,
          },
        ],
      },
      {
        questionLatex: L`Hertz's observation that ultraviolet light helps a spark pass more easily is explained by`,
        difficulty: 1,
        skillTags: ["hertz_observation", "photoelectric_effect"],
        choices: [
          L`heating of air until it becomes conducting`,
          L`increase in wavelength of the ultraviolet light`,
          L`emission of electrons from the metal surface`,
          L`conversion of metal atoms into positive ions by pressure`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`The key effect is electron emission from the electrode surface, not ordinary heating of air.`,
          B: L`Ultraviolet light has short wavelength and high photon energy; the explanation is not a wavelength increase.`,
          D: L`Pressure ionisation is not the observation used in the photoelectric-effect explanation.`,
        },
        hints: [
          L`The observation is an early clue about electron emission by light.`,
          L`Ultraviolet photons can release electrons from metal surfaces.`,
          L`Those electrons help the discharge begin.`,
        ],
        solution: [
          {
            explanation: L`Ultraviolet radiation can eject electrons from the metal electrodes.`,
          },
          {
            explanation: L`The emitted electrons assist discharge, so the spark passes more easily.`,
          },
        ],
      },
      {
        questionLatex: L`If the collector is made more negative than the stopping potential in a photoelectric experiment, the photoelectric current becomes`,
        difficulty: 2,
        skillTags: ["stopping_potential", "photoelectric_current"],
        choices: [
          L`equal to the saturation current`,
          L`half of the saturation current`,
          L`larger because electrons are accelerated`,
          L`zero`,
        ],
        correctLetter: "D",
        rationales: {
          A: L`Saturation current occurs for sufficiently positive collector potential, not for retarding potential beyond $V_0$.`,
          B: L`There is no fixed half-current rule at stopping potential.`,
          C: L`A negative collector retards electrons; beyond stopping potential even the fastest electrons fail to reach it.`,
        },
        hints: [
          L`Stopping potential is a retarding potential.`,
          L`At $V_0$, even the fastest photoelectrons just fail to reach the collector.`,
          L`Making the collector still more negative cannot allow current.`,
        ],
        solution: [
          {
            explanation: L`The stopping potential is defined as the retarding potential at which photocurrent becomes zero.`,
          },
          {
            explanation: L`Beyond this potential, no emitted electron reaches the collector, so current is zero.`,
          },
        ],
      },
      {
        questionLatex: L`A metal surface is illuminated with radiation below its threshold frequency. If only the intensity is increased many times, the result is`,
        difficulty: 2,
        skillTags: ["threshold_frequency", "intensity_effect"],
        choices: [
          L`electrons are emitted with very small kinetic energy`,
          L`no photoelectric emission occurs`,
          L`the stopping potential becomes negative`,
          L`the work function becomes smaller`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`Below threshold, each photon lacks the minimum energy required, regardless of intensity.`,
          C: L`Stopping potential is not defined if no photoelectrons are emitted.`,
          D: L`Work function does not decrease merely by increasing light intensity.`,
        },
        hints: [
          L`Intensity changes the number of photons, not energy per photon.`,
          L`Photon energy is $h\nu$.`,
          L`If $h\nu<\phi$, emission cannot occur.`,
        ],
        solution: [
          {
            explanation: L`Below threshold frequency, each photon has energy less than the work function.`,
            math: L`h\nu<\phi`,
          },
          {
            explanation: L`More such photons per second do not eject electrons in the photoelectric-effect model.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Define stopping potential in the photoelectric effect.`,
        difficulty: 1,
        skillTags: ["definition", "stopping_potential"],
        parts: onePart("State the meaning of stopping potential.", 1),
        hints: [
          L`It is connected with a retarding collector potential.`,
          L`It refers to the point where photocurrent just falls to zero.`,
          L`It measures the maximum kinetic energy of photoelectrons.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Defines stopping potential as the minimum retarding potential that stops the fastest photoelectrons and makes current zero.",
          },
        ]),
        commonErrors: [
          "Calling it the accelerating potential for saturation current.",
          "Forgetting that it is a retarding potential.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Stopping potential is the minimum retarding potential applied to the collector that makes the photoelectric current just zero.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Use the graph to answer the questions. The two curves are for the same metal and the same incident frequency.`,
        difficulty: 3,
        skillTags: [
          "graph_interpretation",
          "photoelectric_current",
          "intensity",
        ],
        figure: photoCurrentGraphFigure,
        parts: [
          part("a", "What is the stopping potential shown by both curves?", 1),
          part("b", "What is the ratio of the two saturation currents?", 1),
          part(
            "c",
            "What does this ratio tell you about the two incident intensities?",
            1,
          ),
        ],
        hints: [
          L`Read stopping potential from the common x-intercept marked $-V_0$.`,
          L`Read saturation current from the flat portions of the curves.`,
          L`For a fixed frequency, saturation current is proportional to intensity.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Identifies the same stopping-potential position for both curves.",
          },
          {
            part: "b",
            points: 1,
            description: "Uses 40 microA and 20 microA to get a 2:1 ratio.",
          },
          {
            part: "c",
            points: 1,
            description:
              "Connects the current ratio to intensity ratio at fixed frequency.",
          },
        ]),
        commonErrors: [
          "Using the y-axis saturation current as stopping potential.",
          "Claiming that intensity changes maximum kinetic energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Both curves cut the voltage axis at the same marked point $-V_0$, so their stopping potential is the same.`,
          },
          {
            part: "b",
            explanation: L`The saturation currents are labelled $40\,\mu\text{A}$ and $20\,\mu\text{A}$.`,
            math: L`I_1:I_2=40:20=2:1`,
          },
          {
            part: "c",
            explanation: L`At fixed frequency, saturation current is proportional to intensity, so the higher-intensity beam has twice the intensity of the lower one.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Give two observations of the photoelectric effect that cannot be explained by the classical wave theory of light alone.`,
        difficulty: 3,
        skillTags: ["photoelectric_observations", "wave_theory_limit"],
        parts: onePart(
          "State and briefly explain any two such observations.",
          3,
        ),
        hints: [
          L`Think about threshold frequency.`,
          L`Think about instantaneous emission.`,
          L`Think about the dependence of maximum kinetic energy on frequency rather than intensity.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Mentions the existence of threshold frequency.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Mentions absence of measurable time lag or frequency dependence of Kmax.",
          },
          {
            part: "a",
            points: 1,
            description: "Gives a brief photon-model explanation.",
          },
        ]),
        commonErrors: [
          "Saying intensity controls maximum kinetic energy.",
          "Stating observations without connecting them to wave theory's failure.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`One observation is threshold frequency: no emission occurs below a certain frequency, however large the intensity may be. This contradicts the idea that energy can be built up continuously from a low-frequency wave.`,
          },
          {
            part: "a",
            explanation: L`A second observation is that emission begins without measurable time lag when frequency is above threshold, even for weak light. The photon picture explains this as one photon giving its energy to one electron.`,
          },
          {
            part: "a",
            explanation: L`Also, maximum kinetic energy depends on frequency, not intensity, because $K_{\max}=h\nu-\phi$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Describe how photoelectric current changes when the collector potential, light intensity, and frequency are varied one at a time in a photoelectric experiment.`,
        difficulty: 3,
        skillTags: ["photoelectric_experiment", "current_potential_curve"],
        parts: [
          part(
            "a",
            "Explain the current-potential variation for fixed frequency and intensity.",
            2,
          ),
          part(
            "b",
            "Explain the effect of increasing intensity at fixed frequency above threshold.",
            2,
          ),
          part(
            "c",
            "Explain the effect of increasing frequency at fixed intensity above threshold.",
            2,
          ),
        ],
        hints: [
          L`A positive collector attracts more emitted electrons until saturation.`,
          L`Intensity controls number of photons per second.`,
          L`Frequency controls maximum kinetic energy and hence stopping potential.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Describes rise to saturation and zero current at stopping potential.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Connects increased intensity with increased saturation current but unchanged stopping potential.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Connects increased frequency with increased stopping potential and Kmax.",
          },
        ]),
        commonErrors: [
          "Saying higher intensity increases stopping potential.",
          "Saying higher frequency lowers photon energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For fixed frequency and intensity, increasing positive collector potential increases the collected-electron current until all emitted electrons are collected; then current saturates. A sufficiently negative collector potential reduces current to zero at the stopping potential.`,
          },
          {
            part: "b",
            explanation: L`At fixed frequency above threshold, increasing intensity increases the number of incident photons per second and hence increases saturation current. It does not change $K_{\max}$ or $V_0$.`,
          },
          {
            part: "c",
            explanation: L`At fixed intensity and above threshold, increasing frequency increases photon energy, so $K_{\max}$ and stopping potential increase according to $eV_0=h\nu-\phi$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`In a photocell experiment with a fixed metal surface, light of frequency just above threshold is first used at intensity $I$. Then the intensity is doubled without changing frequency. Finally, the frequency is increased while the photon flux is kept the same.`,
        difficulty: 3,
        skillTags: ["case_study", "intensity_effect", "frequency_effect"],
        parts: [
          part(
            "a",
            "What happens to the saturation current when intensity is doubled at the same frequency?",
            1,
          ),
          part(
            "b",
            "What happens to the stopping potential when intensity is doubled at the same frequency?",
            1,
          ),
          part(
            "c",
            "What happens to the stopping potential when frequency is increased above threshold?",
            1,
          ),
          part("d", "Give the physical reason for your answer in part (c).", 1),
        ],
        hints: [
          L`Separate number of photons from energy per photon.`,
          L`Saturation current counts collected photoelectrons per second.`,
          L`Stopping potential measures maximum kinetic energy.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Says saturation current doubles ideally.",
          },
          {
            part: "b",
            points: 1,
            description: "Says stopping potential remains unchanged.",
          },
          {
            part: "c",
            points: 1,
            description: "Says stopping potential increases.",
          },
          {
            part: "d",
            points: 1,
            description: "Connects frequency to photon energy and Kmax.",
          },
        ]),
        commonErrors: [
          "Mixing up saturation current and stopping potential.",
          "Assuming higher intensity makes each electron more energetic.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`At the same frequency, doubling intensity doubles the photon arrival rate, so the saturation current doubles ideally.`,
          },
          {
            part: "b",
            explanation: L`The stopping potential remains unchanged because the maximum kinetic energy per electron is unchanged.`,
          },
          {
            part: "c",
            explanation: L`When frequency is increased above threshold, stopping potential increases.`,
          },
          {
            part: "d",
            explanation: L`This is because $E=h\nu$ increases, so $K_{\max}=h\nu-\phi$ increases for the same metal.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "7.3",
    title: "Einstein's Photoelectric Equation and Graphs",
    subtopic:
      "Stopping potential graphs, Planck constant from slope, threshold frequency, and work function",
    mc: [
      {
        questionLatex: L`For a graph of stopping potential $V_0$ versus incident frequency $\nu$, the slope is`,
        difficulty: 2,
        skillTags: ["einstein_equation", "graph_slope"],
        figure: stoppingPotentialGraphFigure,
        choices: [L`$h/e$`, L`$e/h$`, L`$\phi/e$`, L`$h\phi$`],
        correctLetter: "A",
        rationales: {
          B: L`This is the reciprocal of the correct slope.`,
          C: L`The work function affects the intercept, not the slope.`,
          D: L`Multiplying $h$ and $\phi$ has the wrong physical units for this graph.`,
        },
        hints: [
          L`Start from $eV_0=h\nu-\phi$.`,
          L`Write it in the form $V_0=m\nu+c$.`,
          L`The coefficient of $\nu$ is the slope.`,
        ],
        solution: [
          {
            explanation: L`Einstein's equation gives`,
            math: L`eV_0=h\nu-\phi`,
          },
          {
            explanation: L`So`,
            math: L`V_0=\frac{h}{e}\nu-\frac{\phi}{e}`,
          },
          {
            explanation: L`Therefore the slope of the $V_0$ versus $\nu$ graph is $h/e$.`,
          },
        ],
      },
      {
        questionLatex: L`In the shown $V_0$ versus $\nu$ graph, the threshold frequency is`,
        difficulty: 2,
        skillTags: ["threshold_frequency", "graph_interpretation"],
        figure: stoppingPotentialGraphFigure,
        choices: [
          L`$4.0\times10^{14}\,\text{Hz}$`,
          L`$5.0\times10^{14}\,\text{Hz}$`,
          L`$8.0\times10^{14}\,\text{Hz}$`,
          L`$1.0\times10^{15}\,\text{Hz}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`This is before the x-intercept shown on the graph.`,
          C: L`This is a data frequency above threshold, not the threshold point.`,
          D: L`This is beyond the plotted threshold mark.`,
        },
        hints: [
          L`Threshold frequency occurs when $V_0=0$.`,
          L`Look for the x-intercept of the straight line.`,
          L`The graph labels this intercept as $\nu_0$.`,
        ],
        solution: [
          {
            explanation: L`At threshold, photoelectrons just emerge with zero maximum kinetic energy, so $V_0=0$.`,
          },
          {
            explanation: L`The graph's x-intercept is labelled $\nu_0=5.0\times10^{14}\,\text{Hz}$.`,
          },
        ],
      },
      {
        questionLatex: L`The $V_0$ versus $\nu$ graph for a metal has y-intercept $-2.0\,\text{V}$. The work function of the metal is`,
        difficulty: 2,
        skillTags: ["work_function", "graph_intercept"],
        choices: [
          L`$0.50\,\text{eV}$`,
          L`$1.0\,\text{eV}$`,
          L`$2.0\,\text{eV}$`,
          L`$4.0\,\text{eV}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`This would correspond to an intercept of only $-0.50\,\text{V}$.`,
          B: L`This halves the intercept magnitude without reason.`,
          D: L`This doubles the intercept magnitude.`,
        },
        hints: [
          L`In $V_0=(h/e)\nu-\phi/e$, the y-intercept is $-\phi/e$.`,
          L`If $\phi$ is in eV, $\phi/e$ is numerically the same number in volts.`,
          L`Use the magnitude of the intercept.`,
        ],
        solution: [
          {
            explanation: L`The intercept is`,
            math: L`-\frac{\phi}{e}=-2.0\,\text{V}`,
          },
          {
            explanation: L`Hence the work function is $2.0\,\text{eV}$.`,
          },
        ],
      },
      {
        questionLatex: L`For a metal, stopping potentials are $0.40\,\text{V}$ and $1.20\,\text{V}$ at frequencies $6.0\times10^{14}\,\text{Hz}$ and $8.0\times10^{14}\,\text{Hz}$ respectively. The value of $h$ obtained from these data is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["planck_constant", "stopping_potential_data"],
        choices: [
          L`$6.4\times10^{-34}\,\text{J s}$`,
          L`$3.2\times10^{-34}\,\text{J s}$`,
          L`$8.0\times10^{-15}\,\text{J s}$`,
          L`$1.6\times10^{-19}\,\text{J s}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This halves the slope change; use the full $0.80\,\text{V}$ change.`,
          C: L`This is closer to the graph slope in V s, not Planck's constant in J s.`,
          D: L`This is the electronic charge, not Planck's constant.`,
        },
        hints: [
          L`Subtract the two equations $eV_0=h\nu-\phi$.`,
          L`The work function cancels.`,
          L`Use $h=e\Delta V_0/\Delta\nu$.`,
        ],
        solution: [
          {
            explanation: L`For two readings from the same metal,`,
            math: L`e\Delta V_0=h\Delta\nu`,
          },
          {
            explanation: L`Substitute values.`,
            math: L`h=\frac{1.6\times10^{-19}\times(1.20-0.40)}{(8.0-6.0)\times10^{14}}`,
          },
          {
            explanation: L`This gives`,
            math: L`h=6.4\times10^{-34}\,\text{J s}`,
          },
        ],
      },
      {
        questionLatex: L`For a metal, the stopping potential is $1.20\,\text{V}$ when the incident frequency is $8.0\times10^{14}\,\text{Hz}$. If $h=6.63\times10^{-34}\,\text{J s}$, the work function is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["work_function", "stopping_potential"],
        choices: [
          L`$0.90\,\text{eV}$`,
          L`$1.20\,\text{eV}$`,
          L`$3.32\,\text{eV}$`,
          L`$2.12\,\text{eV}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: L`This subtracts too much from the photon energy.`,
          B: L`This is the stopping-potential energy, not the work function.`,
          C: L`This is the incident photon energy before subtracting $eV_0$.`,
        },
        hints: [
          L`Convert $h\nu$ to eV.`,
          L`Use $\phi=h\nu-eV_0$.`,
          L`A stopping potential of $1.20\,\text{V}$ corresponds to $1.20\,\text{eV}$.`,
        ],
        solution: [
          {
            explanation: L`The photon energy is`,
            math: L`h\nu=6.63\times10^{-34}\times8.0\times10^{14}=5.304\times10^{-19}\,\text{J}`,
          },
          {
            explanation: L`In electron-volts,`,
            math: L`h\nu=\frac{5.304\times10^{-19}}{1.6\times10^{-19}}=3.315\,\text{eV}`,
          },
          {
            explanation: L`Therefore`,
            math: L`\phi=3.315-1.20\approx 2.12\,\text{eV}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write Einstein's photoelectric equation and name each term.`,
        difficulty: 2,
        skillTags: ["einstein_equation", "definition"],
        parts: onePart(
          "State the equation and identify the physical meaning of each term.",
          2,
        ),
        hints: [
          L`The incident photon energy is $h\nu$.`,
          L`Part of it overcomes the work function.`,
          L`The remainder appears as maximum kinetic energy.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Writes the correct equation.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Identifies photon energy, work function and maximum kinetic energy.",
          },
        ]),
        commonErrors: [
          "Writing intensity in the equation for maximum kinetic energy.",
          "Forgetting the work function term.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Einstein's photoelectric equation is`,
            math: L`h\nu=\phi+K_{\max}`,
          },
          {
            part: "a",
            explanation: L`Here $h\nu$ is photon energy, $\phi$ is work function of the metal, and $K_{\max}$ is the maximum kinetic energy of emitted photoelectrons.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Stopping potentials for the same metal are $0.42\,\text{V}$ and $1.25\,\text{V}$ at frequencies $6.0\times10^{14}\,\text{Hz}$ and $8.0\times10^{14}\,\text{Hz}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["planck_constant", "data_interpretation"],
        parts: [
          part("a", "Estimate Planck's constant from the readings.", 2),
          part(
            "b",
            "State why the work function is not needed for part (a).",
            1,
          ),
        ],
        hints: [
          L`Use two versions of $eV_0=h\nu-\phi$.`,
          L`Subtract the equations.`,
          L`The intercept term cancels when data are from the same metal.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Uses h = e Delta V/Delta nu and gets about 6.6 x 10^-34 J s.",
          },
          {
            part: "b",
            points: 1,
            description:
              "Explains cancellation of work function for the same metal.",
          },
        ]),
        commonErrors: [
          "Adding the two stopping potentials instead of subtracting.",
          "Using frequencies without the factor of 10^14.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Subtracting $eV_0=h\nu-\phi$ for the two readings gives`,
            math: L`h=\frac{e\Delta V_0}{\Delta\nu}`,
          },
          {
            part: "a",
            explanation: L`Substitute the values.`,
            math: L`h=\frac{1.6\times10^{-19}\times(1.25-0.42)}{2.0\times10^{14}}=6.64\times10^{-34}\,\text{J s}`,
          },
          {
            part: "b",
            explanation: L`The work function is the same for both observations, so it cancels when the equations are subtracted.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For a metal, the graph of stopping potential $V_0$ against frequency $\nu$ has slope $4.14\times10^{-15}\,\text{V s}$ and x-intercept $5.0\times10^{14}\,\text{Hz}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["graph_slope", "work_function", "threshold_frequency"],
        parts: [
          part("a", "Find Planck's constant from the slope.", 2),
          part("b", "Find the work function in eV.", 2),
        ],
        hints: [
          L`The slope of the graph is $h/e$.`,
          L`The x-intercept is threshold frequency.`,
          L`At threshold, $\phi=h\nu_0$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Uses h = e x slope.",
          },
          {
            part: "b",
            points: 2,
            description: "Uses phi = h nu0 and converts to eV.",
          },
        ]),
        commonErrors: [
          "Using the reciprocal of the slope.",
          "Taking the y-intercept as threshold frequency.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Since slope is $h/e$,`,
            math: L`h=e\times\text{slope}=1.6\times10^{-19}\times4.14\times10^{-15}`,
          },
          {
            part: "a",
            explanation: L`Thus`,
            math: L`h\approx6.62\times10^{-34}\,\text{J s}`,
          },
          {
            part: "b",
            explanation: L`The threshold frequency is $5.0\times10^{14}\,\text{Hz}$.`,
            math: L`\phi=h\nu_0\approx6.62\times10^{-34}\times5.0\times10^{14}=3.31\times10^{-19}\,\text{J}`,
          },
          {
            part: "b",
            explanation: L`Convert to eV.`,
            math: L`\phi=\frac{3.31\times10^{-19}}{1.6\times10^{-19}}\approx2.07\,\text{eV}`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`For a metal surface, the following observations are made: $V_0=0.41\,\text{V}$ at $6.0\times10^{14}\,\text{Hz}$, $V_0=0.83\,\text{V}$ at $7.0\times10^{14}\,\text{Hz}$, and $V_0=1.24\,\text{V}$ at $8.0\times10^{14}\,\text{Hz}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: [
          "stopping_potential_data",
          "graph_interpretation",
          "work_function",
        ],
        parts: [
          part("a", "Estimate Planck's constant from the data.", 2),
          part("b", "Estimate the threshold frequency.", 2),
          part("c", "Find the work function in eV.", 2),
        ],
        hints: [
          L`Use the slope of the $V_0-\nu$ graph.`,
          L`Extend the straight-line relation to $V_0=0$.`,
          L`Use $\phi=h\nu_0$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Computes h from e Delta V/Delta nu.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Uses the straight-line relation to find nu0 near 5.0 times 10^14 Hz.",
          },
          {
            part: "c",
            points: 2,
            description: "Computes phi in eV from h nu0.",
          },
        ]),
        commonErrors: [
          "Treating the three readings as unrelated rather than a straight line.",
          "Using the stopping potential as the work function directly.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Using the first and third readings,`,
            math: L`slope=\frac{1.24-0.41}{(8.0-6.0)\times10^{14}}=4.15\times10^{-15}\,\text{V s}`,
          },
          {
            part: "a",
            explanation: L`Since slope is $h/e$,`,
            math: L`h=1.6\times10^{-19}\times4.15\times10^{-15}=6.64\times10^{-34}\,\text{J s}`,
          },
          {
            part: "b",
            explanation: L`From $V_0=s(\nu-\nu_0)$ and the first reading,`,
            math: L`0.41=4.15\times10^{-15}(6.0\times10^{14}-\nu_0)`,
          },
          {
            part: "b",
            explanation: L`This gives`,
            math: L`\nu_0\approx5.0\times10^{14}\,\text{Hz}`,
          },
          {
            part: "c",
            explanation: L`The work function is`,
            math: L`\phi=h\nu_0\approx6.64\times10^{-34}\times5.0\times10^{14}=3.32\times10^{-19}\,\text{J}\approx2.08\,\text{eV}`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student plots $V_0$ against $\nu$ for a clean metal surface and obtains the straight line shown.`,
        difficulty: 3,
        skillTags: [
          "case_study",
          "stopping_potential_graph",
          "einstein_equation",
        ],
        figure: stoppingPotentialGraphFigure,
        parts: [
          part(
            "a",
            "What physical constant can be obtained from the slope?",
            1,
          ),
          part("b", "What does the x-intercept represent?", 1),
          part(
            "c",
            "If the light intensity is increased without changing frequency, how does this graph change ideally?",
            2,
          ),
        ],
        hints: [
          L`Compare the graph with $V_0=(h/e)\nu-\phi/e$.`,
          L`At the x-intercept, $V_0=0$.`,
          L`Intensity affects current, not $K_{\max}$ for a fixed frequency.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Identifies h from slope h/e.",
          },
          {
            part: "b",
            points: 1,
            description: "Identifies threshold frequency.",
          },
          {
            part: "c",
            points: 2,
            description:
              "States no ideal change in V0-frequency graph and explains why.",
          },
        ]),
        commonErrors: [
          "Saying the slope gives work function.",
          "Saying intensity changes the stopping potential graph.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The slope of the graph is $h/e$, so Planck's constant $h$ can be obtained if $e$ is known.`,
          },
          {
            part: "b",
            explanation: L`The x-intercept is the threshold frequency $\nu_0$.`,
          },
          {
            part: "c",
            explanation: L`Ideally the graph does not shift when only intensity is changed. Intensity changes saturation current, while $V_0$ is fixed by $h\nu-\phi$.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "7.4",
    title: "de Broglie Matter Waves",
    subtopic:
      "Matter-wave wavelength, momentum relation, accelerated electrons, and particle comparisons",
    mc: [
      {
        questionLatex: L`An electron is accelerated from rest through $150\,\text{V}$. Using $\lambda(\text{nm})\approx 1.227/\sqrt{V}$ for an electron, its de Broglie wavelength is closest to`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["electron_wavelength", "accelerating_potential"],
        choices: [
          L`$0.100\,\text{nm}$`,
          L`$0.245\,\text{nm}$`,
          L`$1.00\,\text{nm}$`,
          L`$12.3\,\text{nm}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This corresponds to a much smaller accelerating voltage, not $150\,\text{V}$.`,
          C: L`This misses the square-root dependence and is too large.`,
          D: L`This uses the numerator without dividing by $\sqrt{150}$.`,
        },
        hints: [
          L`Use the given shortcut only for electrons accelerated through volts.`,
          L`Compute $\sqrt{150}\approx12.25$.`,
          L`Divide $1.227$ by that value.`,
        ],
        solution: [
          {
            explanation: L`For the accelerated electron,`,
            math: L`\lambda=\frac{1.227}{\sqrt{150}}\,\text{nm}`,
          },
          {
            explanation: L`Since $\sqrt{150}\approx12.25$,`,
            math: L`\lambda\approx0.100\,\text{nm}`,
          },
        ],
      },
      {
        questionLatex: L`An electron and a proton have the same non-relativistic kinetic energy. Which particle has the larger de Broglie wavelength?`,
        difficulty: 2,
        skillTags: ["matter_wave_comparison", "kinetic_energy"],
        choices: [
          L`The proton, because it is more massive`,
          L`The electron, because its momentum is smaller`,
          L`Both have the same wavelength because kinetic energy is the same`,
          L`Neither has a de Broglie wavelength unless it is charged`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`For the same kinetic energy, larger mass gives larger momentum and therefore smaller wavelength.`,
          C: L`Same kinetic energy does not mean same momentum when masses differ.`,
          D: L`de Broglie wavelength is associated with matter particles generally, not only charged particles.`,
        },
        hints: [
          L`Use $K=p^2/(2m)$.`,
          L`For the same $K$, $p=\sqrt{2mK}$.`,
          L`Then $\lambda=h/p$.`,
        ],
        solution: [
          {
            explanation: L`For equal kinetic energy,`,
            math: L`p=\sqrt{2mK}`,
          },
          {
            explanation: L`The proton has much larger mass, so it has larger momentum. Since $\lambda=h/p$, the electron has the larger wavelength.`,
          },
        ],
      },
      {
        questionLatex: L`A proton, an electron, and an alpha particle have the same momentum magnitude. Their de Broglie wavelengths are`,
        difficulty: 2,
        skillTags: ["de_broglie_relation", "momentum"],
        choices: [
          L`largest for the electron`,
          L`largest for the proton`,
          L`equal for all three`,
          L`largest for the alpha particle`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`Mass does not enter separately once momentum is specified.`,
          B: L`The wavelength depends on $p$, not directly on the particle name.`,
          D: L`The alpha particle's larger mass does not matter if momentum is already the same.`,
        },
        hints: [
          L`Recall the de Broglie relation.`,
          L`Only momentum appears in $\lambda=h/p$.`,
          L`Same $p$ gives same $\lambda$.`,
        ],
        solution: [
          {
            explanation: L`By de Broglie's relation,`,
            math: L`\lambda=\frac{h}{p}`,
          },
          {
            explanation: L`If the momentum magnitude is the same, the de Broglie wavelength is the same for all three particles.`,
          },
        ],
      },
      {
        questionLatex: L`The accelerating potential of an electron beam is increased from $V$ to $4V$. The de Broglie wavelength becomes`,
        difficulty: 2,
        skillTags: ["accelerating_potential", "wavelength_scaling"],
        choices: [L`$4\lambda$`, L`$\lambda/2$`, L`$2\lambda$`, L`$\lambda/4$`],
        correctLetter: "B",
        rationales: {
          A: L`Increasing accelerating voltage increases momentum, so wavelength cannot become larger.`,
          C: L`This has the direction reversed.`,
          D: L`Wavelength varies as $1/\sqrt{V}$, not as $1/V$.`,
        },
        hints: [
          L`For an accelerated electron, $\lambda\propto 1/\sqrt{V}$.`,
          L`Replace $V$ by $4V$.`,
          L`$\sqrt{4V}=2\sqrt V$.`,
        ],
        solution: [
          {
            explanation: L`Electron de Broglie wavelength after acceleration through $V$ is proportional to $1/\sqrt{V}$.`,
            math: L`\lambda'\propto\frac{1}{\sqrt{4V}}=\frac{1}{2\sqrt V}`,
          },
          {
            explanation: L`So the new wavelength is $\lambda/2$.`,
          },
        ],
      },
      {
        questionLatex: L`A particle has momentum $6.63\times10^{-24}\,\text{kg m s}^{-1}$. Its de Broglie wavelength is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["de_broglie_relation", "momentum"],
        choices: [
          L`$1.0\times10^{-8}\,\text{m}$`,
          L`$1.0\times10^{-12}\,\text{m}$`,
          L`$6.63\times10^{-10}\,\text{m}$`,
          L`$1.0\times10^{-10}\,\text{m}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: L`This is two powers of ten too large.`,
          B: L`This is two powers of ten too small.`,
          C: L`This does not divide Planck's constant by the given momentum.`,
        },
        hints: [
          L`Use $\lambda=h/p$.`,
          L`Take $h=6.63\times10^{-34}\,\text{J s}$.`,
          L`Subtract powers: $10^{-34}/10^{-24}=10^{-10}$.`,
        ],
        solution: [
          {
            explanation: L`Using de Broglie's relation,`,
            math: L`\lambda=\frac{h}{p}=\frac{6.63\times10^{-34}}{6.63\times10^{-24}}`,
          },
          {
            explanation: L`Therefore`,
            math: L`\lambda=1.0\times10^{-10}\,\text{m}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`State de Broglie's relation for the wavelength of a matter particle.`,
        difficulty: 1,
        skillTags: ["de_broglie_relation", "definition"],
        parts: onePart("Write the relation and define the symbols.", 1),
        hints: [
          L`The wavelength is inversely proportional to momentum.`,
          L`Planck's constant appears in the numerator.`,
          L`Use $p$ for momentum.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States lambda = h/p and identifies p as momentum.",
          },
        ]),
        commonErrors: [
          "Writing lambda proportional to momentum.",
          "Using energy instead of momentum in the denominator.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The de Broglie wavelength of a particle of momentum $p$ is`,
            math: L`\lambda=\frac{h}{p}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A particle has momentum $3.315\times10^{-24}\,\text{kg m s}^{-1}$. Find its de Broglie wavelength. Take $h=6.63\times10^{-34}\,\text{J s}$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["de_broglie_relation", "momentum"],
        parts: onePart("Calculate the wavelength.", 2),
        hints: [
          L`Use $\lambda=h/p$.`,
          L`The mantissas are chosen so that $6.63/3.315=2$.`,
          L`Watch the powers of ten.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Uses de Broglie's relation correctly.",
          },
          {
            part: "a",
            points: 1,
            description: "Computes 2.0 x 10^-10 m.",
          },
        ]),
        commonErrors: [
          "Multiplying h and p.",
          "Dropping the negative power of ten.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Apply $\lambda=h/p$.`,
            math: L`\lambda=\frac{6.63\times10^{-34}}{3.315\times10^{-24}}=2.0\times10^{-10}\,\text{m}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The de Broglie wavelength of an electron accelerated through $100\,\text{V}$ is approximately $0.123\,\text{nm}$. Find its wavelength when accelerated through $400\,\text{V}$.`,
        difficulty: 2,
        skillTags: ["wavelength_scaling", "accelerating_potential"],
        parts: onePart("Use proportionality to find the new wavelength.", 2),
        hints: [
          L`For an electron accelerated through $V$, $\lambda\propto1/\sqrt V$.`,
          L`The voltage becomes four times as large.`,
          L`The wavelength becomes half.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Uses inverse square-root dependence.",
          },
          {
            part: "a",
            points: 1,
            description: "Obtains 0.0615 nm.",
          },
        ]),
        commonErrors: [
          "Using inverse linear dependence and dividing by 4.",
          "Saying wavelength increases with voltage.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The accelerating voltage changes from $100\,\text{V}$ to $400\,\text{V}$, a factor of $4$.`,
          },
          {
            part: "a",
            explanation: L`Since $\lambda\propto1/\sqrt V$,`,
            math: L`\lambda'=\frac{0.123}{\sqrt4}=0.0615\,\text{nm}`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`An electron is accelerated from rest through a potential difference $V$.`,
        difficulty: 3,
        skillTags: ["derive", "electron_wavelength", "accelerating_potential"],
        parts: [
          part(
            "a",
            L`Show that its de Broglie wavelength is $\lambda=h/\sqrt{2meV}$.`,
            3,
          ),
          part(
            "b",
            L`Using $\lambda(\text{nm})=1.227/\sqrt V$, find $\lambda$ for $150\,\text{V}$.`,
            2,
          ),
        ],
        hints: [
          L`The electron gains kinetic energy $eV$.`,
          L`Use $K=p^2/(2m)$.`,
          L`Then substitute $p$ into $\lambda=h/p$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 3,
            description:
              "Connects eV to kinetic energy, obtains p, and substitutes in lambda = h/p.",
          },
          {
            part: "b",
            points: 2,
            description: "Computes about 0.100 nm for 150 V.",
          },
        ]),
        commonErrors: [
          "Using $eV=mv$ instead of kinetic energy.",
          "Forgetting the square root when finding momentum.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The kinetic energy gained by the electron is`,
            math: L`K=eV`,
          },
          {
            part: "a",
            explanation: L`For non-relativistic motion,`,
            math: L`K=\frac{p^2}{2m}\Rightarrow p=\sqrt{2meV}`,
          },
          {
            part: "a",
            explanation: L`Therefore, by de Broglie's relation,`,
            math: L`\lambda=\frac{h}{p}=\frac{h}{\sqrt{2meV}}`,
          },
          {
            part: "b",
            explanation: L`For $150\,\text{V}$,`,
            math: L`\lambda=\frac{1.227}{\sqrt{150}}\approx0.100\,\text{nm}`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`An electron beam used for matter-wave diffraction is accelerated through $54\,\text{V}$ and then through $216\,\text{V}$ in a second trial.`,
        difficulty: 3,
        skillTags: ["case_study", "matter_waves", "accelerating_potential"],
        figure: deBroglieGraphFigure,
        parts: [
          part(
            "a",
            "How does the electron momentum change from the first trial to the second?",
            1,
          ),
          part("b", "How does the de Broglie wavelength change?", 1),
          part("c", "Explain the trend using the graph.", 2),
        ],
        hints: [
          L`Kinetic energy is proportional to accelerating voltage.`,
          L`Momentum is proportional to $\sqrt V$.`,
          L`Wavelength is inversely proportional to momentum.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Says momentum doubles.",
          },
          {
            part: "b",
            points: 1,
            description: "Says wavelength halves.",
          },
          {
            part: "c",
            points: 2,
            description: "Links the inverse lambda-p relation to the graph.",
          },
        ]),
        commonErrors: [
          "Treating wavelength as proportional to voltage.",
          "Ignoring the square-root relation between momentum and voltage.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The voltage changes by a factor of $216/54=4$. Since $p\propto\sqrt V$, momentum doubles.`,
          },
          {
            part: "b",
            explanation: L`Since $\lambda=h/p$, doubling momentum halves the wavelength.`,
          },
          {
            part: "c",
            explanation: L`The graph shows $\lambda$ decreasing as $p$ increases, which is the inverse relation $\lambda=h/p$.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "7.5",
    title: "Integrated Dual-Nature Reasoning",
    subtopic:
      "Particle-wave evidence, combined photoelectric and matter-wave calculations, and assertion-reason style reasoning",
    mc: [
      {
        questionLatex: L`Which pairing best represents the dual nature of radiation?`,
        difficulty: 2,
        skillTags: ["dual_nature", "evidence"],
        choices: [
          L`Interference shows wave nature, while the photoelectric effect shows particle nature.`,
          L`Interference shows particle nature, while the photoelectric effect shows wave nature.`,
          L`Both interference and the photoelectric effect show only wave nature.`,
          L`Both effects show only particle nature.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This reverses the standard interpretation of the two phenomena.`,
          C: L`The photoelectric effect requires the photon model for its key observations.`,
          D: L`Interference is a wave phenomenon.`,
        },
        hints: [
          L`Think of which phenomenon needs superposition.`,
          L`Think of which phenomenon needs energy packets.`,
          L`Radiation needs different models in different experiments.`,
        ],
        solution: [
          {
            explanation: L`Interference and diffraction are explained by wave nature of light.`,
          },
          {
            explanation: L`The photoelectric effect is explained by particle-like photons transferring energy $h\nu$ to electrons.`,
          },
        ],
      },
      {
        questionLatex: L`In a photoelectric experiment, the frequency is fixed above threshold and the light intensity is doubled. Ideally,`,
        difficulty: 2,
        skillTags: ["intensity_effect", "stopping_potential"],
        choices: [
          L`both saturation current and stopping potential double`,
          L`saturation current doubles but stopping potential remains unchanged`,
          L`stopping potential doubles but saturation current remains unchanged`,
          L`both saturation current and stopping potential remain unchanged`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`Stopping potential depends on photon energy, not photon count.`,
          C: L`Intensity changes electron emission rate, not maximum kinetic energy.`,
          D: L`Saturation current changes because more photons arrive per second.`,
        },
        hints: [
          L`Intensity controls number of incident photons per second.`,
          L`Frequency controls energy per photon.`,
          L`Stopping potential is linked to $K_{\max}$.`,
        ],
        solution: [
          {
            explanation: L`At fixed frequency, each photon has the same energy, so $K_{\max}$ and $V_0$ are unchanged.`,
          },
          {
            explanation: L`Doubling intensity doubles the photon arrival rate and ideally doubles saturation current.`,
          },
        ],
      },
      {
        questionLatex: L`A fastest photoelectron has kinetic energy $1.5\,\text{eV}$. Treating it non-relativistically, its de Broglie wavelength is closest to $\lambda(\text{nm})=1.227/\sqrt{V}$ with $V=1.5$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: [
          "integrated_photoelectric_de_broglie",
          "electron_wavelength",
        ],
        choices: [
          L`$0.50\,\text{nm}$`,
          L`$0.75\,\text{nm}$`,
          L`$1.00\,\text{nm}$`,
          L`$1.50\,\text{nm}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`This is too small; the square-root divisor is only about $1.225$.`,
          B: L`This overestimates the effect of the $1.5\,\text{eV}$ kinetic energy.`,
          D: L`This treats wavelength as directly proportional to kinetic energy.`,
        },
        hints: [
          L`Electron kinetic energy in eV can be treated like acceleration through the same number of volts for this formula.`,
          L`Compute $\sqrt{1.5}\approx1.225$.`,
          L`Divide $1.227$ by $1.225$.`,
        ],
        solution: [
          {
            explanation: L`For an electron with $1.5\,\text{eV}$ kinetic energy, use the equivalent accelerating voltage $V=1.5$.`,
            math: L`\lambda=\frac{1.227}{\sqrt{1.5}}\,\text{nm}`,
          },
          {
            explanation: L`Since $\sqrt{1.5}\approx1.225$,`,
            math: L`\lambda\approx1.00\,\text{nm}`,
          },
        ],
      },
      {
        questionLatex: L`Light of wavelength $310\,\text{nm}$ is incident on a metal of work function $2.0\,\text{eV}$. Taking $hc=1240\,\text{eV nm}$, the stopping potential is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["photoelectric_equation", "stopping_potential"],
        choices: [
          L`$0\,\text{V}$`,
          L`$1.0\,\text{V}$`,
          L`$4.0\,\text{V}$`,
          L`$2.0\,\text{V}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: L`The incident photon energy is greater than the work function, so emission occurs.`,
          B: L`This subtracts from an incorrect photon energy.`,
          C: L`This is the incident photon energy, not the stopping potential.`,
        },
        hints: [
          L`Find photon energy from $1240/310$.`,
          L`Subtract the work function.`,
          L`The answer in eV is numerically equal to stopping potential in volts.`,
        ],
        solution: [
          {
            explanation: L`The photon energy is`,
            math: L`E=\frac{1240}{310}=4.0\,\text{eV}`,
          },
          {
            explanation: L`The maximum kinetic energy is`,
            math: L`K_{\max}=4.0-2.0=2.0\,\text{eV}`,
          },
          {
            explanation: L`Thus the stopping potential is $2.0\,\text{V}$.`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Threshold frequency depends on the nature of the metal. Reason (R): Work function is a characteristic property of the metal surface. Choose the correct option.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "threshold_frequency", "work_function"],
        choices: [
          L`Both A and R are true, and R correctly explains A.`,
          L`Both A and R are true, but R does not explain A.`,
          L`A is true, but R is false.`,
          L`A is false, but R is true.`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`The reason does explain the assertion because $h\nu_0=\phi$.`,
          C: L`The reason is true: work function is characteristic of the metal surface.`,
          D: L`The assertion is also true; threshold frequency changes with work function.`,
        },
        hints: [
          L`Connect threshold frequency with work function.`,
          L`Use $h\nu_0=\phi$.`,
          L`If $\phi$ changes from metal to metal, so does $\nu_0$.`,
        ],
        solution: [
          {
            explanation: L`At threshold,`,
            math: L`h\nu_0=\phi`,
          },
          {
            explanation: L`Since the work function is characteristic of the metal surface, threshold frequency also depends on the metal. So R correctly explains A.`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Why does the photoelectric effect support the particle nature of light?`,
        difficulty: 2,
        skillTags: ["particle_nature", "photoelectric_effect"],
        parts: onePart("Give one clear reason.", 1),
        hints: [
          L`Think about energy transfer.`,
          L`Each electron absorbs energy from one photon in the basic model.`,
          L`The energy is $h\nu$, not proportional to intensity per electron.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Mentions discrete photons transferring energy h nu to electrons.",
          },
        ]),
        commonErrors: [
          "Saying the effect proves only wave nature.",
          "Saying intensity alone decides electron energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The effect is explained by light arriving in photons, each carrying energy $h\nu$, which is transferred to an electron to overcome the work function and give kinetic energy.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Radiation of wavelength $300\,\text{nm}$ falls on a metal with work function $2.3\,\text{eV}$. Take $hc=1240\,\text{eV nm}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["photoelectric_equation", "stopping_potential"],
        parts: [
          part("a", "Find the maximum kinetic energy of photoelectrons.", 2),
          part("b", "Find the stopping potential.", 1),
        ],
        hints: [
          L`Find the incident photon energy.`,
          L`Subtract the work function.`,
          L`Convert eV of kinetic energy directly to volts of stopping potential.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Computes photon energy and Kmax correctly.",
          },
          {
            part: "b",
            points: 1,
            description:
              "States stopping potential equal numerically to Kmax in eV.",
          },
        ]),
        commonErrors: [
          "Using $300$ as frequency.",
          "Forgetting to subtract the work function.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Photon energy is`,
            math: L`E=\frac{1240}{300}=4.13\,\text{eV}`,
          },
          {
            part: "a",
            explanation: L`Therefore`,
            math: L`K_{\max}=4.13-2.30=1.83\,\text{eV}`,
          },
          {
            part: "b",
            explanation: L`The stopping potential is`,
            math: L`V_0=1.83\,\text{V}`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A photon and an electron have the same de Broglie wavelength $\lambda$. Compare their momenta and comment on whether their energies must be equal.`,
        difficulty: 3,
        skillTags: ["dual_nature", "momentum_comparison", "matter_waves"],
        parts: [
          part("a", "Compare their momentum magnitudes.", 1),
          part(
            "b",
            "State whether their energies must be equal, with a reason.",
            2,
          ),
        ],
        hints: [
          L`For both, momentum is related to wavelength by $p=h/\lambda$.`,
          L`A photon has $E=pc$.`,
          L`A non-relativistic electron has $K=p^2/(2m)$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States equal momentum magnitudes.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Explains that energy relations differ for photon and electron.",
          },
        ]),
        commonErrors: [
          "Assuming equal wavelength means equal energy for all particles.",
          "Forgetting that photons and electrons obey different energy-momentum relations.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For the same wavelength,`,
            math: L`p=\frac{h}{\lambda}`,
          },
          {
            part: "a",
            explanation: L`So their momentum magnitudes are equal.`,
          },
          {
            part: "b",
            explanation: L`Their energies need not be equal. A photon has $E=pc$, while a non-relativistic electron has kinetic energy $K=p^2/(2m)$. Same $p$ does not imply same energy for these different particles.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Light of wavelength $400\,\text{nm}$ ejects electrons from a metal of work function $2.0\,\text{eV}$. Estimate the de Broglie wavelength of the fastest emitted electrons. Use $hc=1240\,\text{eV nm}$ and $\lambda_e(\text{nm})=1.227/\sqrt{K(\text{eV})}$ for electrons.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: [
          "integrated_photoelectric_de_broglie",
          "stopping_potential",
        ],
        parts: [
          part(
            "a",
            "Find the maximum kinetic energy of the photoelectrons.",
            2,
          ),
          part("b", "Find the stopping potential.", 1),
          part(
            "c",
            "Estimate the de Broglie wavelength of the fastest emitted electrons.",
            2,
          ),
        ],
        hints: [
          L`Begin with photon energy $1240/400$.`,
          L`The fastest electron has kinetic energy $h\nu-\phi$.`,
          L`Use that kinetic energy in the given electron wavelength formula.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Computes Kmax = 1.10 eV.",
          },
          {
            part: "b",
            points: 1,
            description: "States V0 = 1.10 V.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Uses Kmax in de Broglie formula and obtains about 1.17 nm.",
          },
        ]),
        commonErrors: [
          "Using photon wavelength as the electron de Broglie wavelength.",
          "Using photon energy instead of electron kinetic energy in the electron formula.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The incident photon energy is`,
            math: L`E=\frac{1240}{400}=3.10\,\text{eV}`,
          },
          {
            part: "a",
            explanation: L`Therefore the maximum kinetic energy is`,
            math: L`K_{\max}=3.10-2.00=1.10\,\text{eV}`,
          },
          {
            part: "b",
            explanation: L`The stopping potential is`,
            math: L`V_0=1.10\,\text{V}`,
          },
          {
            part: "c",
            explanation: L`For the fastest electrons,`,
            math: L`\lambda_e=\frac{1.227}{\sqrt{1.10}}\approx1.17\,\text{nm}`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A metal has threshold frequency $5.0\times10^{14}\,\text{Hz}$. It is illuminated first with light of frequency $8.0\times10^{14}\,\text{Hz}$ and intensity $I$, then with the same frequency and intensity $2I$, and finally with frequency $1.0\times10^{15}\,\text{Hz}$ at intensity $I$. Take $h=6.63\times10^{-34}\,\text{J s}$ and $1\,\text{eV}=1.6\times10^{-19}\,\text{J}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: [
          "case_study",
          "threshold_frequency",
          "intensity_effect",
          "stopping_potential",
        ],
        parts: [
          part("a", "Find the work function in eV.", 2),
          part(
            "b",
            L`Find the stopping potential for $8.0\times10^{14}\,\text{Hz}$ light.`,
            2,
          ),
          part(
            "c",
            "State what changes when intensity is changed from $I$ to $2I$ at the same frequency.",
            1,
          ),
          part(
            "d",
            L`Find the stopping potential for $1.0\times10^{15}\,\text{Hz}$ light.`,
            2,
          ),
        ],
        hints: [
          L`At threshold, $\phi=h\nu_0$.`,
          L`Use $K_{\max}=h(\nu-\nu_0)$.`,
          L`Intensity changes current; frequency changes maximum kinetic energy.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Computes work function about 2.07 eV.",
          },
          {
            part: "b",
            points: 2,
            description: "Computes stopping potential about 1.24 V.",
          },
          {
            part: "c",
            points: 1,
            description:
              "States saturation current changes but stopping potential does not.",
          },
          {
            part: "d",
            points: 2,
            description: "Computes stopping potential about 2.07 V.",
          },
        ]),
        commonErrors: [
          "Saying intensity doubles stopping potential.",
          "Using absolute frequency instead of frequency above threshold for kinetic energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The work function is threshold photon energy.`,
            math: L`\phi=h\nu_0=6.63\times10^{-34}\times5.0\times10^{14}=3.315\times10^{-19}\,\text{J}`,
          },
          {
            part: "a",
            explanation: L`In eV,`,
            math: L`\phi=\frac{3.315\times10^{-19}}{1.6\times10^{-19}}=2.07\,\text{eV}`,
          },
          {
            part: "b",
            explanation: L`For $8.0\times10^{14}\,\text{Hz}$,`,
            math: L`K_{\max}=h(8.0-5.0)\times10^{14}=1.989\times10^{-19}\,\text{J}=1.24\,\text{eV}`,
          },
          {
            part: "b",
            explanation: L`So $V_0=1.24\,\text{V}$.`,
          },
          {
            part: "c",
            explanation: L`Doubling intensity at the same frequency ideally doubles saturation current, but stopping potential remains unchanged.`,
          },
          {
            part: "d",
            explanation: L`For $1.0\times10^{15}\,\text{Hz}$, the excess frequency is $5.0\times10^{14}\,\text{Hz}$.`,
            math: L`K_{\max}=6.63\times10^{-34}\times5.0\times10^{14}=3.315\times10^{-19}\,\text{J}=2.07\,\text{eV}`,
          },
          {
            part: "d",
            explanation: L`Therefore $V_0=2.07\,\text{V}$.`,
          },
        ],
      },
    ],
  },
];

export const dualNatureRadiationMatterTopics: Topic[] = relocateDualNatureItems(
  topics.map(makeTopic),
);
