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
const UNIT = "u10-oscillations-waves";
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
  return `You chose ${choiceText}. Recheck whether the question is using period, frequency, phase, SHM energy, wave speed, standing-wave mode, or beat frequency.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class11_physics_oscillations_waves_reasoning"),
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
    contentId: `${COURSE}.u10.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "confuses_period_frequency_phase_amplitude_or_wave_speed_relation",
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
    contentId: `${COURSE}.u10.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "uses_formula_without_checking_which_quantity_is_fixed_or_which_mode_is_shown",
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

const shmTimeGraphFigure: ItemFigure = {
  type: "svg",
  title: "Displacement-time graph of simple harmonic motion",
  description:
    "A sinusoidal displacement-time graph with marked displacement scale 4 cm and time marks 0, 0.5, 1.0, 1.5 and 2.0 seconds.",
  svg: `<svg viewBox="0 0 700 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="420" fill="#ffffff"/>
  <defs>
    <marker id="arrow-shm-u10" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <line x1="80" y1="210" x2="620" y2="210" stroke="#334155" stroke-width="2" marker-end="url(#arrow-shm-u10)"/>
  <line x1="80" y1="340" x2="80" y2="70" stroke="#334155" stroke-width="2" marker-end="url(#arrow-shm-u10)"/>
  <text x="630" y="216" font-size="17" fill="#0f172a">t (s)</text>
  <text x="26" y="122" font-size="17" fill="#0f172a">x (cm)</text>
  <line x1="80" y1="90" x2="610" y2="90" stroke="#dbe3ef" stroke-width="1"/>
  <line x1="80" y1="330" x2="610" y2="330" stroke="#dbe3ef" stroke-width="1"/>
  <text x="62" y="95" font-size="15" text-anchor="end" fill="#0f172a">4</text>
  <text x="62" y="335" font-size="15" text-anchor="end" fill="#0f172a">-4</text>
  <polyline points="80.0,210.0 86.8,191.2 93.5,172.9 100.3,155.5 107.0,139.5 113.8,125.1 120.5,112.9 127.3,103.1 134.0,95.9 140.8,91.5 147.5,90.0 154.3,91.5 161.0,95.9 167.8,103.1 174.5,112.9 181.3,125.1 188.0,139.5 194.8,155.5 201.5,172.9 208.3,191.2 215.0,210.0 221.8,228.8 228.5,247.1 235.3,264.5 242.0,280.5 248.8,294.9 255.5,307.1 262.3,316.9 269.0,324.1 275.8,328.5 282.5,330.0 289.3,328.5 296.0,324.1 302.8,316.9 309.5,307.1 316.3,294.9 323.0,280.5 329.8,264.5 336.5,247.1 343.3,228.8 350.0,210.0 356.8,191.2 363.5,172.9 370.3,155.5 377.0,139.5 383.8,125.1 390.5,112.9 397.3,103.1 404.0,95.9 410.8,91.5 417.5,90.0 424.3,91.5 431.0,95.9 437.8,103.1 444.5,112.9 451.3,125.1 458.0,139.5 464.8,155.5 471.5,172.9 478.3,191.2 485.0,210.0 491.8,228.8 498.5,247.1 505.3,264.5 512.0,280.5 518.8,294.9 525.5,307.1 532.3,316.9 539.0,324.1 545.8,328.5 552.5,330.0 559.3,328.5 566.0,324.1 572.8,316.9 579.5,307.1 586.3,294.9 593.0,280.5 599.8,264.5 606.5,247.1 613.3,228.8 620.0,210.0" fill="none" stroke="#2563eb" stroke-width="4"/>
  <line x1="80" y1="205" x2="80" y2="215" stroke="#334155" stroke-width="2"/>
  <line x1="215" y1="205" x2="215" y2="215" stroke="#334155" stroke-width="2"/>
  <line x1="350" y1="205" x2="350" y2="215" stroke="#334155" stroke-width="2"/>
  <line x1="485" y1="205" x2="485" y2="215" stroke="#334155" stroke-width="2"/>
  <line x1="620" y1="205" x2="620" y2="215" stroke="#334155" stroke-width="2"/>
  <text x="80" y="235" font-size="14" text-anchor="middle" fill="#0f172a">0</text>
  <text x="215" y="235" font-size="14" text-anchor="middle" fill="#0f172a">0.5</text>
  <text x="350" y="235" font-size="14" text-anchor="middle" fill="#0f172a">1.0</text>
  <text x="485" y="235" font-size="14" text-anchor="middle" fill="#0f172a">1.5</text>
  <text x="620" y="235" font-size="14" text-anchor="middle" fill="#0f172a">2.0</text>
</svg>`,
};

const springEnergyFigure: ItemFigure = {
  type: "svg",
  title: "Energy exchange in a spring oscillator",
  description:
    "A spring-block oscillator shown at the extreme left position, mean position and extreme right position.",
  svg: `<svg viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="360" fill="#ffffff"/>
  <line x1="90" y1="245" x2="630" y2="245" stroke="#64748b" stroke-width="3"/>
  <line x1="360" y1="200" x2="360" y2="280" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 6"/>
  <text x="360" y="300" font-size="16" text-anchor="middle" fill="#0f172a">mean position</text>
  <rect x="145" y="190" width="70" height="50" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <rect x="325" y="190" width="70" height="50" rx="6" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
  <rect x="505" y="190" width="70" height="50" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <path d="M80 215 h15 l10 -20 l20 40 l20 -40 l20 40 l20 -40 l20 40 h20" fill="none" stroke="#334155" stroke-width="3"/>
  <path d="M260 215 h20 l12 -17 l24 34 l24 -34 l24 34 l24 -34 l24 34 h20" fill="none" stroke="#334155" stroke-width="3"/>
  <path d="M440 215 h28 l15 -20 l30 40 l30 -40 l30 40 h28" fill="none" stroke="#334155" stroke-width="3"/>
  <text x="180" y="150" font-size="17" text-anchor="middle" fill="#0f172a">x = -A</text>
  <text x="360" y="150" font-size="17" text-anchor="middle" fill="#0f172a">x = 0</text>
  <text x="540" y="150" font-size="17" text-anchor="middle" fill="#0f172a">x = +A</text>
</svg>`,
};

const progressiveWaveFigure: ItemFigure = {
  type: "svg",
  title: "Snapshot of a transverse progressive wave",
  description:
    "A transverse sine wave snapshot with two marked points P and Q separated by one-quarter wavelength.",
  svg: `<svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="400" fill="#ffffff"/>
  <defs>
    <marker id="arrow-wave-u10" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <line x1="70" y1="200" x2="640" y2="200" stroke="#334155" stroke-width="2" marker-end="url(#arrow-wave-u10)"/>
  <line x1="70" y1="320" x2="70" y2="80" stroke="#334155" stroke-width="2" marker-end="url(#arrow-wave-u10)"/>
  <text x="648" y="206" font-size="17" fill="#0f172a">x</text>
  <text x="38" y="100" font-size="17" fill="#0f172a">y</text>
  <polyline points="70.0,200.0 75.0,189.5 80.0,179.2 85.0,169.1 90.0,159.3 95.0,150.0 100.0,141.2 105.0,133.1 110.0,125.7 115.0,119.1 120.0,113.4 125.0,108.6 130.0,104.9 135.0,102.2 140.0,100.5 145.0,100.0 150.0,100.5 155.0,102.2 160.0,104.9 165.0,108.6 170.0,113.4 175.0,119.1 180.0,125.7 185.0,133.1 190.0,141.2 195.0,150.0 200.0,159.3 205.0,169.1 210.0,179.2 215.0,189.5 220.0,200.0 225.0,210.5 230.0,220.8 235.0,230.9 240.0,240.7 245.0,250.0 250.0,258.8 255.0,266.9 260.0,274.3 265.0,280.9 270.0,286.6 275.0,291.4 280.0,295.1 285.0,297.8 290.0,299.5 295.0,300.0 300.0,299.5 305.0,297.8 310.0,295.1 315.0,291.4 320.0,286.6 325.0,280.9 330.0,274.3 335.0,266.9 340.0,258.8 345.0,250.0 350.0,240.7 355.0,230.9 360.0,220.8 365.0,210.5 370.0,200.0 375.0,189.5 380.0,179.2 385.0,169.1 390.0,159.3 395.0,150.0 400.0,141.2 405.0,133.1 410.0,125.7 415.0,119.1 420.0,113.4 425.0,108.6 430.0,104.9 435.0,102.2 440.0,100.5 445.0,100.0 450.0,100.5 455.0,102.2 460.0,104.9 465.0,108.6 470.0,113.4 475.0,119.1 480.0,125.7 485.0,133.1 490.0,141.2 495.0,150.0 500.0,159.3 505.0,169.1 510.0,179.2 515.0,189.5 520.0,200.0 525.0,210.5 530.0,220.8 535.0,230.9 540.0,240.7 545.0,250.0 550.0,258.8 555.0,266.9 560.0,274.3 565.0,280.9 570.0,286.6 575.0,291.4 580.0,295.1 585.0,297.8 590.0,299.5 595.0,300.0 600.0,299.5 605.0,297.8 610.0,295.1 615.0,291.4 620.0,286.6 625.0,280.9 630.0,274.3 635.0,266.9 640.0,258.8 645.0,250.0 650.0,240.7 655.0,230.9 660.0,220.8 665.0,210.5 670.0,200.0" fill="none" stroke="#2563eb" stroke-width="4"/>
  <circle cx="70" cy="200" r="6" fill="#ef4444"/>
  <circle cx="145" cy="100" r="6" fill="#ef4444"/>
  <text x="58" y="230" font-size="16" fill="#0f172a">P</text>
  <text x="154" y="94" font-size="16" fill="#0f172a">Q</text>
  <line x1="70" y1="340" x2="145" y2="340" stroke="#f97316" stroke-width="3"/>
  <line x1="70" y1="332" x2="70" y2="348" stroke="#f97316" stroke-width="3"/>
  <line x1="145" y1="332" x2="145" y2="348" stroke="#f97316" stroke-width="3"/>
  <text x="107" y="364" font-size="16" text-anchor="middle" fill="#c2410c">&#955;/4</text>
</svg>`,
};

const standingStringFigure: ItemFigure = {
  type: "svg",
  title: "Standing waves on a string fixed at both ends",
  description:
    "The first three standing-wave patterns for a string fixed at both ends.",
  svg: `<svg viewBox="0 0 720 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="420" fill="#ffffff"/>
  <line x1="110" y1="110" x2="610" y2="110" stroke="#334155" stroke-width="3"/>
  <line x1="110" y1="220" x2="610" y2="220" stroke="#334155" stroke-width="3"/>
  <line x1="110" y1="330" x2="610" y2="330" stroke="#334155" stroke-width="3"/>
  <path d="M110 110 C235 30 485 30 610 110" fill="none" stroke="#2563eb" stroke-width="4"/>
  <path d="M110 220 C172 150 298 150 360 220 C422 290 548 290 610 220" fill="none" stroke="#16a34a" stroke-width="4"/>
  <path d="M110 330 C151 270 235 270 276 330 C317 390 403 390 444 330 C485 270 569 270 610 330" fill="none" stroke="#f97316" stroke-width="4"/>
  <circle cx="110" cy="110" r="5" fill="#0f172a"/>
  <circle cx="610" cy="110" r="5" fill="#0f172a"/>
  <circle cx="110" cy="220" r="5" fill="#0f172a"/>
  <circle cx="360" cy="220" r="5" fill="#0f172a"/>
  <circle cx="610" cy="220" r="5" fill="#0f172a"/>
  <circle cx="110" cy="330" r="5" fill="#0f172a"/>
  <circle cx="276" cy="330" r="5" fill="#0f172a"/>
  <circle cx="444" cy="330" r="5" fill="#0f172a"/>
  <circle cx="610" cy="330" r="5" fill="#0f172a"/>
  <text x="70" y="116" font-size="17" fill="#0f172a">I</text>
  <text x="70" y="226" font-size="17" fill="#0f172a">II</text>
  <text x="70" y="336" font-size="17" fill="#0f172a">III</text>
  <text x="350" y="386" font-size="16" text-anchor="middle" fill="#0f172a">same string length L</text>
