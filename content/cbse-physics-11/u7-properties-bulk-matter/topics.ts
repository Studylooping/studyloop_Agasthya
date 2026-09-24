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

const COURSE = "cbse-physics-11";
const UNIT = "u7-properties-bulk-matter";
const VERSION = "0.1.6";
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
  extraMc?: readonly McSeed[];
  extraConstructed?: readonly ConstructedSeed[];
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
  return `You chose ${choiceText}. Recheck the formula, unit conversion, and whether the quantity is pressure, force, energy, or temperature change.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class11_physics_bulk_matter_reasoning"),
    };
  });

  const choices = unletteredChoices.map((choice, choiceIndex) => ({
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
      "uses_formula_without_checking_units_or_physical_region",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: [...seed.solution],
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
      "confuses_gauge_pressure_with_force_or_heat_with_temperature",
    ],
    questionLatex: seed.questionLatex,
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: [...seed.parts],
    hintLadder: hints(seed.hints),
    rubric: seed.rubric,
    commonErrors: [...seed.commonErrors],
    workedSolution: [...seed.workedSolution],
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
      ...(seed.extraMc ?? []).map((item, index) =>
        makeMc(seed, item, seed.mc.length + index),
      ),
      ...seed.constructed.map((item, index) =>
        makeConstructed(seed, item, index),
      ),
      ...(seed.extraConstructed ?? []).map((item, index) =>
        makeConstructed(seed, item, seed.constructed.length + index),
      ),
    ],
  };
}

const stressStrainFigure: ItemFigure = {
  type: "svg",
  title: "Stress-strain graph for a metal wire",
  description:
    "A stress-strain graph for a metal wire with axes and labelled points P, Y, and B.",
  svg: `<svg viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="380" fill="#ffffff"/>
  <line x1="90" y1="310" x2="575" y2="310" stroke="#334155" stroke-width="2"/>
  <line x1="90" y1="310" x2="90" y2="45" stroke="#334155" stroke-width="2"/>
  <path d="M90 310 L245 140 C315 83 390 88 445 145 C492 194 520 235 550 275" fill="none" stroke="#2563eb" stroke-width="4"/>
  <circle cx="245" cy="140" r="6" fill="#2563eb"/>
  <circle cx="445" cy="145" r="6" fill="#2563eb"/>
  <circle cx="550" cy="275" r="6" fill="#2563eb"/>
  <text x="280" y="335" font-size="16" fill="#0f172a">strain</text>
  <text x="24" y="190" font-size="16" fill="#0f172a" transform="rotate(-90 24 190)">stress</text>
  <text x="205" y="123" font-size="14" fill="#0f172a">P</text>
  <text x="455" y="138" font-size="14" fill="#0f172a">Y</text>
  <text x="555" y="292" font-size="14" fill="#0f172a">B</text>
  <path d="M112 286 L140 286" stroke="#94a3b8" stroke-width="2"/>
  <path d="M112 250 L140 250" stroke="#94a3b8" stroke-width="2"/>
  <path d="M112 214 L140 214" stroke="#94a3b8" stroke-width="2"/>
  <path d="M112 178 L140 178" stroke="#94a3b8" stroke-width="2"/>
</svg>`,
};

const hydraulicLiftFigure: ItemFigure = {
  type: "svg",
  title: "Hydraulic lift with two pistons",
  description:
    "Two pistons connected by liquid. The smaller piston has area A1 and the larger piston has area A2.",
  svg: `<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="360" fill="#ffffff"/>
  <defs>
    <marker id="arrow-hydraulic" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <rect x="130" y="110" width="90" height="150" fill="#dbeafe" stroke="#334155" stroke-width="3"/>
  <rect x="410" y="70" width="150" height="190" fill="#dbeafe" stroke="#334155" stroke-width="3"/>
  <rect x="210" y="210" width="210" height="50" fill="#dbeafe" stroke="#334155" stroke-width="3"/>
  <rect x="125" y="100" width="100" height="22" rx="5" fill="#94a3b8" stroke="#334155" stroke-width="2"/>
  <rect x="400" y="60" width="170" height="25" rx="5" fill="#94a3b8" stroke="#334155" stroke-width="2"/>
  <line x1="175" y1="45" x2="175" y2="96" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-hydraulic)"/>
  <line x1="485" y1="120" x2="485" y2="62" stroke="#16a34a" stroke-width="4" marker-end="url(#arrow-hydraulic)"/>
  <text x="150" y="38" font-size="18" fill="#1d4ed8">F1</text>
  <text x="496" y="122" font-size="18" fill="#166534">F2</text>
  <text x="145" y="153" font-size="17" fill="#0f172a">A1</text>
  <text x="465" y="148" font-size="17" fill="#0f172a">A2</text>
  <text x="283" y="244" font-size="16" fill="#0f172a">liquid</text>
</svg>`,
};

const venturiFigure: ItemFigure = {
  type: "svg",
  title: "Horizontal pipe with constriction",
  description:
    "A horizontal pipe narrows from section 1 to section 2. Pressure and speed are marked at both sections.",
  svg: `<svg viewBox="0 0 700 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="360" fill="#ffffff"/>
  <defs>
    <marker id="arrow-flow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <path d="M75 125 C185 125 235 125 305 150 C365 172 430 172 500 150 C570 125 620 125 660 125 L660 235 C620 235 570 235 500 210 C430 188 365 188 305 210 C235 235 185 235 75 235 Z" fill="#dbeafe" stroke="#334155" stroke-width="3"/>
  <line x1="112" y1="180" x2="250" y2="180" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-flow)"/>
  <line x1="430" y1="180" x2="570" y2="180" stroke="#2563eb" stroke-width="4" marker-end="url(#arrow-flow)"/>
  <line x1="175" y1="126" x2="175" y2="234" stroke="#f97316" stroke-width="3"/>
  <line x1="455" y1="151" x2="455" y2="209" stroke="#f97316" stroke-width="3"/>
  <text x="142" y="112" font-size="17" fill="#0f172a">section 1</text>
  <text x="420" y="138" font-size="17" fill="#0f172a">section 2</text>
  <text x="126" y="270" font-size="16" fill="#0f172a">A1, v1, P1</text>
  <text x="410" y="270" font-size="16" fill="#0f172a">A2, v2, P2</text>
</svg>`,
};

const capillaryFigure: ItemFigure = {
  type: "svg",
  title: "Capillary rise in a narrow tube",
  description:
    "A narrow capillary tube dipped in water shows a concave meniscus raised above the outside water level.",
  svg: `<svg viewBox="0 0 620 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="380" fill="#ffffff"/>
  <rect x="60" y="235" width="500" height="95" fill="#dbeafe" stroke="#334155" stroke-width="3"/>
  <rect x="285" y="60" width="55" height="270" fill="#eff6ff" stroke="#334155" stroke-width="3"/>
  <path d="M287 154 C300 168 325 168 338 154 L338 330 L287 330 Z" fill="#93c5fd" opacity="0.9"/>
  <line x1="80" y1="235" x2="560" y2="235" stroke="#2563eb" stroke-width="3"/>
  <line x1="340" y1="154" x2="475" y2="154" stroke="#f97316" stroke-width="2" stroke-dasharray="8 6"/>
  <line x1="475" y1="154" x2="475" y2="235" stroke="#f97316" stroke-width="3"/>
  <path d="M468 162 L475 154 L482 162" fill="none" stroke="#f97316" stroke-width="3"/>
  <path d="M468 227 L475 235 L482 227" fill="none" stroke="#f97316" stroke-width="3"/>
  <text x="486" y="199" font-size="18" fill="#9a3412">h</text>
  <text x="245" y="45" font-size="16" fill="#0f172a">capillary tube</text>
  <text x="82" y="224" font-size="16" fill="#1d4ed8">outside water level</text>
