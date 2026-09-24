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
const UNIT = "practicals-activities";
const VERSION = "0.1.3";
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
  mc: readonly McSeed[];
  constructed: readonly ConstructedSeed[];
}

function topicSlug(topicCode: string) {
  return topicCode.toLowerCase().replace(/[^a-z0-9]+/g, "-");
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
  return `You chose ${choiceText}. In a practical viva, check the instrument least count, zero correction, plotted quantity, graph slope, or the observation formula before choosing.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class11_physics_practical_viva_reasoning"),
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
    contentId: `${COURSE}.lab.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "answers_viva_by_formula_memory_without_checking_observation_or_precaution",
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
    contentId: `${COURSE}.lab.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "states_final_result_without_unit_precaution_or_graph_reasoning",
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
      ...seed.constructed.map((item, index) =>
        makeConstructed(seed, item, index),
      ),
    ],
  };
}

const vernierReadingFigure: ItemFigure = {
  type: "svg",
  title: "Vernier calipers observation",
  description:
    "A main scale and vernier scale reading where the vernier zero is just after 2.4 cm and the sixth vernier division coincides.",
  svg: `<svg viewBox="0 0 720 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="330" fill="#ffffff"/>
  <text x="70" y="55" font-size="18" fill="#0f172a">Main scale (cm)</text>
  <line x1="80" y1="115" x2="650" y2="115" stroke="#334155" stroke-width="3"/>
  <g stroke="#334155" stroke-width="2">
    <line x1="110" y1="82" x2="110" y2="115"/>
    <line x1="210" y1="82" x2="210" y2="115"/>
    <line x1="310" y1="82" x2="310" y2="115"/>
    <line x1="410" y1="82" x2="410" y2="115"/>
    <line x1="510" y1="82" x2="510" y2="115"/>
    <line x1="610" y1="82" x2="610" y2="115"/>
  </g>
  <g stroke="#94a3b8" stroke-width="1">
    <line x1="120" y1="96" x2="120" y2="115"/>
    <line x1="130" y1="96" x2="130" y2="115"/>
    <line x1="140" y1="96" x2="140" y2="115"/>
    <line x1="150" y1="96" x2="150" y2="115"/>
    <line x1="160" y1="96" x2="160" y2="115"/>
    <line x1="170" y1="96" x2="170" y2="115"/>
    <line x1="180" y1="96" x2="180" y2="115"/>
    <line x1="190" y1="96" x2="190" y2="115"/>
    <line x1="200" y1="96" x2="200" y2="115"/>
    <line x1="220" y1="96" x2="220" y2="115"/>
    <line x1="230" y1="96" x2="230" y2="115"/>
    <line x1="240" y1="96" x2="240" y2="115"/>
    <line x1="250" y1="96" x2="250" y2="115"/>
    <line x1="260" y1="96" x2="260" y2="115"/>
    <line x1="270" y1="96" x2="270" y2="115"/>
    <line x1="280" y1="96" x2="280" y2="115"/>
    <line x1="290" y1="96" x2="290" y2="115"/>
    <line x1="300" y1="96" x2="300" y2="115"/>
    <line x1="320" y1="96" x2="320" y2="115"/>
    <line x1="330" y1="96" x2="330" y2="115"/>
    <line x1="340" y1="96" x2="340" y2="115"/>
    <line x1="350" y1="96" x2="350" y2="115"/>
    <line x1="360" y1="96" x2="360" y2="115"/>
    <line x1="370" y1="96" x2="370" y2="115"/>
    <line x1="380" y1="96" x2="380" y2="115"/>
    <line x1="390" y1="96" x2="390" y2="115"/>
    <line x1="400" y1="96" x2="400" y2="115"/>
    <line x1="420" y1="96" x2="420" y2="115"/>
    <line x1="430" y1="96" x2="430" y2="115"/>
    <line x1="440" y1="96" x2="440" y2="115"/>
    <line x1="450" y1="96" x2="450" y2="115"/>
    <line x1="460" y1="96" x2="460" y2="115"/>
    <line x1="470" y1="96" x2="470" y2="115"/>
    <line x1="480" y1="96" x2="480" y2="115"/>
    <line x1="490" y1="96" x2="490" y2="115"/>
    <line x1="500" y1="96" x2="500" y2="115"/>
    <line x1="520" y1="96" x2="520" y2="115"/>
    <line x1="530" y1="96" x2="530" y2="115"/>
    <line x1="540" y1="96" x2="540" y2="115"/>
    <line x1="550" y1="96" x2="550" y2="115"/>
    <line x1="560" y1="96" x2="560" y2="115"/>
    <line x1="570" y1="96" x2="570" y2="115"/>
    <line x1="580" y1="96" x2="580" y2="115"/>
    <line x1="590" y1="96" x2="590" y2="115"/>
    <line x1="600" y1="96" x2="600" y2="115"/>
  </g>
  <text x="110" y="145" font-size="16" text-anchor="middle" fill="#0f172a">2.0</text>
  <text x="210" y="145" font-size="16" text-anchor="middle" fill="#0f172a">2.1</text>
  <text x="310" y="145" font-size="16" text-anchor="middle" fill="#0f172a">2.2</text>
  <text x="410" y="145" font-size="16" text-anchor="middle" fill="#0f172a">2.3</text>
  <text x="510" y="145" font-size="16" text-anchor="middle" fill="#0f172a">2.4</text>
  <text x="610" y="145" font-size="16" text-anchor="middle" fill="#0f172a">2.5</text>
  <rect x="511" y="175" width="110" height="55" rx="4" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <text x="566" y="262" font-size="17" text-anchor="middle" fill="#0f172a">Vernier scale</text>
  <g stroke="#2563eb" stroke-width="2">
    <line x1="516" y1="175" x2="516" y2="225"/>
    <line x1="525" y1="190" x2="525" y2="225"/>
    <line x1="534" y1="190" x2="534" y2="225"/>
    <line x1="543" y1="190" x2="543" y2="225"/>
    <line x1="552" y1="190" x2="552" y2="225"/>
    <line x1="561" y1="190" x2="561" y2="225"/>
    <line x1="570" y1="175" x2="570" y2="225"/>
    <line x1="579" y1="190" x2="579" y2="225"/>
    <line x1="588" y1="190" x2="588" y2="225"/>
    <line x1="597" y1="190" x2="597" y2="225"/>
    <line x1="606" y1="175" x2="606" y2="225"/>
  </g>
  <line x1="570" y1="82" x2="570" y2="236" stroke="#f97316" stroke-width="3" stroke-dasharray="7 5"/>
  <text x="570" y="294" font-size="16" text-anchor="middle" fill="#f97316">6th vernier division coincides</text>
</svg>`,
};

const springGraphFigure: ItemFigure = {
  type: "svg",
  title: "Load-extension graph for a helical spring",
  description:
    "A straight line graph of load against extension with plotted points used to determine spring constant.",
  svg: `<svg viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="420" fill="#ffffff"/>
  <defs>
    <marker id="arrow-spring-lab" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <line x1="90" y1="340" x2="560" y2="340" stroke="#334155" stroke-width="2" marker-end="url(#arrow-spring-lab)"/>
  <line x1="90" y1="340" x2="90" y2="60" stroke="#334155" stroke-width="2" marker-end="url(#arrow-spring-lab)"/>
  <text x="550" y="374" font-size="16" fill="#0f172a">extension (cm)</text>
  <text x="28" y="90" font-size="16" fill="#0f172a">load (N)</text>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="90" y1="284" x2="540" y2="284"/>
    <line x1="90" y1="228" x2="540" y2="228"/>
    <line x1="90" y1="172" x2="540" y2="172"/>
    <line x1="90" y1="116" x2="540" y2="116"/>
    <line x1="180" y1="340" x2="180" y2="80"/>
    <line x1="270" y1="340" x2="270" y2="80"/>
    <line x1="360" y1="340" x2="360" y2="80"/>
    <line x1="450" y1="340" x2="450" y2="80"/>
  </g>
  <line x1="90" y1="340" x2="450" y2="116" stroke="#2563eb" stroke-width="4"/>
  <circle cx="180" cy="284" r="5" fill="#2563eb"/>
  <circle cx="270" cy="228" r="5" fill="#2563eb"/>
  <circle cx="360" cy="172" r="5" fill="#2563eb"/>
  <circle cx="450" cy="116" r="5" fill="#2563eb"/>
  <text x="180" y="362" font-size="14" text-anchor="middle" fill="#0f172a">2</text>
  <text x="270" y="362" font-size="14" text-anchor="middle" fill="#0f172a">4</text>
  <text x="360" y="362" font-size="14" text-anchor="middle" fill="#0f172a">6</text>
  <text x="450" y="362" font-size="14" text-anchor="middle" fill="#0f172a">8</text>
  <text x="72" y="289" font-size="14" text-anchor="end" fill="#0f172a">1</text>
  <text x="72" y="233" font-size="14" text-anchor="end" fill="#0f172a">2</text>
  <text x="72" y="177" font-size="14" text-anchor="end" fill="#0f172a">3</text>
  <text x="72" y="121" font-size="14" text-anchor="end" fill="#0f172a">4</text>
</svg>`,
};

const boyleGraphFigure: ItemFigure = {
  type: "svg",
  title: "Boyle's law graph",
  description:
    "Two qualitative graphs: P versus V is a rectangular hyperbola and P versus 1/V is a straight line through the origin.",
  svg: `<svg viewBox="0 0 700 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="360" fill="#ffffff"/>
  <g transform="translate(50,35)">
    <line x1="50" y1="250" x2="270" y2="250" stroke="#334155" stroke-width="2"/>
    <line x1="50" y1="250" x2="50" y2="40" stroke="#334155" stroke-width="2"/>
    <path d="M75 70 C105 85 120 125 135 160 C155 205 190 230 250 238" fill="none" stroke="#2563eb" stroke-width="4"/>
    <text x="260" y="282" font-size="16" fill="#0f172a">V</text>
    <text x="22" y="48" font-size="16" fill="#0f172a">P</text>
    <text x="140" y="310" font-size="17" text-anchor="middle" fill="#0f172a">P versus V</text>
  </g>
  <g transform="translate(380,35)">
    <line x1="50" y1="250" x2="270" y2="250" stroke="#334155" stroke-width="2"/>
    <line x1="50" y1="250" x2="50" y2="40" stroke="#334155" stroke-width="2"/>
    <line x1="50" y1="250" x2="245" y2="65" stroke="#16a34a" stroke-width="4"/>
    <text x="245" y="282" font-size="16" fill="#0f172a">1/V</text>
    <text x="22" y="48" font-size="16" fill="#0f172a">P</text>
    <text x="145" y="310" font-size="17" text-anchor="middle" fill="#0f172a">P versus 1/V</text>
  </g>
</svg>`,
};

const resonanceTubeFigure: ItemFigure = {
  type: "svg",
  title: "Resonance tube observations",
  description:
    "A resonance tube with first and second resonance lengths marked at 16 cm and 50 cm.",
  svg: `<svg viewBox="0 0 620 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="420" fill="#ffffff"/>
  <rect x="290" y="80" width="70" height="270" rx="8" fill="#e0f2fe" stroke="#2563eb" stroke-width="3"/>
  <rect x="300" y="250" width="50" height="90" fill="#93c5fd" opacity="0.75"/>
  <line x1="380" y1="112" x2="500" y2="112" stroke="#16a34a" stroke-width="3"/>
  <line x1="380" y1="248" x2="500" y2="248" stroke="#f97316" stroke-width="3"/>
  <text x="510" y="117" font-size="17" fill="#16a34a">second resonance: 50 cm</text>
  <text x="510" y="253" font-size="17" fill="#f97316">first resonance: 16 cm</text>
  <path d="M220 60 h80" stroke="#334155" stroke-width="3"/>
  <path d="M230 58 q30 -28 60 0" fill="none" stroke="#334155" stroke-width="2"/>
  <text x="205" y="42" font-size="16" fill="#0f172a">tuning fork</text>
  <text x="295" y="385" font-size="16" fill="#0f172a">water level is adjusted</text>
</svg>`,
};

const bestFitGraphFigure: ItemFigure = {
  type: "svg",
  title: "Best-fit graph for practical data",
  description:
    "Experimental data points with a best-fit straight line for slope estimation.",
  svg: `<svg viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="420" fill="#ffffff"/>
  <line x1="80" y1="340" x2="560" y2="340" stroke="#334155" stroke-width="2"/>
  <line x1="80" y1="340" x2="80" y2="70" stroke="#334155" stroke-width="2"/>
  <text x="555" y="374" font-size="16" fill="#0f172a">x</text>
  <text x="42" y="82" font-size="16" fill="#0f172a">y</text>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="80" y1="280" x2="540" y2="280"/>
    <line x1="80" y1="220" x2="540" y2="220"/>
    <line x1="80" y1="160" x2="540" y2="160"/>
    <line x1="180" y1="340" x2="180" y2="90"/>
    <line x1="280" y1="340" x2="280" y2="90"/>
    <line x1="380" y1="340" x2="380" y2="90"/>
    <line x1="480" y1="340" x2="480" y2="90"/>
  </g>
  <line x1="115" y1="304" x2="505" y2="110" stroke="#2563eb" stroke-width="3"/>
  <g stroke="#0f172a" stroke-width="2">
    <circle cx="150" cy="280" r="5" fill="#2563eb"/>
    <circle cx="250" cy="230" r="5" fill="#2563eb"/>
    <circle cx="350" cy="185" r="5" fill="#2563eb"/>
    <circle cx="450" cy="140" r="5" fill="#2563eb"/>
  </g>
</svg>`,
};

const topics: readonly TopicSeed[] = [
  {
    topicCode: "Lab.1",
    title: "Apparatus and Measurement Viva",
    subtopic:
      "Vernier calipers, screw gauge, spherometer, beam balance, least count, zero correction, significant figures",
    mc: [
      {
        questionLatex: L`In the vernier observation shown, the least count is $0.01\text{ cm}$. The main-scale reading is $2.40\text{ cm}$ and the $6$th vernier division coincides. The correct reading is`,
        figure: vernierReadingFigure,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["vernier-calipers", "least-count", "observation-reading"],
        choices: [
          L`$2.46\text{ cm}$`,
          L`$2.40\text{ cm}$`,
          L`$2.06\text{ cm}$`,
          L`$2.60\text{ cm}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This ignores the vernier coincidence. The vernier contribution is not zero.",
          C: "This treats the main-scale reading as 2.00 cm, but the zero is just after 2.40 cm.",
          D: "This adds 0.20 cm instead of 6 least-count divisions.",
        },
        hints: [
          L`Use reading = main-scale reading + vernier coincidence $\times$ least count.`,
          L`The vernier contribution is $6\times0.01\text{ cm}$.`,
          L`Add $0.06\text{ cm}$ to $2.40\text{ cm}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Main-scale reading is 2.40 cm and the sixth vernier division coincides.",
          },
          {
            step: 2,
            explanation: "Vernier contribution is 6 least-count divisions.",
            math: "6\\times0.01=0.06\\text{ cm}",
          },
          {
            step: 3,
            explanation: "Total reading is 2.46 cm.",
            math: "2.40+0.06=2.46\\text{ cm}",
          },
        ],
      },
      {
        questionLatex: L`When the jaws of a screw gauge are closed, the zero of the circular scale is $3$ divisions above the reference line. If the least count is $0.01\text{ mm}$, the zero correction is`,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["screw-gauge", "zero-error", "zero-correction"],
        choices: [
          L`$-0.03\text{ mm}$`,
          L`$+0.03\text{ mm}$`,
          L`$+0.30\text{ mm}$`,
          L`zero`,
        ],
        correctLetter: "B",
        rationales: {
          A: "The question asks for zero correction, not zero error. Above the reference line means negative zero error, so the correction is positive.",
          C: "Three circular-scale divisions are 0.03 mm, not 0.30 mm.",
          D: "The circular-scale zero is not on the reference line, so the zero correction is not zero.",
        },
        hints: [
          "First decide whether the error is positive or negative.",
          "For a screw gauge, circular-scale zero above the reference line gives negative zero error.",
          "Zero correction is the negative of zero error.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Zero above the reference line means the instrument reads too small when closed.",
          },
          {
            step: 2,
            explanation: "The zero error is negative.",
            math: "-3\\times0.01=-0.03\\text{ mm}",
          },
          {
            step: 3,
            explanation: "Zero correction is opposite in sign.",
            math: "+0.03\\text{ mm}",
          },
        ],
      },
      {
        questionLatex: L`A spherometer has mean leg separation $l=3.0\text{ cm}$ and sagitta $h=0.080\text{ cm}$ on a convex surface. Using $R=\dfrac{l^2}{6h}+\dfrac{h}{2}$, the radius of curvature is closest to`,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["spherometer", "radius-of-curvature", "viva-formula"],
        choices: [
          L`$37.5\text{ cm}$`,
          L`$11.3\text{ cm}$`,
          L`$18.8\text{ cm}$`,
          L`$3.08\text{ cm}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This misses the factor 6 in the denominator.",
          B: "This uses an incorrect denominator and does not match the spherometer formula.",
          D: "This adds the length and sagitta instead of using the curvature formula.",
        },
        hints: [
          L`Substitute into $R=\dfrac{l^2}{6h}+\dfrac{h}{2}$.`,
          L`Compute $\dfrac{9}{6\times0.080}$ first.`,
          L`The term $h/2$ is small but should be added.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute the observed values.",
            math: "R=\\frac{(3.0)^2}{6(0.080)}+\\frac{0.080}{2}",
          },
          {
            step: 2,
            explanation:
              "The first term is 18.75 cm and the second is 0.04 cm.",
            math: "R=18.75+0.04=18.79\\text{ cm}",
          },
          {
            step: 3,
            explanation: "Closest option is 18.8 cm.",
          },
        ],
      },
      {
        questionLatex: L`A rod measured with a scale of least count $0.1\text{ cm}$ appears to have length $7.0\text{ cm}$. In the practical record, the best way to write the result is`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: [
          "least-count",
          "recording-observation",
          "significant-figures",
        ],
        choices: [
          L`$7\text{ cm}$`,
          L`$7.00\text{ cm}$`,
          L`$7.000\text{ cm}$`,
          L`$7.0\text{ cm}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "Writing 7 cm hides the 0.1 cm precision of the scale.",
          B: "7.00 cm suggests 0.01 cm precision, which this scale does not have.",
          C: "7.000 cm suggests much finer precision than the instrument provides.",
        },
        hints: [
          "Match the final decimal place to the least count.",
          "A 0.1 cm least count supports one decimal place in cm.",
          "Do not overstate precision.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The least count is 0.1 cm, so the reading should be written to one decimal place.",
          },
          {
            step: 2,
            explanation: "Therefore the proper record is 7.0 cm.",
          },
        ],
      },
      {
        questionLatex: L`In a beam balance practical, a student uses forceps to handle fractional weights mainly because`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["beam-balance", "apparatus-familiarity", "precautions"],
        choices: [
          "handling by hand can add moisture or grease and change the effective mass",
          "forceps reduce the true mass of the object being weighed",
          "forceps remove the need to check balance pointer oscillations",
          "forceps are used only when the object is magnetic",
        ],
        correctLetter: "A",
        rationales: {
          B: "Forceps do not change the object's true mass.",
          C: "The pointer still has to oscillate equally about the zero mark.",
          D: "The usual reason is cleanliness and avoiding contamination, not magnetism.",
        },
        hints: [
          "Think like an examiner asking about precautions.",
          "The fractional weights must remain clean and dry.",
          "Finger contact can leave oil or moisture.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A physical balance is sensitive to small mass changes and contamination.",
          },
          {
            step: 2,
            explanation:
              "Forceps prevent moisture, grease, and dust from fingers from affecting weights.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Define least count of a measuring instrument in one viva-ready sentence.`,
        difficulty: 1,
        skillTags: ["least-count", "viva-definition"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Give the definition and mention why it matters in a practical reading.",
            points: 2,
          },
        ],
        hints: [
          "It is the smallest value directly measurable by the instrument.",
          "Connect it to uncertainty or precision.",
          "For a vernier, it is usually one main-scale division minus one vernier-scale division.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Defines least count as the smallest measurable value.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Connects least count to precision or reading uncertainty.",
            },
          ],
        },
        commonErrors: [
          "Calling least count the largest division on the scale.",
          "Giving only an example without a definition.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Least count is the smallest measurement that an instrument can directly resolve; it fixes the precision to which the observation should be recorded.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A screw gauge gives an observed wire diameter of $0.286\text{ mm}$. Its zero error is $+0.004\text{ mm}$. Find the corrected diameter and state the sign rule used.`,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["screw-gauge", "zero-correction", "corrected-reading"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the zero correction.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the corrected diameter.",
            points: 2,
          },
        ],
        hints: [
          "Corrected reading = observed reading + zero correction.",
          "Zero correction is the negative of zero error.",
          "A positive zero error must be subtracted from the observed reading.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States zero correction as $-0.004\\text{ mm}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Uses corrected reading = observed + correction.",
            },
            {
              part: "b",
              points: 1,
              description: "Obtains $0.282\\text{ mm}$ with unit.",
            },
          ],
        },
        commonErrors: [
          "Adding positive zero error instead of subtracting it.",
          "Omitting the unit in the final result.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Zero correction is opposite in sign to zero error, so it is $-0.004\\text{ mm}$.",
          },
          {
            part: "b",
            explanation: "Corrected diameter $=0.286-0.004=0.282\\text{ mm}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A beaker has internal diameter $5.0\text{ cm}$ and depth $8.0\text{ cm}$ measured by vernier calipers. Estimate its internal volume.`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["vernier-calipers", "beaker-volume", "cylindrical-volume"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the formula used.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Calculate the volume.",
            points: 2,
          },
        ],
        hints: [
          "Treat the inside of the beaker as a cylinder.",
          "Use radius $r=d/2$ or directly $V=\\pi d^2h/4$.",
          "Use $\\pi\\approx3.14$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Uses cylindrical volume formula.",
            },
            {
              part: "b",
              points: 1,
              description: "Substitutes diameter and depth correctly.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Obtains approximately $157\\text{ cm}^3$ with unit.",
            },
          ],
        },
        commonErrors: [
          "Using diameter as radius.",
          "Leaving the answer without cubic unit.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "For a cylindrical beaker, $V=\\pi d^2h/4$.",
          },
          {
            part: "b",
            explanation:
              "$V=3.14\\times(5.0)^2\\times8.0/4=157\\text{ cm}^3$ approximately.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`In a spherometer experiment, the mean distance between the three legs is $4.0\text{ cm}$ and the central screw rises by $0.050\text{ cm}$ when moved from a plane glass plate to a spherical surface. Find the radius of curvature and mention one precaution.`,
        difficulty: 4,
        calculatorAllowed: false,
        skillTags: ["spherometer", "radius-of-curvature", "precautions"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State the formula for radius of curvature.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Compute the radius of curvature.",
            points: 3,
          },
          {
            letter: "c",
            promptMarkdown: "State one relevant precaution.",
            points: 1,
          },
        ],
        hints: [
          L`Use $R=\dfrac{l^2}{6h}+\dfrac{h}{2}$.`,
          L`Here $l=4.0\text{ cm}$ and $h=0.050\text{ cm}$.`,
          "A practical precaution should relate to contact, backlash, or repeated readings.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States the correct spherometer formula.",
            },
            {
              part: "b",
              points: 2,
              description: "Substitutes values and evaluates the main term.",
            },
            {
              part: "b",
              points: 1,
              description: "Adds $h/2$ and rounds with unit.",
            },
            {
              part: "c",
              points: 1,
              description: "Gives a valid practical precaution.",
            },
          ],
        },
        commonErrors: [
          "Using $l^2/2h$ instead of $l^2/6h$.",
          "Forgetting that all lengths must be in the same unit.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For an equilateral three-leg spherometer, $R=\\dfrac{l^2}{6h}+\\dfrac{h}{2}$.",
          },
          {
            part: "b",
            explanation:
              "$R=16/(6\\times0.050)+0.025=53.33+0.025\\approx53.36\\text{ cm}$.",
          },
          {
            part: "c",
            explanation:
              "A valid precaution is to turn the screw in one direction while taking the final reading to avoid backlash.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A student is preparing for the apparatus-familiarity part of the practical examination.",
        difficulty: 3,
        skillTags: [
          "apparatus-identification",
          "viva-voce",
          "practical-skills",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Which instrument is most suitable for the thickness of a thin sheet?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Which instrument is most suitable for the internal diameter of a calorimeter?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Why should the eye be kept normal to the scale while reading?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Name one apparatus used with a simple pendulum experiment besides the bob and string.",
            points: 1,
          },
        ],
        hints: [
          "Match the instrument to the dimension being measured.",
          "Internal diameter needs inside jaws.",
          "The eye-position question is about parallax.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Names screw gauge.",
            },
            {
              part: "b",
              points: 1,
              description: "Names vernier calipers.",
            },
            {
              part: "c",
              points: 1,
              description: "Mentions avoiding parallax error.",
            },
            {
              part: "d",
              points: 1,
              description:
                "Names a valid apparatus such as stopwatch, metre scale, split cork, or suspension stand.",
            },
          ],
        },
        commonErrors: [
          "Using metre scale for thin sheet thickness.",
          "Naming outside jaws for internal diameter.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "A screw gauge is used for a thin sheet.",
          },
          {
            part: "b",
            explanation:
              "Vernier calipers are used for internal diameter using the inside jaws.",
          },
          {
            part: "c",
            explanation:
              "Keeping the eye normal to the scale avoids parallax error.",
          },
          {
            part: "d",
            explanation:
              "A stopwatch, metre scale, split cork, or suspension stand is acceptable.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "Lab.2",
    title: "Mechanics Practical Viva",
    subtopic:
      "Parallelogram law, simple pendulum, friction, inclined plane, projectile range, rolling-ball energy conservation",
    mc: [
      {
        questionLatex: L`In the parallelogram-law experiment, two forces $3\text{ N}$ and $4\text{ N}$ act at right angles. The equilibrant needed is`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["parallelogram-law", "resultant", "equilibrant"],
        choices: [
          L`$7\text{ N}$ along the larger force`,
          L`$5\text{ N}$ opposite to the resultant`,
          L`$1\text{ N}$ opposite to the smaller force`,
          L`$12\text{ N}$ perpendicular to both forces`,
        ],
        correctLetter: "B",
        rationales: {
          A: "Adding magnitudes directly works only for same-direction forces, not perpendicular forces.",
          C: "Subtracting magnitudes is not the resultant for perpendicular forces.",
          D: "Multiplying magnitudes has no meaning for the force equilibrant here.",
        },
        hints: [
          "The equilibrant has the same magnitude as resultant but opposite direction.",
          "For perpendicular forces, use Pythagoras.",
          L`$R=\sqrt{3^2+4^2}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the resultant of perpendicular forces.",
            math: "R=\\sqrt{3^2+4^2}=5\\text{ N}",
          },
          {
            step: 2,
            explanation:
              "Equilibrant is equal in magnitude and opposite in direction to the resultant.",
          },
        ],
      },
      {
        questionLatex: L`In a simple pendulum experiment, the graph of $T^2$ versus $L$ is a straight line. Its slope is`,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["simple-pendulum", "graph-slope", "effective-length"],
        choices: [
          L`$\dfrac{g}{4\pi^2}$`,
          L`$2\pi\sqrt{g}$`,
          L`$\dfrac{4\pi^2}{g}$`,
          L`$\dfrac{1}{2\pi g}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This is reciprocal of the required slope.",
          B: "This mixes the period formula but is not the slope of $T^2$ versus $L$.",
          D: "This has incorrect dimensions and misses the squared relation.",
        },
        hints: [
          L`Start from $T=2\pi\sqrt{L/g}$.`,
          L`Square both sides.`,
          L`Compare $T^2=(4\pi^2/g)L$ with $y=mx$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Square the pendulum relation.",
            math: "T^2=\\frac{4\\pi^2}{g}L",
          },
          {
            step: 2,
            explanation: "So slope of $T^2$ versus $L$ is $4\\pi^2/g$.",
          },
        ],
      },
      {
        questionLatex: L`In the pendulum activity, bobs of the same size but different masses are used at the same length and small amplitude. The expected observation is`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["simple-pendulum", "mass-independence", "viva-concept"],
        choices: [
          "the heavier bob always has a larger time period",
          "the lighter bob always has a larger time period",
          "the time period becomes zero for equal-size bobs",
          "the time period remains practically unchanged",
        ],
        correctLetter: "D",
        rationales: {
          A: "For small oscillations, ideal pendulum period is independent of bob mass.",
          B: "The ideal period does not increase for a lighter bob either.",
          C: "The period cannot become zero; the pendulum still oscillates.",
        },
        hints: [
          "Recall the expression for a simple pendulum.",
          L`$T=2\pi\sqrt{L/g}$ contains no mass term.`,
          "The same size controls air resistance differences.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For small oscillations, the time period depends on length and g, not mass.",
            math: "T=2\\pi\\sqrt{L/g}",
          },
          {
            step: 2,
            explanation:
              "Therefore different masses of the same size give nearly the same time period.",
          },
        ],
      },
      {
        questionLatex: L`In the limiting-friction experiment, a graph of limiting friction $F$ versus normal reaction $N$ is drawn. The slope gives`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["friction", "graph-slope", "coefficient-of-friction"],
        choices: [
          L`coefficient of static friction $\mu_s$`,
          L`acceleration due to gravity $g$`,
          "mass of the block",
          "angle of repose directly in degrees",
        ],
        correctLetter: "A",
        rationales: {
          B: "The graph uses measured friction and normal reaction; its slope is dimensionless, not g.",
          C: "Mass affects N, but the slope of F versus N is not the mass.",
          D: "Angle of repose is related by $\\tan\\theta=\\mu$, but the graph slope itself is $\\mu$.",
        },
        hints: [
          L`Use $F_{\text{limiting}}=\mu_s N$.`,
          "Compare this with a straight line through the origin.",
          "Slope equals coefficient multiplying N.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Limiting friction is proportional to normal reaction.",
            math: "F=\\mu_s N",
          },
          {
            step: 2,
            explanation: "The slope of F versus N is $\\mu_s$.",
          },
        ],
      },
      {
        questionLatex: L`In the inclined-plane activity for a roller, the graph of downward force $F$ along the plane versus $\sin\theta$ should have slope`,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["inclined-plane", "graph-slope", "component-of-weight"],
        choices: [L`$m/g$`, L`$mg$`, L`$g/m$`, L`$mg\cos\theta$`],
        correctLetter: "B",
        rationales: {
          A: "The component of weight is proportional to mg, not m divided by g.",
          C: "This has the wrong dimensions for force.",
          D: "The graph is against $\\sin\\theta$; the coefficient of $\\sin\\theta$ is mg.",
        },
        hints: [
          "Resolve weight along the inclined plane.",
          L`The component down the plane is $mg\sin\theta$.`,
          L`If $F=mg\sin\theta$, slope of $F$ versus $\sin\theta$ is $mg$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The component of weight of a roller down the plane is $mg\\sin\\theta$.",
          },
          {
            step: 2,
            explanation:
              "So the F versus $\\sin\\theta$ graph is straight with slope mg.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "saq",
        questionLatex: L`In a metre-scale principle-of-moments activity, a $150\text{ g}$ mass is placed $20\text{ cm}$ from the pivot on one side. An unknown mass balances it at $30\text{ cm}$ on the other side. Find the unknown mass.`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["principle-of-moments", "metre-scale", "activity"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the balancing condition.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the unknown mass.",
            points: 2,
          },
        ],
        hints: [
          "At balance, clockwise moment equals anticlockwise moment.",
          "The factor g cancels from both sides.",
          L`$150\times20=m\times30$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States equality of moments.",
            },
            {
              part: "b",
              points: 1,
              description: "Substitutes distances correctly.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $100\\text{ g}$.",
            },
          ],
        },
        commonErrors: [
          "Adding distances instead of equating moments.",
          "Forgetting that g cancels.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "At balance, clockwise moment = anticlockwise moment.",
          },
          {
            part: "b",
            explanation: "$150\\times20=m\\times30$, so $m=100\\text{ g}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A simple pendulum gives a straight-line graph of $T^2$ versus $L$ with slope $4.0\text{ s}^2\text{ m}^{-1}$. Estimate $g$ using $g=4\pi^2/\text{slope}$ and take $\pi^2=9.87$.`,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["simple-pendulum", "graph-analysis", "experimental-g"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Substitute the slope in the formula.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Calculate $g$ with unit.",
            points: 2,
          },
        ],
        hints: [
          "The slope is already in SI units.",
          L`$4\pi^2=39.48$.`,
          "Divide by 4.0.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Uses $g=4\\pi^2/\\text{slope}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Computes the numerical value.",
            },
            {
              part: "b",
              points: 1,
              description: "Gives correct SI unit.",
            },
          ],
        },
        commonErrors: [
          "Using slope divided by $4\\pi^2$.",
          "Omitting $\\text{m s}^{-2}$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$g=4\\pi^2/\\text{slope}=39.48/4.0$.",
          },
          {
            part: "b",
            explanation: "$g=9.87\\text{ m s}^{-2}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "In the friction experiment, why is the block pulled gently so that it just begins to move?",
        difficulty: 2,
        skillTags: ["friction", "precautions", "viva-voce"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Answer in one or two sentences.",
            points: 2,
          },
        ],
        hints: [
          "The required value is limiting friction, not kinetic friction.",
          "Limiting friction occurs at the instant motion is about to start.",
          "Jerky pulling can overshoot the limiting value.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Identifies the required reading as limiting friction.",
            },
            {
              part: "a",
              points: 1,
              description: "Mentions avoiding jerk or overshoot.",
            },
          ],
        },
        commonErrors: [
          "Saying it is done to reduce the mass of the block.",
          "Confusing limiting friction with rolling friction.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The reading should correspond to limiting friction, which acts just before motion starts. Pulling gently avoids a jerk that would make the spring balance reading overshoot.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "In the projectile-range activity, what projection angle should give the maximum range on level ground, and why are readings taken on both sides of this angle?",
        difficulty: 3,
        skillTags: ["projectile-range", "activity", "graph-interpretation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State the angle for maximum range.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Explain why observations around that angle are useful.",
            points: 2,
          },
        ],
        hints: [
          L`For same speed and level ground, $R=u^2\sin2\theta/g$.`,
          L`$\sin2\theta$ is maximum when $2\theta=90^\circ$.`,
          "Readings on both sides test the trend rather than one isolated value.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States $45^\\circ$.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Uses the rise and fall of range with angle around $45^\\circ$.",
            },
            {
              part: "b",
              points: 1,
              description: "Mentions reducing dependence on one reading.",
            },
          ],
        },
        commonErrors: [
          "Saying maximum range occurs at 90 degrees.",
          "Not distinguishing range from maximum height.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The maximum range occurs at $45^\\circ$.",
          },
          {
            part: "b",
            explanation:
              "Since $R\\propto\\sin2\\theta$, the range increases up to $45^\\circ$ and then decreases. Readings on both sides verify the trend and reduce over-reliance on a single observation.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A ball is released from one side of a double inclined plane and climbs the other side.",
        difficulty: 4,
        skillTags: ["energy-conservation", "double-inclined-plane", "activity"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "What energy conversion is mainly observed during descent?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Why does the ball usually not reach exactly the same vertical height on the other side?",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "State one way to make the observation closer to ideal conservation of mechanical energy.",
            points: 1,
          },
        ],
        hints: [
          "Compare gravitational potential energy and kinetic energy.",
          "Real surfaces introduce dissipative forces.",
          "A smoother track and gentle release reduce losses.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Identifies potential energy converting mainly into kinetic energy.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Explains energy loss due to rolling friction, air resistance, or sound/heat.",
            },
            {
              part: "c",
              points: 1,
              description: "Gives a valid improvement.",
            },
          ],
        },
        commonErrors: [
          "Claiming energy is not conserved at all.",
          "Ignoring frictional and rolling losses.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "During descent, gravitational potential energy is converted mainly into kinetic energy.",
          },
          {
            part: "b",
            explanation:
              "The ball does not reach exactly the same height because some mechanical energy is dissipated due to rolling friction, air resistance, sound, and deformation.",
          },
          {
            part: "c",
            explanation:
              "Use a smooth, clean track and release the ball without pushing it.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "Lab.3",
    title: "Elasticity, Fluids and Thermal Viva",
    subtopic:
      "Young's modulus, helical spring, Boyle's law graphs, capillary rise, viscosity, cooling curve, calorimetry, bimetallic strip",
    mc: [
      {
        questionLatex: L`For the load-extension graph shown for a helical spring, the spring constant is closest to`,
        figure: springGraphFigure,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["helical-spring", "graph-slope", "spring-constant"],
        choices: [
          L`$0.50\text{ N m}^{-1}$`,
          L`$5\text{ N m}^{-1}$`,
          L`$50\text{ N m}^{-1}$`,
          L`$500\text{ N m}^{-1}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This keeps extension in cm but labels the answer as per metre.",
          B: "This is a factor of ten low after converting cm to metre.",
          D: "This is a factor of ten high; 4 N over 0.08 m is 50 N/m.",
        },
        hints: [
          "Spring constant is slope of load versus extension.",
          "Convert cm to m before reporting N/m.",
          L`Use the point $4\text{ N}$ at $8\text{ cm}=0.08\text{ m}$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "From the graph, load 4 N produces extension 8 cm.",
          },
          {
            step: 2,
            explanation: "Convert extension to metre.",
            math: "8\\text{ cm}=0.08\\text{ m}",
          },
          {
            step: 3,
            explanation: "Spring constant is load divided by extension.",
            math: "k=4/0.08=50\\text{ N m}^{-1}",
          },
        ],
      },
      {
        questionLatex: L`In Young's modulus experiment for a wire, the extension is measured accurately only after applying a load because Young's modulus is based on`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["youngs-modulus", "stress-strain", "viva-concept"],
        choices: [
          "mass divided by density",
          "load multiplied by room temperature",
          "extension divided by original length only",
          "stress divided by strain within the elastic limit",
        ],
        correctLetter: "D",
        rationales: {
          A: "Mass divided by density gives volume, not Young's modulus.",
          B: "Temperature is not multiplied by load in the modulus definition.",
          C: "Strain alone is not modulus; stress must also be included.",
        },
        hints: [
          "Recall the definition of Young's modulus.",
          "It compares stress and strain.",
          "The elastic limit matters because proportionality is assumed.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Young's modulus is defined as longitudinal stress divided by longitudinal strain.",
            math: "Y=\\frac{\\text{stress}}{\\text{strain}}",
          },
          {
            step: 2,
            explanation:
              "This relation is valid within the elastic limit of the wire.",
          },
        ],
      },
      {
        questionLatex: L`For a sample of air at constant temperature, which graph is expected to be a straight line through the origin in Boyle's law verification?`,
        figure: boyleGraphFigure,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["boyles-law", "graph-selection", "gas-law-practical"],
        choices: [
          L`$P$ versus $1/V$`,
          L`$P$ versus $V$`,
          L`$V$ versus $P^2$`,
          L`$PV$ versus $1/P$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "$P$ versus $V$ is inverse, so it is a rectangular hyperbola, not a straight line.",
          C: "Boyle's law does not give $V\\propto P^2$.",
          D: "$PV$ is approximately constant at fixed temperature; this graph is not the standard straight-line test.",
        },
        hints: [
          L`Boyle's law says $PV=$ constant.`,
          L`So $P\propto1/V$.`,
          "A direct proportionality graph through the origin uses P and 1/V.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At constant temperature, Boyle's law is $PV=$ constant.",
          },
          {
            step: 2,
            explanation:
              "Therefore $P$ is directly proportional to $1/V$, giving a straight line through origin.",
          },
        ],
      },
      {
        questionLatex:
          "In the capillary-rise activity, adding detergent to water generally reduces surface tension. The capillary rise is therefore expected to",
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["surface-tension", "capillary-rise", "activity"],
        choices: [
          "increase without limit",
          "decrease",
          "remain exactly unchanged",
          "become negative for every tube",
        ],
        correctLetter: "B",
        rationales: {
          A: "Lower surface tension gives a smaller rise, not an unlimited increase.",
          C: "Capillary rise depends on surface tension.",
          D: "A lower rise is not the same as a negative rise in every tube.",
        },
        hints: [
          L`Use $h=2T\cos\theta/(\rho gr)$.`,
          "If surface tension T decreases, h decreases for the same tube.",
          "This is why detergent changes the observed rise.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Capillary rise is directly proportional to surface tension.",
            math: "h=\\frac{2T\\cos\\theta}{\\rho gr}",
          },
          {
            step: 2,
            explanation: "Detergent lowers T, so the capillary rise decreases.",
          },
        ],
      },
      {
        questionLatex:
          "In a cooling-curve experiment, the slope of the temperature-time graph becomes smaller as the body approaches room temperature because",
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: [
          "cooling-curve",
          "newtons-law-of-cooling",
          "thermal-practical",
        ],
        choices: [
          "specific heat becomes zero near room temperature",
          "the thermometer stops absorbing heat",
          "rate of heat loss decreases as temperature difference from surroundings decreases",
          "latent heat is released at every temperature",
        ],
        correctLetter: "C",
        rationales: {
          A: "Specific heat does not become zero near room temperature.",
          B: "The thermometer response is not the main reason for the decreasing slope.",
          D: "Latent heat is linked with change of state, not every cooling point.",
        },
        hints: [
          "Recall Newton's law of cooling.",
          "Rate of cooling depends on temperature excess over surroundings.",
          "As excess temperature decreases, the curve flattens.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Newton's law of cooling says rate of cooling is proportional to temperature difference from surroundings.",
          },
          {
            step: 2,
            explanation:
              "As the body nears room temperature, the temperature difference and hence the slope decrease.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "saq",
        questionLatex: L`Using the load-extension graph shown, calculate the spring constant and mention one precaution in the helical-spring experiment.`,
        figure: springGraphFigure,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["spring-constant", "graph-reading", "precautions"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Calculate the spring constant.",
            points: 3,
          },
          {
            letter: "b",
            promptMarkdown: "State one suitable precaution.",
            points: 1,
          },
        ],
        hints: [
          "Slope of load-extension graph is spring constant.",
          "Use SI units for N/m.",
          "A precaution should prevent oscillation or overloading.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Reads a correct point from the graph.",
            },
            {
              part: "a",
              points: 1,
              description: "Converts cm to m.",
            },
            {
              part: "a",
              points: 1,
              description: "Obtains $50\\text{ N m}^{-1}$.",
            },
            {
              part: "b",
              points: 1,
              description: "States a valid precaution.",
            },
          ],
        },
        commonErrors: [
          "Reporting N/cm as N/m.",
          "Taking a reading while the spring is still oscillating.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "From the graph, $4\\text{ N}$ corresponds to $8\\text{ cm}=0.08\\text{ m}$, so $k=4/0.08=50\\text{ N m}^{-1}$.",
          },
          {
            part: "b",
            explanation:
              "A valid precaution is to take the reading only after the load comes to rest and not to exceed the elastic limit.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In the capillary-rise experiment, water rises by $4.0\text{ cm}$ in a tube of radius $0.50\text{ mm}$. Assuming $\cos\theta=1$, $\rho=1000\text{ kg m}^{-3}$ and $g=10\text{ m s}^{-2}$, estimate surface tension using $T=\rho grh/2$.`,
        difficulty: 4,
        calculatorAllowed: false,
        skillTags: ["capillary-rise", "surface-tension", "unit-conversion"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Convert radius and height to SI units.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Calculate surface tension.",
            points: 3,
          },
        ],
        hints: [
          L`$0.50\text{ mm}=5.0\times10^{-4}\text{ m}$.`,
          L`$4.0\text{ cm}=4.0\times10^{-2}\text{ m}$.`,
          L`Substitute in $T=\rho grh/2$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Converts both quantities correctly.",
            },
            {
              part: "b",
              points: 2,
              description: "Substitutes in the formula correctly.",
            },
            {
              part: "b",
              points: 1,
              description: "Obtains $0.10\\text{ N m}^{-1}$.",
            },
          ],
        },
        commonErrors: [
          "Using mm and cm directly in SI formula.",
          "Forgetting the factor 2.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$r=5.0\\times10^{-4}\\text{ m}$ and $h=4.0\\times10^{-2}\\text{ m}$.",
          },
          {
            part: "b",
            explanation:
              "$T=(1000)(10)(5.0\\times10^{-4})(4.0\\times10^{-2})/2=0.10\\text{ N m}^{-1}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "Why must the falling sphere in the viscosity experiment move with terminal velocity before timing is used?",
        difficulty: 3,
        skillTags: ["viscosity", "terminal-velocity", "stokes-law"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Give a viva-ready reason.",
            points: 2,
          },
        ],
        hints: [
          "Stokes' law method uses steady speed.",
          "At terminal velocity, net force is zero.",
          "Before terminal velocity, the sphere is accelerating.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Mentions terminal velocity as constant velocity.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Connects constant velocity to valid use of Stokes' law/timing.",
            },
          ],
        },
        commonErrors: [
          "Saying terminal velocity is the initial velocity.",
          "Ignoring acceleration before terminal speed.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The viscosity formula based on Stokes' law uses the steady terminal velocity of the sphere. Before that, the sphere accelerates, so timing would not give the required constant velocity.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In a calorimetry experiment, a hot solid of mass $0.20\text{ kg}$ at $80^\circ\text{C}$ is placed in $0.30\text{ kg}$ of water at $30^\circ\text{C}$. The final temperature is $35^\circ\text{C}$. Taking $c_w=4200\text{ J kg}^{-1}\text{K}^{-1}$ and neglecting calorimeter heat capacity, find the specific heat of the solid.`,
        difficulty: 4,
        calculatorAllowed: false,
        skillTags: ["calorimetry", "specific-heat", "heat-balance"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Write the heat balance equation.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Calculate the specific heat of the solid.",
            points: 3,
          },
        ],
        hints: [
          "Heat lost by hot solid = heat gained by water.",
          "Temperature fall of solid is 45 K; temperature rise of water is 5 K.",
          L`$0.20c(45)=0.30(4200)(5)$.`,
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Sets heat lost equal to heat gained correctly.",
            },
            {
              part: "b",
              points: 2,
              description: "Substitutes masses and temperature changes.",
            },
            {
              part: "b",
              points: 1,
              description: "Obtains $700\\text{ J kg}^{-1}\\text{K}^{-1}$.",
            },
          ],
        },
        commonErrors: [
          "Using final temperature as the temperature change.",
          "Putting heat gained by water on the wrong side without sign clarity.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Heat lost by solid = heat gained by water, so $0.20c(80-35)=0.30(4200)(35-30)$.",
          },
          {
            part: "b",
            explanation:
              "$9c=6300$, hence $c=700\\text{ J kg}^{-1}\\text{K}^{-1}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A student observes a bimetallic strip made of brass and iron when it is heated. Brass expands more than iron for the same temperature rise.",
        difficulty: 3,
        skillTags: ["thermal-expansion", "bimetallic-strip", "activity"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Which metal forms the outer side of the curve on heating?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Toward which metal does the strip bend?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "What physical property difference is demonstrated?",
            points: 1,
          },
        ],
        hints: [
          "The metal that expands more must take the longer outer arc.",
          "The strip bends toward the metal that expands less.",
          "This is about linear expansion.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies brass as outer side.",
            },
            {
              part: "b",
              points: 1,
              description: "States bending toward iron.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Mentions different coefficients of linear expansion.",
            },
          ],
        },
        commonErrors: [
          "Saying it bends toward the more-expanding metal.",
          "Calling it anomalous expansion of water.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Brass expands more, so it forms the longer outer side of the curve.",
          },
          {
            part: "b",
            explanation:
              "The strip bends toward iron, the metal with smaller expansion.",
          },
          {
            part: "c",
            explanation:
              "It demonstrates different coefficients of linear expansion of solids.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "Lab.4",
    title: "Sonometer and Resonance Tube Viva",
    subtopic:
      "Frequency-length relation, length-tension relation, tuning forks, resonance positions, end correction, speed of sound",
    mc: [
      {
        questionLatex:
          "In a sonometer experiment at constant tension, the length of the wire is adjusted until resonance occurs with different tuning forks. The relation tested is",
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["sonometer", "frequency-length-relation", "resonance"],
        choices: [
          L`$f\propto l$`,
          L`$f\propto l^2$`,
          L`$f$ is independent of $l$`,
          L`$f\propto 1/l$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "At constant tension and linear density, frequency varies inversely with length.",
          B: "There is no square dependence on length in the fundamental frequency formula.",
          C: "Changing length is exactly how resonance is obtained for different tuning forks.",
        },
        hints: [
          L`For fundamental mode, $f=\dfrac{1}{2l}\sqrt{T/\mu}$.`,
          "At constant T and linear density, only l changes.",
          "So f is inversely proportional to l.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the sonometer fundamental frequency relation.",
            math: "f=\\frac{1}{2l}\\sqrt{T/\\mu}",
          },
          {
            step: 2,
            explanation: "For fixed T and $\\mu$, $f\\propto1/l$.",
          },
        ],
      },
      {
        questionLatex: L`In the sonometer experiment at constant frequency, the relation between resonating length $l$ and tension $T$ is`,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["sonometer", "length-tension-relation", "graph-reasoning"],
        choices: [
          L`$l\propto\sqrt{T}$`,
          L`$l\propto T^2$`,
          L`$l\propto1/T$`,
          L`$l$ is independent of $T$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Length is proportional to square root of tension, not square of tension.",
          C: "Increasing tension increases wave speed and resonating length for fixed frequency.",
          D: "Tension is deliberately varied in this experiment.",
        },
        hints: [
          L`Use $f=\dfrac{1}{2l}\sqrt{T/\mu}$.`,
          "Keep f and $\\mu$ constant.",
          "Solve for l in terms of T.",
        ],
        solution: [
          {
            step: 1,
            explanation: "For fixed frequency and linear density:",
            math: "l=\\frac{1}{2f}\\sqrt{T/\\mu}",
          },
          {
            step: 2,
            explanation: "Thus $l\\propto\\sqrt{T}$.",
          },
        ],
      },
      {
        questionLatex: L`In a resonance tube experiment with a tuning fork of frequency $500\text{ Hz}$, the first and second resonance lengths are $16\text{ cm}$ and $50\text{ cm}$. The speed of sound is`,
        figure: resonanceTubeFigure,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["resonance-tube", "speed-of-sound", "resonance-lengths"],
        choices: [
          L`$170\text{ m s}^{-1}$`,
          L`$340\text{ m s}^{-1}$`,
          L`$500\text{ m s}^{-1}$`,
          L`$660\text{ m s}^{-1}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This uses $l_2-l_1$ as one wavelength; it is half a wavelength.",
          C: "Frequency alone is not speed.",
          D: "This roughly adds the two lengths instead of using their difference.",
        },
        hints: [
          L`For a closed pipe, $l_2-l_1=\lambda/2$.`,
          L`Here $l_2-l_1=34\text{ cm}=0.34\text{ m}$.`,
          L`So $\lambda=0.68\text{ m}$ and $v=f\lambda$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Difference between successive resonance lengths is half wavelength.",
            math: "l_2-l_1=50-16=34\\text{ cm}=0.34\\text{ m}",
          },
          {
            step: 2,
            explanation: "Therefore wavelength is 0.68 m.",
            math: "\\lambda=2(0.34)=0.68\\text{ m}",
          },
          {
            step: 3,
            explanation: "Speed is frequency times wavelength.",
            math: "v=500\\times0.68=340\\text{ m s}^{-1}",
          },
        ],
      },
      {
        questionLatex:
          "In the resonance tube method, using the difference of second and first resonance lengths is useful because",
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["resonance-tube", "end-correction", "viva-reasoning"],
        choices: [
          "the frequency of the tuning fork becomes zero",
          "the water level becomes irrelevant",
          "the end correction cancels out",
          "sound changes from longitudinal to transverse",
        ],
        correctLetter: "C",
        rationales: {
          A: "The tuning fork frequency remains fixed, not zero.",
          B: "Water level determines resonance length; it is not irrelevant.",
          D: "Sound in air remains longitudinal.",
        },
        hints: [
          "Write the corrected lengths for first and second resonance.",
          L`$l_1+e=\lambda/4$ and $l_2+e=3\lambda/4$.`,
          "Subtract the two equations.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For first resonance $l_1+e=\\lambda/4$ and second resonance $l_2+e=3\\lambda/4$.",
          },
          {
            step: 2,
            explanation:
              "On subtracting, end correction e cancels and $l_2-l_1=\\lambda/2$.",
          },
        ],
      },
      {
        questionLatex: L`A tuning fork of known frequency $256\text{ Hz}$ is sounded with another fork and $4$ beats per second are heard. The unknown frequency could be`,
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["tuning-fork", "beats", "viva-application"],
        choices: [
          L`$256\text{ Hz}$ only`,
          L`$4\text{ Hz}$ only`,
          L`$512\text{ Hz}$ only`,
          L`$252\text{ Hz}$ or $260\text{ Hz}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "Equal frequencies produce no beats.",
          B: "4 Hz is the beat frequency, not the fork frequency.",
          C: "512 Hz differs by 256 Hz, not 4 Hz.",
        },
        hints: [
          "Beat frequency is the absolute difference of the two frequencies.",
          L`$|f-256|=4$.`,
          "There are two possible frequencies unless extra information is given.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Beat frequency is $|f_1-f_2|$.",
            math: "|f-256|=4",
          },
          {
            step: 2,
            explanation: "So the unknown frequency can be 252 Hz or 260 Hz.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "saq",
        questionLatex: L`In a resonance tube experiment, $l_1=16\text{ cm}$ and $l_2=50\text{ cm}$ for a tuning fork of frequency $500\text{ Hz}$. Find $\lambda$ and $v$.`,
        figure: resonanceTubeFigure,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["resonance-tube", "speed-of-sound", "calculation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the wavelength.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the speed of sound.",
            points: 2,
          },
        ],
        hints: [
          L`Use $l_2-l_1=\lambda/2$.`,
          "Convert cm to metre before speed calculation.",
          L`$v=f\lambda$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Uses $l_2-l_1=\\lambda/2$.",
            },
            {
              part: "a",
              points: 1,
              description: "Finds $\\lambda=0.68\\text{ m}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Uses $v=f\\lambda$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $340\\text{ m s}^{-1}$.",
            },
          ],
        },
        commonErrors: [
          "Taking the length difference itself as wavelength.",
          "Not converting centimetre to metre.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$l_2-l_1=50-16=34\\text{ cm}=0.34\\text{ m}=\\lambda/2$, so $\\lambda=0.68\\text{ m}$.",
          },
          {
            part: "b",
            explanation: "$v=f\\lambda=500\\times0.68=340\\text{ m s}^{-1}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For a resonance tube, $l_1=15\text{ cm}$ and $l_2=49\text{ cm}$. Find the end correction using $e=(l_2-3l_1)/2$.`,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["resonance-tube", "end-correction", "observation-analysis"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Substitute the values.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the end correction.",
            points: 2,
          },
        ],
        hints: [
          "Use the formula exactly as given.",
          L`$3l_1=45\text{ cm}$.`,
          "Divide the remaining length by 2.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Substitutes $l_1$ and $l_2$ correctly.",
            },
            {
              part: "b",
              points: 1,
              description: "Computes numerator correctly.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $2\\text{ cm}$.",
            },
          ],
        },
        commonErrors: [
          "Using $l_2-l_1$ instead of $l_2-3l_1$.",
          "Forgetting to divide by 2.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "$e=(49-3\\times15)/2$ cm.",
          },
          {
            part: "b",
            explanation: "$e=(49-45)/2=2\\text{ cm}$.",
          },
        ],
      },
      {
        responseType: "vsaq",
        questionLatex:
          "In a sonometer experiment, why are paper riders placed on the wire?",
        difficulty: 2,
        skillTags: ["sonometer", "resonance-detection", "viva-voce"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Give the practical purpose.",
            points: 2,
          },
        ],
        hints: [
          "The rider responds strongly at resonance.",
          "It gives a visible indication.",
          "At resonance, the wire vibrates with maximum amplitude.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Mentions detecting resonance.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Explains rider falls or vibrates due to large amplitude.",
            },
          ],
        },
        commonErrors: [
          "Saying the rider changes the tuning fork frequency.",
          "Saying it is used only to increase tension.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Paper riders are used as a visible indicator of resonance. At resonance the wire vibrates with large amplitude and the rider is thrown off or vibrates strongly.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A sonometer wire resonates at length $40\text{ cm}$ under tension $T$. If the same tuning fork is used and the tension is made $4T$, find the new resonating length. State the relation used.`,
        difficulty: 4,
        calculatorAllowed: false,
        skillTags: ["sonometer", "length-tension-relation", "reasoning"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State the relation between length and tension.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the new length.",
            points: 3,
          },
        ],
        hints: [
          "The tuning fork frequency is unchanged.",
          L`For constant $f$, $l\propto\sqrt{T}$.`,
          "If tension becomes four times, length becomes two times.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States $l\\propto\\sqrt{T}$ for fixed frequency.",
            },
            {
              part: "b",
              points: 2,
              description: "Applies square-root scaling correctly.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $80\\text{ cm}$.",
            },
          ],
        },
        commonErrors: [
          "Making length four times instead of two times.",
          "Using inverse relation meant for frequency-length at constant tension.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For the same tuning fork and same wire, $f$ and $\\mu$ are constant, so $l\\propto\\sqrt{T}$.",
          },
          {
            part: "b",
            explanation:
              "$l_2/l_1=\\sqrt{4T/T}=2$, so $l_2=2\\times40=80\\text{ cm}$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A student hears beats while checking whether a tuning fork is suitable for a sonometer experiment.",
        difficulty: 3,
        skillTags: ["beats", "tuning-fork", "viva-case"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "If a 256 Hz fork produces 3 beats per second with another fork, what are the two possible frequencies?",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "How can the ambiguity be resolved experimentally?",
            points: 2,
          },
        ],
        hints: [
          "Beat frequency is the difference of frequencies.",
          "The unknown may be above or below 256 Hz.",
          "Loading the unknown fork slightly lowers its frequency.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Gives both 253 Hz and 259 Hz.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Explains using wax/loading or filing to see whether beat frequency increases or decreases.",
            },
          ],
        },
        commonErrors: [
          "Giving only one possible frequency.",
          "Confusing beat frequency with sound speed.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The unknown frequency may be $256-3=253\\text{ Hz}$ or $256+3=259\\text{ Hz}$.",
          },
          {
            part: "b",
            explanation:
              "Load the unknown fork slightly with wax to reduce its frequency. If beats decrease, it was above 256 Hz; if beats increase, it was below 256 Hz.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "Lab.5",
    title: "Record, Activity, Project and Viva Protocol",
    subtopic:
      "Official practical record requirements, graph scales, best-fit lines, precautions, project reasoning, viva communication",
    mc: [
      {
        questionLatex:
          "According to the CBSE Class XI practical record requirement, the record should include at least",
        difficulty: 1,
        calculatorAllowed: false,
        skillTags: ["official-practical-scheme", "record-requirement"],
        choices: [
          "8 experiments with 4 from each section",
          "2 experiments with both from Section A only",
          "10 activities with no experiment record",
          "only the investigatory project",
        ],
        correctLetter: "A",
        rationales: {
          B: "The official record requires at least 8 experiments, with 4 from each section.",
          C: "Activities are required, but they do not replace the experiment record.",
          D: "The project is included, but it is not the whole practical record.",
        },
        hints: [
          "This is an official practical-record rule.",
          "The requirement is split equally between Section A and Section B.",
          "Remember 8 experiments: 4 + 4.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The CBSE Class XI record includes at least 8 experiments with 4 from each section.",
          },
        ],
      },
      {
        questionLatex:
          "According to the CBSE Class XI practical record requirement, the activities record should include at least",
        difficulty: 1,
        calculatorAllowed: false,
        skillTags: ["official-practical-scheme", "activities-record"],
        choices: [
          "1 activity from any one section only",
          "6 activities with 3 from each section",
          "all activities from Section A and none from Section B",
          "no activity if the project is submitted",
        ],
        correctLetter: "B",
        rationales: {
          A: "One activity may be assessed, but the record requirement is at least 6 activities.",
          C: "The requirement is balanced: 3 from each section.",
          D: "The project does not remove the activities-record requirement.",
        },
        hints: [
          "The activity requirement is also split section-wise.",
          "It is 3 + 3.",
          "The total is 6 activities.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The record should include at least 6 activities with 3 each from Section A and Section B.",
          },
        ],
      },
      {
        questionLatex:
          "When plotting experimental data in a practical record, the most acceptable graph is one that",
        figure: bestFitGraphFigure,
        difficulty: 3,
        calculatorAllowed: false,
        skillTags: ["graph-skills", "best-fit-line", "practical-record"],
        choices: [
          "joins every point by sharp zig-zag line",
          "chooses a scale that hides scatter completely",
          "uses a suitable scale, plots points neatly, and draws a best-fit line when needed",
          "places all readings at the origin",
        ],
        correctLetter: "C",
        rationales: {
          A: "Experimental scatter should be represented by a best-fit trend, not a forced zig-zag through every point.",
          B: "A graph should use a fair scale and show the observed trend clearly.",
          D: "Data points must be plotted at their measured coordinates.",
        },
        hints: [
          "A graph is not just decoration; it helps read the trend or slope.",
          "Do not force a line through every point.",
          "A suitable scale and best-fit line are standard practical-graph habits.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A good practical graph uses a clear scale, plots measured points carefully, labels axes with units, and uses a best-fit line for the trend when appropriate.",
          },
        ],
      },
      {
        questionLatex:
          "In a viva voce, if an examiner asks why repeated observations are taken, the best answer is",
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["viva-voce", "repeated-readings", "experimental-error"],
        choices: [
          "to make the notebook longer",
          "to change the least count of the instrument",
          "to remove all systematic error automatically",
          "to reduce random error by taking a mean and to identify inconsistent readings",
        ],
        correctLetter: "D",
        rationales: {
          A: "Repeated readings are for reliability, not notebook length.",
          B: "Least count is a property of the instrument, not changed by repetition.",
          C: "Repeating readings helps random error; it does not automatically remove systematic error.",
        },
        hints: [
          "Think of scatter in observations.",
          "Mean value reduces random error.",
          "Systematic error needs correction, not just repetition.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Repeated readings reduce the effect of random errors, allow a mean value, and help detect anomalous observations.",
          },
        ],
      },
      {
        questionLatex:
          "A good investigatory project viva answer should mainly defend",
        difficulty: 2,
        calculatorAllowed: false,
        skillTags: ["investigatory-project", "viva-voce", "methodology"],
        choices: [
          "aim, variables, method, observations, limitations, and conclusion",
          "only the title page decoration",
          "only copied theory from the textbook",
          "only the number of pages submitted",
        ],
        correctLetter: "A",
        rationales: {
          B: "Presentation matters, but viva focuses on understanding and method.",
          C: "Copied theory without method and observations is not a defensible project.",
          D: "Page count is not evidence of investigation quality.",
        },
        hints: [
          "A project is judged by investigation, not decoration.",
          "Know what you changed, what you measured, and what limits your conclusion.",
          "Be ready to explain your variables and observations.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A strong project viva defends the aim, controlled and measured variables, method, observations, limitations, and conclusion.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "State the Class XI practical evaluation components and marks for viva voce.",
        difficulty: 1,
        skillTags: ["official-practical-scheme", "viva-marks"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Name the viva component and state how many marks it carries.",
            points: 2,
          },
        ],
        hints: [
          "The practical exam is out of 30 marks.",
          "Viva is based on experiments, activities, and project.",
          "The viva component carries 5 marks.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Mentions viva on experiments, activities, and project.",
            },
            {
              part: "a",
              points: 1,
              description: "States 5 marks.",
            },
          ],
        },
        commonErrors: [
          "Confusing viva marks with the two-experiment marks.",
          "Saying viva is unrelated to the project.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The viva is on experiments, activities, and the investigatory project, and it carries 5 marks in the 30-mark practical evaluation.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A student plots a graph but all points occupy a tiny corner of the graph sheet. What is wrong with the graph, and how should it be corrected?",
        difficulty: 2,
        skillTags: ["graph-skills", "scale-choice", "practical-record"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Identify the graphing error.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "State the correction.",
            points: 2,
          },
        ],
        hints: [
          "The issue is not the formula.",
          "Think about scale choice and use of graph area.",
          "A good graph should use most of the available sheet without distorting the trend.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies poor scale choice.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Suggests choosing a suitable scale using most of the graph area.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Mentions clearly labelled axes and units or best-fit plotting.",
            },
          ],
        },
        commonErrors: [
          "Saying the experiment must be repeated solely because the graph scale is poor.",
          "Using unequal arbitrary scales without labelling.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The graph uses a poor scale, so the data are crowded and the slope cannot be read accurately.",
          },
          {
            part: "b",
            explanation:
              "Choose a scale that spreads the readings over most of the graph sheet, label axes with units, plot points carefully, and draw a best-fit line where appropriate.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "In a viva, an examiner asks for two precautions common to many Class XI practicals. Give two that are not experiment-specific.",
        difficulty: 2,
        skillTags: ["precautions", "viva-voce", "practical-record"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State any two general precautions.",
            points: 2,
          },
        ],
        hints: [
          "Think of reading scales and repeated observations.",
          "Avoid parallax and note zero error.",
          "Record units and take mean where appropriate.",
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States one valid general precaution.",
            },
            {
              part: "a",
              points: 1,
              description: "States a second valid general precaution.",
            },
          ],
        },
        commonErrors: [
          "Giving only a formula instead of a precaution.",
          "Giving two versions of the same precaution.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Examples: avoid parallax by keeping the eye normal to the scale; note and apply zero correction; take repeated readings and use the mean; write observations with proper units.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Design a brief viva-ready plan for an investigatory project on how the cooling rate of water depends on the exposed surface area.",
        difficulty: 4,
        skillTags: [
          "investigatory-project",
          "experimental-design",
          "cooling-rate",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State the aim and independent variable.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "State two controlled variables and the observation to be plotted.",
            points: 3,
          },
          {
            letter: "c",
            promptMarkdown: "State one limitation or source of error.",
            points: 1,
          },
        ],
        hints: [
          "Independent variable is what you deliberately change.",
          "Keep initial temperature, liquid volume, container material, and room conditions controlled as far as possible.",
          "A suitable graph is temperature versus time for different surface areas.",
        ],
        rubric: {
          maxPoints: 6,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States a clear aim.",
            },
            {
              part: "a",
              points: 1,
              description:
                "Identifies exposed surface area as independent variable.",
            },
            {
              part: "b",
              points: 2,
              description: "States two valid controlled variables.",
            },
            {
              part: "b",
              points: 1,
              description: "Specifies temperature-time observations/graph.",
            },
            {
              part: "c",
              points: 1,
              description: "States a valid limitation or source of error.",
            },
          ],
        },
        commonErrors: [
          "Changing surface area and volume together without controlling volume.",
          "Reporting only a conclusion with no measured graph.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Aim: to study how the cooling rate of water depends on exposed surface area. Independent variable: exposed surface area of the water.",
          },
          {
            part: "b",
            explanation:
              "Keep the volume of water, initial temperature, container material, room conditions, and thermometer type as constant as possible. Record temperature at equal time intervals and plot temperature versus time for different surface areas.",
          },
          {
            part: "c",
            explanation:
              "A limitation is that room air currents and evaporative cooling may not remain exactly the same in all trials.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "During a practical viva, an examiner gives a student a graph with scattered data points and asks how to report the slope from the graph.",
        figure: bestFitGraphFigure,
        difficulty: 4,
        skillTags: ["best-fit-line", "graph-analysis", "viva-case"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Should the student force the line through every point? Explain.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Why should two nearby raw points not be used for the final slope?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "How should the final slope be chosen from scattered data?",
            points: 2,
          },
        ],
        hints: [
          "Experimental data can scatter due to random errors.",
          "A nearby pair can make the slope very sensitive to one small plotting error.",
          "A best-fit line balances the scatter rather than chasing each point.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Rejects forcing the line through every point and explains scatter.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Explains that nearby raw points amplify plotting or reading error.",
            },
            {
              part: "c",
              points: 2,
              description:
                "Explains best-fit line and slope from well-separated points on that line.",
            },
          ],
        },
        commonErrors: [
          "Treating every point as exact.",
          "Finding slope from two nearby raw points instead of the best-fit line.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "No. A line forced through every point usually overfits random experimental scatter. The line should represent the overall trend.",
          },
          {
            part: "b",
            explanation:
              "Two nearby raw points give a short baseline, so a small plotting or reading error can change the slope noticeably.",
          },
          {
            part: "c",
            explanation:
              "Draw a best-fit line that balances the plotted points, then calculate the slope using two well-separated points on that best-fit line.",
          },
        ],
      },
    ],
  },
];

export const practicalsActivitiesTopics: Topic[] = topics.map(makeTopic);
