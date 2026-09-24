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
const UNIT = "u5-electromagnetic-waves";
const VERSION = "0.1.3";
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
  calculatorAllowed?: boolean;
  skillTags: string[];
  commonMisconceptions?: string[];
  figure?: ItemFigure;
  choices: readonly [string, string, string, string];
  correctLetter: McLetter;
  rationales: Partial<Record<McLetter, string>>;
  misconceptionTags?: Partial<Record<McLetter, string>>;
  hints: readonly [string, string, string];
  solution: readonly SolutionStep[];
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
  return `You chose ${choiceText}. Recheck whether the question is about displacement current, wave direction, field relation, spectrum order, or use of the radiation.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class12_physics_em_waves_reasoning"),
    };
  });

  const topicNumber = Number(meta.topicCode.split(".")[1] ?? 0);
  const rotation = (topicNumber + index) % LETTERS.length;
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "confuses_mechanical_waves_current_flow_and_em_wave_properties",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: [...seed.solution],
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
    contentId: `${COURSE}.u5.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "states_a_fact_without_linking_it_to_maxwell_wave_or_spectrum_reasoning",
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

function singlePart(
  promptMarkdown: string,
  points: number,
): readonly FrqPart[] {
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

const chargingCapacitorFigure: ItemFigure = {
  type: "svg",
  title: "Charging capacitor and fields in the gap",
  description:
    "A battery charges a parallel-plate capacitor. Wire current is shown in the leads and electric field lines are shown between the plates.",
  svg: `<svg viewBox="0 0 700 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="390" fill="#ffffff"/>
  <defs>
    <marker id="cap-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#2563eb"/>
    </marker>
    <marker id="field-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
      <path d="M0 0 L9 4.5 L0 9 Z" fill="#f97316"/>
    </marker>
  </defs>
  <g fill="none" stroke="#334155" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M120 245 H250"/>
    <path d="M450 245 H580"/>
    <path d="M120 245 V145 H250"/>
    <path d="M450 145 H580 V245"/>
    <line x1="250" y1="95" x2="250" y2="295"/>
    <line x1="450" y1="95" x2="450" y2="295"/>
  </g>
  <g stroke="#94a3b8" stroke-width="3">
    <line x1="93" y1="210" x2="93" y2="280"/>
    <line x1="105" y1="225" x2="105" y2="265"/>
  </g>
  <g stroke="#2563eb" stroke-width="3" marker-end="url(#cap-arrow)">
    <line x1="150" y1="145" x2="215" y2="145"/>
    <line x1="550" y1="245" x2="490" y2="245"/>
  </g>
  <g stroke="#f97316" stroke-width="3" marker-end="url(#field-arrow)">
    <line x1="295" y1="135" x2="405" y2="135"/>
    <line x1="295" y1="185" x2="405" y2="185"/>
    <line x1="295" y1="235" x2="405" y2="235"/>
    <line x1="295" y1="285" x2="405" y2="285"/>
  </g>
  <g fill="#0f172a" font-family="Arial, sans-serif" font-size="16" text-anchor="middle">
    <text x="99" y="305">battery</text>
    <text x="185" y="125">wire current</text>
    <text x="520" y="225">wire current</text>
    <text x="350" y="78">capacitor gap</text>
    <text x="350" y="328">changing electric field</text>
    <text x="240" y="82">plate A</text>
    <text x="462" y="82">plate B</text>
  </g>
</svg>`,
};

const transverseWaveFigure: ItemFigure = {
  type: "svg",
  title: "Electric and magnetic field directions",
  description:
    "A coordinate sketch showing electric field along positive y and magnetic field along positive z, represented by the out-of-page dot symbol.",
  svg: `<svg viewBox="0 0 720 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="420" fill="#ffffff"/>
  <defs>
    <marker id="axis-arrow-em" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
    <marker id="field-arrow-em" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <g stroke="#dbe4f0" stroke-width="1">
    <line x1="110" y1="250" x2="620" y2="250"/>
    <line x1="170" y1="90" x2="170" y2="330"/>
  </g>
  <g stroke="#334155" stroke-width="2.5" marker-end="url(#axis-arrow-em)">
    <line x1="100" y1="250" x2="635" y2="250"/>
    <line x1="170" y1="335" x2="170" y2="75"/>
  </g>
  <g stroke-width="4" stroke-linecap="round">
    <line x1="310" y1="250" x2="310" y2="118" stroke="#2563eb" marker-end="url(#field-arrow-em)"/>
  </g>
  <circle cx="310" cy="250" r="34" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
  <circle cx="310" cy="250" r="6" fill="#dc2626"/>
  <g fill="#0f172a" font-family="Arial, sans-serif" font-size="16">
    <text x="643" y="255">+x</text>
    <text x="142" y="78">+y</text>
    <text x="320" y="116" fill="#2563eb">E along +y</text>
    <text x="354" y="256" fill="#dc2626">B along +z</text>
    <text x="265" y="305" fill="#64748b">dot: out of page</text>
  </g>
</svg>`,
};

const spectrumFigure: ItemFigure = {
  type: "svg",
  title: "Electromagnetic spectrum order",
  description:
    "The electromagnetic spectrum arranged from long wavelength to short wavelength, with frequency increasing in the opposite direction.",
  svg: `<svg viewBox="0 0 760 310" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="760" height="310" fill="#ffffff"/>
  <defs>
    <marker id="spectrum-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#334155" stroke-width="2.5" marker-end="url(#spectrum-arrow)">
    <line x1="85" y1="88" x2="675" y2="88"/>
    <line x1="675" y1="230" x2="85" y2="230"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="15" text-anchor="middle">
    <text x="380" y="60" fill="#334155">frequency increases</text>
    <text x="380" y="262" fill="#334155">wavelength increases</text>
  </g>
  <g>
    <rect x="78" y="130" width="92" height="56" fill="#dbeafe" stroke="#2563eb"/>
    <rect x="170" y="130" width="92" height="56" fill="#e0f2fe" stroke="#0284c7"/>
    <rect x="262" y="130" width="92" height="56" fill="#fee2e2" stroke="#dc2626"/>
    <rect x="354" y="130" width="92" height="56" fill="#dcfce7" stroke="#16a34a"/>
    <rect x="446" y="130" width="92" height="56" fill="#ede9fe" stroke="#7c3aed"/>
    <rect x="538" y="130" width="92" height="56" fill="#fef3c7" stroke="#d97706"/>
    <rect x="630" y="130" width="92" height="56" fill="#f1f5f9" stroke="#475569"/>
  </g>
  <g fill="#0f172a" font-family="Arial, sans-serif" font-size="15" text-anchor="middle">
    <text x="124" y="164">radio</text>
    <text x="216" y="164">micro</text>
    <text x="308" y="164">infrared</text>
    <text x="400" y="164">visible</text>
    <text x="492" y="164">UV</text>
    <text x="584" y="164">X-ray</text>
    <text x="676" y="164">gamma</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "5.1",
    title: "Displacement Current",
    subtopic:
      "Need for displacement current, charging capacitor, and Maxwell's correction to Ampere's law.",
    mc: [
      {
        questionLatex: L`During the charging of a parallel-plate capacitor, the conduction current in the connecting wire is $0.40\text{ A}$. At the same instant, the displacement current between the plates is`,
        difficulty: 2,
        skillTags: ["displacement_current", "charging_capacitor"],
        figure: chargingCapacitorFigure,
        choices: [
          L`$0.40\text{ A}$`,
          L`zero, because no charge crosses the gap`,
          L`greater than $0.40\text{ A}$ because electric field is present`,
          L`less than $0.40\text{ A}$ because the capacitor opposes current`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This ignores Maxwell's displacement current, which accounts for the changing electric field in the gap.",
          C: "The displacement current equals the conduction current during ordinary charging, not a larger current.",
          D: "Capacitive opposition is not the comparison being asked; current continuity requires equal instantaneous current.",
        },
        hints: [
          "The plates do not conduct across the gap, but the electric field changes there.",
          "Maxwell introduced displacement current so current remains continuous.",
          L`For a charging capacitor, $I_d=I$ at the same instant.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In the wire, ordinary conduction current charges the plates.",
          },
          {
            step: 2,
            explanation:
              "Between the plates, the changing electric field gives displacement current.",
          },
          {
            step: 3,
            explanation:
              "For the same charging process, the instantaneous values are equal.",
            math: "I_d=I=0.40\\text{ A}",
          },
        ],
      },
      {
        questionLatex: L`The displacement current density in a region is most directly related to`,
        difficulty: 2,
        skillTags: ["displacement_current_density", "electric_field_change"],
        choices: [
          L`the rate of change of electric field`,
          L`the rate of change of magnetic field only`,
          L`the drift speed of free electrons only`,
          L`the resistance of the medium only`,
        ],
        correctLetter: "A",
        rationales: {
          B: "A changing magnetic field is linked with induced electric field, not displacement current density directly.",
          C: "Drift of free electrons describes conduction current, not displacement current in a dielectric or vacuum.",
          D: "Resistance affects conduction current, but displacement current is tied to changing electric field.",
        },
        hints: [
          L`Recall $J_d=\varepsilon_0\,dE/dt$ in vacuum.`,
          "Ask what is changing in the capacitor gap.",
          "The key field is the electric field.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Displacement current is introduced for a changing electric flux.",
          },
          {
            step: 2,
            explanation:
              "Per unit area, it depends on the rate of change of electric field.",
            math: "J_d=\\varepsilon_0\\frac{dE}{dt}",
          },
        ],
      },
      {
        questionLatex: L`A capacitor is connected to a DC battery for a long time so that it is fully charged. The displacement current in the gap is then`,
        difficulty: 2,
        skillTags: ["steady_state_capacitor", "displacement_current"],
        choices: [
          L`zero`,
          L`equal to the initial charging current`,
          L`infinite because the dielectric blocks charge`,
          L`non-zero because an electric field exists`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The initial charging current exists only while the plate charge and electric field are changing.",
          C: "Blocking conduction through the gap does not make displacement current infinite.",
          D: "A steady electric field alone is not enough; displacement current requires changing electric field.",
        },
        hints: [
          "After a long time, the capacitor voltage is steady.",
          "Displacement current depends on change of electric flux.",
          L`If $d\Phi_E/dt=0$, then $I_d=0$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In the final steady state, the electric field between the plates no longer changes.",
          },
          {
            step: 2,
            explanation:
              "Therefore the displacement current is zero, even though a steady electric field remains.",
            math: "I_d=\\varepsilon_0\\frac{d\\Phi_E}{dt}=0",
          },
        ],
      },
      {
        questionLatex: L`Between capacitor plates of area $1.0\times10^{-2}\text{ m}^2$, the electric field changes at $4.0\times10^{11}\text{ V m}^{-1}\text{s}^{-1}$. Taking $\varepsilon_0=8.85\times10^{-12}\text{ C}^2\text{N}^{-1}\text{m}^{-2}$, the displacement current is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["displacement_current", "electric_flux_rate"],
        choices: [
          L`$3.5\times10^{-2}\text{ A}$`,
          L`$3.5\times10^{-4}\text{ A}$`,
          L`$4.0\times10^{9}\text{ A}$`,
          L`$8.9\times10^{-14}\text{ A}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is a two-power error from missing the plate area scale.",
          C: "This multiplies field-change rate and area but misses the small factor $\\varepsilon_0$.",
          D: "This keeps only $\\varepsilon_0 A$ and misses the field-change rate.",
        },
        hints: [
          L`Use $I_d=\varepsilon_0 A\,dE/dt$.`,
          "Multiply the area by the field-change rate before applying $\\varepsilon_0$.",
          L`$A\,dE/dt=(10^{-2})(4.0\times10^{11})=4.0\times10^9$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The electric flux rate is area times the electric-field rate.",
            math: "A\\frac{dE}{dt}=10^{-2}\\times4.0\\times10^{11}=4.0\\times10^9",
          },
          {
            step: 2,
            explanation: "Multiply by $\\varepsilon_0$.",
            math: "I_d=8.85\\times10^{-12}\\times4.0\\times10^9",
          },
          {
            step: 3,
            explanation: "The displacement current is about $0.035\\text{ A}$.",
            math: "I_d=3.54\\times10^{-2}\\text{ A}",
          },
        ],
      },
      {
        questionLatex: L`The main purpose of adding displacement current to Ampere's circuital law is to`,
        difficulty: 3,
        skillTags: ["maxwell_correction", "ampere_law"],
        choices: [
          L`make the magnetic field around a charging capacitor consistent for different surfaces`,
          L`prove that charges cannot produce electric fields`,
          L`remove the need for conduction current in metal wires`,
          L`make electromagnetic waves longitudinal`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Charges do produce electric fields; that is not what Maxwell's correction changes.",
          C: "Conduction current remains real in wires; displacement current completes the description where fields change.",
          D: "Electromagnetic waves are transverse in free space, not longitudinal.",
        },
        hints: [
          "Think of an Amperian loop around a wire charging a capacitor.",
          "Different spanning surfaces should not give contradictory magnetic fields.",
          "The missing term is due to changing electric flux.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Ampere's law with only conduction current gives trouble for a loop near a charging capacitor.",
          },
          {
            step: 2,
            explanation:
              "Adding displacement current through the capacitor gap makes the magnetic field result independent of the chosen surface.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`State the physical quantity whose time variation gives displacement current between the plates of a charging capacitor.`,
        difficulty: 1,
        skillTags: ["displacement_current_definition"],
        parts: singlePart(
          "Name the varying quantity and write the compact relation.",
          1,
        ),
        hints: [
          "Look at the capacitor gap, not the metal wire.",
          "The relevant flux is electric flux.",
          L`Use $I_d=\varepsilon_0\,d\Phi_E/dt$ in vacuum.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States changing electric flux/electric field and gives the displacement-current idea.",
          },
        ]),
        commonErrors: [
          "Saying magnetic flux instead of electric flux.",
          "Describing only electron drift in the wire.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Displacement current is associated with time-varying electric flux between the plates.",
            math: "I_d=\\varepsilon_0\\frac{d\\Phi_E}{dt}",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The electric flux through the gap of a capacitor changes uniformly from $0$ to $3.0\times10^8\text{ N m}^2\text{C}^{-1}$ in $2.0\text{ ms}$. Find the average displacement current. Take $\varepsilon_0=8.85\times10^{-12}\text{ C}^2\text{N}^{-1}\text{m}^{-2}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["displacement_current", "average_rate"],
        parts: singlePart("Calculate the average displacement current.", 2),
        hints: [
          L`Use $I_d=\varepsilon_0\Delta\Phi_E/\Delta t$.`,
          L`$2.0\text{ ms}=2.0\times10^{-3}\text{ s}$.`,
          "Keep the power of ten from the millisecond conversion.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Finds the electric-flux rate with correct time unit.",
          },
          {
            part: "a",
            points: 1,
            description: "Multiplies by $\\varepsilon_0$ and reports current.",
          },
        ]),
        commonErrors: [
          "Using milliseconds as seconds.",
          "Forgetting the factor $\\varepsilon_0$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "First compute the average rate of change of electric flux.",
            math: "\\frac{\\Delta\\Phi_E}{\\Delta t}=\\frac{3.0\\times10^8}{2.0\\times10^{-3}}=1.5\\times10^{11}",
          },
          {
            part: "a",
            explanation:
              "The displacement current is $\\varepsilon_0$ times this rate.",
            math: "I_d=8.85\\times10^{-12}\\times1.5\\times10^{11}=1.33\\text{ A}",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student says, "There is no current between capacitor plates because air is an insulator, so magnetic field cannot exist near the gap during charging." Correct the statement in two sentences.`,
        difficulty: 3,
        skillTags: ["conceptual_displacement_current", "capacitor_gap"],
        parts: singlePart("Write the corrected explanation.", 2),
        hints: [
          "Separate conduction current from displacement current.",
          "An insulator blocks charge drift, not changing electric field.",
          "The changing electric field can produce magnetic field.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Identifies that conduction current is absent in the gap.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Explains that displacement current/changing electric field accounts for magnetic field.",
          },
        ]),
        commonErrors: [
          "Claiming electrons jump across the air gap.",
          "Calling displacement current a material conduction current.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "There is no conduction current through the insulating gap, but the electric field between the plates changes while the capacitor charges. This changing electric field is described by displacement current and produces the magnetic field consistently.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A parallel-plate capacitor is being charged by a steady wire current $I$. Explain why an Amperian loop around the lead gives the same magnetic-field conclusion whether the spanning surface cuts the wire or bulges through the capacitor gap.`,
        difficulty: 3,
        skillTags: ["maxwell_correction", "ampere_law", "displacement_current"],
        figure: chargingCapacitorFigure,
        parts: [
          part(
            "a",
            "Describe the apparent contradiction if only conduction current is used.",
            2,
          ),
          part(
            "b",
            "State Maxwell's correction in words and connect it to the capacitor gap.",
            2,
          ),
          part("c", "State the value of displacement current in the gap.", 1),
        ],
        hints: [
          "One surface cuts the wire; another can pass between the capacitor plates.",
          "The wire has conduction current, while the gap has changing electric flux.",
          L`For charging, $I_d=I$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Explains the two-surface issue for Ampere's law around a charging capacitor.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Introduces displacement current due to changing electric flux.",
          },
          {
            part: "c",
            points: 1,
            description:
              "States that the displacement current equals the wire current during charging.",
          },
        ]),
        commonErrors: [
          "Saying the magnetic field is zero near the capacitor gap.",
          "Treating displacement current as actual electron crossing of the dielectric.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "If only conduction current is counted, a surface cutting the wire encloses current $I$, but a surface through the capacitor gap encloses no conduction current. The same loop cannot give two different magnetic fields.",
          },
          {
            part: "b",
            explanation:
              "Maxwell added displacement current, which is produced by changing electric flux. In the capacitor gap, the electric field grows as the plates charge, so the gap contributes displacement current.",
            math: "I_d=\\varepsilon_0\\frac{d\\Phi_E}{dt}",
          },
          {
            part: "c",
            explanation:
              "For the charging capacitor at a given instant, the displacement current in the gap equals the conduction current in the lead.",
            math: "I_d=I",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A laboratory capacitor has plate area $2.0\times10^{-2}\text{ m}^2$. While it is charging, the electric field between the plates increases uniformly at $1.5\times10^{11}\text{ V m}^{-1}\text{s}^{-1}$. Assume fringing is negligible and take $\varepsilon_0=8.85\times10^{-12}\text{ SI units}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["case_based", "displacement_current", "capacitor_field"],
        figure: chargingCapacitorFigure,
        parts: [
          part("a", "Find the rate of change of electric flux.", 2),
          part("b", "Find the displacement current.", 2),
          part(
            "c",
            "If the wire current is steady during this interval, what should its value be?",
            1,
          ),
        ],
        hints: [
          L`For uniform field, $\Phi_E=EA$.`,
          L`$I_d=\varepsilon_0 A\,dE/dt$.`,
          "For charging, the same current appears as conduction current in the wire and displacement current in the gap.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Computes $A\\,dE/dt$ with correct powers.",
          },
          {
            part: "b",
            points: 2,
            description: "Uses displacement-current formula correctly.",
          },
          {
            part: "c",
            points: 1,
            description: "Equates wire current to displacement current.",
          },
        ]),
        commonErrors: [
          "Using $E/A$ instead of $EA$.",
          "Omitting $\\varepsilon_0$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The electric flux rate is the area times the field-change rate.",
            math: "\\frac{d\\Phi_E}{dt}=A\\frac{dE}{dt}=2.0\\times10^{-2}\\times1.5\\times10^{11}=3.0\\times10^9",
          },
          {
            part: "b",
            explanation: "Now multiply by $\\varepsilon_0$.",
            math: "I_d=8.85\\times10^{-12}\\times3.0\\times10^9=2.655\\times10^{-2}\\text{ A}",
          },
          {
            part: "c",
            explanation:
              "For a steady charging current during this interval, the wire current is the same.",
            math: "I=I_d\\approx2.7\\times10^{-2}\\text{ A}",
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.2",
    title: "Origin and Speed of Electromagnetic Waves",
    subtopic:
      "Production by accelerated charges, no need for material medium, and speed in vacuum.",
    mc: [
      {
        questionLatex: L`Which situation is the most direct source of electromagnetic waves?`,
        difficulty: 2,
        skillTags: ["accelerated_charge", "em_wave_origin"],
        choices: [
          L`an accelerated charge`,
          L`a stationary charge only`,
          L`a charge moving uniformly in a straight line only`,
          L`a neutral body at rest with no changing fields`,
        ],
        correctLetter: "A",
        rationales: {
          B: "A stationary charge produces a static electric field, not a radiating electromagnetic wave.",
          C: "Uniform straight-line motion does not provide the changing fields needed for radiation in this level of treatment.",
          D: "Without changing fields or accelerated charges, this is not a source of EM waves.",
        },
        hints: [
          "Static charges make static fields.",
          "Radiation is associated with changing fields.",
          "Acceleration of charge is the key source statement.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Electromagnetic waves are produced by accelerated charges.",
          },
          {
            step: 2,
            explanation:
              "The acceleration causes time-varying electric and magnetic fields to sustain each other.",
          },
        ],
      },
      {
        questionLatex: L`The speed of electromagnetic waves in vacuum is given by`,
        difficulty: 2,
        skillTags: ["speed_of_light", "mu0_epsilon0"],
        choices: [
          L`$c=\dfrac{1}{\sqrt{\mu_0\varepsilon_0}}$`,
          L`$c=\sqrt{\mu_0\varepsilon_0}$`,
          L`$c=\dfrac{\mu_0}{\varepsilon_0}$`,
          L`$c=\mu_0\varepsilon_0$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This inverts the correct expression.",
          C: "The ratio does not have the correct dimensions or value for wave speed.",
          D: "The product alone is not a speed.",
        },
        hints: [
          "The expression contains both constants under a square root.",
          "The speed is large, so the small product is in the denominator.",
          L`Use $c=1/\sqrt{\mu_0\varepsilon_0}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Maxwell's theory gives the vacuum speed from magnetic and electric constants.",
            math: "c=\\frac{1}{\\sqrt{\\mu_0\\varepsilon_0}}",
          },
        ],
      },
      {
        questionLatex: L`A radio transmitter emits waves of frequency $75\text{ MHz}$. Taking $c=3.0\times10^8\text{ m s}^{-1}$, the wavelength is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["wavelength_frequency", "radio_waves"],
        choices: [
          L`$4.0\text{ m}$`,
          L`$0.25\text{ m}$`,
          L`$2.25\times10^{16}\text{ m}$`,
          L`$75\text{ m}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This roughly inverts the correct result.",
          C: "This multiplies speed and frequency instead of dividing.",
          D: "This treats MHz as if it were already a wavelength scale.",
        },
        hints: [
          L`Use $c=f\lambda$.`,
          L`$75\text{ MHz}=75\times10^6\text{ Hz}$.`,
          L`$\lambda=3.0\times10^8/(75\times10^6)$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Convert the frequency into hertz.",
            math: "f=75\\times10^6\\text{ Hz}",
          },
          {
            step: 2,
            explanation: "Use $c=f\\lambda$.",
            math: "\\lambda=\\frac{3.0\\times10^8}{75\\times10^6}=4.0\\text{ m}",
          },
        ],
      },
      {
        questionLatex: L`In an electromagnetic wave travelling in vacuum, the electric and magnetic fields are best described as`,
        difficulty: 2,
        skillTags: ["em_wave_characteristics", "fields"],
        choices: [
          L`time-varying and mutually perpendicular`,
          L`steady and parallel to each other`,
          L`electric field only; magnetic field is absent`,
          L`mechanical vibrations of particles of the medium`,
        ],
        correctLetter: "A",
        rationales: {
          B: "A steady field configuration is not a propagating EM wave.",
          C: "An EM wave contains both electric and magnetic fields.",
          D: "EM waves do not require material particles as the wave medium.",
        },
        hints: [
          "The wave can travel through vacuum.",
          "Both fields are present.",
          "The two fields are perpendicular to each other and to propagation.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Electromagnetic waves consist of time-varying electric and magnetic fields.",
          },
          {
            step: 2,
            explanation:
              "In free space these fields are mutually perpendicular and transverse to the direction of propagation.",
          },
        ],
      },
      {
        questionLatex: L`An electromagnetic wave has peak electric field $E_0=90\text{ V m}^{-1}$. Its peak magnetic field in vacuum is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["field_relation", "em_wave_speed"],
        choices: [
          L`$3.0\times10^{-7}\text{ T}$`,
          L`$2.7\times10^{10}\text{ T}$`,
          L`$90\text{ T}$`,
          L`$3.0\times10^{6}\text{ T}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This multiplies by $c$ instead of dividing by $c$.",
          C: "Electric and magnetic field amplitudes do not have the same numerical value in SI units.",
          D: "This uses an incorrect power of ten for division by $c$.",
        },
        hints: [
          L`For an EM wave in vacuum, $E_0=cB_0$.`,
          L`$B_0=E_0/c$.`,
          L`$c=3.0\times10^8\text{ m s}^{-1}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the field amplitude relation in vacuum.",
            math: "E_0=cB_0",
          },
          {
            step: 2,
            explanation: "Substitute the given value.",
            math: "B_0=\\frac{90}{3.0\\times10^8}=3.0\\times10^{-7}\\text{ T}",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`What kind of charge motion produces electromagnetic waves?`,
        difficulty: 1,
        skillTags: ["accelerated_charge"],
        parts: singlePart("Answer in one phrase.", 1),
        hints: [
          "A stationary charge gives a static field.",
          "Uniform motion alone is not the source statement used here.",
          "The key word is acceleration.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States accelerated charge or accelerating charge.",
          },
        ]),
        commonErrors: [
          "Writing only 'moving charge' without acceleration.",
          "Writing 'stationary charge'.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Electromagnetic waves are produced by accelerated charges.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A wave from a transmitter has frequency $120\text{ MHz}$. Find its wavelength in air, taking the speed as $3.0\times10^8\text{ m s}^{-1}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["wavelength_frequency"],
        parts: singlePart("Calculate the wavelength.", 2),
        hints: [
          L`Use $c=f\lambda$.`,
          L`$120\text{ MHz}=1.20\times10^8\text{ Hz}$.`,
          "Divide speed by frequency.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Converts MHz into Hz." },
          {
            part: "a",
            points: 1,
            description: "Uses $\\lambda=c/f$ correctly.",
          },
        ]),
        commonErrors: [
          "Multiplying speed and frequency.",
          "Forgetting the mega prefix.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Convert and substitute in the wave relation.",
            math: "\\lambda=\\frac{3.0\\times10^8}{120\\times10^6}=2.5\\text{ m}",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An electromagnetic wave can travel from the Sun to Earth through nearly empty space. What does this show about the nature of electromagnetic waves?`,
        difficulty: 2,
        skillTags: ["vacuum_propagation", "em_wave_characteristics"],
        parts: singlePart(
          "State the conclusion and contrast it with a sound wave.",
          2,
        ),
        hints: [
          "Think about whether a material medium is required.",
          "Sound is mechanical.",
          "EM waves are field waves.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States EM waves do not require a material medium.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Contrasts with sound/mechanical waves needing medium.",
          },
        ]),
        commonErrors: [
          "Saying space contains enough air for sound-like propagation.",
          "Calling EM waves mechanical waves.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "It shows that electromagnetic waves do not need a material medium; they are oscillating electric and magnetic fields. A sound wave is mechanical and needs material particles to transmit it.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`An electromagnetic wave in vacuum has $B_0=2.0\times10^{-7}\text{ T}$ and frequency $6.0\times10^{14}\text{ Hz}$. Take $c=3.0\times10^8\text{ m s}^{-1}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["field_relation", "wavelength_frequency", "visible_light"],
        parts: [
          part("a", "Find the peak electric field.", 2),
          part("b", "Find the wavelength.", 2),
          part("c", "State whether the wave needs a material medium.", 1),
        ],
        hints: [
          L`Use $E_0=cB_0$.`,
          L`Use $\lambda=c/f$.`,
          "EM waves travel in vacuum.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Uses $E_0=cB_0$ with correct substitution.",
          },
          {
            part: "b",
            points: 2,
            description: "Uses $\\lambda=c/f$ with correct power of ten.",
          },
          {
            part: "c",
            points: 1,
            description: "States no material medium is required.",
          },
        ]),
        commonErrors: [
          "Using $B_0=cE_0$.",
          "Multiplying $c$ and $f$ for wavelength.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The amplitudes obey $E_0=cB_0$.",
            math: "E_0=3.0\\times10^8\\times2.0\\times10^{-7}=60\\text{ V m}^{-1}",
          },
          {
            part: "b",
            explanation: "The wavelength follows from the wave relation.",
            math: "\\lambda=\\frac{3.0\\times10^8}{6.0\\times10^{14}}=5.0\\times10^{-7}\\text{ m}",
          },
          {
            part: "c",
            explanation:
              "Electromagnetic waves can travel through vacuum and do not require a material medium.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A classroom demonstration uses a small radio source whose frequency can be varied. At one setting the frequency is $100\text{ MHz}$; at another it is $300\text{ MHz}$. Take $c=3.0\times10^8\text{ m s}^{-1}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["case_based", "frequency_wavelength", "radio_waves"],
        parts: [
          part("a", "Find the wavelength at $100\\text{ MHz}$.", 1),
          part("b", "Find the wavelength at $300\\text{ MHz}$.", 1),
          part(
            "c",
            "State the relation between frequency and wavelength in the same medium.",
            1,
          ),
        ],
        hints: [
          L`Use $\lambda=c/f$.`,
          "Higher frequency gives shorter wavelength in the same medium.",
          "Convert MHz to Hz.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Finds $3.0\\text{ m}$." },
          { part: "b", points: 1, description: "Finds $1.0\\text{ m}$." },
          {
            part: "c",
            points: 1,
            description: "States inverse proportionality for fixed speed.",
          },
        ]),
        commonErrors: [
          "Forgetting that MHz means $10^6\\text{ Hz}$.",
          "Saying higher frequency gives longer wavelength.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "At $100\\text{ MHz}$,",
            math: "\\lambda=\\frac{3.0\\times10^8}{100\\times10^6}=3.0\\text{ m}",
          },
          {
            part: "b",
            explanation: "At $300\\text{ MHz}$,",
            math: "\\lambda=\\frac{3.0\\times10^8}{300\\times10^6}=1.0\\text{ m}",
          },
          {
            part: "c",
            explanation:
              "Since $c=f\\lambda$ and $c$ is fixed in the same medium, wavelength is inversely proportional to frequency.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.3",
    title: "Transverse Nature and Field Direction",
    subtopic:
      "Mutual perpendicularity of electric field, magnetic field, and direction of propagation.",
    mc: [
      {
        questionLatex: L`In the figure, the electric field is along $+y$ and the magnetic field is along $+z$. The direction of propagation is along`,
        difficulty: 3,
        skillTags: ["field_direction", "em_wave_transverse"],
        figure: transverseWaveFigure,
        choices: [L`$+x$`, L`$-x$`, L`$+y$`, L`$+z$`],
        correctLetter: "A",
        rationales: {
          B: "The direction is given by $\\vec E\\times\\vec B$, not the reverse product.",
          C: "The electric field direction is transverse to propagation.",
          D: "The magnetic field direction is also transverse to propagation.",
        },
        hints: [
          L`The wave travels along $\vec E\times\vec B$.`,
          L`Use the right-hand rule for $\hat y\times\hat z$.`,
          L`$\hat y\times\hat z=\hat x$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For an EM wave, the direction of propagation is along $\\vec E\\times\\vec B$.",
            math: "\\hat y\\times\\hat z=\\hat x",
          },
        ],
      },
      {
        questionLatex: L`The statement "electromagnetic waves are transverse" means that`,
        difficulty: 2,
        skillTags: ["transverse_wave", "em_wave_characteristics"],
        choices: [
          L`$\vec E$ and $\vec B$ are perpendicular to the direction of propagation`,
          L`$\vec E$ is parallel to the direction of propagation`,
          L`only magnetic field oscillates`,
          L`the wave needs a solid medium`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Parallel oscillation would describe longitudinal behaviour for that field.",
          C: "Both electric and magnetic fields oscillate in an EM wave.",
          D: "Requirement of a solid medium is unrelated and false for EM waves.",
        },
        hints: [
          "Transverse means oscillation is across the travel direction.",
          "Both fields are involved.",
          "The fields and propagation direction are mutually perpendicular.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In a transverse EM wave, electric and magnetic fields oscillate perpendicular to the direction in which the wave travels.",
          },
        ],
      },
      {
        questionLatex: L`For an electromagnetic wave in vacuum, which relation between the field magnitudes is correct?`,
        difficulty: 2,
        skillTags: ["field_relation", "em_wave_speed"],
        choices: [L`$E=cB$`, L`$B=cE$`, L`$E=B$ in SI units`, L`$E/B=c^2$`],
        correctLetter: "A",
        rationales: {
          B: "This reverses the correct relation.",
          C: "The SI units and numerical scales of electric and magnetic field differ.",
          D: "The ratio $E/B$ equals $c$, not $c^2$.",
        },
        hints: [
          "The ratio of electric to magnetic field has units of speed.",
          L`$E/B=c$.`,
          L`Therefore $E=cB$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The magnitudes in vacuum obey $E/B=c$.",
            math: "E=cB",
          },
        ],
      },
      {
        questionLatex: L`An EM wave travels along $+x$. If its electric field oscillates along $+z$ at an instant, the magnetic field at that instant must be along`,
        difficulty: 3,
        skillTags: ["right_hand_rule", "field_direction"],
        choices: [L`$+y$`, L`$-y$`, L`$+x$`, L`$-z$`],
        correctLetter: "B",
        rationales: {
          A: "This reverses the sign: $+z\\times+y=-x$, so the wave would travel opposite to the stated direction.",
          C: "Magnetic field cannot be along the direction of propagation for a transverse EM wave.",
          D: "That is opposite to the electric-field direction and still not perpendicular in the needed way.",
        },
        hints: [
          L`Propagation is along $\vec E\times\vec B$.`,
          L`You need $\hat z\times ?=\hat x$.`,
          L`$\hat z\times\hat y=-\hat x$, so check signs carefully.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "We need $\\vec E\\times\\vec B$ to point along $+x$.",
          },
          {
            step: 2,
            explanation:
              "Since $\\hat z\\times\\hat y=-\\hat x$, the magnetic field must be along $-y$, not $+y$.",
            math: "\\hat z\\times(-\\hat y)=+\\hat x",
          },
        ],
      },
      {
        questionLatex: L`In a plane electromagnetic wave in vacuum, the electric and magnetic fields are`,
        difficulty: 2,
        skillTags: ["phase", "em_wave_fields"],
        choices: [
          L`in phase`,
          L`always $90^\circ$ out of phase`,
          L`opposite in direction and parallel`,
          L`randomly oriented in every cycle`,
        ],
        correctLetter: "A",
        rationales: {
          B: "For a plane EM wave in vacuum, $E$ and $B$ reach maxima together.",
          C: "They are perpendicular, not parallel.",
          D: "Their relative directions are fixed for a plane wave.",
        },
        hints: [
          "Look at when the field magnitudes become maximum.",
          "For a plane wave, the fields maintain a fixed relation.",
          "They oscillate together.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In a plane EM wave in free space, the electric and magnetic fields are mutually perpendicular and in phase.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`If an electromagnetic wave travels along $+x$ and its electric field is along $+y$, along which direction should its magnetic field point?`,
        difficulty: 2,
        skillTags: ["right_hand_rule", "field_direction"],
        parts: singlePart("Give the direction only.", 1),
        hints: [
          L`Propagation is along $\vec E\times\vec B$.`,
          L`You need $\hat y\times ?=\hat x$.`,
          L`$\hat y\times\hat z=\hat x$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States $+z$ direction.",
          },
        ]),
        commonErrors: [
          "Choosing $+x$, the propagation direction.",
          "Using $\\vec B\\times\\vec E$ instead of $\\vec E\\times\\vec B$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The propagation direction is $\\vec E\\times\\vec B$, so $+y\\times+z=+x$.",
            math: "\\vec B\\parallel +z",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`The electric field amplitude of a plane electromagnetic wave is $300\text{ V m}^{-1}$. Find the magnetic field amplitude in vacuum.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["field_relation", "amplitude"],
        parts: singlePart("Calculate $B_0$.", 2),
        hints: [
          L`Use $E_0=cB_0$.`,
          L`$c=3.0\times10^8\text{ m s}^{-1}$.`,
          "Divide electric field by $c$.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Uses $E_0=cB_0$." },
          {
            part: "a",
            points: 1,
            description: "Finds the correct order of magnitude for $B_0$.",
          },
        ]),
        commonErrors: [
          "Multiplying by $c$ instead of dividing.",
          "Writing the same numerical value for $E_0$ and $B_0$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use the vacuum relation between field amplitudes.",
            math: "B_0=\\frac{E_0}{c}=\\frac{300}{3.0\\times10^8}=1.0\\times10^{-6}\\text{ T}",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Use the schematic electromagnetic wave shown to state two perpendicularity relations among $\vec E$, $\vec B$, and the direction of propagation.`,
        difficulty: 2,
        skillTags: ["transverse_wave", "field_geometry"],
        figure: transverseWaveFigure,
        parts: singlePart(
          "Write any two correct perpendicularity relations.",
          2,
        ),
        hints: [
          "A transverse wave has field oscillations perpendicular to travel direction.",
          "The electric and magnetic fields are also mutually perpendicular.",
          "You can express this using dot products equal to zero.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States one correct relation, such as $\\vec E\\perp\\vec B$.",
          },
          {
            part: "a",
            points: 1,
            description:
              "States a second correct relation involving propagation direction.",
          },
        ]),
        commonErrors: [
          "Saying $\\vec E$ is parallel to propagation.",
          "Forgetting the magnetic field direction.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For a plane EM wave, $\\vec E\\perp\\vec B$, $\\vec E\\perp$ direction of propagation, and $\\vec B\\perp$ direction of propagation. Any two of these earn full credit.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`An electromagnetic wave travels along $+x$. At a certain point and instant, $\vec E=120\hat{j}\text{ V m}^{-1}$.`,
        difficulty: 3,
        skillTags: ["right_hand_rule", "field_relation", "transverse_wave"],
        parts: [
          part("a", "Find the direction of $\\vec B$.", 1),
          part("b", "Find the magnitude of $\\vec B$.", 2),
          part(
            "c",
            "State why this supports the transverse nature of the wave.",
            2,
          ),
        ],
        hints: [
          L`Use $\vec E\times\vec B$ for propagation direction.`,
          L`$E=cB$.`,
          "Transverse means the fields are perpendicular to travel direction.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Correctly gives $+z$ direction.",
          },
          {
            part: "b",
            points: 2,
            description: "Uses $B=E/c$ and calculates magnitude.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Explains that both fields are perpendicular to propagation and to each other.",
          },
        ]),
        commonErrors: ["Choosing $+x$ for magnetic field.", "Using $B=cE$."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The propagation direction is $+x$, and $+y\\times+z=+x$, so $\\vec B$ is along $+z$.",
          },
          {
            part: "b",
            explanation: "Use $E=cB$.",
            math: "B=\\frac{120}{3.0\\times10^8}=4.0\\times10^{-7}\\text{ T}",
          },
          {
            part: "c",
            explanation:
              "The electric field is along $y$, the magnetic field is along $z$, and the wave travels along $x$. Since the field oscillations are perpendicular to the propagation direction, the wave is transverse.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A detector records a plane electromagnetic wave. At one instant, the electric field is upward and the magnetic field is toward the east. The wave is known to be travelling horizontally.`,
        difficulty: 3,
        skillTags: ["case_based", "field_direction", "transverse_wave"],
        parts: [
          part("a", "What rule gives the direction of propagation?", 1),
          part("b", "Is the wave direction parallel to either field?", 1),
          part("c", "What does this tell you about the type of wave?", 1),
        ],
        hints: [
          L`Use $\vec E\times\vec B$.`,
          "The direction of propagation is perpendicular to both field directions.",
          "Perpendicular field oscillation indicates transverse nature.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States $\\vec E\\times\\vec B$ rule.",
          },
          {
            part: "b",
            points: 1,
            description: "States it is not parallel to either field.",
          },
          {
            part: "c",
            points: 1,
            description: "Identifies the wave as transverse.",
          },
        ]),
        commonErrors: [
          "Using $\\vec B\\times\\vec E$ without checking sign.",
          "Calling it longitudinal because it travels horizontally.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The propagation direction of a plane EM wave is given by $\\vec E\\times\\vec B$.",
          },
          {
            part: "b",
            explanation:
              "The propagation direction is perpendicular to both the electric and magnetic fields.",
          },
          {
            part: "c",
            explanation:
              "Because the field oscillations are perpendicular to the propagation direction, the wave is transverse.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.4",
    title: "Electromagnetic Spectrum",
    subtopic:
      "Order of spectrum, wavelength-frequency relation, and identification of common bands.",
    mc: [
      {
        questionLatex: L`Which sequence is in order of increasing frequency?`,
        difficulty: 2,
        skillTags: ["spectrum_order", "frequency"],
        choices: [
          L`radio waves, microwaves, infrared, visible light, ultraviolet, X-rays, gamma rays`,
          L`gamma rays, X-rays, ultraviolet, visible light, infrared, microwaves, radio waves`,
          L`visible light, infrared, microwaves, radio waves, ultraviolet, X-rays, gamma rays`,
          L`radio waves, infrared, microwaves, visible light, X-rays, ultraviolet, gamma rays`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is decreasing frequency, not increasing frequency.",
          C: "This breaks the low-frequency side by placing visible before infrared and radio.",
          D: "Microwaves should come before infrared, and ultraviolet should come before X-rays.",
        },
        hints: [
          "Radio waves are at the low-frequency end.",
          "Gamma rays are at the high-frequency end.",
          "Microwaves lie between radio and infrared.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Frequency increases from radio waves through microwaves, infrared, visible, ultraviolet, X-rays, and gamma rays.",
          },
        ],
      },
      {
        questionLatex: L`If the wavelength of an electromagnetic wave decreases while it remains in vacuum, its frequency`,
        difficulty: 2,
        skillTags: ["frequency_wavelength", "spectrum"],
        choices: [
          L`increases`,
          L`decreases`,
          L`remains necessarily zero`,
          L`becomes independent of speed`,
        ],
        correctLetter: "A",
        rationales: {
          B: "For fixed speed, frequency and wavelength are inversely related.",
          C: "A propagating EM wave has nonzero frequency.",
          D: "The relation $c=f\\lambda$ still involves speed.",
        },
        hints: [
          L`Use $c=f\lambda$.`,
          "In vacuum, $c$ is fixed.",
          "If one factor decreases, the other increases.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Since $c=f\\lambda$ is fixed in vacuum, frequency increases when wavelength decreases.",
          },
        ],
      },
      {
        questionLatex: L`Light of wavelength $600\text{ nm}$ has frequency approximately`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["visible_light", "frequency_wavelength"],
        choices: [
          L`$5.0\times10^{14}\text{ Hz}$`,
          L`$5.0\times10^{5}\text{ Hz}$`,
          L`$1.8\times10^{2}\text{ Hz}$`,
          L`$1.8\times10^{17}\text{ Hz}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This misses the nanometre conversion by many powers of ten.",
          C: "This effectively multiplies the wavelength scale incorrectly.",
          D: "This multiplies speed and wavelength instead of dividing.",
        },
        hints: [
          L`600\text{ nm}=600\times10^{-9}\text{ m}=6.0\times10^{-7}\text{ m}.`,
          L`$f=c/\lambda$.`,
          L`$3.0\times10^8/(6.0\times10^{-7})=5.0\times10^{14}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Convert the wavelength into metre.",
            math: "\\lambda=600\\times10^{-9}=6.0\\times10^{-7}\\text{ m}",
          },
          {
            step: 2,
            explanation: "Use $f=c/\\lambda$.",
            math: "f=\\frac{3.0\\times10^8}{6.0\\times10^{-7}}=5.0\\times10^{14}\\text{ Hz}",
          },
        ],
      },
      {
        questionLatex: L`The band of electromagnetic radiation immediately beyond the red end of the visible spectrum is`,
        difficulty: 2,
        skillTags: ["infrared", "spectrum_order"],
        choices: [L`infrared`, L`ultraviolet`, L`X-rays`, L`gamma rays`],
        correctLetter: "A",
        rationales: {
          B: "Ultraviolet lies beyond the violet end, not the red end.",
          C: "X-rays have still higher frequency than ultraviolet.",
          D: "Gamma rays are at the extreme high-frequency end.",
        },
        hints: [
          "Red is the lower-frequency edge of visible light.",
          "Below visible frequency lies infrared.",
          "Beyond violet lies ultraviolet.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Infrared radiation lies just beyond the red end of the visible spectrum.",
          },
        ],
      },
      {
        questionLatex: L`A radiation has wavelength $1.0\times10^{-10}\text{ m}$. In the usual school-level electromagnetic spectrum, it is best identified as`,
        difficulty: 3,
        skillTags: ["x_rays", "spectrum_identification"],
        choices: [L`X-rays`, L`radio waves`, L`microwaves`, L`infrared`],
        correctLetter: "A",
        rationales: {
          B: "Radio waves have much longer wavelengths.",
          C: "Microwaves have wavelengths much longer than atomic-scale lengths.",
          D: "Infrared wavelengths are longer than visible light, not $10^{-10}\\text{ m}$.",
        },
        hints: [
          "The wavelength is far shorter than visible light.",
          "It is around an atomic length scale.",
          "Such wavelengths are associated with X-rays in this spectrum map.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A wavelength of about $10^{-10}\\text{ m}$ lies in the X-ray region for school-level classification.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Arrange microwaves, ultraviolet, radio waves, and visible light in increasing frequency.`,
        difficulty: 2,
        skillTags: ["spectrum_order"],
        parts: singlePart("Write the correct order.", 1),
        hints: [
          "Radio waves are lowest among these.",
          "Microwaves come after radio waves.",
          "Ultraviolet is beyond visible light in frequency.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "Gives radio waves, microwaves, visible light, ultraviolet.",
          },
        ]),
        commonErrors: [
          "Putting ultraviolet before visible light.",
          "Putting microwaves above visible light.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Increasing frequency order is radio waves, microwaves, visible light, ultraviolet.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A microwave oven uses radiation of frequency $2.45\text{ GHz}$. Estimate its wavelength in air. Take $c=3.0\times10^8\text{ m s}^{-1}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["microwaves", "wavelength_frequency"],
        parts: singlePart("Calculate the wavelength.", 2),
        hints: [
          L`$2.45\text{ GHz}=2.45\times10^9\text{ Hz}$.`,
          L`$\lambda=c/f$.`,
          "The answer should be of the order of centimetres.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Converts GHz to Hz." },
          {
            part: "a",
            points: 1,
            description: "Computes wavelength using $c=f\\lambda$.",
          },
        ]),
        commonErrors: [
          "Using $10^6$ instead of $10^9$ for giga.",
          "Multiplying by frequency.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Substitute in $\\lambda=c/f$.",
            math: "\\lambda=\\frac{3.0\\times10^8}{2.45\\times10^9}=1.22\\times10^{-1}\\text{ m}",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Why are X-rays placed beyond ultraviolet rays on the high-frequency side of the electromagnetic spectrum?`,
        difficulty: 2,
        skillTags: ["x_rays", "spectrum_order"],
        parts: singlePart(
          "Give the reason using wavelength-frequency relation.",
          2,
        ),
        hints: [
          "Compare their typical wavelengths.",
          "Shorter wavelength means higher frequency.",
          L`Use $c=f\lambda$ for the same speed.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description:
              "States X-rays have shorter wavelength than ultraviolet.",
          },
          {
            part: "a",
            points: 1,
            description: "Links shorter wavelength to higher frequency.",
          },
        ]),
        commonErrors: [
          "Saying X-rays are beyond UV because they travel faster in vacuum.",
          "Reversing the wavelength-frequency relation.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "X-rays have shorter wavelengths than ultraviolet rays. Since all EM waves travel with the same speed in vacuum, $c=f\\lambda$, shorter wavelength corresponds to higher frequency.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A source emits electromagnetic radiation of wavelength $3.0\times10^{-2}\text{ m}$ and another source emits radiation of wavelength $5.0\times10^{-7}\text{ m}$. Take $c=3.0\times10^8\text{ m s}^{-1}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["spectrum_identification", "frequency_wavelength"],
        parts: [
          part("a", "Find the frequency of the first radiation.", 2),
          part("b", "Find the frequency of the second radiation.", 2),
          part("c", "Identify the likely spectrum regions.", 2),
        ],
        hints: [
          L`Use $f=c/\lambda$ for both.`,
          "Centimetre wavelength suggests microwaves.",
          "A wavelength of a few hundred nanometres is visible light.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Finds $1.0\\times10^{10}\\text{ Hz}$.",
          },
          {
            part: "b",
            points: 2,
            description: "Finds $6.0\\times10^{14}\\text{ Hz}$.",
          },
          {
            part: "c",
            points: 2,
            description: "Identifies microwave and visible regions.",
          },
        ]),
        commonErrors: [
          "Calling centimetre wavelength radio only without checking microwave range.",
          "Treating $5.0\\times10^{-7}\\text{ m}$ as ultraviolet.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "For the first source,",
            math: "f_1=\\frac{3.0\\times10^8}{3.0\\times10^{-2}}=1.0\\times10^{10}\\text{ Hz}",
          },
          {
            part: "b",
            explanation: "For the second source,",
            math: "f_2=\\frac{3.0\\times10^8}{5.0\\times10^{-7}}=6.0\\times10^{14}\\text{ Hz}",
          },
          {
            part: "c",
            explanation:
              "$3.0\\times10^{-2}\\text{ m}$ is in the microwave region. $5.0\\times10^{-7}\\text{ m}$ is visible light.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student uses the spectrum chart shown while comparing three radiations: P has wavelength $10^{-1}\text{ m}$, Q has wavelength $10^{-6}\text{ m}$, and R has wavelength $10^{-10}\text{ m}$.`,
        difficulty: 3,
        skillTags: ["case_based", "spectrum_order", "wavelength"],
        figure: spectrumFigure,
        parts: [
          part("a", "Which has the highest frequency?", 1),
          part("b", "Which is closest to infrared/visible boundary scale?", 1),
          part("c", "Which is most likely an X-ray-scale radiation?", 1),
        ],
        hints: [
          "Highest frequency means shortest wavelength.",
          "Infrared and visible are around micrometre to sub-micrometre scales.",
          "X-ray wavelengths are much shorter.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Chooses R." },
          { part: "b", points: 1, description: "Chooses Q." },
          { part: "c", points: 1, description: "Chooses R." },
        ]),
        commonErrors: [
          "Choosing longest wavelength as highest frequency.",
          "Confusing micrometre-scale radiation with radio waves.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "R has the shortest wavelength, so it has the highest frequency.",
          },
          {
            part: "b",
            explanation:
              "$10^{-6}\\text{ m}$ is a micrometre scale, close to infrared/visible boundary scales.",
          },
          {
            part: "c",
            explanation:
              "$10^{-10}\\text{ m}$ is characteristic of X-ray-scale radiation in this school-level spectrum map.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "5.5",
    title: "Uses of Electromagnetic Waves",
    subtopic:
      "Elementary uses of radio waves, microwaves, infrared, visible, ultraviolet, X-rays, and gamma rays.",
    mc: [
      {
        questionLatex: L`Which radiation is most commonly associated with thermal imaging and remote controls?`,
        difficulty: 2,
        skillTags: ["infrared_uses", "applications"],
        choices: [L`infrared`, L`gamma rays`, L`X-rays`, L`radio waves`],
        correctLetter: "A",
        rationales: {
          B: "Gamma rays are very high-frequency radiation used in nuclear/medical contexts, not ordinary remote controls.",
          C: "X-rays are used for radiography and security scanning, not TV remote controls.",
          D: "Radio waves are used in communication, but thermal imaging is associated with infrared.",
        },
        hints: [
          "Warm bodies emit strongly in this region.",
          "TV remotes commonly use this radiation.",
          "It lies beyond the red end of visible light.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Infrared radiation is associated with heat radiation, thermal imaging, and many remote controls.",
          },
        ],
      },
      {
        questionLatex: L`For medical imaging of bones, the suitable electromagnetic radiation is usually`,
        difficulty: 2,
        skillTags: ["x_ray_uses", "medical_imaging"],
        choices: [L`X-rays`, L`radio waves`, L`infrared`, L`microwaves`],
        correctLetter: "A",
        rationales: {
          B: "Radio waves have low frequency and are used for communication, not ordinary bone radiographs.",
          C: "Infrared is mainly thermal/heat-related at this level.",
          D: "Microwaves are used in radar, communication, and heating, not standard bone imaging.",
        },
        hints: [
          "Bones absorb this radiation more strongly than soft tissue.",
          "It has shorter wavelength than ultraviolet.",
          "The common school-level answer is X-rays.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "X-rays are used for medical radiography such as imaging bones.",
          },
        ],
      },
      {
        questionLatex: L`Which pair is correctly matched?`,
        difficulty: 2,
        skillTags: ["em_spectrum_uses", "matching"],
        choices: [
          L`microwaves - radar`,
          L`ultraviolet - AM radio broadcasting`,
          L`gamma rays - TV remote controls`,
          L`infrared - bone radiography`,
        ],
        correctLetter: "A",
        rationales: {
          B: "AM broadcasting uses radio waves, not ultraviolet.",
          C: "TV remote controls usually use infrared, not gamma rays.",
          D: "Bone radiography uses X-rays, not infrared.",
        },
        hints: [
          "Radar commonly uses centimetre-range waves.",
          "Remote controls are usually infrared.",
          "Bone imaging is X-ray use.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Microwaves are commonly used in radar systems.",
          },
        ],
      },
      {
        questionLatex: L`Ultraviolet radiation is useful for sterilisation mainly because it can`,
        difficulty: 2,
        skillTags: ["ultraviolet_uses", "sterilisation"],
        choices: [
          L`damage microorganisms at sufficient intensity`,
          L`carry long-distance radio signals around Earth`,
          L`produce ordinary thermal images of warm bodies`,
          L`pass through bones for routine radiography`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Long-distance radio communication is a radio-wave use.",
          C: "Thermal imaging is associated with infrared.",
          D: "Routine bone radiography uses X-rays.",
        },
        hints: [
          "Think of disinfection lamps.",
          "It lies just beyond violet light.",
          "The effect is not ordinary heating alone.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Ultraviolet radiation can damage microorganisms and is therefore used for sterilisation in controlled settings.",
          },
        ],
      },
      {
        questionLatex: L`In controlled medical radiotherapy, the very high-frequency electromagnetic radiation used to destroy cancer cells is commonly identified as`,
        difficulty: 2,
        skillTags: ["gamma_ray_uses", "applications"],
        choices: [L`gamma rays`, L`radio waves`, L`infrared`, L`microwaves`],
        correctLetter: "A",
        rationales: {
          B: "Radio waves are low-frequency waves used mainly for communication, not radiotherapy.",
          C: "Infrared is associated with heat and thermal imaging, not cancer radiotherapy at this level.",
          D: "Microwaves are used for radar, communication, and heating, not the intended radiotherapy match.",
        },
        hints: [
          "The treatment uses the high-frequency end of the spectrum.",
          "The school-level use is cancer treatment or radiotherapy.",
          "The answer is beyond X-rays in the usual spectrum order.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Gamma rays are very high-frequency electromagnetic waves and are commonly listed for radiotherapy or cancer treatment in elementary spectrum-use questions.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Name the electromagnetic radiation commonly used in TV remote controls.`,
        difficulty: 1,
        skillTags: ["infrared_uses"],
        parts: singlePart("Name the radiation.", 1),
        hints: [
          "It lies beyond red.",
          "It is associated with heat radiation too.",
          "It is infrared.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Names infrared radiation." },
        ]),
        commonErrors: ["Writing radio waves for a short-range TV remote."],
        workedSolution: [
          {
            part: "a",
            explanation: "TV remote controls commonly use infrared radiation.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A hospital uses one electromagnetic radiation for imaging bones and another for sterilising instruments. Name the two radiations and give one reason for each choice.`,
        difficulty: 3,
        skillTags: ["x_ray_uses", "ultraviolet_uses", "applications"],
        parts: singlePart("Identify both radiations with reasons.", 4),
        hints: [
          "Bone imaging is not done with infrared.",
          "Sterilisation lamps often use ultraviolet.",
          "Give one use-based reason for each.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Names X-rays for bone imaging.",
          },
          {
            part: "a",
            points: 1,
            description: "Gives a valid X-ray imaging reason.",
          },
          {
            part: "a",
            points: 1,
            description: "Names ultraviolet for sterilisation.",
          },
          {
            part: "a",
            points: 1,
            description: "Gives a valid UV sterilisation reason.",
          },
        ]),
        commonErrors: [
          "Using gamma rays for routine bone imaging.",
          "Using infrared for sterilisation without qualification.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "X-rays are used for imaging bones because they can penetrate soft tissue but are absorbed more by dense bone. Ultraviolet radiation is used for sterilisation because it can damage microorganisms at sufficient intensity.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A weather satellite senses radiation emitted strongly by warm clouds and land surfaces, even at night. Which part of the electromagnetic spectrum is most relevant, and why?`,
        difficulty: 2,
        skillTags: ["infrared_uses", "thermal_imaging"],
        parts: singlePart("Identify the band and explain the clue.", 2),
        hints: [
          "The key clue is warm surfaces.",
          "Night operation means it is not relying only on reflected visible light.",
          "Thermal radiation is infrared.",
        ],
        rubric: rubric([
          { part: "a", points: 1, description: "Identifies infrared." },
          {
            part: "a",
            points: 1,
            description:
              "Links infrared to heat/thermal emission from warm bodies.",
          },
        ]),
        commonErrors: [
          "Choosing visible light despite the night-time clue.",
          "Choosing X-rays because they penetrate matter.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Infrared radiation is most relevant because warm objects emit thermal radiation strongly in the infrared region, allowing night-time thermal imaging.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A science exhibition has four counters: radar speed sensing, thermal camera, hospital bone imaging, and sterilisation lamp. Match each counter with the most suitable electromagnetic radiation and justify each match briefly.`,
        difficulty: 3,
        skillTags: ["applications", "spectrum_uses", "matching"],
        parts: [
          part("a", "Match radar speed sensing and thermal camera.", 2),
          part("b", "Match bone imaging and sterilisation lamp.", 2),
          part(
            "c",
            "Write the four radiations in increasing frequency order.",
            2,
          ),
        ],
        hints: [
          "Radar commonly uses microwaves.",
          "Thermal camera points to infrared.",
          "For the order, place infrared before ultraviolet and X-rays.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Correctly matches microwaves and infrared with reasons.",
          },
          {
            part: "b",
            points: 2,
            description:
              "Correctly matches X-rays and ultraviolet with reasons.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Orders microwave, infrared, ultraviolet, X-rays by increasing frequency.",
          },
        ]),
        commonErrors: [
          "Putting X-rays below ultraviolet in frequency.",
          "Matching thermal camera with microwaves because of heating.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Radar speed sensing: microwaves, because radar commonly uses microwave radiation. Thermal camera: infrared, because warm bodies emit infrared strongly.",
          },
          {
            part: "b",
            explanation:
              "Hospital bone imaging: X-rays, because they penetrate soft tissue and are absorbed more by bone. Sterilisation lamp: ultraviolet, because UV can damage microorganisms.",
          },
          {
            part: "c",
            explanation:
              "The increasing frequency order is microwaves, infrared, ultraviolet, X-rays.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A school sets up an electromagnetic-spectrum display. Station P transmits audio programmes to receivers far away. Station Q detects warm objects in darkness. Station R checks luggage by forming shadow images of dense objects. Station S disinfects a small closed box under supervision.`,
        difficulty: 3,
        skillTags: ["case_based", "spectrum_uses"],
        parts: [
          part("a", "Identify the radiation used at P and Q.", 2),
          part("b", "Identify the radiation used at R and S.", 2),
          part("c", "Which of these four has the highest frequency?", 1),
        ],
        hints: [
          "Long-distance audio broadcasting uses radio waves.",
          "Warm objects in darkness suggest infrared.",
          "Among radio, infrared, ultraviolet, and X-rays, X-rays have the highest frequency.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Identifies radio and infrared.",
          },
          {
            part: "b",
            points: 2,
            description: "Identifies X-rays and ultraviolet.",
          },
          { part: "c", points: 1, description: "Chooses X-rays." },
        ]),
        commonErrors: [
          "Choosing visible light for station Q despite darkness.",
          "Choosing gamma rays for luggage checking instead of X-rays.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "P uses radio waves for long-distance broadcasting. Q uses infrared for thermal detection.",
          },
          {
            part: "b",
            explanation:
              "R uses X-rays for shadow imaging of dense objects. S uses ultraviolet radiation for sterilisation.",
          },
          {
            part: "c",
            explanation:
              "Among radio, infrared, ultraviolet, and X-rays, X-rays have the highest frequency.",
          },
        ],
      },
    ],
  },
];

export const electromagneticWavesTopics: Topic[] = topicSeeds.map(makeTopic);