</svg>`,
};

const heatingCurveFigure: ItemFigure = {
  type: "svg",
  title: "Heating curve with phase changes",
  description:
    "A temperature-time graph with sloped heating regions and two horizontal plateaus.",
  svg: `<svg viewBox="0 0 660 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="380" fill="#ffffff"/>
  <line x1="80" y1="320" x2="585" y2="320" stroke="#334155" stroke-width="2"/>
  <line x1="80" y1="320" x2="80" y2="45" stroke="#334155" stroke-width="2"/>
  <path d="M90 292 L185 235 L285 235 L385 105 L505 105 L570 60" fill="none" stroke="#2563eb" stroke-width="4"/>
  <circle cx="185" cy="235" r="5" fill="#2563eb"/>
  <circle cx="285" cy="235" r="5" fill="#2563eb"/>
  <circle cx="385" cy="105" r="5" fill="#2563eb"/>
  <circle cx="505" cy="105" r="5" fill="#2563eb"/>
  <text x="278" y="350" font-size="16" fill="#0f172a">time / heat supplied</text>
  <text x="23" y="205" font-size="16" fill="#0f172a" transform="rotate(-90 23 205)">temperature</text>
  <text x="50" y="240" font-size="15" fill="#0f172a">0 C</text>
  <text x="43" y="110" font-size="15" fill="#0f172a">100 C</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "7.1",
    title: "Elasticity and Stress-Strain",
    subtopic:
      "Stress, strain, Hooke's law, Young's modulus, elastic energy, and interpretation of stress-strain graphs.",
    mc: [
      {
        questionLatex: L`A steel wire of length $2\text{ m}$ and area $1.0\text{ mm}^2$ is stretched by a force of $100\text{ N}$. If $Y=2.0\times10^{11}\text{ Pa}$, the extension is`,
        difficulty: 2,
        skillTags: ["young_modulus", "extension_of_wire", "unit_conversion"],
        choices: [
          L`$1.0\text{ mm}$`,
          L`$0.10\text{ mm}$`,
          L`$10\text{ mm}$`,
          L`$0.50\text{ mm}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This is ten times too small; $1\text{ mm}^2$ must be converted to $10^{-6}\text{ m}^2$.`,
          C: L`This misses a power of ten in the area or Young's modulus.`,
          D: L`This halves the extension without a physical reason.`,
        },
        hints: [
          L`Use $Y=FL/(A\Delta L)$.`,
          L`Convert $1.0\text{ mm}^2$ to $10^{-6}\text{ m}^2$.`,
          L`$\Delta L=FL/(AY)$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Convert the cross-sectional area.",
            math: L`A=1.0\times10^{-6}\text{ m}^2`,
          },
          {
            step: 2,
            explanation: "Use Young's modulus.",
            math: L`\Delta L=\frac{FL}{AY}=\frac{100(2)}{(10^{-6})(2.0\times10^{11})}=10^{-3}\text{ m}`,
          },
          {
            step: 3,
            explanation: "Convert to millimetres.",
            math: L`10^{-3}\text{ m}=1.0\text{ mm}`,
          },
        ],
      },
      {
        questionLatex: L`In the stress-strain graph shown, the physical meaning of the slope of the initial straight portion is`,
        difficulty: 2,
        figure: stressStrainFigure,
        skillTags: ["stress_strain_graph", "young_modulus"],
        choices: [
          L`elastic limit`,
          L`Young's modulus`,
          L`breaking stress`,
          L`elastic potential energy`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`The elastic limit is a point or boundary, not the slope of the initial straight line.`,
          C: L`Breaking stress is the stress at fracture, not the proportional-region slope.`,
          D: L`Elastic energy relates to the area under a force-extension graph, not this slope.`,
        },
        hints: [
          L`In the proportional region, stress is proportional to strain.`,
          L`The slope is $\text{stress}/\text{strain}$.`,
          L`Young's modulus is $Y=\text{stress}/\text{strain}$.`,
        ],
        solution: [
          { step: 1, explanation: "In the straight part, Hooke's law holds." },
          {
            step: 2,
            explanation: "The slope equals stress divided by strain.",
            math: L`Y=\frac{\text{stress}}{\text{strain}}`,
          },
        ],
      },
      {
        questionLatex: L`For the same material and same applied force, the length of a wire is doubled and its radius is also doubled. The extension becomes`,
        difficulty: 3,
        skillTags: ["young_modulus", "scaling", "area_of_wire"],
        choices: [L`double`, L`four times`, L`half`, L`unchanged`],
        correctLetter: "C",
        rationales: {
          A: L`Doubling length alone doubles extension, but doubling radius makes area four times larger.`,
          B: L`This ignores the inverse dependence on area.`,
          D: L`The two changes do not cancel; the net factor is $2/4$.`,
        },
        hints: [
          L`Extension varies as $L/A$ for fixed $F$ and material.`,
          L`Area is proportional to $r^2$.`,
          L`New factor $=2/(2^2)$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For a wire, extension is proportional to length divided by area.",
            math: L`\Delta L\propto \frac{L}{r^2}`,
          },
          {
            step: 2,
            explanation:
              "The new length factor is 2 and the new area factor is 4.",
            math: L`\frac{\Delta L'}{\Delta L}=\frac{2}{4}=\frac12`,
          },
        ],
      },
      {
        questionLatex: L`A wire is stressed to $4.0\times10^6\text{ Pa}$ and its strain is $2.0\times10^{-5}$. The elastic energy density stored in it is`,
        difficulty: 3,
        skillTags: ["elastic_energy_density", "stress", "strain"],
        choices: [
          L`$80\text{ J m}^{-3}$`,
          L`$20\text{ J m}^{-3}$`,
          L`$4.0\times10^2\text{ J m}^{-3}$`,
          L`$40\text{ J m}^{-3}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: L`This omits the factor $1/2$ in elastic energy density.`,
          B: L`This halves the correct value again.`,
          C: L`This has a power-of-ten error.`,
        },
        hints: [
          L`Energy density in the linear elastic region is $\frac12\times\text{stress}\times\text{strain}$.`,
          L`Multiply $4.0\times10^6$ by $2.0\times10^{-5}$.`,
          L`Then divide by $2$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Use the triangular area under the stress-strain graph.",
            math: L`u=\frac12(\text{stress})(\text{strain})`,
          },
          {
            step: 2,
            explanation: "Substitute the values.",
            math: L`u=\frac12(4.0\times10^6)(2.0\times10^{-5})=40\text{ J m}^{-3}`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): Hooke's law is valid for every value of stress up to the breaking point. Reason (R): A material regains its original dimensions after the deforming force is removed only within its elastic range.`,
        difficulty: 4,
        skillTags: ["assertion_reason", "hookes_law", "elastic_limit"],
        choices: [
          L`A is false but R is true`,
          L`Both A and R are true, and R explains A`,
          L`Both A and R are true, but R does not explain A`,
          L`A is true but R is false`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Hooke's law is not valid all the way to breaking; it is limited to the proportional region.`,
          C: L`The assertion itself is false, so this option cannot be correct.`,
          D: L`The reason is a true statement about elastic behaviour.`,
        },
        hints: [
          L`Separate proportionality from elasticity.`,
          L`A body can still be elastic beyond the strictly proportional region.`,
          L`Hooke's law is restricted to the initial linear portion.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Hooke's law requires stress proportional to strain, which is only the initial straight-line region.",
          },
          {
            step: 2,
            explanation: "The reason correctly describes the elastic range.",
          },
          { step: 3, explanation: "Therefore A is false but R is true." },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A force of $200\text{ N}$ is applied normally on a wire of cross-sectional area $2.0\text{ mm}^2$. Find the tensile stress.`,
        difficulty: 1,
        skillTags: ["stress", "unit_conversion"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Calculate the stress in pascal.",
            points: 1,
          },
        ],
        hints: [
          L`Stress is force per unit area.`,
          L`Convert $\text{mm}^2$ to $\text{m}^2$.`,
          L`$2.0\text{ mm}^2=2.0\times10^{-6}\text{ m}^2$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Finds $1.0\\times10^8\\text{ Pa}$ with correct area conversion.",
            },
          ],
        },
        commonErrors: [
          L`Using $2.0\text{ mm}^2$ directly as $2.0\text{ m}^2$.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$\text{stress}=F/A=200/(2.0\times10^{-6})=1.0\times10^8\text{ Pa}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A wire of length $1.5\text{ m}$ and diameter $1.0\text{ mm}$ extends by $0.60\text{ mm}$ when a load of $50\text{ N}$ is applied. Take $\pi=3.14$.`,
        difficulty: 3,
        skillTags: ["young_modulus", "wire_extension"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the cross-sectional area of the wire.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find Young's modulus of the material.",
            points: 2,
          },
        ],
        hints: [
          L`Use $A=\pi d^2/4$.`,
          L`Use $Y=FL/(A\Delta L)$.`,
          L`Convert both diameter and extension from millimetres to metres.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Calculates $A=7.85\\times10^{-7}\\text{ m}^2$.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Substitutes SI values in $Y=FL/(A\\Delta L)$ and obtains about $1.6\\times10^{11}\\text{ Pa}$.",
            },
          ],
        },
        commonErrors: [
          L`Using radius as diameter.`,
          L`Leaving extension in millimetres.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$A=\pi d^2/4=3.14(1.0\times10^{-3})^2/4=7.85\times10^{-7}\text{ m}^2$.`,
          },
          {
            part: "b",
            explanation: L`$Y=FL/(A\Delta L)=50(1.5)/[(7.85\times10^{-7})(0.60\times10^{-3})]\approx1.6\times10^{11}\text{ Pa}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A metal sample has stress $3.0\times10^8\text{ Pa}$ at strain $1.5\times10^{-3}$ while it is still in the proportional region.`,
        difficulty: 3,
        skillTags: ["stress_strain", "young_modulus", "elastic_energy_density"],
        parts: [
          { letter: "a", promptMarkdown: "Find Young's modulus.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Find the elastic energy density at this strain.",
            points: 2,
          },
        ],
        hints: [
          L`Use the slope of a stress-strain graph.`,
          L`Energy density is area under the stress-strain graph.`,
          L`The area is a triangle in the proportional region.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $Y=2.0\\times10^{11}\\text{ Pa}$.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Uses $u=\\frac12\\sigma\\epsilon$ and obtains $2.25\\times10^5\\text{ J m}^{-3}$.",
            },
          ],
        },
        commonErrors: [L`Using stress times strain without the factor $1/2$.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`$Y=\sigma/\epsilon=(3.0\times10^8)/(1.5\times10^{-3})=2.0\times10^{11}\text{ Pa}$.`,
          },
          {
            part: "b",
            explanation: L`$u=\frac12\sigma\epsilon=\frac12(3.0\times10^8)(1.5\times10^{-3})=2.25\times10^5\text{ J m}^{-3}$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A light platform is suspended by four identical steel wires. Each wire has length $2.0\text{ m}$, area $0.50\text{ mm}^2$, and Young's modulus $2.0\times10^{11}\text{ Pa}$. A load of $400\text{ N}$ is placed symmetrically on the platform.`,
        difficulty: 4,
        skillTags: ["parallel_wires", "young_modulus", "extension"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the force carried by each wire.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the extension of each wire.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State why the symmetry condition matters.",
            points: 1,
          },
        ],
        hints: [
          L`The load is shared equally only because the arrangement is symmetric.`,
          L`Each wire carries $400/4$ newton.`,
          L`Apply $\Delta L=FL/(AY)$ to one wire.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds force per wire as $100\\text{ N}$.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Uses one-wire area $0.50\\times10^{-6}\\text{ m}^2$ and obtains $2.0\\text{ mm}$.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Explains equal load sharing due to symmetric placement.",
            },
          ],
        },
        commonErrors: [
          L`Putting the full $400\text{ N}$ into one wire.`,
          L`Using total area but also force per wire, mixing two equivalent methods incorrectly.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`By symmetry, each wire carries $400/4=100\text{ N}$.`,
          },
          {
            part: "b",
            explanation: L`$\Delta L=FL/(AY)=100(2.0)/[(0.50\times10^{-6})(2.0\times10^{11})]=2.0\times10^{-3}\text{ m}=2.0\text{ mm}$.`,
          },
          {
            part: "c",
            explanation:
              "Without symmetric loading, the four wires need not have equal tension.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A stress-strain test is performed on a metal wire. The graph remains straight up to point P, then bends before the sample finally breaks at B.`,
        difficulty: 4,
        figure: stressStrainFigure,
        skillTags: ["stress_strain_graph", "hookes_law", "elastic_limit"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Which part of the graph is used to find Young's modulus?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "What does departure from the straight line indicate?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Why is the breaking point not used to calculate Young's modulus?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "State one design reason engineers keep working stress far below the breaking stress.",
            points: 1,
          },
        ],
        hints: [
          L`Young's modulus is defined in the proportional region.`,
          L`Departure from straight line means stress is no longer proportional to strain.`,
          L`A safe design uses a factor of safety.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Identifies the initial straight proportional region.",
            },
            {
              part: "b",
              points: 1,
              description: "States that Hooke's law no longer holds.",
            },
            {
              part: "c",
              points: 1,
              description: "Explains that slope is not constant near breaking.",
            },
            {
              part: "d",
              points: 1,
              description:
                "Mentions safety margin, fatigue, sudden loads, or permanent deformation.",
            },
          ],
        },
        commonErrors: [
          L`Using the whole curve slope as Young's modulus.`,
          L`Confusing breaking stress with elastic limit.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Use the initial straight-line part of the stress-strain graph.",
          },
          {
            part: "b",
            explanation:
              "It shows stress and strain are no longer proportional, so Hooke's law is not valid there.",
          },
          {
            part: "c",
            explanation:
              "Near breaking, the material response is non-linear and may include permanent deformation.",
          },
          {
            part: "d",
            explanation:
              "A working stress far below breaking stress gives a factor of safety against overloads and material imperfections.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "7.2",
    title: "Fluid Pressure and Pascal's Law",
    subtopic:
      "Pressure in fluids, gauge pressure, hydraulic machines, barometers, and pressure variation with depth.",
    mc: [
      {
        questionLatex: L`The gauge pressure at a depth of $2.0\text{ m}$ below the surface of water is approximately $(\rho=1000\text{ kg m}^{-3}, g=10\text{ m s}^{-2})$`,
        difficulty: 1,
        skillTags: ["fluid_pressure", "gauge_pressure"],
        choices: [
          L`$2.0\times10^3\text{ Pa}$`,
          L`$2.0\times10^4\text{ Pa}$`,
          L`$5.0\times10^3\text{ Pa}$`,
          L`$2.0\times10^5\text{ Pa}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`This is smaller by a factor of 10.`,
          C: L`This does not use $\rho gh$ correctly.`,
          D: L`This is too large by a factor of 10.`,
        },
        hints: [
          L`Use $p=\rho gh$ for gauge pressure.`,
          L`Depth is measured vertically.`,
          L`Substitute $1000$, $10$, and $2.0$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Gauge pressure due to water depth is",
            math: L`p=\rho gh=1000(10)(2.0)=2.0\times10^4\text{ Pa}`,
          },
        ],
      },
      {
        questionLatex: L`Two points in mercury differ in height by $0.50\text{ m}$. The pressure difference is closest to $(\rho_{\text{Hg}}=13.6\times10^3\text{ kg m}^{-3}, g=10\text{ m s}^{-2})$`,
        difficulty: 2,
        skillTags: ["pressure_difference", "manometer"],
        choices: [
          L`$6.8\times10^3\text{ Pa}$`,
          L`$1.36\times10^5\text{ Pa}$`,
          L`$6.8\times10^4\text{ Pa}$`,
          L`$5.0\times10^4\text{ Pa}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`This misses a factor of 10 from $g$ or density.`,
          B: L`This uses $1.0\text{ m}$ instead of $0.50\text{ m}$.`,
          D: L`This replaces mercury density with an unrelated rounded value.`,
        },
        hints: [
          L`Use $\Delta p=\rho g\Delta h$.`,
          L`Mercury density is much larger than water density.`,
          L`Multiply $13.6\times10^3$ by $10$ and $0.50$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The pressure difference is",
            math: L`\Delta p=\rho g\Delta h=(13.6\times10^3)(10)(0.50)=6.8\times10^4\text{ Pa}`,
          },
        ],
      },
      {
        questionLatex: L`In a hydraulic lift, the larger piston has $25$ times the area of the smaller piston. If $80\text{ N}$ is applied on the smaller piston, the ideal upward force on the larger piston is`,
        difficulty: 2,
        figure: hydraulicLiftFigure,
        skillTags: ["pascal_law", "hydraulic_lift"],
        choices: [
          L`$320\text{ N}$`,
          L`$80\text{ N}$`,
          L`$3.2\text{ N}$`,
          L`$2000\text{ N}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: L`This uses an area ratio of 4, not 25.`,
          B: L`The force changes; pressure is transmitted, not force.`,
          C: L`This divides by the area ratio instead of multiplying.`,
        },
        hints: [
          L`Pascal's law gives equal pressure in the liquid.`,
          L`$F_1/A_1=F_2/A_2$.`,
          L`So $F_2=25F_1$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Equal pressure is transmitted through the liquid.",
            math: L`\frac{F_1}{A_1}=\frac{F_2}{A_2}`,
          },
          {
            step: 2,
            explanation: "Use the area ratio.",
            math: L`F_2=80(25)=2000\text{ N}`,
          },
        ],
      },
      {
        questionLatex: L`A liquid is at rest in connected vessels of different shapes. At points lying at the same horizontal level in the same liquid, the pressure is`,
        difficulty: 2,
        skillTags: ["hydrostatic_pressure", "same_level_pressure"],
        choices: [
          L`the same`,
          L`larger in the wider vessel`,
          L`larger in the narrower vessel`,
          L`dependent on the total volume above the point`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Pressure at a depth depends on $\rho gh$, not vessel width.`,
          C: L`A narrow shape does not increase hydrostatic pressure at the same depth.`,
          D: L`Hydrostatic pressure is not determined by the total volume of liquid.`,
        },
        hints: [
          L`For a liquid at rest, pressure depends on depth.`,
          L`Shape of the container is not in $p=p_0+\rho gh$.`,
          L`Same liquid and same depth means same pressure.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In hydrostatics, points at the same depth in the same connected liquid have equal pressure.",
          },
        ],
      },
      {
        questionLatex: L`A mercury barometer reads $76\text{ cm}$ of Hg. The equivalent height of a water column is approximately $(\rho_{\text{Hg}}/\rho_{\text{water}}=13.6)$`,
        difficulty: 3,
        skillTags: ["barometer", "pressure_equivalence"],
        choices: [
          L`$1.03\text{ m}$`,
          L`$10.3\text{ m}$`,
          L`$76\text{ m}$`,
          L`$5.6\text{ m}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`This has a metre-centimetre conversion error.`,
          C: L`This ignores the density ratio.`,
          D: L`This uses roughly half the correct density ratio.`,
        },
        hints: [
          L`Equate $\rho_{\text{Hg}}gh_{\text{Hg}}=\rho_wgh_w$.`,
          L`So $h_w=13.6h_{\text{Hg}}$.`,
          L`Use $76\text{ cm}=0.76\text{ m}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Equal pressure columns satisfy",
            math: L`h_w=13.6(0.76)=10.336\text{ m}\approx10.3\text{ m}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the gauge pressure $5.0\text{ m}$ below the surface of water. Take $\rho=1000\text{ kg m}^{-3}$ and $g=10\text{ m s}^{-2}$.`,
        difficulty: 1,
        skillTags: ["fluid_pressure"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Calculate the gauge pressure.",
            points: 1,
          },
        ],
        hints: [
          L`Gauge pressure due to a liquid column is $\rho gh$.`,
          L`Use the vertical depth.`,
          L`Substitute $h=5.0\text{ m}$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $5.0\\times10^4\\text{ Pa}$.",
            },
          ],
        },
        commonErrors: [
          L`Adding atmospheric pressure when only gauge pressure is asked.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$p=\rho gh=1000(10)(5.0)=5.0\times10^4\text{ Pa}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A hydraulic press has piston areas $4.0\text{ cm}^2$ and $200\text{ cm}^2$. A force of $120\text{ N}$ is applied on the smaller piston.`,
        difficulty: 2,
        figure: hydraulicLiftFigure,
        skillTags: ["pascal_law", "hydraulic_press"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the pressure applied to the liquid.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the force on the larger piston, neglecting losses.",
            points: 1,
          },
        ],
        hints: [
          L`Convert $\text{cm}^2$ to $\text{m}^2$ for pressure.`,
          L`For force multiplication, the ratio of areas is enough.`,
          L`$A_2/A_1=200/4=50$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $3.0\\times10^5\\text{ Pa}$.",
            },
            { part: "b", points: 1, description: "Finds $6000\\text{ N}$." },
          ],
        },
        commonErrors: [
          L`Multiplying by area in $\text{cm}^2$ while reporting pascal.`,
          L`Assuming force, rather than pressure, is unchanged.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$A_1=4.0\times10^{-4}\text{ m}^2$, so $p=120/(4.0\times10^{-4})=3.0\times10^5\text{ Pa}$.`,
          },
          {
            part: "b",
            explanation: L`$F_2=F_1(A_2/A_1)=120(200/4)=6000\text{ N}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In a U-tube manometer, a gas pressure exceeds atmospheric pressure by a mercury height difference of $20\text{ cm}$. Take $\rho_{\text{Hg}}=13.6\times10^3\text{ kg m}^{-3}$ and $g=10\text{ m s}^{-2}$.`,
        difficulty: 3,
        skillTags: ["manometer", "gauge_pressure"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the gauge pressure of the gas.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "State whether the gas pressure is above or below atmospheric pressure.",
            points: 1,
          },
        ],
        hints: [
          L`A height difference in the manometer represents pressure difference.`,
          L`Use $\Delta p=\rho g h$.`,
          L`Convert $20\text{ cm}$ to $0.20\text{ m}$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds $2.72\\times10^4\\text{ Pa}$.",
            },
            {
              part: "b",
              points: 1,
              description: "States gas pressure is above atmospheric pressure.",
            },
          ],
        },
        commonErrors: [
          L`Using water density instead of mercury density.`,
          L`Forgetting centimetre-to-metre conversion.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$\Delta p=\rho gh=(13.6\times10^3)(10)(0.20)=2.72\times10^4\text{ Pa}$.`,
          },
          {
            part: "b",
            explanation:
              "The gas pressure exceeds atmospheric pressure by this amount.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A rectangular inspection gate of area $1.5\text{ m}^2$ is fitted vertically in a water tank. The centre of the gate is $4.0\text{ m}$ below the free surface. Take $\rho=1000\text{ kg m}^{-3}$ and $g=10\text{ m s}^{-2}$.`,
        difficulty: 4,
        skillTags: ["hydrostatic_force", "pressure_depth"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the gauge pressure at the centre of the gate.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Estimate the force on the gate using the centre pressure.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain why this is an estimate if the gate has large vertical height.",
            points: 1,
          },
        ],
        hints: [
          L`Pressure increases with depth.`,
          L`Use $F=pA$ after finding pressure at the centre.`,
          L`For a tall gate, pressure is not uniform from top to bottom.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $4.0\\times10^4\\text{ Pa}$.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Finds force $6.0\\times10^4\\text{ N}$ using centre pressure.",
            },
            {
              part: "c",
              points: 1,
              description: "Explains vertical pressure variation.",
            },
          ],
        },
        commonErrors: [
          L`Using total water volume above the gate.`,
          L`Treating pressure as same at all depths without qualification.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$p=\rho gh=1000(10)(4.0)=4.0\times10^4\text{ Pa}$.`,
          },
          {
            part: "b",
            explanation: L`$F=pA=(4.0\times10^4)(1.5)=6.0\times10^4\text{ N}$.`,
          },
          {
            part: "c",
            explanation:
              "If the gate is tall, pressure is smaller near the top and larger near the bottom, so a full integration or centre-of-pressure treatment is more exact.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A dam wall must hold back water. At one location the water is $12\text{ m}$ deep. Engineers make the lower part of the wall much thicker than the upper part.`,
        difficulty: 3,
        skillTags: [
          "dam_pressure",
          "hydrostatic_pressure",
          "conceptual_application",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the gauge pressure at the bottom of the water column.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the gauge pressure halfway down, at depth $6\\text{ m}$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain why the lower part of the dam needs greater strength.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Does the pressure at a point depend on the total length of the reservoir? Explain briefly.",
            points: 1,
          },
        ],
        hints: [
          L`Use $p=\rho gh$.`,
          L`Double the depth doubles the gauge pressure.`,
          L`Hydrostatic pressure at a point depends on vertical depth, not reservoir length.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $1.2\\times10^5\\text{ Pa}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $6.0\\times10^4\\text{ Pa}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Links larger depth to larger pressure and force.",
            },
            {
              part: "d",
              points: 1,
              description:
                "States no; pressure depends on depth for a static liquid.",
            },
          ],
        },
        commonErrors: [
          L`Saying pressure depends mainly on the reservoir's horizontal size.`,
          L`Confusing pressure with total force on the whole dam.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$p=1000(10)(12)=1.2\times10^5\text{ Pa}$.`,
          },
          {
            part: "b",
            explanation: L`At $6\text{ m}$, $p=1000(10)(6)=6.0\times10^4\text{ Pa}$.`,
          },
          {
            part: "c",
            explanation:
              "Pressure and therefore sideways force per unit area are larger at greater depth.",
          },
          {
            part: "d",
            explanation:
              "For a static liquid, pressure at a point depends on liquid density, gravity, and vertical depth.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "7.3",
    title: "Buoyancy, Continuity and Bernoulli's Principle",
    subtopic:
      "Archimedes' principle, floating bodies, equation of continuity, Bernoulli's theorem, Torricelli speed, and applications.",
    mc: [
      {
        questionLatex: L`A body of volume $500\text{ cm}^3$ is fully submerged in water. The buoyant force is $(\rho=1000\text{ kg m}^{-3}, g=10\text{ m s}^{-2})$`,
        difficulty: 2,
        skillTags: ["archimedes_principle", "buoyant_force"],
        choices: [
          L`$50\text{ N}$`,
          L`$0.5\text{ N}$`,
          L`$5\text{ N}$`,
          L`$500\text{ N}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`This is ten times too large; check the conversion from $\text{cm}^3$ to $\text{m}^3$.`,
          B: L`This is ten times too small.`,
          D: L`This treats cubic centimetres as if they were SI volume.`,
        },
        hints: [
          L`Buoyant force equals weight of displaced liquid.`,
          L`$500\text{ cm}^3=5.0\times10^{-4}\text{ m}^3$.`,
          L`Use $F_B=\rho Vg$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Weight of displaced water is",
            math: L`F_B=\rho Vg=1000(5.0\times10^{-4})(10)=5\text{ N}`,
          },
        ],
      },
      {
        questionLatex: L`A block floats in water with $80\%$ of its volume submerged. Its density is`,
        difficulty: 2,
        skillTags: ["floating_body", "density"],
        choices: [
          L`$1000\text{ kg m}^{-3}$`,
          L`$1250\text{ kg m}^{-3}$`,
          L`$200\text{ kg m}^{-3}$`,
          L`$800\text{ kg m}^{-3}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: L`This would mean the block is just fully submerged in neutral equilibrium.`,
          B: L`This inverts the submerged fraction.`,
          C: L`This uses the unsubmerged fraction instead of the submerged fraction.`,
        },
        hints: [
          L`For floating, weight equals buoyant force.`,
          L`$\rho_{\text{body}}Vg=\rho_w(0.80V)g$.`,
          L`So density is $0.80$ of water density.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For a floating body,",
            math: L`\rho_b Vg=\rho_w(0.80V)g\Rightarrow \rho_b=800\text{ kg m}^{-3}`,
          },
        ],
      },
      {
        questionLatex: L`Water flows steadily through a pipe. At section 1, area is $4\text{ cm}^2$ and speed is $3\text{ m s}^{-1}$. At section 2, area is $1\text{ cm}^2$. The speed at section 2 is`,
        difficulty: 2,
        figure: venturiFigure,
        skillTags: ["continuity_equation", "fluid_flow"],
        choices: [
          L`$12\text{ m s}^{-1}$`,
          L`$3\text{ m s}^{-1}$`,
          L`$0.75\text{ m s}^{-1}$`,
          L`$6\text{ m s}^{-1}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Speed changes when area changes in steady incompressible flow.`,
          C: L`This divides by the area ratio in the wrong direction.`,
          D: L`This uses an area ratio of 2 instead of 4.`,
        },
        hints: [
          L`Use $A_1v_1=A_2v_2$.`,
          L`The smaller section has larger speed.`,
          L`$v_2=(A_1/A_2)v_1$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Continuity gives",
            math: L`v_2=\frac{A_1}{A_2}v_1=\frac{4}{1}(3)=12\text{ m s}^{-1}`,
          },
        ],
      },
      {
        questionLatex: L`In a horizontal pipe, water speed increases from $2\text{ m s}^{-1}$ to $6\text{ m s}^{-1}$. The pressure drop is $(\rho=1000\text{ kg m}^{-3})$`,
        difficulty: 3,
        skillTags: ["bernoulli_principle", "pressure_drop"],
        choices: [
          L`$3.2\times10^4\text{ Pa}$`,
          L`$1.6\times10^4\text{ Pa}$`,
          L`$4.0\times10^3\text{ Pa}$`,
          L`$2.0\times10^4\text{ Pa}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`This omits the factor $1/2$ in kinetic pressure change.`,
          C: L`This uses $v_2-v_1$ instead of $v_2^2-v_1^2$.`,
          D: L`This is not the Bernoulli pressure difference for the given speeds.`,
        },
        hints: [
          L`For horizontal flow, $P+\frac12\rho v^2$ is constant.`,
          L`Pressure drop equals $\frac12\rho(v_2^2-v_1^2)$.`,
          L`Compute $36-4$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Using Bernoulli for horizontal flow,",
            math: L`\Delta P=\frac12\rho(v_2^2-v_1^2)=\frac12(1000)(36-4)=1.6\times10^4\text{ Pa}`,
          },
        ],
      },
      {
        questionLatex: L`Water leaves a small hole that is $5.0\text{ m}$ below the free surface of a large tank. The efflux speed is approximately $(g=10\text{ m s}^{-2})$`,
        difficulty: 3,
        skillTags: ["torricelli_theorem", "bernoulli_application"],
        choices: [
          L`$5\text{ m s}^{-1}$`,
          L`$20\text{ m s}^{-1}$`,
          L`$10\text{ m s}^{-1}$`,
          L`$50\text{ m s}^{-1}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`This uses $\sqrt{gh}$ instead of $\sqrt{2gh}$.`,
          B: L`This doubles the correct speed.`,
          D: L`This uses $gh$ without taking the square root.`,
        },
        hints: [
          L`Apply Torricelli's result for a small hole in a large tank.`,
          L`$v=\sqrt{2gh}$.`,
          L`Here $2gh=100$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The speed of efflux is",
            math: L`v=\sqrt{2gh}=\sqrt{2(10)(5)}=10\text{ m s}^{-1}`,
          },
        ],
      },
    ],
    extraMc: [
      {
        questionLatex: L`Water flows steadily through a pipe. If the radius of the pipe becomes half at a constriction, the speed of water there becomes`,
        difficulty: 2,
        skillTags: ["continuity_equation", "area_speed_relation"],
        choices: [L`four times`, L`two times`, L`half`, L`one-fourth`],
        correctLetter: "A",
        rationales: {
          B: L`Area is proportional to radius squared, so halving radius quarters area.`,
          C: L`Speed increases when area decreases for incompressible flow.`,
          D: L`This reverses the continuity relation.`,
        },
        hints: [
          L`Use $Av=$ constant.`,
          L`Area varies as $r^2$.`,
          L`If area becomes $1/4$, speed becomes $4$ times.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "By continuity,",
            math: L`A_1v_1=A_2v_2,\quad A_2=A_1/4\Rightarrow v_2=4v_1`,
          },
        ],
      },
      {
        questionLatex: L`In a horizontal water pipe, pressure falls by $6.0\times10^3\text{ Pa}$ as the speed changes from $2\text{ m s}^{-1}$ in the broad section to $v$ in the narrow section. Taking $\rho=1000\text{ kg m}^{-3}$, $v$ is`,
        difficulty: 4,
        skillTags: ["bernoulli_principle", "inverse_pressure_drop"],
        choices: [
          L`$4\text{ m s}^{-1}$`,
          L`$\sqrt{10}\text{ m s}^{-1}$`,
          L`$6\text{ m s}^{-1}$`,
          L`$8\text{ m s}^{-1}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This uses $\Delta P/\rho$ instead of $2\Delta P/\rho$ in Bernoulli's equation.`,
          C: L`This is the speed from the earlier direct case, not the value fixed by a $6.0\times10^3\text{ Pa}$ drop.`,
          D: L`This is too large; it would require a much bigger pressure drop.`,
        },
        hints: [
          L`For a horizontal pipe, $P+\frac12\rho v^2$ is constant.`,
          L`Use $\Delta P=\frac12\rho(v^2-v_1^2)$.`,
          L`Substitute $6000=500(v^2-4)$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use Bernoulli's equation for horizontal flow.",
            math: L`6000=\frac12(1000)(v^2-2^2)`,
          },
          {
            step: 2,
            explanation: "Solve for the unknown speed.",
            math: L`v^2=16,\quad v=4\text{ m s}^{-1}`,
          },
        ],
      },
      {
        questionLatex: L`A wooden block of density $600\text{ kg m}^{-3}$ floats in water of density $1000\text{ kg m}^{-3}$. The fraction of its volume submerged is`,
        difficulty: 2,
        skillTags: ["floatation", "buoyancy"],
        choices: [L`$0.60$`, L`$0.40$`, L`$1.67$`, L`$0.30$`],
        correctLetter: "A",
        rationales: {
          B: L`This gives the fraction above water.`,
          C: L`This takes the reciprocal and would exceed the whole volume.`,
          D: L`This halves the correct fraction.`,
        },
        hints: [
          L`For floating equilibrium, weight equals buoyant force.`,
          L`$\rho_b Vg=\rho_w V_{\text{sub}}g$.`,
          L`The submerged fraction is $\rho_b/\rho_w$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the floating condition.",
            math: L`\frac{V_{\text{sub}}}{V}=\frac{600}{1000}=0.60`,
          },
        ],
      },
      {
        questionLatex: L`A stone weighs $20\text{ N}$ in air and experiences an upthrust of $5\text{ N}$ when fully immersed in water. Its apparent weight in water is`,
        difficulty: 2,
        skillTags: ["buoyancy", "apparent_weight"],
        choices: [
          L`$15\text{ N}$`,
          L`$20\text{ N}$`,
          L`$25\text{ N}$`,
          L`$5\text{ N}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Upthrust reduces apparent weight.`,
          C: L`This adds upthrust instead of subtracting it.`,
          D: L`This gives only the upthrust, not apparent weight.`,
        },
        hints: [
          L`Apparent weight equals true weight minus buoyant force.`,
          L`The upthrust acts upward.`,
          L`Subtract $5\text{ N}$ from $20\text{ N}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The apparent weight is",
            math: L`W_{\text{app}}=20-5=15\text{ N}`,
          },
        ],
      },
      {
        questionLatex: L`Water flows out of a small hole at a depth $1.25\text{ m}$ below the free surface of a large tank. Taking $g=10\text{ m s}^{-2}$, the efflux speed is approximately`,
        difficulty: 4,
        skillTags: ["bernoulli_principle", "efflux_speed"],
        choices: [
          L`$5\text{ m s}^{-1}$`,
          L`$2.5\text{ m s}^{-1}$`,
          L`$12.5\text{ m s}^{-1}$`,
          L`$25\text{ m s}^{-1}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This omits the factor $2$ inside the square root.`,
          C: L`This uses $gh$ without taking square root.`,
          D: L`This uses $2gh$ without taking square root.`,
        },
        hints: [
          L`Use Torricelli's result from Bernoulli's principle.`,
          L`$v=\sqrt{2gh}$.`,
          L`Here $2gh=25$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Efflux speed is",
            math: L`v=\sqrt{2gh}=\sqrt{2(10)(1.25)}=5\text{ m s}^{-1}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A stone weighs $12\text{ N}$ in air and $8\text{ N}$ when completely immersed in water. Find the buoyant force on it.`,
        difficulty: 1,
        skillTags: ["apparent_weight", "buoyant_force"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Calculate the buoyant force.",
            points: 1,
          },
        ],
        hints: [
          L`Loss of weight in liquid equals buoyant force.`,
          L`Subtract apparent weight from true weight.`,
          L`$12-8=4$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            { part: "a", points: 1, description: "Finds $4\\text{ N}$." },
          ],
        },
        commonErrors: [
          L`Adding the two readings instead of taking the loss of weight.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`Buoyant force $=12-8=4\text{ N}$.` },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An incompressible liquid flows through a pipe of area $8\text{ cm}^2$ at $1.5\text{ m s}^{-1}$ and then through a narrower part of area $3\text{ cm}^2$.`,
        difficulty: 2,
        skillTags: ["continuity_equation"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the volume flow rate in $\\text{cm}^3\\text{ s}^{-1}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the speed in the narrower part.",
            points: 1,
          },
        ],
        hints: [
          L`Volume flow rate is $Q=Av$.`,
          L`Use consistent units.`,
          L`The same $Q$ passes every section.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $1200\\text{ cm}^3\\text{ s}^{-1}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $4.0\\text{ m s}^{-1}$.",
            },
          ],
        },
        commonErrors: [
          L`Forgetting that $1.5\text{ m s}^{-1}=150\text{ cm s}^{-1}$.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$Q=Av=8(150)=1200\text{ cm}^3\text{ s}^{-1}$.`,
          },
          {
            part: "b",
            explanation: L`$v_2=Q/A_2=1200/3=400\text{ cm s}^{-1}=4.0\text{ m s}^{-1}$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Water flows horizontally through a venturi tube. The broad section has area $6.0\times10^{-4}\text{ m}^2$ and the narrow section has area $2.0\times10^{-4}\text{ m}^2$. The volume flow rate is $1.2\times10^{-3}\text{ m}^3\text{ s}^{-1}$. Take $\rho=1000\text{ kg m}^{-3}$.`,
        difficulty: 4,
        figure: venturiFigure,
        skillTags: ["continuity_equation", "bernoulli_principle", "venturi"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the speed in the broad section.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the speed in the narrow section.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the pressure difference between the two sections.",
            points: 2,
          },
        ],
        hints: [
          L`First use $Q=Av$ at each section.`,
          L`The narrow section has larger speed.`,
          L`For horizontal flow, pressure drop equals $\frac12\rho(v_2^2-v_1^2)$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $v_1=2\\text{ m s}^{-1}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $v_2=6\\text{ m s}^{-1}$.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Finds pressure drop $1.6\\times10^4\\text{ Pa}$, with lower pressure at narrow section.",
            },
          ],
        },
        commonErrors: [
          L`Applying Bernoulli before finding speeds.`,
          L`Reversing which section has lower pressure.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$v_1=Q/A_1=(1.2\times10^{-3})/(6.0\times10^{-4})=2\text{ m s}^{-1}$.`,
          },
          {
            part: "b",
            explanation: L`$v_2=Q/A_2=(1.2\times10^{-3})/(2.0\times10^{-4})=6\text{ m s}^{-1}$.`,
          },
          {
            part: "c",
            explanation: L`$P_1-P_2=\frac12\rho(v_2^2-v_1^2)=\frac12(1000)(36-4)=1.6\times10^4\text{ Pa}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A cubical block of side $10\text{ cm}$ floats in water with $7.5\text{ cm}$ of its height below the surface.`,
        difficulty: 3,
        skillTags: ["floating_body", "density"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the fraction of volume submerged.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the density of the block.",
            points: 1,
          },
        ],
        hints: [
          L`For a cube floating upright, volume fraction equals height fraction.`,
          L`For floating, density fraction equals submerged fraction.`,
          L`Water density is $1000\text{ kg m}^{-3}$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds submerged fraction $0.75$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds density $750\\text{ kg m}^{-3}$.",
            },
          ],
        },
        commonErrors: [L`Using the unsubmerged fraction $0.25$.`],
        workedSolution: [
          { part: "a", explanation: L`Submerged fraction $=7.5/10=0.75$.` },
          {
            part: "b",
            explanation: L`$\rho_{\text{block}}=0.75\rho_w=750\text{ kg m}^{-3}$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A large open tank has a small hole in its side. The hole is $1.25\text{ m}$ below the water surface and $0.80\text{ m}$ above the ground. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 5,
        skillTags: [
          "torricelli_theorem",
          "projectile_motion",
          "bernoulli_application",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the speed of water as it leaves the hole.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the time taken by the water stream to reach the ground after leaving the hole.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the horizontal distance from the wall where the stream hits the ground.",
            points: 2,
          },
          {
            letter: "d",
            promptMarkdown:
              "State one assumption used in applying Torricelli's theorem here.",
            points: 1,
          },
        ],
        hints: [
          L`Use $v=\sqrt{2gh}$ for speed from depth below the surface.`,
          L`After leaving the hole, the water has horizontal velocity and falls vertically by $0.80\text{ m}$.`,
          L`Range from the wall is $vt$.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds efflux speed $5\\text{ m s}^{-1}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds fall time $0.40\\text{ s}$.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Combines horizontal speed and fall time to get $2.0\\text{ m}$.",
            },
            {
              part: "d",
              points: 1,
              description:
                "States an assumption such as large tank, negligible viscosity, or small hole.",
            },
          ],
        },
        commonErrors: [
          L`Using $0.80\text{ m}$ instead of $1.25\text{ m}$ for efflux speed.`,
          L`Using the efflux depth again for projectile fall time.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$v=\sqrt{2gh}=\sqrt{2(10)(1.25)}=5\text{ m s}^{-1}$.`,
          },
          {
            part: "b",
            explanation: L`$0.80=\frac12gt^2=5t^2$, so $t=0.40\text{ s}$.`,
          },
          {
            part: "c",
            explanation: L`Horizontal distance $=vt=5(0.40)=2.0\text{ m}$.`,
          },
          {
            part: "d",
            explanation:
              "One assumption is that the tank is large enough that the free surface speed is negligible.",
          },
        ],
      },
    ],
    extraConstructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Water flows through a pipe of area $4\text{ cm}^2$ with speed $2\text{ m s}^{-1}$. It enters a narrower part of area $1\text{ cm}^2$.`,
        difficulty: 2,
        skillTags: ["continuity_equation", "flow_speed"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the speed in the narrower part.`,
            points: 1,
          },
        ],
        hints: [
          L`Use $A_1v_1=A_2v_2$.`,
          L`Use the area ratio directly; units cancel.`,
          L`The area becomes one-fourth.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $8\text{ m s}^{-1}$.`,
            },
          ],
        },
        commonErrors: [L`Making speed smaller in the narrower part.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`$4(2)=1(v_2)$, so $v_2=8\text{ m s}^{-1}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A horizontal pipe carries oil of density $800\text{ kg m}^{-3}$. At a wide section the speed is $1\text{ m s}^{-1}$; at a narrow section it is $5\text{ m s}^{-1}$.`,
        difficulty: 4,
        skillTags: ["bernoulli_principle", "pressure_difference"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Which section has lower pressure?`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the pressure difference between the two sections.`,
            points: 2,
          },
        ],
        hints: [
          L`In a horizontal streamline, higher speed means lower pressure.`,
          L`Use $P_1-P_2=\frac12\rho(v_2^2-v_1^2)$.`,
          L`Use $\rho=800\text{ kg m}^{-3}$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies the narrow section as lower pressure.",
            },
            {
              part: "b",
              points: 2,
              description: L`Finds $9.6\times10^3\text{ Pa}$.`,
            },
          ],
        },
        commonErrors: [
          L`Assuming pressure is higher in the faster, narrower region.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The narrow section has lower pressure because the speed is higher there.",
          },
          {
            part: "b",
            explanation: L`P_1-P_2=\frac12(800)(25-1)=9600\text{ Pa}.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A cube of density $750\text{ kg m}^{-3}$ floats in a liquid of density $1000\text{ kg m}^{-3}$.`,
        difficulty: 3,
        skillTags: ["floatation", "buoyancy"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the fraction of the cube submerged.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the fraction of the cube above the liquid surface.`,
            points: 1,
          },
        ],
        hints: [
          L`For floating bodies, submerged fraction equals body density divided by liquid density.`,
          L`The fraction above is the remaining part.`,
          L`The two fractions must add to $1$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Finds $0.75$.` },
            { part: "b", points: 1, description: L`Finds $0.25$.` },
          ],
        },
        commonErrors: [
          L`Using liquid density divided by body density, which gives a fraction greater than $1$.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$V_{\text{sub}}/V=\rho_b/\rho_l=750/1000=0.75$.`,
          },
          { part: "b", explanation: L`Fraction above $=1-0.75=0.25$.` },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A horizontal pipe narrows so that its cross-sectional area changes from $6\text{ cm}^2$ to $2\text{ cm}^2$. Water enters the wide section at $2\text{ m s}^{-1}$. Take $\rho=1000\text{ kg m}^{-3}$.`,
        difficulty: 5,
        skillTags: [
          "continuity_equation",
          "bernoulli_principle",
          "multi_step_fluid_flow",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the speed in the narrow section.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the pressure difference between the wide and narrow sections.`,
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: L`State which section has greater pressure.`,
            points: 1,
          },
        ],
        hints: [
          L`Use continuity first.`,
          L`Then apply Bernoulli for a horizontal pipe.`,
          L`Pressure is lower in the faster section.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $6\text{ m s}^{-1}$.`,
            },
            {
              part: "b",
              points: 2,
              description: L`Finds $1.6\times10^4\text{ Pa}$.`,
            },
            {
              part: "c",
              points: 1,
              description: "States the wide section has greater pressure.",
            },
          ],
        },
        commonErrors: [L`Applying Bernoulli before finding the changed speed.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`$6(2)=2v_2$, so $v_2=6\text{ m s}^{-1}$.`,
          },
          {
            part: "b",
            explanation: L`P_1-P_2=\frac12(1000)(6^2-2^2)=1.6\times10^4\text{ Pa}.`,
          },
          {
            part: "c",
            explanation:
              "The wide section has greater pressure because the speed there is lower.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A tank has a small hole at a depth $h$ below the water surface. The tank is large enough that the speed of the free surface is negligible.`,
        difficulty: 4,
        skillTags: ["bernoulli_principle", "torricelli_result", "fluid_energy"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Write the efflux speed in terms of $g$ and $h$.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the speed for $h=0.80\text{ m}$ and $g=10\text{ m s}^{-2}$.`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`What energy conversion is represented by this result?`,
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: L`Why is the free-surface speed neglected?`,
            points: 1,
          },
        ],
        hints: [
          L`Use Bernoulli between the free surface and the hole.`,
          L`Both points are at atmospheric pressure.`,
          L`Potential energy per unit mass becomes kinetic energy per unit mass.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`Writes $v=\sqrt{2gh}$.` },
            {
              part: "b",
              points: 1,
              description: L`Finds $4\text{ m s}^{-1}$.`,
            },
            {
              part: "c",
              points: 1,
              description:
                "Identifies gravitational potential energy converting to kinetic energy.",
            },
            {
              part: "d",
              points: 1,
              description:
                "Explains that the tank cross-section is much larger than the hole area.",
            },
          ],
        },
        commonErrors: [L`Using $v=gh$ instead of $v=\sqrt{2gh}$.`],
        workedSolution: [
          { part: "a", explanation: L`Bernoulli gives $v=\sqrt{2gh}$.` },
          {
            part: "b",
            explanation: L`v=\sqrt{2(10)(0.80)}=4\text{ m s}^{-1}.`,
          },
          {
            part: "c",
            explanation:
              "Loss of gravitational potential energy becomes kinetic energy of the water jet.",
          },
          {
            part: "d",
            explanation:
              "For a large tank, the free surface has very large area, so its downward speed is negligible compared with the jet speed.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "7.4",
    title: "Viscosity and Surface Tension",
    subtopic:
      "Stokes' law, terminal velocity, Reynolds number, streamline and turbulent flow, surface energy, excess pressure, and capillary rise.",
    mc: [
      {
        questionLatex: L`For small spherical drops falling through the same viscous liquid, terminal speed varies as $r^2$. If the radius is doubled, terminal speed becomes`,
        difficulty: 2,
        skillTags: ["terminal_velocity", "stokes_law", "scaling"],
        choices: [L`twice`, L`half`, L`unchanged`, L`four times`],
        correctLetter: "D",
        rationales: {
          A: L`This treats terminal speed as proportional to $r$, not $r^2$.`,
          B: L`The speed increases, not decreases, when radius increases.`,
          C: L`Radius appears in Stokes terminal velocity.`,
        },
        hints: [
          L`Use the given proportionality.`,
          L`If $v_t\propto r^2$, replace $r$ by $2r$.`,
          L`$(2r)^2=4r^2$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The scaling is",
            math: L`\frac{v_t'}{v_t}=\frac{(2r)^2}{r^2}=4`,
          },
        ],
      },
      {
        questionLatex: L`A sphere of radius $1.0\text{ mm}$ moves through a liquid of viscosity $0.10\text{ Pa s}$ at $0.20\text{ m s}^{-1}$. Using $F=6\pi\eta rv$ and $\pi=3$, the viscous force is`,
        difficulty: 3,
        skillTags: ["stokes_law", "viscous_force"],
        choices: [
          L`$3.6\times10^{-4}\text{ N}$`,
          L`$3.6\times10^{-3}\text{ N}$`,
          L`$3.6\times10^{-5}\text{ N}$`,
          L`$0.36\text{ N}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This is ten times too large; check $1\text{ mm}=10^{-3}\text{ m}$.`,
          C: L`This is ten times too small.`,
          D: L`This treats millimetres as metres.`,
        },
        hints: [
          L`Convert radius to metres.`,
          L`Substitute into $6\pi\eta rv$.`,
          L`Use $\pi=3$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Stokes' force is",
            math: L`F=6(3)(0.10)(1.0\times10^{-3})(0.20)=3.6\times10^{-4}\text{ N}`,
          },
        ],
      },
      {
        questionLatex: L`If the radius of a pipe is halved while liquid density and viscosity remain the same, the critical velocity for the onset of turbulence approximately`,
        difficulty: 3,
        skillTags: ["critical_velocity", "reynolds_number"],
        choices: [
          L`halves`,
          L`doubles`,
          L`becomes four times`,
          L`is unchanged`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`Critical velocity is inversely proportional to pipe diameter or radius for fixed Reynolds number.`,
          C: L`The dependence is inverse first power, not inverse square.`,
          D: L`Pipe size affects Reynolds number.`,
        },
        hints: [
          L`Use $R_e=\rho vd/\eta$.`,
          L`At critical condition, $R_e$ is fixed.`,
          L`So $v_c\propto1/d$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For fixed critical Reynolds number,",
            math: L`v_c=\frac{R_c\eta}{\rho d}`,
          },
          {
            step: 2,
            explanation: "Halving diameter doubles critical velocity.",
          },
        ],
      },
      {
        questionLatex: L`The excess pressure inside a soap bubble of radius $2.0\text{ mm}$ is $(T=0.030\text{ N m}^{-1})$`,
        difficulty: 3,
        skillTags: ["surface_tension", "soap_bubble", "excess_pressure"],
        choices: [
          L`$30\text{ Pa}$`,
          L`$15\text{ Pa}$`,
          L`$60\text{ Pa}$`,
          L`$120\text{ Pa}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`This uses the liquid-drop formula $2T/r$ instead of soap-bubble formula $4T/r$.`,
          B: L`This misses both the soap bubble factor and a factor of 2.`,
          D: L`This doubles the correct soap-bubble excess pressure.`,
        },
        hints: [
          L`A soap bubble has two surfaces.`,
          L`Use $\Delta p=4T/r$.`,
          L`Convert radius from millimetres to metres.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For a soap bubble,",
            math: L`\Delta p=\frac{4T}{r}=\frac{4(0.030)}{2.0\times10^{-3}}=60\text{ Pa}`,
          },
        ],
      },
      {
        questionLatex: L`In capillary rise, if the radius of the capillary tube is doubled while liquid and contact angle remain unchanged, the height of rise becomes`,
        difficulty: 2,
        figure: capillaryFigure,
        skillTags: ["capillary_rise", "surface_tension"],
        choices: [L`double`, L`four times`, L`unchanged`, L`half`],
        correctLetter: "D",
        rationales: {
          A: L`Capillary rise is inversely proportional to radius.`,
          B: L`There is no square dependence on radius in the rise formula.`,
          C: L`Tube radius directly affects capillary rise.`,
        },
        hints: [
          L`Use $h=2T\cos\theta/(\rho gr)$.`,
          L`Only $r$ changes.`,
          L`Height is inversely proportional to radius.`,
        ],
        solution: [
          { step: 1, explanation: "Since", math: L`h\propto\frac1r` },
          { step: 2, explanation: "doubling $r$ halves $h$." },
        ],
      },
    ],
    extraMc: [
      {
        questionLatex: L`In capillary rise, if a liquid of four times the density is used in the same tube while surface tension and contact angle remain unchanged, the height of rise becomes`,
        difficulty: 2,
        skillTags: ["capillary_rise", "density_dependence"],
        choices: [L`half`, L`double`, L`one-fourth`, L`unchanged`],
        correctLetter: "C",
        rationales: {
          A: L`This would be the result for doubled density, not four times density.`,
          B: L`Capillary rise decreases when density increases.`,
          D: L`Density appears in the denominator of the capillary-rise formula.`,
        },
        hints: [
          L`Use $h=2T\cos\theta/(\rho gr)$.`,
          L`Here $T$, $\theta$, and $r$ are unchanged.`,
          L`Height is inversely proportional to liquid density.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Since",
            math: L`h\propto\frac1\rho,\quad \rho'=4\rho\Rightarrow h'=h/4`,
          },
        ],
      },
      {
        questionLatex: L`For small spherical drops falling through a viscous liquid under Stokes' law, terminal speed is proportional to`,
        difficulty: 3,
        skillTags: ["stokes_law", "terminal_velocity"],
        choices: [L`$r^2$`, L`$r$`, L`$1/r$`, L`$1/r^2$`],
        correctLetter: "A",
        rationales: {
          B: L`The buoyancy-corrected weight varies as $r^3$ while viscous drag varies as $r v$.`,
          C: L`Larger drops have larger terminal speed under Stokes' law.`,
          D: L`This reverses the dependence.`,
        },
        hints: [
          L`At terminal speed, effective weight equals viscous drag.`,
          L`Stokes drag is $6\pi\eta rv$.`,
          L`The effective weight of a sphere is proportional to $r^3$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Equating forces gives",
            math: L`v_t\propto\frac{r^3}{r}=r^2`,
          },
        ],
      },
      {
        questionLatex: L`The excess pressure inside a soap bubble of radius $R$ and surface tension $T$ is`,
        difficulty: 3,
        skillTags: ["excess_pressure", "soap_bubble"],
        choices: [
          L`$\frac{4T}{R}$`,
          L`$\frac{2T}{R}$`,
          L`$\frac{T}{R}$`,
          L`$\frac{8T}{R}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This is the liquid drop result; a soap bubble has two surfaces.`,
          C: L`This misses the curvature factor.`,
          D: L`This doubles the soap-bubble result.`,
        },
        hints: [
          L`A soap bubble has two surfaces.`,
          L`A liquid drop has excess pressure $2T/R$.`,
          L`Double the drop result for a soap bubble.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For a soap bubble,",
            math: L`\Delta P=\frac{4T}{R}`,
          },
        ],
      },
      {
        questionLatex: L`A soap film of surface tension $0.050\text{ N m}^{-1}$ has its area increased by $0.020\text{ m}^2$. The work done is`,
        difficulty: 4,
        skillTags: ["surface_energy", "soap_film"],
        choices: [
          L`$2.0\times10^{-3}\text{ J}$`,
          L`$1.0\times10^{-3}\text{ J}$`,
          L`$5.0\times10^{-2}\text{ J}$`,
          L`$2.0\times10^{-2}\text{ J}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This misses the two surfaces of the soap film.`,
          C: L`This uses surface tension alone as energy.`,
          D: L`This has a factor-of-ten error.`,
        },
        hints: [
          L`A soap film has two surfaces.`,
          L`Work done equals increase in surface energy.`,
          L`Use $W=2T\Delta A$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Increase in surface energy is",
            math: L`W=2T\Delta A=2(0.050)(0.020)=2.0\times10^{-3}\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`For flow through a tube, the critical speed for transition from streamline to turbulent flow is proportional to`,
        difficulty: 3,
        skillTags: ["reynolds_number", "critical_velocity"],
        choices: [
          L`$\eta/(\rho r)$`,
          L`$\rho r/\eta$`,
          L`$\eta\rho r$`,
          L`$r/\rho\eta$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This is the inverse of the correct dependence.`,
          C: L`Critical speed decreases with larger density and tube radius.`,
          D: L`This places viscosity in the denominator incorrectly.`,
        },
        hints: [
          L`Use Reynolds number $R_e=\rho v r/\eta$ up to a constant.`,
          L`At critical flow, $R_e$ is fixed.`,
          L`Solve for $v_c$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For fixed critical Reynolds number,",
            math: L`v_c\propto\frac{\eta}{\rho r}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Water flows in a pipe of diameter $1.0\text{ cm}$ with speed $0.20\text{ m s}^{-1}$. Take $\rho=1000\text{ kg m}^{-3}$ and $\eta=1.0\times10^{-3}\text{ Pa s}$. Find the Reynolds number.`,
        difficulty: 2,
        skillTags: ["reynolds_number"],
        parts: [{ letter: "a", promptMarkdown: "Calculate $R_e$.", points: 1 }],
        hints: [
          L`Use $R_e=\rho vd/\eta$.`,
          L`Convert diameter to metres.`,
          L`Use $d=0.010\text{ m}$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            { part: "a", points: 1, description: "Finds $R_e=2000$." },
          ],
        },
        commonErrors: [
          L`Using radius instead of diameter without adjusting the formula.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$R_e=\rho vd/\eta=1000(0.20)(0.010)/(1.0\times10^{-3})=2000$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Water rises in a clean glass capillary of radius $0.50\text{ mm}$. Take $T=0.075\text{ N m}^{-1}$, $\cos\theta=1$, $\rho=1000\text{ kg m}^{-3}$, and $g=10\text{ m s}^{-2}$.`,
        difficulty: 3,
        figure: capillaryFigure,
        skillTags: ["capillary_rise", "surface_tension"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the height of capillary rise.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "State what happens to the rise if the tube radius is doubled.",
            points: 1,
          },
        ],
        hints: [
          L`Use $h=2T\cos\theta/(\rho gr)$.`,
          L`Convert $0.50\text{ mm}$ to SI units.`,
          L`Capillary rise is inversely proportional to radius.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds $h=0.030\\text{ m}=3.0\\text{ cm}$.",
            },
            { part: "b", points: 1, description: "States the rise halves." },
          ],
        },
        commonErrors: [
          L`Leaving radius in millimetres.`,
          L`Using diameter in place of radius.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$h=2(0.075)(1)/[1000(10)(0.50\times10^{-3})]=0.030\text{ m}=3.0\text{ cm}$.`,
          },
          {
            part: "b",
            explanation: "If radius doubles, the height becomes half.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A liquid drop of radius $1.5\text{ mm}$ has surface tension $0.072\text{ N m}^{-1}$.`,
        difficulty: 3,
        skillTags: ["excess_pressure", "surface_tension", "liquid_drop"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the excess pressure inside the drop.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "How would the answer differ for a soap bubble of the same radius and surface tension?",
            points: 1,
          },
        ],
        hints: [
          L`A liquid drop has one surface.`,
          L`A soap bubble has two surfaces.`,
          L`Use $2T/r$ for a drop and $4T/r$ for a soap bubble.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 2, description: "Finds $96\\text{ Pa}$." },
            {
              part: "b",
              points: 1,
              description:
                "States soap bubble pressure would be double, $192\\text{ Pa}$.",
            },
          ],
        },
        commonErrors: [L`Using the soap bubble formula for a liquid drop.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`$\Delta p=2T/r=2(0.072)/(1.5\times10^{-3})=96\text{ Pa}$.`,
          },
          {
            part: "b",
            explanation: L`For a soap bubble, $\Delta p=4T/r=192\text{ Pa}$, double the liquid-drop value.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A small metal sphere of radius $1.0\text{ mm}$ falls through a liquid. The density difference between the sphere and liquid is $800\text{ kg m}^{-3}$ and the liquid viscosity is $0.50\text{ Pa s}$. Take $g=10\text{ m s}^{-2}$.`,
        difficulty: 4,
        skillTags: ["stokes_law", "terminal_velocity", "viscosity"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write the expression for terminal velocity according to Stokes' law.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the terminal velocity.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "State why the speed becomes constant at terminal velocity.",
            points: 1,
          },
        ],
        hints: [
          L`At terminal velocity, effective weight is balanced by viscous drag.`,
          L`Use $v_t=2r^2(\rho_s-\rho_l)g/(9\eta)$.`,
          L`Convert radius to metres before squaring.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Writes the correct Stokes terminal velocity expression.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Finds approximately $3.6\\times10^{-3}\\text{ m s}^{-1}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Explains net force becomes zero.",
            },
          ],
        },
        commonErrors: [
          L`Forgetting that radius is squared.`,
          L`Using density of sphere instead of density difference.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$v_t=\frac{2r^2(\rho_s-\rho_l)g}{9\eta}$.`,
          },
          {
            part: "b",
            explanation: L`$v_t=2(10^{-3})^2(800)(10)/[9(0.50)]\approx3.6\times10^{-3}\text{ m s}^{-1}$.`,
          },
          {
            part: "c",
            explanation:
              "At terminal velocity, viscous force plus buoyant force balance the weight, so acceleration is zero.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student studies a small oil drop moving through glycerine. The drop first accelerates, then moves downward with constant speed. The teacher says this final constant speed can be used to estimate viscosity.`,
        difficulty: 4,
        skillTags: [
          "terminal_velocity",
          "stokes_law",
          "experimental_reasoning",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Name the final constant speed.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "List the three forces acting on the drop while it falls.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "At the final constant speed, what is the net force on the drop?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Why is a larger drop expected to have a larger final speed in the same liquid?",
            points: 1,
          },
        ],
        hints: [
          L`A constant speed means acceleration is zero.`,
          L`For a falling sphere in a viscous liquid, Stokes drag acts upward.`,
          L`Terminal velocity varies as $r^2$ under Stokes' law.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Names terminal velocity." },
            {
              part: "b",
              points: 1,
              description: "Lists weight, buoyant force, and viscous drag.",
            },
            { part: "c", points: 1, description: "States net force is zero." },
            {
              part: "d",
              points: 1,
              description:
                "Links larger radius to larger terminal velocity under Stokes' law.",
            },
          ],
        },
        commonErrors: [
          L`Saying drag vanishes at terminal velocity.`,
          L`Ignoring buoyant force.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The final constant speed is terminal velocity.",
          },
          {
            part: "b",
            explanation:
              "The forces are weight downward, buoyant force upward, and viscous drag upward.",
          },
          {
            part: "c",
            explanation: "The net force is zero, so acceleration is zero.",
          },
          {
            part: "d",
            explanation: L`For Stokes flow, $v_t\propto r^2$, so a larger radius gives a larger terminal speed when other quantities are unchanged.`,
          },
        ],
      },
    ],
    extraConstructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Water rises in a clean capillary tube of radius $0.50\text{ mm}$. Take $T=0.072\text{ N m}^{-1}$, $\rho=1000\text{ kg m}^{-3}$, $g=10\text{ m s}^{-2}$, and $\cos\theta=1$.`,
        difficulty: 4,
        skillTags: ["capillary_rise", "surface_tension"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the height of capillary rise.`,
            points: 1,
          },
        ],
        hints: [
          L`Use $h=2T\cos\theta/(\rho gr)$.`,
          L`Convert $0.50\text{ mm}$ to metres.`,
          L`The denominator is $1000\times10\times5\times10^{-4}$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            { part: "a", points: 1, description: L`Finds $2.88\text{ cm}$.` },
          ],
        },
        commonErrors: [L`Forgetting to convert millimetres to metres.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`h=\frac{2(0.072)}{1000(10)(5\times10^{-4})}=0.0288\text{ m}=2.88\text{ cm}.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two small drops of the same material fall through air under Stokes' law. Drop A has radius $r$ and drop B has radius $3r$.`,
        difficulty: 3,
        skillTags: ["stokes_law", "terminal_velocity_ratio"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Compare their terminal speeds.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Which drop reaches a larger terminal speed?`,
            points: 1,
          },
        ],
        hints: [
          L`Under Stokes' law, $v_t\propto r^2$.`,
          L`Radius is tripled.`,
          L`Terminal speed changes by the square of the radius ratio.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Finds $v_B=9v_A$.` },
            { part: "b", points: 1, description: "Identifies drop B." },
          ],
        },
        commonErrors: [
          L`Using a linear radius ratio instead of a squared ratio.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$v_t\propto r^2$, so $v_B/v_A=(3r/r)^2=9$.`,
          },
          { part: "b", explanation: "Drop B has the larger terminal speed." },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A soap bubble has radius $2.0\text{ cm}$ and surface tension $0.030\text{ N m}^{-1}$.`,
        difficulty: 3,
        skillTags: ["excess_pressure", "soap_bubble"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the excess pressure inside the bubble.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`State why the factor differs from a liquid drop.`,
            points: 1,
          },
        ],
        hints: [
          L`For a soap bubble, $\Delta P=4T/R$.`,
          L`Convert radius to metres.`,
          L`A soap bubble has two surfaces.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Finds $6\text{ Pa}$.` },
            { part: "b", points: 1, description: "Mentions two surfaces." },
          ],
        },
        commonErrors: [L`Using $2T/R$, which is for a liquid drop.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`\Delta P=4T/R=4(0.030)/0.020=6\text{ Pa}.`,
          },
          {
            part: "b",
            explanation:
              "A soap bubble has two liquid-air surfaces, so its excess pressure is twice that of a liquid drop of the same radius.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A rectangular wire frame carries a soap film. A movable side of length $5.0\text{ cm}$ is pulled slowly through $4.0\text{ cm}$. The surface tension of the soap solution is $0.025\text{ N m}^{-1}$.`,
        difficulty: 4,
        skillTags: ["surface_energy", "soap_film", "work_done"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the increase in area of one surface.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the total increase in surface area of the film.`,
            points: 1,
          },
          { letter: "c", promptMarkdown: L`Find the work done.`, points: 2 },
        ],
        hints: [
          L`Area increase of one surface is length times displacement.`,
          L`A soap film has two surfaces.`,
          L`Work equals $T$ times total surface-area increase.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $2.0\times10^{-3}\text{ m}^2$.`,
            },
            {
              part: "b",
              points: 1,
              description: L`Finds $4.0\times10^{-3}\text{ m}^2$.`,
            },
            {
              part: "c",
              points: 2,
              description: L`Finds $1.0\times10^{-4}\text{ J}$.`,
            },
          ],
        },
        commonErrors: [L`Counting only one surface of the soap film.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`$\Delta A_1=(0.050)(0.040)=2.0\times10^{-3}\text{ m}^2$.`,
          },
          {
            part: "b",
            explanation: L`Total area increase is $2\Delta A_1=4.0\times10^{-3}\text{ m}^2$.`,
          },
          {
            part: "c",
            explanation: L`$W=T\Delta A_{\text{total}}=0.025(4.0\times10^{-3})=1.0\times10^{-4}\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A liquid flows through a glass tube. As the speed increases beyond a certain value, the flow changes from orderly layers to irregular motion. The Reynolds number helps predict this change.`,
        difficulty: 4,
        skillTags: ["reynolds_number", "critical_velocity", "viscosity"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Name the orderly type of flow.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`How does critical speed change if viscosity increases?`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`How does critical speed change if tube radius increases?`,
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: L`Why is density relevant to the transition?`,
            points: 1,
          },
        ],
        hints: [
          L`Critical speed follows $v_c\propto\eta/(\rho r)$.`,
          L`Viscosity resists relative motion of layers.`,
          L`Larger radius and larger density favour turbulence at lower speeds.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies streamline or laminar flow.",
            },
            {
              part: "b",
              points: 1,
              description: "States critical speed increases.",
            },
            {
              part: "c",
              points: 1,
              description: "States critical speed decreases.",
            },
            {
              part: "d",
              points: 1,
              description: "Relates density to inertia in Reynolds number.",
            },
          ],
        },
        commonErrors: [
          L`Saying higher viscosity always makes turbulence easier.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The orderly flow is streamline or laminar flow.",
          },
          {
            part: "b",
            explanation: L`Since $v_c\propto\eta$, increasing viscosity increases critical speed.`,
          },
          {
            part: "c",
            explanation: L`Since $v_c\propto1/r$, increasing tube radius decreases critical speed.`,
          },
          {
            part: "d",
            explanation:
              "Density measures inertia of the moving fluid; greater density increases Reynolds number for the same speed and tube size.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "7.5",
    title: "Thermal Properties and Heat Transfer",
    subtopic:
      "Thermal expansion, calorimetry, change of state, specific heat, latent heat, heat transfer, and Newton's law of cooling.",
    mc: [
      {
        questionLatex: L`A metal rod of length $2.0\text{ m}$ has coefficient of linear expansion $1.2\times10^{-5}\text{ K}^{-1}$. If its temperature rises by $50\text{ K}$, the increase in length is`,
        difficulty: 2,
        skillTags: ["thermal_expansion", "linear_expansion"],
        choices: [
          L`$1.2\text{ mm}$`,
          L`$0.12\text{ mm}$`,
          L`$12\text{ mm}$`,
          L`$0.60\text{ mm}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This is smaller by a factor of 10.`,
          C: L`This is larger by a factor of 10.`,
          D: L`This omits the factor of length $2.0\text{ m}$ or halves the result.`,
        },
        hints: [
          L`Use $\Delta L=\alpha L\Delta T$.`,
          L`Substitute $1.2\times10^{-5}$, $2.0$, and $50$.`,
          L`Convert metres to millimetres.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Linear expansion is",
            math: L`\Delta L=\alpha L\Delta T=(1.2\times10^{-5})(2.0)(50)=1.2\times10^{-3}\text{ m}=1.2\text{ mm}`,
          },
        ],
      },
      {
        questionLatex: L`The real coefficient of volume expansion of a liquid is $9.0\times10^{-4}\text{ K}^{-1}$ and the coefficient of volume expansion of the vessel is $3.6\times10^{-5}\text{ K}^{-1}$. The apparent coefficient of volume expansion is`,
        difficulty: 3,
        skillTags: ["apparent_expansion", "thermal_expansion"],
        choices: [
          L`$9.36\times10^{-4}\text{ K}^{-1}$`,
          L`$8.64\times10^{-4}\text{ K}^{-1}$`,
          L`$3.6\times10^{-5}\text{ K}^{-1}$`,
          L`$2.5\times10^{-5}\text{ K}^{-1}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: L`This adds vessel expansion instead of subtracting it.`,
          C: L`This gives only the vessel expansion coefficient.`,
          D: L`This divides the two coefficients instead of subtracting.`,
        },
        hints: [
          L`Apparent expansion is what is observed relative to the expanding vessel.`,
          L`Use $\gamma_{\text{apparent}}=\gamma_{\text{liquid}}-\gamma_{\text{vessel}}$.`,
          L`Subtract $0.036\times10^{-3}$ from $0.900\times10^{-3}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The apparent coefficient is",
            math: L`\gamma_a=9.0\times10^{-4}-3.6\times10^{-5}=8.64\times10^{-4}\text{ K}^{-1}`,
          },
        ],
      },
      {
        questionLatex: L`The heat needed to raise the temperature of $0.50\text{ kg}$ of water from $20^\circ\text{C}$ to $40^\circ\text{C}$ is $(c=4200\text{ J kg}^{-1}\text{K}^{-1})$`,
        difficulty: 1,
        skillTags: ["specific_heat", "calorimetry"],
        choices: [
          L`$8.4\times10^4\text{ J}$`,
          L`$2.1\times10^4\text{ J}$`,
          L`$4.2\times10^4\text{ J}$`,
          L`$4.2\times10^3\text{ J}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: L`This uses $1.0\text{ kg}$ instead of $0.50\text{ kg}$.`,
          B: L`This halves the correct value again.`,
          D: L`This misses a factor of 10 in temperature change or specific heat.`,
        },
        hints: [
          L`Use $Q=mc\Delta T$.`,
          L`The temperature change is $20\text{ K}$.`,
          L`Substitute $m=0.50\text{ kg}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Heat required is",
            math: L`Q=mc\Delta T=0.50(4200)(20)=4.2\times10^4\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`The heat required to melt $0.10\text{ kg}$ of ice at $0^\circ\text{C}$ is $(L_f=3.36\times10^5\text{ J kg}^{-1})$`,
        difficulty: 2,
        skillTags: ["latent_heat", "change_of_state"],
        choices: [
          L`$3.36\times10^5\text{ J}$`,
          L`$3.36\times10^3\text{ J}$`,
          L`$4.2\times10^4\text{ J}$`,
          L`$3.36\times10^4\text{ J}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: L`This uses $1\text{ kg}$ of ice instead of $0.10\text{ kg}$.`,
          B: L`This is smaller by a factor of 10.`,
          C: L`This uses the specific heat of water idea, not latent heat of fusion.`,
        },
        hints: [
          L`During melting at $0^\circ\text{C}$, temperature does not change.`,
          L`Use $Q=mL_f$.`,
          L`Multiply by $0.10$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Latent heat required is",
            math: L`Q=mL_f=0.10(3.36\times10^5)=3.36\times10^4\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`A hot body cools in a room according to Newton's law of cooling. If its excess temperature over the room becomes half, the instantaneous rate of cooling becomes`,
        difficulty: 3,
        skillTags: ["newtons_law_of_cooling", "heat_transfer"],
        choices: [L`half`, L`double`, L`one-fourth`, L`unchanged`],
        correctLetter: "A",
        rationales: {
          B: L`Rate is directly proportional to excess temperature, not inversely proportional.`,
          C: L`Newton's law gives first-power dependence, not square dependence.`,
          D: L`Rate changes as the body approaches room temperature.`,
        },
        hints: [
          L`Newton's law: rate of cooling is proportional to temperature excess.`,
          L`Temperature excess means $T-T_0$.`,
          L`Halving the excess halves the rate.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Newton's law of cooling gives",
            math: L`\left|\frac{dT}{dt}\right|\propto (T-T_0)`,
          },
          { step: 2, explanation: "So halving $T-T_0$ halves the rate." },
        ],
      },
    ],
    extraMc: [
      {
        questionLatex: L`A steel ring is heated uniformly. What happens to the diameter of the hole in the ring?`,
        difficulty: 2,
        skillTags: ["thermal_expansion", "conceptual_expansion"],
        choices: [
          "decreases",
          "increases",
          "remains exactly unchanged",
          "first decreases and then increases",
        ],
        correctLetter: "B",
        rationales: {
          A: "Every length in the ring expands, including the hole diameter.",
          C: "Thermal expansion changes all linear dimensions.",
          D: "Uniform heating does not cause this two-stage behaviour.",
        },
        hints: [
          "Imagine the hole filled with the same material before heating.",
          "All linear dimensions scale up on heating.",
          "The hole behaves as if it also expands.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "On uniform heating, all linear dimensions of the ring increase, so the hole diameter increases.",
          },
        ],
      },
      {
        questionLatex: L`A slab conducts heat steadily. If its thickness is doubled while area and temperature difference are unchanged, the rate of heat flow becomes`,
        difficulty: 3,
        skillTags: ["thermal_conduction", "rate_of_heat_flow"],
        choices: ["double", "half", "four times", "unchanged"],
        correctLetter: "B",
        rationales: {
          A: "Rate is inversely proportional to thickness.",
          C: "This treats thickness as if it were in the numerator and squared.",
          D: "Thickness affects conduction rate.",
        },
        hints: [
          L`For conduction, $\frac{Q}{t}=\frac{kA\Delta T}{L}$.`,
          "Only thickness changes.",
          "Doubling $L$ halves the rate.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Heat current is inversely proportional to slab thickness.",
            math: L`H=\frac{kA\Delta T}{L}`,
          },
        ],
      },
      {
        questionLatex: L`Two bodies have the same mass and receive the same heat. Body X has larger specific heat than body Y. The temperature rise of X is`,
        difficulty: 2,
        skillTags: ["specific_heat", "temperature_rise"],
        choices: [
          "larger than Y",
          "smaller than Y",
          "equal to Y",
          "zero always",
        ],
        correctLetter: "B",
        rationales: {
          A: "For fixed heat and mass, larger specific heat gives smaller temperature rise.",
          C: "Equal heat does not mean equal temperature rise when specific heats differ.",
          D: "Temperature can rise unless heat goes entirely into phase change.",
        },
        hints: [
          L`Use $Q=mc\Delta T$.`,
          "For fixed $Q$ and $m$, $\\Delta T$ is inversely proportional to $c$.",
          "Larger $c$ means smaller rise.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Since $\\Delta T=Q/(mc)$, the body with larger specific heat has smaller temperature rise.",
          },
        ],
      },
      {
        questionLatex: L`During boiling at constant pressure, heat supplied to water at its boiling point mainly`,
        difficulty: 2,
        skillTags: ["latent_heat", "change_of_state"],
        choices: [
          "raises its temperature rapidly",
          "increases its mass",
          "changes liquid into vapour at the same temperature",
          "reduces its latent heat to zero",
        ],
        correctLetter: "C",
        rationales: {
          A: "During a phase change at the boiling point, temperature remains constant.",
          B: "Heating does not increase the mass of the sample.",
          D: "Latent heat is the heat required for the phase change.",
        },
        hints: [
          "At the boiling point, supplied heat goes into changing state.",
          "Temperature remains constant during the phase change.",
          "This heat is latent heat of vaporisation.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At the boiling point, heat supplied at constant pressure changes liquid water into vapour without raising temperature.",
          },
        ],
      },
      {
        questionLatex: L`A blackened surface and a polished surface at the same temperature are placed in identical surroundings. The blackened surface is generally a`,
        difficulty: 3,
        skillTags: ["thermal_radiation", "absorber_emitter"],
        choices: [
          "poor absorber and poor emitter",
          "good absorber and good emitter",
          "good absorber but poor emitter",
          "poor absorber but good emitter",
        ],
        correctLetter: "B",
        rationales: {
          A: "Black surfaces are good absorbers and emitters of radiation.",
          C: "Good absorbers are generally good emitters.",
          D: "Polished bright surfaces are poor absorbers and poor emitters.",
        },
        hints: [
          "Use Kirchhoff's law of radiation qualitatively.",
          "A good absorber is also a good emitter.",
          "Blackened surfaces absorb strongly.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A blackened surface is a good absorber and, correspondingly, a good emitter of thermal radiation.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A $0.20\text{ kg}$ metal piece at $80^\circ\text{C}$ is mixed with $0.30\text{ kg}$ of the same metal at $20^\circ\text{C}$ in an insulated vessel. Find the final temperature.`,
        difficulty: 2,
        skillTags: ["calorimetry", "heat_balance"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Calculate the final temperature.",
            points: 1,
          },
        ],
        hints: [
          L`Same material means same specific heat.`,
          L`Use weighted average temperature.`,
          L`$T_f=(m_1T_1+m_2T_2)/(m_1+m_2)$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $44^\\circ\\text{C}$.",
            },
          ],
        },
        commonErrors: [
          L`Taking the simple average $50^\circ\text{C}$ despite unequal masses.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$T_f=[0.20(80)+0.30(20)]/(0.50)=44^\circ\text{C}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A brass scale is correct at $20^\circ\text{C}$. Its coefficient of linear expansion is $1.8\times10^{-5}\text{ K}^{-1}$. At $70^\circ\text{C}$, it is used to measure a rod and reads $50.00\text{ cm}$.`,
        difficulty: 4,
        skillTags: ["thermal_expansion", "measurement_error"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Explain whether the true rod length is larger or smaller than $50.00\\text{ cm}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Estimate the true length of the rod.",
            points: 2,
          },
        ],
        hints: [
          L`Each scale division expands when temperature rises.`,
          L`An expanded scale under-reads the true length.`,
          L`True length $=$ reading $\times(1+\alpha\Delta T)$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States true length is slightly larger.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds approximately $50.045\\text{ cm}$.",
            },
          ],
        },
        commonErrors: [
          L`Subtracting the correction instead of adding it.`,
          L`Using Celsius value instead of temperature change.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "At higher temperature, each centimetre mark is farther apart, so the scale under-reads.",
          },
          {
            part: "b",
            explanation: L`$\Delta T=50\text{ K}$. True length $=50.00[1+(1.8\times10^{-5})(50)]\approx50.045\text{ cm}$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A $50\text{ g}$ piece of ice at $0^\circ\text{C}$ is put into $200\text{ g}$ of water at $30^\circ\text{C}$ in an insulated vessel. Take $L_f=3.36\times10^5\text{ J kg}^{-1}$ and $c_w=4200\text{ J kg}^{-1}\text{K}^{-1}$.`,
        difficulty: 5,
        skillTags: ["calorimetry", "latent_heat", "heat_balance"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the heat released by water if it cools to $0^\\circ\\text{C}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the heat needed to melt all the ice.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Determine whether all the ice melts.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Find the final temperature.",
            points: 2,
          },
        ],
        hints: [
          L`First compare heat available from warm water with heat needed for melting.`,
          L`If heat remains after melting, it warms the melted ice plus original water.`,
          L`Use energy conservation in two stages.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $25200\\text{ J}$." },
            { part: "b", points: 1, description: "Finds $16800\\text{ J}$." },
            {
              part: "c",
              points: 1,
              description: "States all ice melts and heat remains.",
            },
            {
              part: "d",
              points: 2,
              description:
                "Uses remaining heat to warm $0.25\\text{ kg}$ water and finds $8^\\circ\\text{C}$.",
            },
          ],
        },
        commonErrors: [
          L`Stopping at $0^\circ\text{C}$ even though heat remains.`,
          L`Warming only the melted ice instead of all water after melting.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Heat released by water cooling to $0^\circ\text{C}$ is $0.200(4200)(30)=25200\text{ J}$.`,
          },
          {
            part: "b",
            explanation: L`Heat needed to melt ice is $0.050(3.36\times10^5)=16800\text{ J}$.`,
          },
          { part: "c", explanation: "Since $25200>16800$, all the ice melts." },
          {
            part: "d",
            explanation: L`Remaining heat $=8400\text{ J}$. This warms $0.250\text{ kg}$ of water, so $\Delta T=8400/[0.250(4200)]=8^\circ\text{C}$. Final temperature is $8^\circ\text{C}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A body cools from $90^\circ\text{C}$ in a room at $30^\circ\text{C}$. At $90^\circ\text{C}$ its rate of cooling is $3.0^\circ\text{C min}^{-1}$. Assume Newton's law of cooling holds.`,
        difficulty: 4,
        skillTags: ["newtons_law_of_cooling", "proportional_reasoning"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the proportionality constant $k$ if rate $=k(T-T_0)$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the rate of cooling when the body is at $50^\\circ\\text{C}$.",
            points: 1,
          },
        ],
        hints: [
          L`The excess temperature at $90^\circ\text{C}$ is $60^\circ\text{C}$.`,
          L`Find $k$ from $3.0=k(60)$.`,
          L`At $50^\circ\text{C}$, the excess temperature is $20^\circ\text{C}$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $k=0.050\\text{ min}^{-1}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $1.0^\\circ\\text{C min}^{-1}$.",
            },
          ],
        },
        commonErrors: [
          L`Using absolute temperature instead of excess over surroundings.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$3.0=k(90-30)=60k$, so $k=0.050\text{ min}^{-1}$.`,
          },
          {
            part: "b",
            explanation: L`At $50^\circ\text{C}$, excess is $20^\circ\text{C}$, so rate $=0.050(20)=1.0^\circ\text{C min}^{-1}$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A substance is heated at a steady rate. Its temperature-time curve has two horizontal parts as shown.`,
        difficulty: 4,
        figure: heatingCurveFigure,
        skillTags: ["heating_curve", "latent_heat", "phase_change"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "What physical process occurs during the lower horizontal part?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Why does temperature remain constant during a horizontal part even though heat is supplied?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "If $0.20\\text{ kg}$ of the substance absorbs $4.0\\times10^4\\text{ J}$ during one plateau, find the latent heat for that change.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Which part of the curve would be used to calculate specific heat capacity of a single phase?",
            points: 1,
          },
        ],
        hints: [
          L`A horizontal part means phase change at constant temperature.`,
          L`Latent heat changes internal structure, not temperature.`,
          L`Use $L=Q/m$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Identifies melting/fusion." },
            {
              part: "b",
              points: 1,
              description: "Explains supplied heat is latent heat.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds $2.0\\times10^5\\text{ J kg}^{-1}$.",
            },
            {
              part: "d",
              points: 1,
              description: "Identifies a sloped single-phase region.",
            },
          ],
        },
        commonErrors: [
          L`Saying no heat is absorbed during a plateau.`,
          L`Using $mc\Delta T$ during a phase-change plateau.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The lower horizontal part represents melting.",
          },
          {
            part: "b",
            explanation:
              "Heat supplied during a phase change is latent heat; it changes the state rather than increasing temperature.",
          },
          {
            part: "c",
            explanation: L`$L=Q/m=(4.0\times10^4)/(0.20)=2.0\times10^5\text{ J kg}^{-1}$.`,
          },
          {
            part: "d",
            explanation:
              "Use a sloped part of the curve, where one phase is warming and temperature changes with heat supplied.",
          },
        ],
      },
    ],
    extraConstructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A copper rod of length $1.5\text{ m}$ expands by $0.90\text{ mm}$ when heated through $40\text{ K}$.`,
        difficulty: 2,
        skillTags: ["linear_expansion", "thermal_expansion"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the coefficient of linear expansion.",
            points: 1,
          },
        ],
        hints: [
          L`Use $\Delta L=\alpha L\Delta T$.`,
          "Convert $0.90\\text{ mm}$ to metres.",
          "Solve for $\\alpha$.",
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $\alpha=1.5\times10^{-5}\text{ K}^{-1}$.`,
            },
          ],
        },
        commonErrors: [
          "Using millimetres and metres in the same equation without conversion.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$\alpha=\Delta L/(L\Delta T)=0.90\times10^{-3}/(1.5\times40)=1.5\times10^{-5}\text{ K}^{-1}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A wall of area $2.0\text{ m}^2$ and thickness $0.20\text{ m}$ has thermal conductivity $0.80\text{ W m}^{-1}\text{K}^{-1}$. The temperature difference across it is $15\text{ K}$.`,
        difficulty: 3,
        skillTags: ["thermal_conduction", "heat_current"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the steady rate of heat flow.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "State one way to reduce this rate without changing the temperatures.",
            points: 1,
          },
        ],
        hints: [
          L`Use $H=kA\Delta T/L$.`,
          "To reduce heat flow, reduce area/conductivity or increase thickness.",
          "Insulation effectively lowers conductivity.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $120\\text{ W}$." },
            {
              part: "b",
              points: 1,
              description:
                "Gives a valid reduction method such as increasing thickness or adding insulation.",
            },
          ],
        },
        commonErrors: ["Putting thickness in the numerator."],
        workedSolution: [
          {
            part: "a",
            explanation: L`$H=kA\Delta T/L=0.80(2.0)(15)/0.20=120\text{ W}$.`,
          },
          {
            part: "b",
            explanation:
              "Adding insulating material or increasing wall thickness reduces the rate.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A $0.40\text{ kg}$ block of aluminium with $c=900\text{ J kg}^{-1}\text{K}^{-1}$ is heated from $25^\circ\text{C}$ to $75^\circ\text{C}$.`,
        difficulty: 2,
        skillTags: ["specific_heat", "heat_required"],
        parts: [
          { letter: "a", promptMarkdown: "Find the heat supplied.", points: 1 },
          {
            letter: "b",
            promptMarkdown:
              "If the same heat is supplied to $0.40\\text{ kg}$ water, will the temperature rise be larger or smaller? Explain.",
            points: 1,
          },
        ],
        hints: [
          L`Use $Q=mc\Delta T$.`,
          "Water has a larger specific heat than aluminium.",
          "For same heat and mass, larger $c$ gives smaller $\\Delta T$.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $1.8\\times10^4\\text{ J}$.",
            },
            {
              part: "b",
              points: 1,
              description: "States smaller rise for water with reason.",
            },
          ],
        },
        commonErrors: [
          "Using final temperature instead of temperature change.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$Q=0.40(900)(50)=1.8\times10^4\text{ J}$.`,
          },
          {
            part: "b",
            explanation:
              "For the same mass and heat, water's larger specific heat gives a smaller temperature rise.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Steam at $100^\circ\text{C}$ is passed into $0.50\text{ kg}$ of water at $20^\circ\text{C}$ until the final temperature becomes $60^\circ\text{C}$. Take $c_w=4200\text{ J kg}^{-1}\text{K}^{-1}$ and latent heat of steam $L_v=2.26\times10^6\text{ J kg}^{-1}$. Ignore heat losses.`,
        difficulty: 5,
        skillTags: ["calorimetry", "latent_heat", "steam_condensation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the heat gained by the original water.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Write the heat released by $m$ kg of steam in condensing and cooling to $60^\\circ\\text{C}$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Find the mass of steam condensed.",
            points: 2,
          },
        ],
        hints: [
          "Original water warms from $20^\\circ\\text{C}$ to $60^\\circ\\text{C}$.",
          "Steam first condenses at $100^\\circ\\text{C}$ and then the condensed water cools to $60^\\circ\\text{C}$.",
          "Set heat lost by steam equal to heat gained by water.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Finds $84000\\text{ J}$." },
            { part: "b", points: 2, description: "Writes $m[L_v+c_w(40)]$." },
            {
              part: "c",
              points: 2,
              description: "Finds $m\\approx0.0346\\text{ kg}$.",
            },
          ],
        },
        commonErrors: [
          "Forgetting the condensed steam cools from $100^\\circ\\text{C}$ to $60^\\circ\\text{C}$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Heat gained $=0.50(4200)(60-20)=84000\text{ J}$.`,
          },
          {
            part: "b",
            explanation: L`Heat released per kg of steam is $L_v+c_w(100-60)=2.26\times10^6+4200(40)=2.428\times10^6\text{ J kg}^{-1}$.`,
          },
          {
            part: "c",
            explanation: L`$m=84000/(2.428\times10^6)\approx3.46\times10^{-2}\text{ kg}$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A hot liquid cools in a room at $25^\circ\text{C}$. At one instant its temperature is $85^\circ\text{C}$ and its cooling rate is $3.0^\circ\text{C min}^{-1}$. Assume Newton's law of cooling holds approximately for the interval considered.`,
        difficulty: 4,
        skillTags: ["case_based", "newtons_law_of_cooling"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the excess temperature at that instant.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the proportionality constant in $\\text{min}^{-1}$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Estimate the cooling rate when the liquid is at $55^\\circ\\text{C}$.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Explain why the rate decreases as the liquid approaches room temperature.",
            points: 1,
          },
        ],
        hints: [
          "Excess temperature is temperature above surroundings.",
          "Newton's law says rate is proportional to excess temperature.",
          "At $55^\\circ\\text{C}$, excess is smaller.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $60^\\circ\\text{C}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $k=0.05\\text{ min}^{-1}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds $1.5^\\circ\\text{C min}^{-1}$.",
            },
            {
              part: "d",
              points: 1,
              description:
                "Explains lower temperature difference gives lower heat-loss rate.",
            },
          ],
        },
        commonErrors: [
          "Using actual temperature instead of excess temperature.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Excess temperature $=85-25=60^\circ\text{C}$.`,
          },
          {
            part: "b",
            explanation: L`$3.0=k(60)$, so $k=0.05\text{ min}^{-1}$.`,
          },
          {
            part: "c",
            explanation: L`At $55^\circ\text{C}$, excess $=30^\circ\text{C}$, so rate $=0.05(30)=1.5^\circ\text{C min}^{-1}$.`,
          },
          {
            part: "d",
            explanation:
              "As the liquid approaches room temperature, the excess temperature decreases, so the heat-loss rate decreases.",
          },
        ],
      },
    ],
  },
];

export const propertiesBulkMatterTopics: Topic[] = topicSeeds.map(makeTopic);