</svg>`,
};

const organPipeFigure: ItemFigure = {
  type: "svg",
  title: "First mode in open and closed organ pipes",
  description:
    "An open pipe and a pipe closed at one end showing the first standing-wave pattern qualitatively.",
  svg: `<svg viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="360" fill="#ffffff"/>
  <rect x="95" y="95" width="235" height="70" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
  <rect x="390" y="95" width="235" height="70" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
  <rect x="390" y="95" width="18" height="70" fill="#334155"/>
  <line x1="105" y1="130" x2="320" y2="130" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 6"/>
  <line x1="408" y1="130" x2="615" y2="130" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 6"/>
  <path d="M105 90 C150 90 175 130 212.5 130 C250 130 275 170 320 170" fill="none" stroke="#2563eb" stroke-width="4"/>
  <path d="M408 130 C455 130 555 90 615 90" fill="none" stroke="#f97316" stroke-width="4"/>
  <text x="212" y="72" font-size="18" text-anchor="middle" fill="#0f172a">open pipe</text>
  <text x="507" y="72" font-size="18" text-anchor="middle" fill="#0f172a">closed pipe</text>
</svg>`,
};

const beatGraphFigure: ItemFigure = {
  type: "svg",
  title: "Beat pattern from two nearby frequencies",
  description:
    "An amplitude-time sketch showing a periodic rise and fall of loudness.",
  svg: `<svg viewBox="0 0 700 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="360" fill="#ffffff"/>
  <defs>
    <marker id="arrow-beat-u10" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <line x1="70" y1="180" x2="640" y2="180" stroke="#334155" stroke-width="2" marker-end="url(#arrow-beat-u10)"/>
  <line x1="70" y1="300" x2="70" y2="60" stroke="#334155" stroke-width="2" marker-end="url(#arrow-beat-u10)"/>
  <text x="648" y="186" font-size="17" fill="#0f172a">time</text>
  <text x="28" y="82" font-size="17" fill="#0f172a">sound</text>
  <path d="M70 180 C88 80 118 80 136 180 C154 280 184 280 202 180 C220 95 250 95 268 180 C286 265 316 265 334 180 C352 80 382 80 400 180 C418 280 448 280 466 180 C484 95 514 95 532 180 C550 265 580 265 598 180" fill="none" stroke="#2563eb" stroke-width="3"/>
  <path d="M70 180 C160 55 250 55 340 180 C430 305 520 305 610 180" fill="none" stroke="#f97316" stroke-width="3" stroke-dasharray="8 6"/>
  <text x="210" y="50" font-size="16" fill="#c2410c">loud</text>
  <text x="342" y="314" font-size="16" text-anchor="middle" fill="#c2410c">soft</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "10.1",
    title: "Periodic Motion, SHM and Phase",
    subtopic:
      "Time period, frequency, displacement as a function of time, periodic functions, SHM as projection of uniform circular motion, and phase.",
    mc: [
      {
        questionLatex: L`A tuning fork completes $120$ oscillations in $0.50\text{ min}$. Its frequency is`,
        difficulty: 1,
        calculatorAllowed: true,
        skillTags: ["periodic_motion", "frequency"],
        choices: [
          L`$4\text{ Hz}$`,
          L`$60\text{ Hz}$`,
          L`$240\text{ Hz}$`,
          L`$0.25\text{ Hz}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This treats half a minute as half a second.",
          C: "This divides by $0.50$ but ignores that the time is in minutes.",
          D: "This is the time period in seconds, not the frequency.",
        },
        hints: [
          L`Convert $0.50\text{ min}$ to seconds.`,
          L`Frequency is oscillations per second.`,
          L`Use $f=N/t$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The time is $30\\text{ s}$, so",
            math: L`f=\frac{120}{30}=4\text{ Hz}`,
          },
        ],
      },
      {
        questionLatex: L`For the displacement-time graph shown, the amplitude and time period are respectively`,
        difficulty: 2,
        figure: shmTimeGraphFigure,
        skillTags: ["shm_graph", "amplitude", "period"],
        choices: [
          L`$8\text{ cm},\ 1.0\text{ s}$`,
          L`$4\text{ cm},\ 1.0\text{ s}$`,
          L`$4\text{ cm},\ 2.0\text{ s}$`,
          L`$8\text{ cm},\ 2.0\text{ s}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "Eight centimetres is peak-to-peak displacement, not amplitude.",
          C: "The same motion repeats from one crest to the next after $1.0\\text{ s}$.",
          D: "This uses peak-to-peak displacement and two cycles as the period.",
        },
        hints: [
          L`Amplitude is maximum displacement from the mean position.`,
          L`Period is the time between identical states such as crest to crest.`,
          L`Read the crest spacing on the time axis.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The graph reaches $+4\\text{ cm}$ and $-4\\text{ cm}$, so amplitude is $4\\text{ cm}$. Consecutive crests are $1.0\\text{ s}$ apart.",
          },
        ],
      },
      {
        questionLatex: L`A particle executes SHM according to $x=0.05\cos(20\pi t+\pi/6)$ in SI units. Its time period is`,
        difficulty: 2,
        skillTags: ["shm_equation", "angular_frequency", "period"],
        choices: [
          L`$20\text{ s}$`,
          L`$10\text{ s}$`,
          L`$0.10\text{ s}$`,
          L`$0.05\text{ s}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This mistakes angular frequency for period.",
          B: "This uses $2\\pi/(0.2\\pi)$ instead of $2\\pi/(20\\pi)$.",
          D: "This misses the factor $2\\pi$ in $T=2\\pi/\\omega$.",
        },
        hints: [
          L`Compare with $x=A\cos(\omega t+\phi)$.`,
          L`Here $\omega=20\pi\text{ rad s}^{-1}$.`,
          L`Use $T=2\pi/\omega$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: L`From the equation, $\omega=20\pi$.`,
            math: L`T=\frac{2\pi}{20\pi}=0.10\text{ s}`,
          },
        ],
      },
      {
        questionLatex: L`The projection of uniform circular motion of radius $A$ on a diameter is simple harmonic because the projected acceleration is`,
        difficulty: 3,
        skillTags: ["ucm_projection", "shm_condition"],
        choices: [
          L`constant in magnitude and direction`,
          L`directly proportional to velocity`,
          L`zero at all positions`,
          L`directly proportional to displacement and opposite in direction`,
        ],
        correctLetter: "D",
        rationales: {
          A: "In SHM the acceleration changes with displacement.",
          B: "SHM acceleration is related to displacement, not directly to velocity.",
          C: "Acceleration is zero only at the mean position.",
        },
        hints: [
          L`The defining condition of SHM is $a\propto -x$.`,
          L`For circular motion, centripetal acceleration is toward the centre.`,
          L`The projection gives $a_x=-\omega^2x$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The projection obeys",
            math: L`a_x=-\omega^2x`,
          },
        ],
      },
      {
        questionLatex: L`Two particles execute SHM with $x_1=A\sin\omega t$ and $x_2=A\cos\omega t$. Their phase difference is`,
        difficulty: 3,
        skillTags: ["phase_difference", "shm_equation"],
        choices: [L`$\pi/2$`, L`$\pi$`, L`$2\pi$`, L`$0$`],
        correctLetter: "A",
        rationales: {
          B: "A phase difference of $\\pi$ would make the displacements opposite at every instant.",
          C: "$2\\pi$ means the motions are in phase.",
          D: "Sine and cosine do not have the same phase.",
        },
        hints: [
          L`Use $\cos\omega t=\sin(\omega t+\pi/2)$.`,
          L`Compare both equations in sine form.`,
          L`The phase shift is one quarter of a cycle.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Since",
            math: L`\cos\omega t=\sin(\omega t+\pi/2)`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write the relation between frequency $f$ and time period $T$ of a periodic motion.`,
        difficulty: 1,
        skillTags: ["periodic_motion", "frequency_period_relation"],
        parts: [
          { letter: "a", promptMarkdown: "Write the relation.", points: 1 },
        ],
        hints: [
          L`Frequency counts cycles per second.`,
          L`Period is time for one cycle.`,
          L`They are reciprocals.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            { part: "a", points: 1, description: "Writes $f=1/T$ or $T=1/f$." },
          ],
        },
        commonErrors: [L`Multiplying $f$ and $T$ as if both grow together.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`The relation is $f=\frac{1}{T}$ or $T=\frac{1}{f}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Use the displacement-time graph shown for an oscillator.`,
        difficulty: 2,
        figure: shmTimeGraphFigure,
        skillTags: ["shm_graph", "frequency"],
        parts: [
          { letter: "a", promptMarkdown: "Find the amplitude.", points: 1 },
          { letter: "b", promptMarkdown: "Find the frequency.", points: 1 },
        ],
        hints: [
          L`Amplitude is maximum displacement from the mean position.`,
          L`Find the time period from crest-to-crest spacing.`,
          L`Use $f=1/T$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds amplitude $4\\text{ cm}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds frequency $1\\text{ Hz}$.",
            },
          ],
        },
        commonErrors: [
          L`Using peak-to-peak displacement as amplitude.`,
          L`Using two seconds as one period because two cycles are drawn.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The maximum displacement is $4\text{ cm}$, so amplitude is $4\text{ cm}$.`,
          },
          {
            part: "b",
            explanation: L`The period is $1.0\text{ s}$, so $f=1/T=1\text{ Hz}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A particle executes SHM: $x=0.06\sin(10\pi t)$ in SI units.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["shm_equation", "maximum_speed"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the amplitude and time period.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find the maximum speed.", points: 1 },
        ],
        hints: [
          L`Compare with $x=A\sin\omega t$.`,
          L`Use $T=2\pi/\omega$.`,
          L`For SHM, $v_{\max}=\omega A$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $A=0.06\\text{ m}$ and $T=0.20\\text{ s}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $v_{\\max}=0.6\\pi\\text{ m s}^{-1}$.",
            },
          ],
        },
        commonErrors: [
          L`Taking $10\pi$ as frequency instead of angular frequency.`,
          L`Using $A/\omega$ for maximum speed.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Here $A=0.06\text{ m}$ and $\omega=10\pi\text{ rad s}^{-1}$, so $T=2\pi/(10\pi)=0.20\text{ s}$.`,
          },
          {
            part: "b",
            explanation: L`$v_{\max}=\omega A=(10\pi)(0.06)=0.6\pi\text{ m s}^{-1}$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A point moves uniformly on a circle of radius $A$ with angular speed $\omega$. Show that its projection on a diameter executes SHM.`,
        difficulty: 4,
        skillTags: ["ucm_projection", "shm_derivation"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write the projected displacement as a function of time.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Differentiate twice to find the projected acceleration.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State the condition that proves SHM.",
            points: 1,
          },
        ],
        hints: [
          L`Take $x=A\cos\omega t$.`,
          L`Differentiate twice with respect to time.`,
          L`SHM requires $a=-\omega^2x$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Writes $x=A\\cos\\omega t$ or equivalent.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds $a=-\\omega^2A\\cos\\omega t$.",
            },
            {
              part: "c",
              points: 1,
              description: "Recognizes $a=-\\omega^2x$ as SHM condition.",
            },
          ],
        },
        commonErrors: [
          L`Claiming circular motion itself is SHM.`,
          L`Missing the negative sign in acceleration.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The projection on a diameter may be written as $x=A\cos\omega t$.`,
          },
          {
            part: "b",
            explanation: L`Differentiating twice, $a=\frac{d^2x}{dt^2}=-\omega^2A\cos\omega t$.`,
          },
          {
            part: "c",
            explanation: L`Since $x=A\cos\omega t$, $a=-\omega^2x$, so acceleration is proportional to displacement and opposite in direction. Hence the projection is SHM.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A sensor records the displacement of a small oscillator as $x=5\cos(\pi t)$ cm, where $t$ is in seconds.`,
        difficulty: 4,
        skillTags: ["shm_equation", "phase", "periodic_motion"],
        parts: [
          { letter: "a", promptMarkdown: "Find the amplitude.", points: 1 },
          { letter: "b", promptMarkdown: "Find the time period.", points: 1 },
          {
            letter: "c",
            promptMarkdown: "Find the displacement at $t=0.5\\text{ s}$.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "State whether the oscillator is at an extreme or at the mean position at $t=1.0\\text{ s}$.",
            points: 1,
          },
        ],
        hints: [
          L`Compare with $x=A\cos\omega t$.`,
          L`Use $T=2\pi/\omega$.`,
          L`Substitute the given times into the displacement equation.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds amplitude $5\\text{ cm}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds period $2\\text{ s}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds $x=0$ at $0.5\\text{ s}$.",
            },
            {
              part: "d",
              points: 1,
              description:
                "States the oscillator is at the negative extreme at $1.0\\text{ s}$.",
            },
          ],
        },
        commonErrors: [
          L`Using $\pi$ as the frequency instead of angular frequency.`,
          L`Confusing mean position with zero velocity at an extreme.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`The amplitude is $5\text{ cm}$.` },
          {
            part: "b",
            explanation: L`Here $\omega=\pi$, so $T=2\pi/\pi=2\text{ s}$.`,
          },
          {
            part: "c",
            explanation: L`At $t=0.5\text{ s}$, $x=5\cos(\pi/2)=0$.`,
          },
          {
            part: "d",
            explanation: L`At $t=1.0\text{ s}$, $x=5\cos\pi=-5\text{ cm}$, so it is at the negative extreme.`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "10.2",
    title: "Spring Oscillations, Pendulum and SHM Energy",
    subtopic:
      "Loaded spring, restoring force and force constant, energy exchange in SHM, and simple pendulum time period.",
    mc: [
      {
        questionLatex: L`For a mass-spring oscillator, if the mass is made four times while the spring constant is unchanged, the time period becomes`,
        difficulty: 2,
        skillTags: ["spring_oscillator", "period_ratio"],
        choices: [
          L`four times the initial value`,
          L`twice the initial value`,
          L`one-half of the initial value`,
          L`unchanged`,
        ],
        correctLetter: "B",
        rationales: {
          A: "The time period depends on the square root of mass, not directly on mass.",
          C: "Increasing mass makes the oscillator slower, not faster.",
          D: "The period depends on mass for a spring oscillator.",
        },
        hints: [
          L`Use $T=2\pi\sqrt{m/k}$.`,
          L`Only $m$ changes.`,
          L`$\sqrt4=2$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For a spring oscillator,",
            math: L`T\propto\sqrt m\Rightarrow T_2/T_1=\sqrt4=2`,
          },
        ],
      },
      {
        questionLatex: L`A $0.50\text{ kg}$ load stretches a vertical spring by $2.0\text{ cm}$. Taking $g=10\text{ m s}^{-2}$, the spring constant is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["spring_constant", "loaded_spring"],
        choices: [
          L`$25\text{ N m}^{-1}$`,
          L`$0.10\text{ N m}^{-1}$`,
          L`$250\text{ N m}^{-1}$`,
          L`$1000\text{ N m}^{-1}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This uses $0.20\\text{ m}$ instead of $0.020\\text{ m}$.",
          B: "This divides extension by force instead of force by extension.",
          D: "This uses an extension of $0.005\\text{ m}$.",
        },
        hints: [
          L`At equilibrium, $kx=mg$.`,
          L`Convert $2.0\text{ cm}$ to metre.`,
          L`Use $k=mg/x$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The spring force balances weight.",
            math: L`k=\frac{mg}{x}=\frac{0.50(10)}{0.020}=250\text{ N m}^{-1}`,
          },
        ],
      },
      {
        questionLatex: L`For the spring oscillator in the figure, where is the kinetic energy maximum?`,
        difficulty: 2,
        figure: springEnergyFigure,
        skillTags: ["shm_energy", "mean_position"],
        choices: [
          L`only at $x=+A$`,
          L`only at $x=-A$`,
          L`equally maximum at all positions`,
          L`at the mean position`,
        ],
        correctLetter: "D",
        rationales: {
          A: "At an extreme position the speed is zero, so kinetic energy is zero.",
          B: "At the other extreme also the speed is zero.",
          C: "Kinetic energy changes during SHM.",
        },
        hints: [
          L`Speed is maximum at the mean position.`,
          L`Kinetic energy depends on speed squared.`,
          L`At the extremes, the oscillator momentarily stops.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In SHM, speed and therefore kinetic energy are maximum at the mean position.",
          },
        ],
      },
      {
        questionLatex: L`The length of a simple pendulum is increased from $L$ to $4L$. For small oscillations, its time period becomes`,
        difficulty: 2,
        skillTags: ["simple_pendulum", "period_ratio"],
        choices: [L`$2T$`, L`$4T$`, L`$T/2$`, L`$T$`],
        correctLetter: "A",
        rationales: {
          B: "The period depends on square root of length, not directly on length.",
          C: "A longer pendulum has a larger period.",
          D: "Pendulum period depends on length.",
        },
        hints: [
          L`For small oscillations, $T=2\pi\sqrt{L/g}$.`,
          L`Only length changes.`,
          L`$\sqrt{4L/L}=2$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For a simple pendulum,",
            math: L`T\propto\sqrt L\Rightarrow T_2=2T`,
          },
        ],
      },
      {
        questionLatex: L`For a given spring oscillator, the amplitude is doubled. The total mechanical energy becomes`,
        difficulty: 3,
        skillTags: ["shm_energy", "amplitude_ratio"],
        choices: [L`twice`, L`four times`, L`one-half`, L`unchanged`],
        correctLetter: "B",
        rationales: {
          A: "Energy depends on square of amplitude.",
          C: "Increasing amplitude increases energy.",
          D: "Energy changes when amplitude changes for the same spring.",
        },
        hints: [
          L`For a spring oscillator, $E=\frac12kA^2$.`,
          L`Only $A$ changes.`,
          L`Doubling $A$ gives a factor $2^2$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The total energy is",
            math: L`E=\frac12kA^2\Rightarrow E_2/E_1=2^2=4`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write the restoring force law for a spring obeying Hooke's law.`,
        difficulty: 1,
        skillTags: ["restoring_force", "spring_constant"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write the force law and state the meaning of the negative sign.",
            points: 1,
          },
        ],
        hints: [
          L`The force is proportional to displacement.`,
          L`It acts opposite to displacement.`,
          L`Use spring constant $k$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Writes $F=-kx$ and explains the force is restoring.",
            },
          ],
        },
        commonErrors: [L`Writing $F=kx$ without direction information.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`The restoring force is $F=-kx$. The negative sign shows that the force is opposite to displacement from equilibrium.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A $0.25\text{ kg}$ mass attached to a spring performs SHM with spring constant $100\text{ N m}^{-1}$. Use $\pi^2\approx10$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["spring_oscillator", "period"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the angular frequency.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find the time period.", points: 1 },
        ],
        hints: [
          L`For a spring oscillator, $\omega=\sqrt{k/m}$.`,
          L`Use $T=2\pi/\omega$.`,
          L`Here $k/m=400$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $\\omega=20\\text{ rad s}^{-1}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds $T=\\pi/10\\text{ s}$.",
            },
          ],
        },
        commonErrors: [
          L`Using $m/k$ inside the square root for angular frequency.`,
          L`Forgetting the factor $2\pi$ in period.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$\omega=\sqrt{k/m}=\sqrt{100/0.25}=20\text{ rad s}^{-1}$.`,
          },
          {
            part: "b",
            explanation: L`$T=2\pi/\omega=2\pi/20=\pi/10\text{ s}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A simple pendulum has length $1.0\text{ m}$. Take $g=\pi^2\text{ m s}^{-2}$ and assume small oscillations.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["simple_pendulum", "period"],
        parts: [
          { letter: "a", promptMarkdown: "Find the time period.", points: 1 },
          {
            letter: "b",
            promptMarkdown:
              "State whether changing the bob mass changes this period in the ideal model.",
            points: 1,
          },
        ],
        hints: [
          L`Use $T=2\pi\sqrt{L/g}$.`,
          L`Substitute $L=1$ and $g=\pi^2$.`,
          L`The ideal small-angle period does not contain bob mass.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $T=2\\text{ s}$." },
            {
              part: "b",
              points: 1,
              description: "States bob mass does not change the ideal period.",
            },
          ],
        },
        commonErrors: [
          L`Using $T=2\pi\sqrt{g/L}$.`,
          L`Assuming heavier bobs always have larger period.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$T=2\pi\sqrt{L/g}=2\pi\sqrt{1/\pi^2}=2\text{ s}$.`,
          },
          {
            part: "b",
            explanation:
              "In the ideal small-angle model, the period is independent of bob mass.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A block of mass $0.20\text{ kg}$ attached to a spring of force constant $50\text{ N m}^{-1}$ executes SHM with amplitude $0.10\text{ m}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["shm_energy", "spring_oscillator", "maximum_speed"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the angular frequency.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the total mechanical energy.",
            points: 1,
          },
          { letter: "c", promptMarkdown: "Find the maximum speed.", points: 1 },
          {
            letter: "d",
            promptMarkdown: "Find the kinetic energy when $x=0.060\\text{ m}$.",
            points: 1,
          },
        ],
        hints: [
          L`Use $\omega=\sqrt{k/m}$.`,
          L`Total energy is $\frac12kA^2$.`,
          L`At displacement $x$, potential energy is $\frac12kx^2$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $\\omega=\\sqrt{250}\\text{ rad s}^{-1}$.",
            },
            {
              part: "b",
              points: 1,
              description: "Finds total energy $0.25\\text{ J}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds maximum speed about $1.58\\text{ m s}^{-1}$.",
            },
            {
              part: "d",
              points: 1,
              description: "Finds kinetic energy $0.16\\text{ J}$.",
            },
          ],
        },
        commonErrors: [
          L`Using displacement $x$ instead of amplitude $A$ for total energy.`,
          L`Adding potential energy at $x$ to total energy instead of subtracting it.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$\omega=\sqrt{k/m}=\sqrt{50/0.20}=\sqrt{250}\text{ rad s}^{-1}$.`,
          },
          {
            part: "b",
            explanation: L`$E=\frac12kA^2=\frac12(50)(0.10)^2=0.25\text{ J}$.`,
          },
          {
            part: "c",
            explanation: L`$v_{\max}=\omega A=\sqrt{250}(0.10)\approx1.58\text{ m s}^{-1}$.`,
          },
          {
            part: "d",
            explanation: L`$K=E-\frac12kx^2=0.25-\frac12(50)(0.060)^2=0.16\text{ J}$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`In a pendulum experiment, a student uses small angular displacements. Trial I uses length $L$ and bob mass $m$. Trial II uses length $4L$ and the same bob. Trial III uses length $L$ and bob mass $2m$.`,
        difficulty: 4,
        skillTags: [
          "simple_pendulum",
          "period_ratio",
          "experimental_reasoning",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Compare the period in Trial II with Trial I.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Compare the period in Trial III with Trial I.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Which graph should be a straight line through the origin: $T$ vs $L$ or $T^2$ vs $L$?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "What assumption about amplitude is needed for the standard formula?",
            points: 1,
          },
        ],
        hints: [
          L`For a simple pendulum, $T=2\pi\sqrt{L/g}$.`,
          L`Mass does not appear in the ideal expression.`,
          L`Square the period formula to see the graph relation.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "States Trial II period is twice Trial I.",
            },
            {
              part: "b",
              points: 1,
              description: "States Trial III period is the same as Trial I.",
            },
            { part: "c", points: 1, description: "Identifies $T^2$ vs $L$." },
            {
              part: "d",
              points: 1,
              description: "States the displacement angle must be small.",
            },
          ],
        },
        commonErrors: [
          L`Making period proportional to length instead of square root of length.`,
          L`Saying mass affects the ideal period.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Since $T\propto\sqrt L$, changing $L$ to $4L$ doubles the period.`,
          },
          {
            part: "b",
            explanation:
              "Changing bob mass does not change the ideal small-angle period.",
          },
          {
            part: "c",
            explanation: L`From $T^2=\frac{4\pi^2}{g}L$, the graph of $T^2$ vs $L$ is a straight line through the origin.`,
          },
          {
            part: "d",
            explanation:
              "The angular displacement must be small so that the small-angle approximation is valid.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "10.3",
    title: "Travelling Waves and Progressive Wave Relation",
    subtopic:
      "Transverse and longitudinal waves, speed of a travelling wave, displacement relation for a progressive wave, wavelength, frequency and phase difference.",
    mc: [
      {
        questionLatex: L`In a transverse mechanical wave, the particles of the medium oscillate`,
        difficulty: 1,
        skillTags: ["transverse_wave", "wave_motion"],
        choices: [
          L`parallel to the direction of wave propagation`,
          L`only in circular paths`,
          L`perpendicular to the direction of wave propagation`,
          L`without transferring energy`,
        ],
        correctLetter: "C",
        rationales: {
          A: "Parallel oscillation describes a longitudinal wave.",
          B: "Circular paths are not the defining feature of transverse waves.",
          D: "Mechanical waves transfer energy through the medium.",
        },
        hints: [
          L`Compare displacement direction with propagation direction.`,
          L`A string wave is the standard example.`,
          L`The disturbance is sideways while the wave travels along the string.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In a transverse wave, particle displacement is perpendicular to the direction in which the wave travels.",
          },
        ],
      },
      {
        questionLatex: L`A wave has frequency $256\text{ Hz}$ and wavelength $1.30\text{ m}$. Its speed is closest to`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["wave_speed", "frequency_wavelength"],
        choices: [
          L`$197\text{ m s}^{-1}$`,
          L`$256\text{ m s}^{-1}$`,
          L`$1.30\text{ m s}^{-1}$`,
          L`$333\text{ m s}^{-1}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This divides frequency by wavelength.",
          B: "This ignores wavelength.",
          C: "This ignores frequency.",
        },
        hints: [
          L`Use $v=f\lambda$.`,
          L`Multiply $256$ by $1.30$.`,
          L`The value should be near the speed of sound in air.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Wave speed is",
            math: L`v=f\lambda=256(1.30)\approx333\text{ m s}^{-1}`,
          },
        ],
      },
      {
        questionLatex: L`A progressive wave is represented by $y=0.02\sin(100\pi t-2\pi x)$ in SI units. The speed of the wave is`,
        difficulty: 3,
        skillTags: ["progressive_wave_equation", "wave_speed"],
        choices: [
          L`$50\text{ m s}^{-1}$`,
          L`$100\text{ m s}^{-1}$`,
          L`$2\text{ m s}^{-1}$`,
          L`$0.02\text{ m s}^{-1}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This uses angular frequency as if it were ordinary frequency.",
          C: "This confuses wave number with speed.",
          D: "This is the amplitude.",
        },
        hints: [
          L`Compare with $y=A\sin(\omega t-kx)$.`,
          L`Wave speed is $\omega/k$.`,
          L`Use $\omega=100\pi$ and $k=2\pi$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For a progressive wave,",
            math: L`v=\frac{\omega}{k}=\frac{100\pi}{2\pi}=50\text{ m s}^{-1}`,
          },
        ],
      },
      {
        questionLatex: L`In the wave snapshot shown, the phase difference between points P and Q is`,
        difficulty: 3,
        figure: progressiveWaveFigure,
        skillTags: ["phase_difference", "progressive_wave"],
        choices: [L`$\pi$`, L`$\pi/2$`, L`$2\pi$`, L`$\pi/4$`],
        correctLetter: "B",
        rationales: {
          A: "A separation of half a wavelength gives phase difference $\\pi$.",
          C: "A separation of one full wavelength gives phase difference $2\\pi$.",
          D: "The phase difference is $2\\pi$ times the fraction of wavelength.",
        },
        hints: [
          L`Use $\Delta\phi=2\pi\Delta x/\lambda$.`,
          L`Here $\Delta x=\lambda/4$.`,
          L`So $\Delta\phi=2\pi(1/4)$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For a separation of one-quarter wavelength,",
            math: L`\Delta\phi=2\pi\left(\frac14\right)=\frac{\pi}{2}`,
          },
        ],
      },
      {
        questionLatex: L`Assertion (A): A mechanical wave transfers energy without transporting matter as a whole. Reason (R): Particles of the medium oscillate about their mean positions while the disturbance travels through the medium.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "wave_motion"],
        choices: [
          L`Both A and R are true, but R does not explain A`,
          L`A is true but R is false`,
          L`Both A and R are true, and R explains A`,
          L`A is false but R is true`,
        ],
        correctLetter: "C",
        rationales: {
          A: "The reason explains how energy can travel while particles only oscillate locally.",
          B: "The reason is a correct statement of mechanical wave motion.",
          D: "The assertion is also true.",
        },
        hints: [
          L`Think of a pulse moving along a rope.`,
          L`The disturbance travels, but each element of the rope returns near its place.`,
          L`That is why energy transfer does not require bulk matter transport.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Both statements are true. The local oscillation of particles while the disturbance travels explains why energy is transferred without net transport of matter.",
          },
        ],
      },
    ],
    extraMc: [
      {
        questionLatex: L`A progressive wave is represented by $y=A\sin(20\pi t-4\pi x)$, where $x$ is in metres and $t$ in seconds. Its speed is`,
        difficulty: 3,
        skillTags: ["progressive_wave", "wave_speed_from_equation"],
        choices: [
          L`$5\text{ m s}^{-1}$`,
          L`$4\text{ m s}^{-1}$`,
          L`$20\text{ m s}^{-1}$`,
          L`$80\text{ m s}^{-1}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This reads the wave number as speed.`,
          C: L`This reads angular frequency as speed.`,
          D: L`This multiplies $\omega$ and $k$ instead of dividing.`,
        },
        hints: [
          L`Compare with $y=A\sin(\omega t-kx)$.`,
          L`Wave speed is $v=\omega/k$.`,
          L`Here $\omega=20\pi$ and $k=4\pi$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the wave speed.",
            math: L`v=\frac{\omega}{k}=\frac{20\pi}{4\pi}=5\text{ m s}^{-1}`,
          },
        ],
      },
      {
        questionLatex: L`A wave has wavelength $0.80\text{ m}$ and frequency $250\text{ Hz}$. Its speed is`,
        difficulty: 1,
        skillTags: ["wave_speed", "frequency_wavelength"],
        choices: [
          L`$200\text{ m s}^{-1}$`,
          L`$312.5\text{ m s}^{-1}$`,
          L`$250\text{ m s}^{-1}$`,
          L`$0.0032\text{ m s}^{-1}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This divides frequency by wavelength.`,
          C: L`This gives frequency without multiplying by wavelength.`,
          D: L`This takes the reciprocal incorrectly.`,
        },
        hints: [
          L`Use $v=f\lambda$.`,
          L`Multiply $250$ by $0.80$.`,
          L`Keep SI units.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Wave speed is",
            math: L`v=f\lambda=250(0.80)=200\text{ m s}^{-1}`,
          },
        ],
      },
      {
        questionLatex: L`Two points on a progressive wave are separated by $\lambda/6$ along the direction of propagation. Their phase difference is`,
        difficulty: 2,
        skillTags: ["phase_difference", "wavelength"],
        choices: [L`$\pi/3$`, L`$\pi/6$`, L`$2\pi$`, L`$3\pi$`],
        correctLetter: "A",
        rationales: {
          B: L`This misses the factor $2\pi$ in phase difference over one wavelength.`,
          C: L`This is the phase difference for one full wavelength.`,
          D: L`This is too large for a separation of $\lambda/6$.`,
        },
        hints: [
          L`A separation of one wavelength corresponds to phase difference $2\pi$.`,
          L`Use $\Delta\phi=2\pi\Delta x/\lambda$.`,
          L`Here $\Delta x=\lambda/6$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute phase difference.",
            math: L`\Delta\phi=2\pi\frac{\lambda/6}{\lambda}=\frac{\pi}{3}`,
          },
        ],
      },
      {
        questionLatex: L`For the wave $y=A\sin(kx-\omega t)$, the maximum transverse speed of a particle of the medium is`,
        difficulty: 3,
        skillTags: ["particle_velocity", "wave_equation"],
        choices: [L`$A\omega$`, L`$\omega/k$`, L`$Ak$`, L`$A/k$`],
        correctLetter: "A",
        rationales: {
          B: L`$\omega/k$ is wave speed, not particle speed.`,
          C: L`This uses wave number instead of angular frequency for time variation.`,
          D: L`This has the wrong dimensions.`,
        },
        hints: [
          L`Particle speed is $\partial y/\partial t$.`,
          L`The largest value of cosine factor is $1$.`,
          L`Differentiate with respect to time.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate the displacement.",
            math: L`v_y=\frac{\partial y}{\partial t}=-A\omega\cos(kx-\omega t)\Rightarrow v_{y,\max}=A\omega`,
          },
        ],
      },
      {
        questionLatex: L`The tension in a stretched string is made four times while its linear mass density is unchanged. The wave speed on the string becomes`,
        difficulty: 2,
        skillTags: ["waves_on_string", "tension_dependence"],
        choices: [L`two times`, L`four times`, L`half`, L`unchanged`],
        correctLetter: "A",
        rationales: {
          B: L`Wave speed depends on the square root of tension.`,
          C: L`Increasing tension increases speed.`,
          D: L`Tension directly affects wave speed on a string.`,
        },
        hints: [
          L`For a string, $v=\sqrt{T/\mu}$.`,
          L`Only $T$ changes.`,
          L`Square root of $4$ is $2$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use string wave speed.",
            math: L`v'=\sqrt{4T/\mu}=2\sqrt{T/\mu}=2v`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Define wavelength of a progressive wave.`,
        difficulty: 1,
        skillTags: ["wavelength_definition"],
        parts: [
          { letter: "a", promptMarkdown: "Write the definition.", points: 1 },
        ],
        hints: [
          L`It is a distance measured along the wave.`,
          L`Use two nearest points in the same phase.`,
          L`Crest to next crest is one example.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Defines wavelength as the distance between nearest points in the same phase.",
            },
          ],
        },
        commonErrors: [L`Defining wavelength as the height of a crest.`],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Wavelength is the distance between two nearest points of a wave that are in the same phase, such as two consecutive crests.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A progressive wave is given by $y=0.04\sin(8\pi t-2\pi x)$ in SI units.`,
        difficulty: 3,
        skillTags: ["progressive_wave_equation", "frequency_wavelength"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the amplitude and frequency.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the wavelength and wave speed.",
            points: 1,
          },
        ],
        hints: [
          L`Compare with $y=A\sin(\omega t-kx)$.`,
          L`Use $f=\omega/(2\pi)$ and $\lambda=2\pi/k$.`,
          L`Then use $v=f\lambda$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $A=0.04\\text{ m}$ and $f=4\\text{ Hz}$.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Finds $\\lambda=1\\text{ m}$ and $v=4\\text{ m s}^{-1}$.",
            },
          ],
        },
        commonErrors: [
          L`Taking angular frequency as ordinary frequency.`,
          L`Using $k$ itself as wavelength.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Here $A=0.04\text{ m}$ and $\omega=8\pi$, so $f=\omega/(2\pi)=4\text{ Hz}$.`,
          },
          {
            part: "b",
            explanation: L`Here $k=2\pi$, so $\lambda=2\pi/k=1\text{ m}$ and $v=f\lambda=4\text{ m s}^{-1}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A stretched string carries a transverse wave. The tension is increased to four times its initial value while the linear mass density is unchanged.`,
        difficulty: 3,
        skillTags: ["wave_speed_on_string", "proportional_reasoning"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State how the wave speed changes.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "If the initial speed was $60\\text{ m s}^{-1}$, find the new speed.",
            points: 1,
          },
        ],
        hints: [
          L`For a string, $v=\sqrt{T/\mu}$.`,
          L`Only tension changes.`,
          L`Taking tension four times makes speed two times.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "States speed doubles." },
            {
              part: "b",
              points: 1,
              description: "Finds $120\\text{ m s}^{-1}$.",
            },
          ],
        },
        commonErrors: [
          L`Making speed four times because tension is four times.`,
          L`Changing speed in the wrong direction.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Since $v\propto\sqrt T$, the speed doubles.`,
          },
          {
            part: "b",
            explanation: L`The new speed is $2(60)=120\text{ m s}^{-1}$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A progressive wave on a string is represented by $y=0.03\sin(40\pi t-5\pi x)$ in SI units.`,
        difficulty: 4,
        skillTags: ["progressive_wave_equation", "phase_difference"],
        parts: [
          { letter: "a", promptMarkdown: "Find the frequency.", points: 1 },
          { letter: "b", promptMarkdown: "Find the wavelength.", points: 1 },
          { letter: "c", promptMarkdown: "Find the wave speed.", points: 1 },
          {
            letter: "d",
            promptMarkdown:
              "Find the phase difference between two points separated by $0.10\\text{ m}$.",
            points: 1,
          },
        ],
        hints: [
          L`Compare with $y=A\sin(\omega t-kx)$.`,
          L`Use $f=\omega/2\pi$, $\lambda=2\pi/k$ and $v=\omega/k$.`,
          L`For phase difference, use $k\Delta x$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $20\\text{ Hz}$." },
            { part: "b", points: 1, description: "Finds $0.40\\text{ m}$." },
            {
              part: "c",
              points: 1,
              description: "Finds $8\\text{ m s}^{-1}$.",
            },
            {
              part: "d",
              points: 1,
              description: "Finds phase difference $\\pi/2$.",
            },
          ],
        },
        commonErrors: [
          L`Confusing $k$ with frequency.`,
          L`Using $\Delta x/\lambda$ without multiplying by $2\pi$.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$\omega=40\pi$, so $f=\omega/(2\pi)=20\text{ Hz}$.`,
          },
          {
            part: "b",
            explanation: L`$k=5\pi$, so $\lambda=2\pi/k=0.40\text{ m}$.`,
          },
          {
            part: "c",
            explanation: L`$v=f\lambda=20(0.40)=8\text{ m s}^{-1}$.`,
          },
          {
            part: "d",
            explanation: L`$\Delta\phi=k\Delta x=(5\pi)(0.10)=\pi/2$.`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A pulse travels along a string and covers $12\text{ m}$ in $0.50\text{ s}$. Later, a continuous sinusoidal wave is sent along the same string with frequency $6\text{ Hz}$ under the same tension.`,
        difficulty: 4,
        skillTags: ["wave_speed", "frequency_wavelength", "wave_motion"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the wave speed on the string.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the wavelength of the sinusoidal wave.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "If the frequency is doubled under the same conditions, what happens to wave speed?",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "For doubled frequency, what is the new wavelength?",
            points: 1,
          },
        ],
        hints: [
          L`Speed is distance divided by time.`,
          L`Use $v=f\lambda$.`,
          L`For the same string tension and mass density, wave speed is fixed.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $24\\text{ m s}^{-1}$.",
            },
            { part: "b", points: 1, description: "Finds $4\\text{ m}$." },
            {
              part: "c",
              points: 1,
              description: "States speed remains unchanged.",
            },
            {
              part: "d",
              points: 1,
              description: "Finds new wavelength $2\\text{ m}$.",
            },
          ],
        },
        commonErrors: [
          L`Assuming wave speed doubles when frequency doubles in the same medium.`,
          L`Using period instead of frequency in $v=f\lambda$.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`$v=12/0.50=24\text{ m s}^{-1}$.` },
          { part: "b", explanation: L`$\lambda=v/f=24/6=4\text{ m}$.` },
          {
            part: "c",
            explanation:
              "For the same string under the same tension, wave speed remains unchanged.",
          },
          {
            part: "d",
            explanation: L`If $f=12\text{ Hz}$, then $\lambda=24/12=2\text{ m}$.`,
          },
        ],
      },
    ],
    extraConstructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A sound wave has frequency $500\text{ Hz}$ and wavelength $0.68\text{ m}$.`,
        difficulty: 1,
        skillTags: ["wave_speed", "frequency_wavelength"],
        parts: [{ letter: "a", promptMarkdown: L`Find its speed.`, points: 1 }],
        hints: [
          L`Use $v=f\lambda$.`,
          L`Multiply $500$ by $0.68$.`,
          L`The unit is $\text{m s}^{-1}$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $340\text{ m s}^{-1}$.`,
            },
          ],
        },
        commonErrors: [L`Dividing frequency by wavelength.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`v=f\lambda=500(0.68)=340\text{ m s}^{-1}.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A transverse wave is given by $y=0.05\sin(20\pi t-4\pi x)$ in SI units.`,
        difficulty: 4,
        skillTags: ["wave_equation", "wave_parameters"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the amplitude.`, points: 1 },
          { letter: "b", promptMarkdown: L`Find the wavelength.`, points: 1 },
          {
            letter: "c",
            promptMarkdown: L`Find the frequency and wave speed.`,
            points: 2,
          },
        ],
        hints: [
          L`Compare with $y=A\sin(\omega t-kx)$.`,
          L`Use $k=2\pi/\lambda$ and $\omega=2\pi f$.`,
          L`Speed is $f\lambda$ or $\omega/k$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: L`Finds $0.05\text{ m}$.` },
            { part: "b", points: 1, description: L`Finds $0.50\text{ m}$.` },
            {
              part: "c",
              points: 2,
              description: L`Finds $10\text{ Hz}$ and $5\text{ m s}^{-1}$.`,
            },
          ],
        },
        commonErrors: [L`Treating angular frequency as ordinary frequency.`],
        workedSolution: [
          { part: "a", explanation: L`Amplitude is $A=0.05\text{ m}$.` },
          {
            part: "b",
            explanation: L`$k=4\pi=2\pi/\lambda$, so $\lambda=0.50\text{ m}$.`,
          },
          {
            part: "c",
            explanation: L`$\omega=20\pi=2\pi f$, so $f=10\text{ Hz}$. Hence $v=f\lambda=10(0.50)=5\text{ m s}^{-1}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two particles of a medium are on the same progressive wave and are separated by $0.25\text{ m}$. The wavelength is $1.0\text{ m}$.`,
        difficulty: 3,
        skillTags: ["phase_difference", "progressive_wave"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find their phase difference in radians.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`State whether they are in phase, opposite phase, or neither.`,
            points: 1,
          },
        ],
        hints: [
          L`Use $\Delta\phi=2\pi\Delta x/\lambda$.`,
          L`Here $\Delta x/\lambda=1/4$.`,
          L`Opposite phase would be $\pi$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Finds $\pi/2$.` },
            { part: "b", points: 1, description: "States neither." },
          ],
        },
        commonErrors: [
          L`Calling every non-zero phase difference opposite phase.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`\Delta\phi=2\pi(0.25/1.0)=\pi/2.` },
          {
            part: "b",
            explanation: "They are neither in phase nor in opposite phase.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A string has length $2.0\text{ m}$ and mass $0.010\text{ kg}$. It is stretched by tension $50\text{ N}$. A wave of frequency $100\text{ Hz}$ travels along it.`,
        difficulty: 5,
        skillTags: ["waves_on_string", "linear_density", "wavelength"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the linear mass density.`,
            points: 1,
          },
          { letter: "b", promptMarkdown: L`Find the wave speed.`, points: 1 },
          { letter: "c", promptMarkdown: L`Find the wavelength.`, points: 1 },
        ],
        hints: [
          L`Linear mass density is mass per length.`,
          L`Use $v=\sqrt{T/\mu}$.`,
          L`Then use $v=f\lambda$.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Finds $5.0\times10^{-3}\text{ kg m}^{-1}$.`,
            },
            {
              part: "b",
              points: 1,
              description: L`Finds $100\text{ m s}^{-1}$.`,
            },
            { part: "c", points: 1, description: L`Finds $1.0\text{ m}$.` },
          ],
        },
        commonErrors: [L`Using total string mass as linear mass density.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`\mu=0.010/2.0=5.0\times10^{-3}\text{ kg m}^{-1}.`,
          },
          {
            part: "b",
            explanation: L`v=\sqrt{50/(5.0\times10^{-3})}=100\text{ m s}^{-1}.`,
          },
          { part: "c", explanation: L`\lambda=v/f=100/100=1.0\text{ m}.` },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A wave travelling on a string is described by $y=A\sin(\omega t-kx)$.`,
        difficulty: 4,
        skillTags: ["progressive_wave", "wave_equation", "direction_of_wave"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`In which direction does the wave travel?`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Write the wave speed in terms of $\omega$ and $k$.`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Write the wavelength in terms of $k$.`,
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: L`Write the frequency in terms of $\omega$.`,
            points: 1,
          },
        ],
        hints: [
          L`A phase $\omega t-kx=$ constant moves toward increasing $x$.`,
          L`Use $k=2\pi/\lambda$.`,
          L`Use $\omega=2\pi f$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Identifies $+x$ direction.`,
            },
            { part: "b", points: 1, description: L`Writes $v=\omega/k$.` },
            { part: "c", points: 1, description: L`Writes $\lambda=2\pi/k$.` },
            { part: "d", points: 1, description: L`Writes $f=\omega/(2\pi)$.` },
          ],
        },
        commonErrors: [
          L`Confusing particle oscillation direction with wave propagation direction.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The form $\omega t-kx$ represents travel in the $+x$ direction.`,
          },
          { part: "b", explanation: L`v=\omega/k.` },
          { part: "c", explanation: L`\lambda=2\pi/k.` },
          { part: "d", explanation: L`f=\omega/(2\pi).` },
        ],
      },
    ],
  },
  {
    topicCode: "10.4",
    title: "Superposition, Reflection and Standing Waves",
    subtopic:
      "Principle of superposition, reflection at boundaries, standing waves in strings and organ pipes, nodes, antinodes and harmonics.",
    mc: [
      {
        questionLatex: L`Two pulses of displacement $+3\text{ cm}$ and $-1\text{ cm}$ reach the same point of a string at the same instant. According to superposition, the resultant displacement is`,
        difficulty: 1,
        skillTags: ["superposition_principle"],
        choices: [
          L`$+4\text{ cm}$`,
          L`$-3\text{ cm}$`,
          L`$0$`,
          L`$+2\text{ cm}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This adds magnitudes and ignores opposite signs.",
          B: "This keeps only the larger pulse.",
          C: "The two displacements are not equal and opposite.",
        },
        hints: [
          L`Superposition adds displacements algebraically.`,
          L`Keep the signs.`,
          L`Compute $+3+(-1)$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The resultant displacement is",
            math: L`3+(-1)=+2\text{ cm}`,
          },
        ],
      },
      {
        questionLatex: L`When a transverse pulse on a string reflects from a rigid fixed end, the reflected pulse is`,
        difficulty: 2,
        skillTags: ["reflection_of_waves", "fixed_end"],
        choices: [
          L`inverted`,
          L`never reflected`,
          L`reflected without change of phase`,
          L`converted into a longitudinal pulse`,
        ],
        correctLetter: "A",
        rationales: {
          B: "A fixed boundary reflects the pulse.",
          C: "Reflection at a fixed end produces phase reversal.",
          D: "The type of pulse does not automatically change to longitudinal at the end.",
        },
        hints: [
          L`The fixed end cannot move.`,
          L`The boundary condition requires zero displacement at the end.`,
          L`This causes inversion on reflection.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A pulse reflected from a rigid fixed end undergoes phase reversal, so it is inverted.",
          },
        ],
      },
      {
        questionLatex: L`In a standing wave, the distance between two consecutive nodes is`,
        difficulty: 2,
        skillTags: ["standing_wave", "node_spacing"],
        choices: [L`$\lambda$`, L`$\lambda/2$`, L`$\lambda/4$`, L`$2\lambda$`],
        correctLetter: "B",
        rationales: {
          A: "A full wavelength separates every alternate node.",
          C: "Node to nearest antinode is $\\lambda/4$, not node to node.",
          D: "This is too large for adjacent nodes.",
        },
        hints: [
          L`A node and the next antinode are separated by $\lambda/4$.`,
          L`Node to next node includes two such intervals.`,
          L`So adjacent nodes are separated by half a wavelength.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In a standing wave, consecutive nodes are separated by",
            math: L`\lambda/2`,
          },
        ],
      },
      {
        questionLatex: L`For the string patterns shown, pattern III corresponds to wavelength`,
        difficulty: 3,
        figure: standingStringFigure,
        skillTags: ["standing_wave_string", "harmonics"],
        choices: [L`$2L$`, L`$L$`, L`$2L/3$`, L`$3L/2$`],
        correctLetter: "C",
        rationales: {
          A: "This is the fundamental wavelength for one loop.",
          B: "This corresponds to the second harmonic.",
          D: "This does not fit three half-wavelengths into length $L$.",
        },
        hints: [
          L`For a string fixed at both ends, $L=n\lambda/2$.`,
          L`Pattern III has three loops.`,
          L`Use $n=3$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For the third pattern,",
            math: L`L=3\lambda/2\Rightarrow \lambda=2L/3`,
          },
        ],
      },
      {
        questionLatex: L`In the fundamental mode of a pipe closed at one end and open at the other, the length of the pipe is`,
        difficulty: 3,
        skillTags: ["organ_pipe", "closed_pipe_fundamental"],
        choices: [
          L`$\lambda/2$`,
          L`$\lambda$`,
          L`$3\lambda/4$`,
          L`$\lambda/4$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "That is the fundamental condition for a pipe open at both ends.",
          B: "A full wavelength is not the fundamental closed-pipe pattern.",
          C: "That is the next odd harmonic condition, not the fundamental.",
        },
        hints: [
          L`Closed end is a displacement node.`,
          L`Open end is a displacement antinode.`,
          L`Node to nearest antinode is one-quarter wavelength.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For the fundamental closed-open pipe,",
            math: L`L=\lambda/4`,
          },
        ],
      },
    ],
    extraMc: [
      {
        questionLatex: L`Two coherent waves of equal amplitude $A$ reach a point in the same phase. The resultant amplitude is`,
        difficulty: 1,
        skillTags: ["superposition", "constructive_interference"],
        choices: [L`$2A$`, L`$A$`, L`$0$`, L`$A/2$`],
        correctLetter: "A",
        rationales: {
          B: L`In-phase amplitudes add.`,
          C: L`Zero occurs for equal waves in opposite phase.`,
          D: L`There is no halving here.`,
        },
        hints: [
          L`Use superposition.`,
          L`Same phase means same sign displacement.`,
          L`Add $A$ and $A$.`,
        ],
        solution: [{ step: 1, explanation: L`Resultant amplitude $=A+A=2A$.` }],
      },
      {
        questionLatex: L`For two equal-amplitude waves, a path difference of $\lambda/2$ at a point produces`,
        difficulty: 2,
        skillTags: ["destructive_interference", "path_difference"],
        choices: [
          L`destructive interference`,
          L`constructive interference`,
          L`no phase difference`,
          L`double frequency`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Constructive interference needs path difference $n\lambda$.`,
          C: L`$\lambda/2$ gives phase difference $\pi$.`,
          D: L`Interference changes amplitude, not frequency.`,
        },
        hints: [
          L`One wavelength means $2\pi$ phase.`,
          L`Half a wavelength means $\pi$.`,
          L`Equal opposite-phase waves cancel.`,
        ],
        solution: [
          {
            step: 1,
            explanation: L`Path difference $\lambda/2$ gives phase difference $\pi$, so equal-amplitude waves interfere destructively.`,
          },
        ],
      },
      {
        questionLatex: L`In a standing wave, the distance between a node and the nearest antinode is`,
        difficulty: 2,
        skillTags: ["standing_waves", "nodes", "antinodes"],
        choices: [L`$\lambda/4$`, L`$\lambda/2$`, L`$\lambda$`, L`$2\lambda$`],
        correctLetter: "A",
        rationales: {
          B: L`$\lambda/2$ is the distance between consecutive nodes.`,
          C: L`One wavelength contains two full node-to-node intervals.`,
          D: L`This is too large.`,
        },
        hints: [
          L`Node to antinode is $\lambda/4$.`,
          L`Node to next node is $2(\lambda/4)=\lambda/2$.`,
          L`The nearest antinode lies halfway between adjacent nodes.`,
        ],
        solution: [
          {
            step: 1,
            explanation: L`A node and the nearest antinode are separated by $\lambda/4$.`,
          },
        ],
      },
      {
        questionLatex: L`A wave reflected from a rigid boundary undergoes a phase change of`,
        difficulty: 3,
        skillTags: ["reflection_of_waves", "phase_reversal"],
        choices: [L`$\pi$`, L`$0$`, L`$\pi/2$`, L`$2\pi$`],
        correctLetter: "A",
        rationales: {
          B: L`A free end has no phase reversal; a rigid end does.`,
          C: L`The reflected pulse is inverted, not shifted by a quarter cycle.`,
          D: L`$2\pi$ is equivalent to no phase change.`,
        },
        hints: [
          L`A fixed end cannot move.`,
          L`The reflected pulse is inverted.`,
          L`Inversion means phase change $\pi$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: L`Reflection at a rigid boundary gives phase reversal of $\pi$.`,
          },
        ],
      },
      {
        questionLatex: L`A standing wave is represented by $y=2A\sin kx\cos\omega t$. Nodes occur at positions satisfying`,
        difficulty: 4,
        skillTags: ["standing_wave_equation", "nodes"],
        choices: [
          L`$x=n\lambda/2$`,
          L`$x=(2n+1)\lambda/4$`,
          L`$x=n\lambda$ only`,
          L`$x=(2n+1)\lambda/2$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Those are antinodes for this form.`,
          C: L`This misses alternate nodes.`,
          D: L`This is not the full node condition.`,
        },
        hints: [
          L`Nodes have zero amplitude for all time.`,
          L`Set $\sin kx=0$.`,
          L`Use $k=2\pi/\lambda$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Set the position factor to zero.",
            math: L`\sin kx=0\Rightarrow kx=n\pi\Rightarrow x=n\lambda/2`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`State the principle of superposition of waves.`,
        difficulty: 1,
        skillTags: ["superposition_principle"],
        parts: [
          { letter: "a", promptMarkdown: "Write the statement.", points: 1 },
        ],
        hints: [
          L`It applies when two or more waves overlap.`,
          L`Displacements add.`,
          L`The addition is algebraic/vectorial depending on displacement direction.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "States that resultant displacement is the algebraic sum of individual displacements.",
            },
          ],
        },
        commonErrors: [L`Adding wave speeds instead of displacements.`],
        workedSolution: [
          {
            part: "a",
            explanation:
              "When two or more waves overlap, the resultant displacement at any point is the algebraic sum of the displacements due to the individual waves.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two waves of the same frequency reach a point with displacements $y_1=3\sin\omega t$ cm and $y_2=4\sin(\omega t+\pi/2)$ cm.`,
        difficulty: 3,
        skillTags: ["superposition_principle", "resultant_amplitude"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the resultant amplitude.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Explain why the answer is not $7\\text{ cm}$.",
            points: 1,
          },
        ],
        hints: [
          L`The two components differ in phase by $\pi/2$.`,
          L`Use perpendicular phasor addition.`,
          L`Resultant amplitude is $\sqrt{3^2+4^2}$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds resultant amplitude $5\\text{ cm}$.",
            },
            {
              part: "b",
              points: 1,
              description:
                "Explains amplitudes add directly only when waves are in phase.",
            },
          ],
        },
        commonErrors: [
          L`Adding amplitudes directly despite phase difference.`,
          L`Subtracting amplitudes as if the waves were opposite in phase.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The phase difference is $\pi/2$, so $A=\sqrt{3^2+4^2}=5\text{ cm}$.`,
          },
          {
            part: "b",
            explanation:
              "The amplitudes would add to $7\\text{ cm}$ only if the two waves were in phase.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A string fixed at both ends has length $1.2\text{ m}$. It vibrates in the second harmonic. The wave speed on the string is $120\text{ m s}^{-1}$.`,
        difficulty: 3,
        skillTags: ["standing_wave_string", "harmonics"],
        parts: [
          { letter: "a", promptMarkdown: "Find the wavelength.", points: 1 },
          { letter: "b", promptMarkdown: "Find the frequency.", points: 1 },
        ],
        hints: [
          L`For a string fixed at both ends, $L=n\lambda/2$.`,
          L`For second harmonic, $n=2$.`,
          L`Use $f=v/\lambda$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $\\lambda=1.2\\text{ m}$.",
            },
            { part: "b", points: 1, description: "Finds $100\\text{ Hz}$." },
          ],
        },
        commonErrors: [
          L`Using the fundamental wavelength $2L$ for the second harmonic.`,
          L`Using $f=\lambda/v$.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`For $n=2$, $L=2\lambda/2=\lambda$, so $\lambda=1.2\text{ m}$.`,
          },
          { part: "b", explanation: L`$f=v/\lambda=120/1.2=100\text{ Hz}$.` },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A string of length $1.0\text{ m}$ is fixed at both ends. The tension is $100\text{ N}$ and its linear mass density is $0.010\text{ kg m}^{-1}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: [
          "standing_wave_string",
          "wave_speed_on_string",
          "harmonics",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the wave speed on the string.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the fundamental frequency.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the second and third harmonic frequencies.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "State the number of nodes in the third harmonic including the ends.",
            points: 1,
          },
        ],
        hints: [
          L`Use $v=\sqrt{T/\mu}$.`,
          L`For a string fixed at both ends, $f_1=v/(2L)$.`,
          L`The nth harmonic frequency is $nf_1$ and has $n+1$ nodes.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Finds $100\\text{ m s}^{-1}$.",
            },
            { part: "b", points: 1, description: "Finds $50\\text{ Hz}$." },
            {
              part: "c",
              points: 1,
              description: "Finds $100\\text{ Hz}$ and $150\\text{ Hz}$.",
            },
            { part: "d", points: 1, description: "States four nodes." },
          ],
        },
        commonErrors: [
          L`Using $v=2Lf$ for all harmonics without including $n$.`,
          L`Counting only internal nodes and missing the fixed ends.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$v=\sqrt{T/\mu}=\sqrt{100/0.010}=100\text{ m s}^{-1}$.`,
          },
          {
            part: "b",
            explanation: L`$f_1=v/(2L)=100/(2\times1.0)=50\text{ Hz}$.`,
          },
          {
            part: "c",
            explanation: L`$f_2=2f_1=100\text{ Hz}$ and $f_3=3f_1=150\text{ Hz}$.`,
          },
          {
            part: "d",
            explanation:
              "The third harmonic has nodes at both fixed ends and two internal nodes, so there are four nodes in all.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`In a resonance tube experiment closed at one end, the first two resonance lengths for a tuning fork are $17\text{ cm}$ and $51\text{ cm}$. The tuning fork frequency is $500\text{ Hz}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["organ_pipe", "resonance_tube", "wave_speed"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the difference between successive resonance lengths.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the wavelength of sound.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the speed of sound.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "State the boundary condition at the closed end.",
            points: 1,
          },
        ],
        hints: [
          L`For a closed pipe, successive resonance lengths differ by $\lambda/2$.`,
          L`Use the given two lengths.`,
          L`Then use $v=f\lambda$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $34\\text{ cm}$." },
            {
              part: "b",
              points: 1,
              description: "Finds $\\lambda=68\\text{ cm}$.",
            },
            {
              part: "c",
              points: 1,
              description: "Finds $340\\text{ m s}^{-1}$.",
            },
            {
              part: "d",
              points: 1,
              description: "States displacement node at the closed end.",
            },
          ],
        },
        commonErrors: [
          L`Taking the length difference as one full wavelength.`,
          L`Using centimetres directly without converting for speed.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`The difference is $51-17=34\text{ cm}$.`,
          },
          {
            part: "b",
            explanation: L`Successive resonances differ by $\lambda/2$, so $\lambda=2(34)=68\text{ cm}=0.68\text{ m}$.`,
          },
          {
            part: "c",
            explanation: L`$v=f\lambda=500(0.68)=340\text{ m s}^{-1}$.`,
          },
          { part: "d", explanation: "The closed end is a displacement node." },
        ],
      },
    ],
    extraConstructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A standing wave has wavelength $1.2\text{ m}$.`,
        difficulty: 1,
        skillTags: ["standing_waves", "nodes"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the distance between consecutive nodes.`,
            points: 1,
          },
        ],
        hints: [
          L`Node spacing is $\lambda/2$.`,
          L`Use $\lambda=1.2\text{ m}$.`,
          L`Half of $1.2$ is $0.6$.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            { part: "a", points: 1, description: L`Finds $0.60\text{ m}$.` },
          ],
        },
        commonErrors: [L`Using $\lambda$ instead of $\lambda/2$.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`Distance between consecutive nodes $=\lambda/2=0.60\text{ m}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A standing wave on a string has nodes at $x=0$, $0.40\text{ m}$, and $0.80\text{ m}$.`,
        difficulty: 3,
        skillTags: ["standing_waves", "wavelength_from_nodes"],
        parts: [
          { letter: "a", promptMarkdown: L`Find the wavelength.`, points: 1 },
          {
            letter: "b",
            promptMarkdown: L`Find the antinode positions between $0$ and $0.80\text{ m}$.`,
            points: 1,
          },
        ],
        hints: [
          L`Node spacing is $\lambda/2$.`,
          L`Antinodes lie midway between nodes.`,
          L`The node spacing is $0.40\text{ m}$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Finds $0.80\text{ m}$.` },
            {
              part: "b",
              points: 1,
              description: L`Finds $0.20\text{ m}$ and $0.60\text{ m}$.`,
            },
          ],
        },
        commonErrors: [L`Taking node spacing as one full wavelength.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`$0.40\text{ m}=\lambda/2$, so $\lambda=0.80\text{ m}$.`,
          },
          {
            part: "b",
            explanation: L`Antinodes are halfway between adjacent nodes: $0.20\text{ m}$ and $0.60\text{ m}$.`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two waves of amplitude $3\text{ cm}$ each meet at a point.`,
        difficulty: 2,
        skillTags: ["superposition", "interference"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the resultant amplitude if they meet in phase.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the resultant amplitude if they meet in opposite phase.`,
            points: 1,
          },
        ],
        hints: [
          L`In phase displacements add.`,
          L`Opposite phase displacements subtract.`,
          L`The amplitudes are equal.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Finds $6\text{ cm}$.` },
            { part: "b", points: 1, description: L`Finds $0$.` },
          ],
        },
        commonErrors: [L`Adding amplitudes even in opposite phase.`],
        workedSolution: [
          { part: "a", explanation: L`In phase: $3+3=6\text{ cm}$.` },
          { part: "b", explanation: L`Opposite phase: $3-3=0$.` },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Two waves travelling in opposite directions on the same string are $y_1=A\sin(\omega t-kx)$ and $y_2=A\sin(\omega t+kx)$.`,
        difficulty: 5,
        skillTags: ["superposition", "standing_wave_equation"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Use superposition to write the resultant displacement.`,
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: L`Identify the positions of nodes.`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Explain why the pattern does not travel along the string.`,
            points: 1,
          },
        ],
        hints: [
          L`Use $\sin C+\sin D=2\sin[(C+D)/2]\cos[(C-D)/2]$.`,
          L`Nodes occur where the position-dependent amplitude is zero.`,
          L`Standing waves have fixed nodes and antinodes.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: L`Obtains $y=2A\sin\omega t\cos kx$.`,
            },
            { part: "b", points: 1, description: L`Finds $kx=(2n+1)\pi/2$.` },
            {
              part: "c",
              points: 1,
              description: "Explains fixed node-antinode pattern.",
            },
          ],
        },
        commonErrors: [
          L`Forgetting that the two waves travel in opposite directions.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`y=y_1+y_2=2A\sin\omega t\cos kx.` },
          {
            part: "b",
            explanation: L`Nodes occur when $\cos kx=0$, so $kx=(2n+1)\pi/2$.`,
          },
          {
            part: "c",
            explanation:
              "The nodes and antinodes remain fixed in space, so the pattern is stationary rather than travelling.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A pulse on a string reaches a rigid wall and reflects. Another pulse reaches a light ring that can move freely at the end of a string.`,
        difficulty: 4,
        skillTags: [
          "reflection_of_waves",
          "phase_change",
          "boundary_conditions",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Which reflection is inverted?`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`What is the phase change at the rigid wall?`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Which end corresponds to a displacement antinode?`,
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: L`Why does the rigid wall force a node?`,
            points: 1,
          },
        ],
        hints: [
          L`A fixed end cannot move.`,
          L`A free end can have maximum displacement.`,
          L`Inversion corresponds to phase change $\pi$.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Identifies rigid-wall reflection.",
            },
            { part: "b", points: 1, description: L`States $\pi$.` },
            { part: "c", points: 1, description: "Identifies free end." },
            {
              part: "d",
              points: 1,
              description: "Says displacement at a rigid wall must be zero.",
            },
          ],
        },
        commonErrors: [L`Saying both fixed and free reflections are inverted.`],
        workedSolution: [
          {
            part: "a",
            explanation: "Reflection at the rigid wall is inverted.",
          },
          { part: "b", explanation: L`The phase change is $\pi$.` },
          {
            part: "c",
            explanation: "The free end is a displacement antinode.",
          },
          {
            part: "d",
            explanation:
              "A rigid wall cannot move, so displacement there is always zero, forming a node.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "10.5",
    title: "Harmonics and Beats",
    subtopic:
      "Fundamental modes and harmonics of strings and organ pipes, overtones, beat frequency, beat period and nearby-frequency applications.",
    mc: [
      {
        questionLatex: L`Two tuning forks of frequencies $256\text{ Hz}$ and $260\text{ Hz}$ are sounded together. The beat frequency is`,
        difficulty: 1,
        skillTags: ["beats", "beat_frequency"],
        choices: [
          L`$4\text{ Hz}$`,
          L`$516\text{ Hz}$`,
          L`$258\text{ Hz}$`,
          L`$2\text{ Hz}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Beats depend on the difference, not the sum, of the frequencies.",
          C: "This is the average frequency, not beat frequency.",
          D: "This is half the frequency difference.",
        },
        hints: [
          L`Beat frequency is the absolute difference of the two frequencies.`,
          L`Subtract the smaller frequency from the larger.`,
          L`Use $260-256$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Beat frequency is",
            math: L`|260-256|=4\text{ Hz}`,
          },
        ],
      },
      {
        questionLatex: L`The graph shown represents a sound with beats. The repeated rise and fall of loudness occurs because of`,
        difficulty: 2,
        figure: beatGraphFigure,
        skillTags: ["beats", "superposition"],
        choices: [
          L`reflection of a single pulse at a fixed end`,
          L`superposition of two waves of slightly different frequencies`,
          L`a transverse wave travelling in vacuum`,
          L`complete absence of interference`,
        ],
        correctLetter: "B",
        rationales: {
          A: "Fixed-end reflection can invert a pulse, but it does not by itself produce periodic beats.",
          C: "Sound is a mechanical wave and does not travel in vacuum.",
          D: "Beats are an interference effect.",
        },
        hints: [
          L`Beats require two close frequencies.`,
          L`Sometimes the waves reinforce; sometimes they partially cancel.`,
          L`That changing resultant amplitude gives loud-soft alternation.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Beats arise when two waves of slightly different frequencies superpose, producing periodic reinforcement and cancellation.",
          },
        ],
      },
      {
        questionLatex: L`An open organ pipe of length $0.85\text{ m}$ has speed of sound $340\text{ m s}^{-1}$. Its fundamental frequency is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["open_pipe", "fundamental_frequency"],
        choices: [
          L`$100\text{ Hz}$`,
          L`$400\text{ Hz}$`,
          L`$200\text{ Hz}$`,
          L`$340\text{ Hz}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This uses the closed-pipe fundamental formula.",
          B: "This corresponds to a wavelength of $0.85\\text{ m}$, not $2L$.",
          D: "This divides speed by $1\\text{ m}$ rather than the wavelength.",
        },
        hints: [
          L`For an open pipe in the fundamental mode, $L=\lambda/2$.`,
          L`Thus $\lambda=2L$.`,
          L`Use $f=v/\lambda$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "For an open pipe,",
            math: L`\lambda=2L=1.70\text{ m},\quad f=\frac{340}{1.70}=200\text{ Hz}`,
          },
        ],
      },
      {
        questionLatex: L`A pipe closed at one end has fundamental frequency $100\text{ Hz}$. The next higher allowed frequency is`,
        difficulty: 2,
        skillTags: ["closed_pipe", "odd_harmonics"],
        choices: [
          L`$200\text{ Hz}$`,
          L`$400\text{ Hz}$`,
          L`$150\text{ Hz}$`,
          L`$300\text{ Hz}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "A closed pipe supports only odd harmonics, so the second harmonic is absent.",
          B: "The fourth harmonic is also absent in a closed pipe.",
          C: "Allowed frequencies are odd multiples of the fundamental.",
        },
        hints: [
          L`A closed-open pipe supports odd harmonics.`,
          L`Allowed frequencies are $f_1,3f_1,5f_1,\ldots$.`,
          L`The next after $100$ is $3(100)$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For a closed pipe, the allowed frequencies are odd multiples of the fundamental.",
            math: L`f=3f_1=300\text{ Hz}`,
          },
        ],
      },
      {
        questionLatex: L`A stretched string has fundamental frequency $80\text{ Hz}$. Its fourth harmonic has frequency`,
        difficulty: 2,
        skillTags: ["string_harmonics"],
        choices: [
          L`$320\text{ Hz}$`,
          L`$160\text{ Hz}$`,
          L`$240\text{ Hz}$`,
          L`$20\text{ Hz}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is the second harmonic.",
          C: "This is the third harmonic.",
          D: "This divides by four instead of multiplying.",
        },
        hints: [
          L`For a string fixed at both ends, all integer harmonics are allowed.`,
          L`The nth harmonic frequency is $nf_1$.`,
          L`Use $n=4$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "The fourth harmonic frequency is",
            math: L`4f_1=4(80)=320\text{ Hz}`,
          },
        ],
      },
    ],
    extraMc: [
      {
        questionLatex: L`A string fixed at both ends has length $L$ and wave speed $v$. Its fundamental frequency is`,
        difficulty: 2,
        skillTags: ["string_harmonics", "fundamental_frequency"],
        choices: [L`$v/(2L)$`, L`$v/(4L)$`, L`$2v/L$`, L`$v/L$`],
        correctLetter: "A",
        rationales: {
          B: L`This is the closed-pipe fundamental form.`,
          C: L`This is too large.`,
          D: L`This is the second harmonic for a fixed string.`,
        },
        hints: [
          L`For the fundamental, $L=\lambda/2$.`,
          L`Thus $\lambda=2L$.`,
          L`Use $f=v/\lambda$.`,
        ],
        solution: [{ step: 1, explanation: L`$f_1=v/(2L)$.` }],
      },
      {
        questionLatex: L`For an open organ pipe, the first overtone is`,
        difficulty: 2,
        skillTags: ["open_pipe", "harmonics"],
        choices: [
          L`twice the fundamental frequency`,
          L`three times the fundamental frequency`,
          L`half the fundamental frequency`,
          L`absent`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`That is the first overtone of a closed pipe.`,
          C: L`An overtone is higher than the fundamental.`,
          D: L`Open pipes support all harmonics.`,
        },
        hints: [
          L`Open pipes support all harmonics.`,
          L`First overtone is the second harmonic.`,
          L`So it is $2f_1$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: L`For an open pipe, first overtone $=2f_1$.`,
          },
        ],
      },
      {
        questionLatex: L`For a closed organ pipe, the first overtone is`,
        difficulty: 3,
        skillTags: ["closed_pipe", "harmonics"],
        choices: [
          L`three times the fundamental frequency`,
          L`twice the fundamental frequency`,
          L`equal to the fundamental frequency`,
          L`four times the fundamental frequency`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`Closed pipes support only odd harmonics.`,
          C: L`An overtone is above the fundamental.`,
          D: L`The fourth harmonic is not present in a closed pipe.`,
        },
        hints: [
          L`Closed pipe frequencies are $f_1,3f_1,5f_1,\ldots$.`,
          L`First overtone is the next allowed one.`,
          L`That is $3f_1$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: L`For a closed pipe, first overtone $=3f_1$.`,
          },
        ],
      },
      {
        questionLatex: L`Two tuning forks of frequencies $450\text{ Hz}$ and $456\text{ Hz}$ are sounded together. The beat frequency is`,
        difficulty: 1,
        skillTags: ["beats", "frequency_difference"],
        choices: [
          L`$6\text{ Hz}$`,
          L`$906\text{ Hz}$`,
          L`$453\text{ Hz}$`,
          L`$3\text{ Hz}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: L`This adds the frequencies.`,
          C: L`This averages them.`,
          D: L`This halves the frequency difference.`,
        },
        hints: [
          L`Beat frequency is the absolute difference.`,
          L`Subtract $450$ from $456$.`,
          L`Use hertz.`,
        ],
        solution: [{ step: 1, explanation: L`f_b=|456-450|=6\text{ Hz}.` }],
      },
      {
        questionLatex: L`The tension in a sonometer wire is made nine times while length and linear density are unchanged. Its fundamental frequency becomes`,
        difficulty: 3,
        skillTags: ["string_harmonics", "tension_dependence"],
        choices: [L`three times`, L`nine times`, L`one-third`, L`unchanged`],
        correctLetter: "A",
        rationales: {
          B: L`Frequency depends on the square root of tension.`,
          C: L`Increasing tension increases frequency.`,
          D: L`Tension affects wave speed and frequency.`,
        },
        hints: [
          L`$f\propto\sqrt T$ for fixed $L$ and $\mu$.`,
          L`Square root of $9$ is $3$.`,
          L`So frequency triples.`,
        ],
        solution: [{ step: 1, explanation: L`f' / f=\sqrt{9T/T}=3.` }],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Define beats in sound.`,
        difficulty: 1,
        skillTags: ["beats_definition"],
        parts: [
          { letter: "a", promptMarkdown: "Write the definition.", points: 1 },
        ],
        hints: [
          L`Beats occur when two close frequencies are heard together.`,
          L`The loudness changes periodically.`,
          L`Mention alternate maxima and minima of intensity.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Defines beats as periodic variation in loudness due to superposition of close frequencies.",
            },
          ],
        },
        commonErrors: [L`Defining beats as echo or reflection.`],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Beats are periodic variations in loudness produced when two sound waves of slightly different frequencies superpose.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two tuning forks of frequencies $300\text{ Hz}$ and $305\text{ Hz}$ are sounded together.`,
        difficulty: 2,
        skillTags: ["beats", "beat_period"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the beat frequency.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Find the beat period.", points: 1 },
        ],
        hints: [
          L`Beat frequency is the frequency difference.`,
          L`Beat period is reciprocal of beat frequency.`,
          L`Use $T_b=1/f_b$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $5\\text{ Hz}$." },
            { part: "b", points: 1, description: "Finds $0.20\\text{ s}$." },
          ],
        },
        commonErrors: [
          L`Using average frequency as beat frequency.`,
          L`Forgetting to invert beat frequency to get beat period.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`$f_b=|305-300|=5\text{ Hz}$.` },
          { part: "b", explanation: L`$T_b=1/f_b=1/5=0.20\text{ s}$.` },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An open organ pipe has length $0.50\text{ m}$. Take speed of sound as $340\text{ m s}^{-1}$.`,
        difficulty: 3,
        skillTags: ["open_pipe", "harmonics"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the fundamental frequency.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the second harmonic frequency.",
            points: 1,
          },
        ],
        hints: [
          L`For an open pipe, $f_1=v/(2L)$.`,
          L`All integral harmonics are allowed.`,
          L`The second harmonic is $2f_1$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: "Finds $340\\text{ Hz}$." },
            { part: "b", points: 1, description: "Finds $680\\text{ Hz}$." },
          ],
        },
        commonErrors: [
          L`Using the closed-pipe formula for an open pipe.`,
          L`Assuming only odd harmonics in an open pipe.`,
        ],
        workedSolution: [
          { part: "a", explanation: L`$f_1=v/(2L)=340/(1.0)=340\text{ Hz}$.` },
          {
            part: "b",
            explanation: L`For an open pipe, $f_2=2f_1=680\text{ Hz}$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A pipe closed at one end has length $0.85\text{ m}$. Take speed of sound as $340\text{ m s}^{-1}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        figure: organPipeFigure,
        skillTags: ["closed_pipe", "odd_harmonics", "organ_pipe"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the fundamental frequency.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find the next two allowed frequencies.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the wavelengths corresponding to these three frequencies.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Explain why $200\\text{ Hz}$ is not an allowed frequency.",
            points: 1,
          },
        ],
        hints: [
          L`For a closed pipe, $f_1=v/(4L)$.`,
          L`Allowed frequencies are odd multiples of $f_1$.`,
          L`Use $\lambda=v/f$ for each allowed frequency.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $100\\text{ Hz}$." },
            {
              part: "b",
              points: 1,
              description: "Finds $300\\text{ Hz}$ and $500\\text{ Hz}$.",
            },
            {
              part: "c",
              points: 1,
              description:
                "Finds $3.4\\text{ m}$, $1.13\\text{ m}$ and $0.68\\text{ m}$ approximately.",
            },
            {
              part: "d",
              points: 1,
              description: "Explains closed pipe has only odd harmonics.",
            },
          ],
        },
        commonErrors: [
          L`Using open-pipe formula $v/(2L)$.`,
          L`Listing even harmonics for a closed pipe.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`$f_1=v/(4L)=340/(4\times0.85)=100\text{ Hz}$.`,
          },
          {
            part: "b",
            explanation: L`The next two allowed frequencies are $3f_1=300\text{ Hz}$ and $5f_1=500\text{ Hz}$.`,
          },
          {
            part: "c",
            explanation: L`The wavelengths are $340/100=3.4\text{ m}$, $340/300\approx1.13\text{ m}$ and $340/500=0.68\text{ m}$.`,
          },
          {
            part: "d",
            explanation:
              "A closed-open pipe supports only odd harmonics; $200\\text{ Hz}=2f_1$ is an even harmonic and is not allowed.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A sonometer wire gives frequency $256\text{ Hz}$ at length $50\text{ cm}$ under a fixed tension. The same wire is then adjusted under the same tension. Assume frequency is inversely proportional to vibrating length.`,
        difficulty: 5,
        skillTags: [
          "sonometer",
          "harmonics",
          "beats",
          "frequency_length_relation",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Find the frequency if the vibrating length is changed to $40\\text{ cm}$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the length needed for frequency $320\\text{ Hz}$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "If a $256\\text{ Hz}$ fork is sounded with a $252\\text{ Hz}$ wire, find the beat frequency.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown:
              "Explain why increasing the vibrating length lowers the frequency.",
            points: 1,
          },
        ],
        hints: [
          L`Under fixed tension and same wire, $fL=\text{constant}$.`,
          L`Use $256\times50=f\times40$.`,
          L`Beat frequency is the absolute difference between frequencies.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds $320\\text{ Hz}$." },
            { part: "b", points: 1, description: "Finds $40\\text{ cm}$." },
            { part: "c", points: 1, description: "Finds $4\\text{ Hz}$." },
            {
              part: "d",
              points: 1,
              description:
                "Explains longer wavelength/larger length gives smaller frequency for fixed wave speed.",
            },
          ],
        },
        commonErrors: [
          L`Making frequency directly proportional to length.`,
          L`Adding frequencies to find beats.`,
        ],
        workedSolution: [
          {
            part: "a",
            explanation: L`Using $fL=\text{constant}$, $f=256(50/40)=320\text{ Hz}$.`,
          },
          {
            part: "b",
            explanation: L`For $320\text{ Hz}$, $L=256(50)/320=40\text{ cm}$.`,
          },
          {
            part: "c",
            explanation: L`Beat frequency $=|256-252|=4\text{ Hz}$.`,
          },
          {
            part: "d",
            explanation:
              "For the same wire under the same tension, wave speed is fixed. Increasing the vibrating length increases wavelength, so frequency decreases.",
          },
        ],
      },
    ],
    extraConstructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Two tuning forks of frequencies $320\text{ Hz}$ and $326\text{ Hz}$ are sounded together.`,
        difficulty: 1,
        skillTags: ["beats", "frequency_difference"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the beat frequency.`,
            points: 1,
          },
        ],
        hints: [
          L`Beat frequency is the absolute difference.`,
          L`Subtract the frequencies.`,
          L`Use hertz.`,
        ],
        rubric: {
          maxPoints: 1,
          criteria: [
            { part: "a", points: 1, description: L`Finds $6\text{ Hz}$.` },
          ],
        },
        commonErrors: [L`Taking the average instead of the difference.`],
        workedSolution: [
          { part: "a", explanation: L`f_b=|326-320|=6\text{ Hz}.` },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A string fixed at both ends has length $1.0\text{ m}$ and wave speed $200\text{ m s}^{-1}$.`,
        difficulty: 2,
        skillTags: ["string_harmonics", "fundamental_frequency"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the fundamental frequency.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the second harmonic frequency.`,
            points: 1,
          },
        ],
        hints: [
          L`For a fixed string, $f_1=v/(2L)$.`,
          L`The second harmonic is $2f_1$.`,
          L`Use $v=200\text{ m s}^{-1}$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Finds $100\text{ Hz}$.` },
            { part: "b", points: 1, description: L`Finds $200\text{ Hz}$.` },
          ],
        },
        commonErrors: [L`Using $v/L$ as the fundamental frequency.`],
        workedSolution: [
          { part: "a", explanation: L`f_1=200/(2\times1.0)=100\text{ Hz}.` },
          { part: "b", explanation: L`f_2=2f_1=200\text{ Hz}.` },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A closed organ pipe has length $0.85\text{ m}$. Take speed of sound as $340\text{ m s}^{-1}$.`,
        difficulty: 3,
        skillTags: ["closed_pipe", "overtones"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Find the fundamental frequency.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Find the first overtone frequency.`,
            points: 1,
          },
        ],
        hints: [
          L`For a closed pipe, $f_1=v/(4L)$.`,
          L`Closed pipes support odd harmonics.`,
          L`First overtone is $3f_1$.`,
        ],
        rubric: {
          maxPoints: 2,
          criteria: [
            { part: "a", points: 1, description: L`Finds $100\text{ Hz}$.` },
            { part: "b", points: 1, description: L`Finds $300\text{ Hz}$.` },
          ],
        },
        commonErrors: [L`Using the open-pipe formula.`],
        workedSolution: [
          { part: "a", explanation: L`f_1=340/(4\times0.85)=100\text{ Hz}.` },
          {
            part: "b",
            explanation: L`First overtone is $3f_1=300\text{ Hz}$.`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`An open pipe and a closed pipe have the same length $L$ and contain air at the same temperature.`,
        difficulty: 4,
        skillTags: ["open_pipe", "closed_pipe", "frequency_comparison"],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`Write the fundamental frequency of the open pipe.`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`Write the fundamental frequency of the closed pipe.`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Compare the two fundamental frequencies.`,
            points: 1,
          },
        ],
        hints: [
          L`Open pipe: $f=v/(2L)$.`,
          L`Closed pipe: $f=v/(4L)$.`,
          L`Divide the two expressions.`,
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: L`Writes $v/(2L)$.` },
            { part: "b", points: 1, description: L`Writes $v/(4L)$.` },
            {
              part: "c",
              points: 1,
              description:
                "States the open-pipe fundamental is twice the closed-pipe fundamental.",
            },
          ],
        },
        commonErrors: [L`Assuming equal lengths give equal fundamentals.`],
        workedSolution: [
          { part: "a", explanation: L`Open pipe: $f_o=v/(2L)$.` },
          { part: "b", explanation: L`Closed pipe: $f_c=v/(4L)$.` },
          { part: "c", explanation: L`f_o/f_c=2.` },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student compares a tuning fork of unknown frequency with a standard fork of $512\text{ Hz}$. The two forks produce $5$ beats per second. When a small piece of wax is attached to the unknown fork, the beat frequency decreases to $3\text{ Hz}$.`,
        difficulty: 5,
        skillTags: [
          "beats",
          "frequency_identification",
          "experimental_reasoning",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: L`What are the two possible original frequencies?`,
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: L`What does adding wax do to the fork frequency?`,
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: L`Determine the original frequency of the unknown fork.`,
            points: 2,
          },
        ],
        hints: [
          L`A $5\text{ Hz}$ beat means $512\pm5\text{ Hz}$.`,
          L`Adding wax lowers the fork frequency.`,
          L`Use the decrease in beat frequency to choose the higher/lower possibility.`,
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 1,
              description: L`Gives $507\text{ Hz}$ and $517\text{ Hz}$.`,
            },
            {
              part: "b",
              points: 1,
              description: "States frequency decreases.",
            },
            {
              part: "c",
              points: 2,
              description: L`Identifies $517\text{ Hz}$.`,
            },
          ],
        },
        commonErrors: [L`Choosing $507\text{ Hz}$ without using the wax test.`],
        workedSolution: [
          {
            part: "a",
            explanation: L`Possible frequencies are $512\pm5$, i.e. $507\text{ Hz}$ and $517\text{ Hz}$.`,
          },
          { part: "b", explanation: "Adding wax lowers the fork frequency." },
          {
            part: "c",
            explanation: L`If the fork were $507\text{ Hz}$, lowering it would increase beats. Since beats decrease, the fork was originally above $512\text{ Hz}$: $517\text{ Hz}$.`,
          },
        ],
      },
    ],
  },
];

export const oscillationsWavesTopics: Topic[] = topicSeeds.map(makeTopic);
