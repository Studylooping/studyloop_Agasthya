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

const COURSE = "cbse-science-9";
const UNIT = "u3-motion-force-work-sound";
const VERSION = "0.1.2";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;

type Difficulty = 1 | 2 | 3 | 4 | 5;
type McLetter = (typeof LETTERS)[number];
type ResponseType = "vsaq" | "saq" | "laq" | "case";

interface TopicMeta {
  topicCode: string;
  title: string;
  subtopic: string;
}

interface ChoiceSeed {
  text: string;
  correct?: boolean;
  rationale?: string;
  misconceptionTag?: string;
}

interface McSeed {
  questionLatex: string;
  difficulty: Difficulty;
  skillTags: string[];
  commonMisconceptions?: string[];
  figure?: ItemFigure;
  choices: readonly [ChoiceSeed, ChoiceSeed, ChoiceSeed, ChoiceSeed];
  hints: readonly [string, string, string];
  solution: readonly SolutionStep[];
}

interface ConstructedSeed {
  responseType: ResponseType;
  questionLatex: string;
  difficulty: Difficulty;
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

function part(letter: string, promptMarkdown: string, points: number): FrqPart {
  return { letter, promptMarkdown, points };
}

function criterion(
  partLetter: string,
  points: number,
  description: string,
): FrqRubric["criteria"][number] {
  return { part: partLetter, points, description };
}

function rubric(criteria: readonly FrqRubric["criteria"][number][]): FrqRubric {
  return {
    maxPoints: criteria.reduce((sum, item) => sum + item.points, 0),
    criteria: [...criteria],
  };
}

function solutionPart(
  partLetter: string,
  explanation: string,
  math?: string,
): FrqSolutionPart {
  return { part: partLetter, explanation, ...(math ? { math } : {}) };
}

function step(stepNumber: number, explanation: string, math?: string): SolutionStep {
  return { step: stepNumber, explanation, ...(math ? { math } : {}) };
}

function correct(text: string): ChoiceSeed {
  return { text, correct: true };
}

function wrong(
  text: string,
  rationale: string,
  misconceptionTag?: string,
): ChoiceSeed {
  return { text, rationale, ...(misconceptionTag ? { misconceptionTag } : {}) };
}

function calibrateMotionDifficulty({
  difficulty,
  kind,
  responseType,
  questionLatex,
}: {
  difficulty: Difficulty;
  kind: "mc_single" | "frq";
  responseType?: ResponseType;
  questionLatex: string;
}): Difficulty {
  if (responseType === "vsaq") return Math.min(difficulty, 2) as Difficulty;
  if (difficulty <= 2) return difficulty;

  const text = questionLatex.toLowerCase();
  const recallOnly =
    /\b(state|name|identify|which law|which unit|is called|si unit)\b/.test(text) &&
    !/\bcalculate|graph|infer|explain|justify|case|derive|compare|why\b/.test(text);

  if (kind === "mc_single" && difficulty >= 4 && recallOnly) {
    return 3;
  }

  return difficulty;
}

function fallbackWrongRationale(seed: McSeed, choice: ChoiceSeed): string {
  const correctText =
    seed.choices.find((candidate) => candidate.correct)?.text ?? "the correct option";
  const keyStep = [...seed.solution].reverse().find((item) => item.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choice.text}. Recheck the physical quantity, direction, graph, or unit before choosing.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const correctCount = seed.choices.filter((choice) => choice.correct).length;
  if (correctCount !== 1) {
    throw new Error(`${meta.topicCode} MC ${index + 1} must have exactly one correct choice.`);
  }

  const choices = seed.choices.map((choice, choiceIndex) => ({
    letter: LETTERS[choiceIndex],
    text: choice.text,
    isCorrect: Boolean(choice.correct),
    rationaleIfWrong: choice.correct
      ? null
      : (choice.rationale ?? fallbackWrongRationale(seed, choice)),
    misconceptionTag: choice.correct
      ? null
      : (choice.misconceptionTag ??
        "incorrect_cbse_class9_motion_force_work_sound_reasoning"),
  })) as McChoice[];

  const correctLetter =
    choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u3.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateMotionDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_formula_without_matching_quantity_direction_or_graph",
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
    contentId: `${COURSE}.u3.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateMotionDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_formula_without_explaining_quantity_direction_or_energy_change",
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
  const meta: TopicMeta = {
    topicCode: seed.topicCode,
    title: seed.title,
    subtopic: seed.subtopic,
  };

  return {
    ...meta,
    items: [
      ...seed.mc.map((item, index) => makeMc(meta, item, index)),
      ...seed.constructed.map((item, index) =>
        makeConstructed(meta, item, index),
      ),
    ],
  };
}

const positionTimeGraphFigure: ItemFigure = {
  type: "svg",
  title: "Position-time graph with three stages",
  description:
    "A graph of position in metres against time in seconds shows motion from 0 m to 20 m, a rest interval, and return to 0 m.",
  svg: `<svg viewBox="0 0 660 390" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="390" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="90" y1="310" x2="590" y2="310"/>
    <line x1="90" y1="270" x2="590" y2="270"/>
    <line x1="90" y1="230" x2="590" y2="230"/>
    <line x1="90" y1="190" x2="590" y2="190"/>
    <line x1="90" y1="150" x2="590" y2="150"/>
    <line x1="90" y1="110" x2="590" y2="110"/>
    <line x1="90" y1="70" x2="590" y2="70"/>
    <line x1="90" y1="70" x2="90" y2="310"/>
    <line x1="210" y1="70" x2="210" y2="310"/>
    <line x1="390" y1="70" x2="390" y2="310"/>
    <line x1="510" y1="70" x2="510" y2="310"/>
  </g>
  <line x1="90" y1="310" x2="610" y2="310" stroke="#334155" stroke-width="2"/>
  <line x1="90" y1="310" x2="90" y2="45" stroke="#334155" stroke-width="2"/>
  <path d="M90 310 L210 110 L390 110 L510 310" fill="none" stroke="#2563eb" stroke-width="4"/>
  <g fill="#2563eb">
    <circle cx="90" cy="310" r="5"/>
    <circle cx="210" cy="110" r="5"/>
    <circle cx="390" cy="110" r="5"/>
    <circle cx="510" cy="310" r="5"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="14" fill="#0f172a">
    <text x="90" y="334" text-anchor="middle">0</text>
    <text x="210" y="334" text-anchor="middle">2</text>
    <text x="390" y="334" text-anchor="middle">5</text>
    <text x="510" y="334" text-anchor="middle">7</text>
    <text x="65" y="314" text-anchor="end">0</text>
    <text x="65" y="114" text-anchor="end">20</text>
    <text x="350" y="365" text-anchor="middle">time t in s</text>
    <text x="28" y="185" text-anchor="middle" transform="rotate(-90 28 185)">position x in m</text>
    <text x="150" y="190" text-anchor="middle" fill="#1d4ed8">A</text>
    <text x="300" y="95" text-anchor="middle" fill="#1d4ed8">B</text>
    <text x="450" y="190" text-anchor="middle" fill="#1d4ed8">C</text>
  </g>
</svg>`,
};

const velocityTimeGraphFigure: ItemFigure = {
  type: "svg",
  title: "Velocity-time graph for uniformly accelerated motion",
  description:
    "A straight velocity-time graph starts at 5 m/s and reaches 13 m/s at 4 seconds.",
  svg: `<svg viewBox="0 0 640 380" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="640" height="380" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="90" y1="300" x2="560" y2="300"/>
    <line x1="90" y1="260" x2="560" y2="260"/>
    <line x1="90" y1="220" x2="560" y2="220"/>
    <line x1="90" y1="180" x2="560" y2="180"/>
    <line x1="90" y1="140" x2="560" y2="140"/>
    <line x1="90" y1="100" x2="560" y2="100"/>
    <line x1="90" y1="60" x2="560" y2="60"/>
    <line x1="90" y1="60" x2="90" y2="300"/>
    <line x1="210" y1="60" x2="210" y2="300"/>
    <line x1="330" y1="60" x2="330" y2="300"/>
    <line x1="450" y1="60" x2="450" y2="300"/>
  </g>
  <line x1="90" y1="300" x2="585" y2="300" stroke="#334155" stroke-width="2"/>
  <line x1="90" y1="300" x2="90" y2="35" stroke="#334155" stroke-width="2"/>
  <path d="M90 220 L330 92" fill="none" stroke="#16a34a" stroke-width="4"/>
  <path d="M90 300 L90 220 L330 92 L330 300 Z" fill="#bbf7d0" opacity="0.45"/>
  <g fill="#16a34a">
    <circle cx="90" cy="220" r="5"/>
    <circle cx="330" cy="92" r="5"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="14" fill="#0f172a">
    <text x="90" y="324" text-anchor="middle">0</text>
    <text x="210" y="324" text-anchor="middle">2</text>
    <text x="330" y="324" text-anchor="middle">4</text>
    <text x="65" y="304" text-anchor="end">0</text>
    <text x="65" y="224" text-anchor="end">5</text>
    <text x="65" y="96" text-anchor="end">13</text>
    <text x="330" y="355" text-anchor="middle">time t in s</text>
    <text x="28" y="185" text-anchor="middle" transform="rotate(-90 28 185)">velocity v in m/s</text>
  </g>
</svg>`,
};

const forceBlockFigure: ItemFigure = {
  type: "svg",
  title: "Horizontal forces on a block",
  description:
    "A block on a table has a 12 N force to the right and a 5 N force to the left.",
  svg: `<svg viewBox="0 0 620 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="300" fill="#ffffff"/>
  <line x1="80" y1="205" x2="540" y2="205" stroke="#94a3b8" stroke-width="4"/>
  <rect x="250" y="145" width="120" height="60" rx="6" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <text x="310" y="181" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#0f172a">block</text>
  <line x1="370" y1="175" x2="505" y2="175" stroke="#16a34a" stroke-width="5"/>
  <path d="M505 175 L482 163 L482 187 Z" fill="#16a34a"/>
  <line x1="250" y1="175" x2="135" y2="175" stroke="#ef4444" stroke-width="5"/>
  <path d="M135 175 L158 163 L158 187 Z" fill="#ef4444"/>
  <g font-family="Arial, sans-serif" font-size="17" fill="#0f172a">
    <text x="438" y="154" text-anchor="middle">12 N</text>
    <text x="190" y="154" text-anchor="middle">5 N</text>
  </g>
</svg>`,
};

const leverFigure: ItemFigure = {
  type: "svg",
  title: "Lever with load and effort",
  description:
    "A simple lever has a load of 120 N on one side and an effort of 40 N on the other side.",
  svg: `<svg viewBox="0 0 620 300" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="620" height="300" fill="#ffffff"/>
  <polygon points="300,190 335,250 265,250" fill="#fbbf24" stroke="#92400e" stroke-width="2"/>
  <line x1="100" y1="185" x2="520" y2="125" stroke="#334155" stroke-width="8" stroke-linecap="round"/>
  <line x1="165" y1="175" x2="165" y2="235" stroke="#ef4444" stroke-width="4"/>
  <path d="M165 235 L153 214 L177 214 Z" fill="#ef4444"/>
  <line x1="455" y1="135" x2="455" y2="195" stroke="#2563eb" stroke-width="4"/>
  <path d="M455 195 L443 174 L467 174 Z" fill="#2563eb"/>
  <g font-family="Arial, sans-serif" font-size="16" fill="#0f172a">
    <text x="165" y="258" text-anchor="middle">load 120 N</text>
    <text x="455" y="218" text-anchor="middle">effort 40 N</text>
    <text x="300" y="270" text-anchor="middle">fulcrum</text>
  </g>
</svg>`,
};

const soundWaveFigure: ItemFigure = {
  type: "svg",
  title: "Displacement-distance graph of a sound wave",
  description:
    "A sinusoidal wave is drawn against distance with crest-to-crest spacing of 4 m and an amplitude marker.",
  svg: `<svg viewBox="0 0 660 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="660" height="360" fill="#ffffff"/>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="80" y1="180" x2="590" y2="180"/>
    <line x1="80" y1="100" x2="590" y2="100"/>
    <line x1="80" y1="260" x2="590" y2="260"/>
    <line x1="140" y1="70" x2="140" y2="290"/>
    <line x1="260" y1="70" x2="260" y2="290"/>
    <line x1="380" y1="70" x2="380" y2="290"/>
    <line x1="500" y1="70" x2="500" y2="290"/>
  </g>
  <line x1="80" y1="180" x2="610" y2="180" stroke="#334155" stroke-width="2"/>
  <line x1="80" y1="290" x2="80" y2="55" stroke="#334155" stroke-width="2"/>
  <path d="M80 180 C110 100 170 100 200 180 C230 260 290 260 320 180 C350 100 410 100 440 180 C470 260 530 260 560 180" fill="none" stroke="#7c3aed" stroke-width="4"/>
  <line x1="140" y1="100" x2="380" y2="100" stroke="#f97316" stroke-width="3" stroke-dasharray="7 6"/>
  <line x1="80" y1="180" x2="80" y2="100" stroke="#16a34a" stroke-width="3" stroke-dasharray="7 6"/>
  <g font-family="Arial, sans-serif" font-size="14" fill="#0f172a">
    <text x="140" y="314" text-anchor="middle">1 m</text>
    <text x="260" y="314" text-anchor="middle">3 m</text>
    <text x="380" y="314" text-anchor="middle">5 m</text>
    <text x="500" y="314" text-anchor="middle">7 m</text>
    <text x="320" y="335" text-anchor="middle">distance</text>
    <text x="32" y="180" text-anchor="middle" transform="rotate(-90 32 180)">displacement</text>
    <text x="260" y="92" text-anchor="middle" fill="#f97316">one wavelength</text>
    <text x="115" y="128" fill="#16a34a">amplitude</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "3.1",
    title: "Motion and Graphs",
    subtopic:
      "Distance, displacement, speed, velocity, acceleration, position-time graphs and velocity-time graphs.",
    mc: [
      {
        questionLatex:
          "A student walks $30\\,\\text{m}$ east and then $40\\,\\text{m}$ north. The distance travelled and the magnitude of displacement are respectively",
        difficulty: 2,
        skillTags: ["distance_displacement", "pythagorean_displacement"],
        choices: [
          wrong("$50\\,\\text{m}$ and $70\\,\\text{m}$", "This reverses the path length and straight-line result."),
          correct("$70\\,\\text{m}$ and $50\\,\\text{m}$"),
          wrong("$70\\,\\text{m}$ and $70\\,\\text{m}$", "Distance and displacement are equal only for straight-line motion in one direction."),
          wrong("$50\\,\\text{m}$ and $50\\,\\text{m}$", "This ignores the actual path length."),
        ],
        hints: [
          "Distance is the length of the actual path.",
          "Displacement is the straight line from start to end.",
          "Use the right triangle with sides 30 m and 40 m.",
        ],
        solution: [
          step(1, "The distance is the total path length.", "30+40=70\\,\\text{m}"),
          step(2, "The displacement magnitude is the hypotenuse.", "\\sqrt{30^2+40^2}=50\\,\\text{m}"),
        ],
      },
      {
        questionLatex:
          "For the full motion shown in the position-time graph, the average velocity from $0\\,\\text{s}$ to $7\\,\\text{s}$ is",
        difficulty: 3,
        skillTags: ["position_time_graph", "average_velocity"],
        figure: positionTimeGraphFigure,
        choices: [
          correct("$0\\,\\text{m/s}$"),
          wrong("$\\frac{20}{7}\\,\\text{m/s}$", "This uses maximum position instead of net displacement."),
          wrong("$\\frac{40}{7}\\,\\text{m/s}$", "This is average speed, not average velocity."),
          wrong("$10\\,\\text{m/s}$", "This uses only the first segment and ignores the return."),
        ],
        hints: [
          "Average velocity uses displacement, not total distance.",
          "Read the initial and final positions from the graph.",
          "The object starts and ends at the same position.",
        ],
        solution: [
          step(1, "Initial and final positions are both zero.", "\\Delta x=0-0=0"),
          step(2, "Average velocity is displacement divided by time.", "\\bar v=0/7=0\\,\\text{m/s}"),
        ],
      },
      {
        questionLatex:
          "In the position-time graph, during which labelled part is the object at rest?",
        difficulty: 2,
        skillTags: ["position_time_graph", "rest_condition"],
        figure: positionTimeGraphFigure,
        choices: [
          wrong("Part A", "Part A has a positive slope, so position changes with time."),
          correct("Part B"),
          wrong("Part C", "Part C has a negative slope, so the object is moving back."),
          wrong("All three parts", "Only a horizontal position-time segment represents rest."),
        ],
        hints: [
          "At rest means position does not change.",
          "Look for a horizontal segment.",
          "The graph is flat from 2 s to 5 s.",
        ],
        solution: [
          step(1, "The horizontal part has zero slope and constant position."),
          step(2, "Part B is horizontal, so the object is at rest during B."),
        ],
      },
      {
        questionLatex:
          "From the velocity-time graph, the acceleration during the shown interval is",
        difficulty: 3,
        skillTags: ["velocity_time_graph", "acceleration"],
        figure: velocityTimeGraphFigure,
        choices: [
          correct("$2\\,\\text{m/s}^2$"),
          wrong("$8\\,\\text{m/s}^2$", "This uses the change in velocity but does not divide by time."),
          wrong("$4.5\\,\\text{m/s}^2$", "This averages the two velocities instead of finding slope."),
          wrong("$18\\,\\text{m/s}^2$", "This adds velocities; acceleration depends on change per unit time."),
        ],
        hints: [
          "Acceleration is the slope of a velocity-time graph.",
          "Velocity changes from 5 m/s to 13 m/s.",
          "Divide the change in velocity by 4 s.",
        ],
        solution: [
          step(1, "The change in velocity is $13-5=8\\,\\text{m/s}$."),
          step(2, "Acceleration is slope.", "a=\\frac{13-5}{4}=2\\,\\text{m/s}^2"),
        ],
      },
      {
        questionLatex:
          "The displacement represented by the velocity-time graph from $0$ to $4\\,\\text{s}$ is",
        difficulty: 3,
        skillTags: ["velocity_time_graph", "area_under_graph"],
        figure: velocityTimeGraphFigure,
        choices: [
          correct("$36\\,\\text{m}$"),
          wrong("$32\\,\\text{m}$", "This uses only the change in velocity as the height."),
          wrong("$52\\,\\text{m}$", "This multiplies final velocity by time, ignoring the initial velocity."),
          wrong("$8\\,\\text{m}$", "This is the change in velocity, not displacement."),
        ],
        hints: [
          "Displacement is area under a velocity-time graph.",
          "The shape is a trapezium.",
          "Use average velocity times time.",
        ],
        solution: [
          step(1, "Average velocity for uniform acceleration is", "\\frac{5+13}{2}=9\\,\\text{m/s}"),
          step(2, "Displacement is average velocity times time.", "s=9\\times 4=36\\,\\text{m}"),
        ],
      },
      {
        questionLatex:
          "Assertion (A): The slope of a position-time graph gives velocity. Reason (R): Velocity measures the rate of change of displacement with time. Choose the correct option.",
        difficulty: 3,
        skillTags: ["assertion_reason", "position_time_graph", "velocity_definition"],
        choices: [
          wrong("Both A and R are true, but R is not the correct explanation of A.", "The reason directly explains why slope gives velocity."),
          wrong("A is true, but R is false.", "The reason is the definition of velocity."),
          wrong("A is false, but R is true.", "The assertion is true for a position-time graph."),
          correct("Both A and R are true, and R is the correct explanation of A."),
        ],
        hints: [
          "Slope means change in vertical quantity divided by change in horizontal quantity.",
          "On a position-time graph, the vertical quantity is displacement/position.",
          "Compare this with the definition of velocity.",
        ],
        solution: [
          step(1, "Slope of a position-time graph is", "\\frac{\\Delta x}{\\Delta t}"),
          step(2, "This is velocity, so both statements are true and R explains A."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "State the SI unit of acceleration.",
        difficulty: 1,
        skillTags: ["acceleration_unit"],
        parts: [part("a", "Write the SI unit.", 1)],
        hints: [
          "Acceleration is change in velocity per unit time.",
          "Velocity is measured in metre per second.",
          "Divide metre per second by second.",
        ],
        rubric: rubric([criterion("a", 1, "Writes $\\text{m/s}^2$ or metre per second squared.")]),
        commonErrors: ["Writing $\\text{m/s}$, which is the unit of velocity."],
        workedSolution: [
          solutionPart("a", "The SI unit of acceleration is metre per second squared.", "\\text{m/s}^2"),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Use the position-time graph to find the average speed and average velocity for the full $7\\,\\text{s}$ motion.",
        difficulty: 3,
        skillTags: ["position_time_graph", "average_speed", "average_velocity"],
        figure: positionTimeGraphFigure,
        parts: [
          part("a", "Find the total distance travelled.", 1),
          part("b", "Find average speed and average velocity.", 2),
        ],
        hints: [
          "Distance counts the forward and return parts of the journey.",
          "Velocity uses net displacement.",
          "The graph begins and ends at 0 m.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds total distance as $40\\,\\text{m}$."),
          criterion("b", 1, "Finds average speed as $40/7\\,\\text{m/s}$."),
          criterion("b", 1, "Finds average velocity as $0\\,\\text{m/s}$."),
        ]),
        commonErrors: [
          "Using displacement instead of distance for average speed.",
          "Calling $40/7\\,\\text{m/s}$ the average velocity.",
        ],
        workedSolution: [
          solutionPart("a", "The object moves from 0 m to 20 m and later from 20 m back to 0 m.", "20+20=40\\,\\text{m}"),
          solutionPart("b", "Average speed is total distance divided by total time.", "\\frac{40}{7}\\,\\text{m/s}"),
          solutionPart("b", "Net displacement is zero, so average velocity is zero.", "\\frac{0}{7}=0\\,\\text{m/s}"),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "From the velocity-time graph, calculate the acceleration and displacement in the first $4\\,\\text{s}$.",
        difficulty: 3,
        skillTags: ["velocity_time_graph", "acceleration", "area_under_graph"],
        figure: velocityTimeGraphFigure,
        parts: [
          part("a", "Calculate acceleration.", 1),
          part("b", "Calculate displacement.", 2),
        ],
        hints: [
          "Acceleration is slope.",
          "Displacement is area under the velocity-time graph.",
          "Use the trapezium area or average velocity.",
        ],
        rubric: rubric([
          criterion("a", 1, "Calculates acceleration as $2\\,\\text{m/s}^2$."),
          criterion("b", 1, "Uses the correct area or average velocity method."),
          criterion("b", 1, "Gets displacement as $36\\,\\text{m}$."),
        ]),
        commonErrors: [
          "Treating area under a velocity-time graph as acceleration.",
          "Using only final velocity times time.",
        ],
        workedSolution: [
          solutionPart("a", "Acceleration is change in velocity divided by time.", "\\frac{13-5}{4}=2\\,\\text{m/s}^2"),
          solutionPart("b", "Displacement is the area under the graph.", "\\frac{1}{2}(5+13)\\times 4=36\\,\\text{m}"),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "A uniformly accelerated object has initial velocity $u$, acceleration $a$ and velocity $v$ after time $t$. Use a velocity-time graph idea to obtain two equations of motion.",
        difficulty: 4,
        skillTags: ["equations_of_motion", "graphical_derivation"],
        parts: [
          part("a", "Write the slope relation and obtain $v=u+at$.", 2),
          part("b", "Use area under the graph to obtain $s=ut+\\frac{1}{2}at^2$.", 3),
        ],
        hints: [
          "On a velocity-time graph, slope gives acceleration.",
          "Displacement is area under the graph.",
          "The area can be split into a rectangle and a triangle.",
        ],
        rubric: rubric([
          criterion("a", 1, "Uses slope of velocity-time graph correctly."),
          criterion("a", 1, "Derives $v=u+at$."),
          criterion("b", 1, "States that displacement is area under the graph."),
          criterion("b", 1, "Separates the area into rectangle and triangle."),
          criterion("b", 1, "Derives $s=ut+\\frac{1}{2}at^2$."),
        ]),
        commonErrors: [
          "Using distance-time graph slope instead of velocity-time graph slope.",
          "Forgetting the triangular area term.",
        ],
        workedSolution: [
          solutionPart("a", "Acceleration is the slope of the velocity-time graph.", "a=\\frac{v-u}{t}"),
          solutionPart("a", "Rearranging gives", "v=u+at"),
          solutionPart("b", "Displacement is area under the velocity-time graph.", "s=ut+\\frac{1}{2}(v-u)t"),
          solutionPart("b", "Using $v-u=at$,", "s=ut+\\frac{1}{2}at^2"),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A runner moves $100\\,\\text{m}$ east and then $60\\,\\text{m}$ west along the same straight track in $20\\,\\text{s}$.",
        difficulty: 3,
        skillTags: ["distance_displacement", "average_speed", "average_velocity"],
        parts: [
          part("a", "Find the total distance travelled.", 1),
          part("b", "Find the displacement, taking east as positive.", 1),
          part("c", "Find average speed.", 1),
          part("d", "Find average velocity.", 1),
        ],
        hints: [
          "Distance adds path lengths.",
          "Displacement keeps direction.",
          "Divide by total time only after choosing distance or displacement.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds distance as $160\\,\\text{m}$."),
          criterion("b", 1, "Finds displacement as $40\\,\\text{m}$ east."),
          criterion("c", 1, "Finds average speed as $8\\,\\text{m/s}$."),
          criterion("d", 1, "Finds average velocity as $2\\,\\text{m/s}$ east."),
        ]),
        commonErrors: [
          "Subtracting distances for average speed.",
          "Dropping direction from velocity.",
        ],
        workedSolution: [
          solutionPart("a", "The total path length is", "100+60=160\\,\\text{m}"),
          solutionPart("b", "Taking east as positive, displacement is", "100-60=40\\,\\text{m east}"),
          solutionPart("c", "Average speed is", "\\frac{160}{20}=8\\,\\text{m/s}"),
          solutionPart("d", "Average velocity is", "\\frac{40}{20}=2\\,\\text{m/s east}"),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A distance-time graph for a car is a straight line through the origin. What does this tell you about the car's motion? Explain using the graph.",
        difficulty: 2,
        skillTags: ["distance_time_graph", "uniform_motion"],
        parts: [part("a", "Interpret the graph in terms of speed.", 2)],
        hints: [
          "A straight line has constant slope.",
          "In a distance-time graph, slope represents speed.",
          "Through the origin means distance is zero at time zero.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that the car has uniform speed."),
          criterion("a", 1, "Explains using constant slope of the distance-time graph."),
        ]),
        commonErrors: [
          "Saying straight line always means acceleration.",
          "Ignoring the meaning of slope.",
        ],
        workedSolution: [
          solutionPart("a", "The car is moving with uniform speed because the distance-time graph has a constant slope. Equal increases in time give equal increases in distance."),
        ],
      },
    ],
  },
  {
    topicCode: "3.2",
    title: "Equations of Motion and Circular Motion",
    subtopic:
      "Kinematic equations for uniformly accelerated motion and elementary uniform circular motion.",
    mc: [
      {
        questionLatex:
          "A scooter starts from rest and accelerates uniformly at $2\\,\\text{m/s}^2$ for $5\\,\\text{s}$. The distance covered is",
        difficulty: 2,
        skillTags: ["equations_of_motion", "uniform_acceleration"],
        choices: [
          correct("$25\\,\\text{m}$"),
          wrong("$10\\,\\text{m}$", "This is the final speed, not the distance."),
          wrong("$50\\,\\text{m}$", "This misses the factor $\\frac{1}{2}$ for motion from rest."),
          wrong("$20\\,\\text{m}$", "This multiplies acceleration and time twice incorrectly."),
        ],
        hints: [
          "The scooter starts from rest, so $u=0$.",
          "Use $s=ut+\\frac{1}{2}at^2$.",
          "Substitute $a=2$ and $t=5$.",
        ],
        solution: [
          step(1, "Use the equation of motion.", "s=0+\\frac{1}{2}(2)(5^2)=25\\,\\text{m}"),
        ],
      },
      {
        questionLatex:
          "A body moving at $10\\,\\text{m/s}$ is uniformly retarded at $2\\,\\text{m/s}^2$. The time taken to stop is",
        difficulty: 2,
        skillTags: ["retardation", "equations_of_motion"],
        choices: [
          wrong("$2\\,\\text{s}$", "This uses acceleration as if it were the final velocity."),
          correct("$5\\,\\text{s}$"),
          wrong("$8\\,\\text{s}$", "This adds the numbers instead of using $v=u+at$."),
          wrong("$20\\,\\text{s}$", "This multiplies speed and retardation instead of dividing."),
        ],
        hints: [
          "At stopping, final velocity is zero.",
          "Retardation means acceleration is opposite to motion.",
          "Use $v=u+at$.",
        ],
        solution: [
          step(1, "Take $u=10\\,\\text{m/s}$, $v=0$, and $a=-2\\,\\text{m/s}^2$.", "0=10-2t"),
          step(2, "Solving gives", "t=5\\,\\text{s}"),
        ],
      },
      {
        questionLatex:
          "Which equation of motion directly relates $u$, $v$, $a$ and $s$ without time?",
        difficulty: 1,
        skillTags: ["equations_of_motion"],
        choices: [
          correct("$v^2-u^2=2as$"),
          wrong("$v=u+at$", "This equation includes time."),
          wrong("$s=ut+\\frac{1}{2}at^2$", "This equation includes time."),
          wrong("$s=\\frac{u+v}{2}$", "This is dimensionally incomplete because time is missing."),
        ],
        hints: [
          "The required equation should not contain $t$.",
          "Look for the equation with squared velocities.",
          "It connects displacement directly with acceleration.",
        ],
        solution: [
          step(1, "The equation without time is", "v^2-u^2=2as"),
        ],
      },
      {
        questionLatex:
          "In uniform circular motion, the speed may remain constant but the motion is still accelerated because",
        difficulty: 2,
        skillTags: ["uniform_circular_motion", "velocity_direction"],
        choices: [
          wrong("the distance travelled in each second is unequal", "In uniform circular motion, equal distances are covered in equal times."),
          correct("the direction of velocity changes continuously"),
          wrong("the mass changes continuously", "Mass is not changing in this description."),
          wrong("the radius becomes zero", "The radius remains fixed for a circular path."),
        ],
        hints: [
          "Velocity has both magnitude and direction.",
          "In circular motion, the tangent direction keeps changing.",
          "Acceleration means change in velocity, not only change in speed.",
        ],
        solution: [
          step(1, "Even if speed is constant, velocity changes because its direction changes."),
          step(2, "Therefore uniform circular motion is accelerated motion."),
        ],
      },
      {
        questionLatex:
          "A wheel of radius $0.5\\,\\text{m}$ makes $10$ revolutions in $5\\,\\text{s}$. Taking the distance in one revolution as $2\\pi r$, the speed of a point on its rim is",
        difficulty: 3,
        skillTags: ["uniform_circular_motion", "speed_calculation"],
        choices: [
          wrong("$\\pi\\,\\text{m/s}$", "This is the distance in one revolution, not distance per second for 10 revolutions."),
          wrong("$10\\pi\\,\\text{m/s}$", "This forgets to divide by the total time."),
          correct("$2\\pi\\,\\text{m/s}$"),
          wrong("$5\\pi\\,\\text{m/s}$", "This uses the number of seconds incorrectly."),
        ],
        hints: [
          "Find circumference first.",
          "Multiply by the number of revolutions.",
          "Divide total distance by total time.",
        ],
        solution: [
          step(1, "Distance in one revolution is", "2\\pi r=2\\pi(0.5)=\\pi\\,\\text{m}"),
          step(2, "Total distance in 10 revolutions is $10\\pi\\,\\text{m}$, so speed is", "\\frac{10\\pi}{5}=2\\pi\\,\\text{m/s}"),
        ],
      },
      {
        questionLatex:
          "A train moving at $4\\,\\text{m/s}$ accelerates uniformly at $2\\,\\text{m/s}^2$ for $6\\,\\text{s}$. Its final velocity is",
        difficulty: 2,
        skillTags: ["equations_of_motion", "final_velocity"],
        choices: [
          wrong("$12\\,\\text{m/s}$", "This uses only $at$ and ignores the initial velocity."),
          wrong("$10\\,\\text{m/s}$", "This adds the given numbers directly instead of using acceleration times time."),
          wrong("$24\\,\\text{m/s}$", "This multiplies the initial velocity by time."),
          correct("$16\\,\\text{m/s}$"),
        ],
        hints: [
          "Use $v=u+at$.",
          "Here $u=4$, $a=2$, $t=6$.",
          "Add the velocity gained to the initial velocity.",
        ],
        solution: [
          step(1, "The velocity gained is $at=2\\times 6=12\\,\\text{m/s}$."),
          step(2, "Final velocity is", "v=4+12=16\\,\\text{m/s}"),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "What is meant by uniform circular motion?",
        difficulty: 1,
        skillTags: ["uniform_circular_motion"],
        parts: [part("a", "Define the term.", 1)],
        hints: [
          "The path is circular.",
          "The speed is constant.",
          "Velocity direction still changes.",
        ],
        rubric: rubric([criterion("a", 1, "Defines it as motion along a circular path with constant speed.")]),
        commonErrors: ["Saying velocity is constant instead of speed."],
        workedSolution: [
          solutionPart("a", "Uniform circular motion is motion along a circular path with constant speed."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A train has $u=5\\,\\text{m/s}$ and $a=1.5\\,\\text{m/s}^2$ for $8\\,\\text{s}$. Calculate its final velocity and displacement.",
        difficulty: 3,
        skillTags: ["equations_of_motion", "displacement"],
        parts: [
          part("a", "Find final velocity.", 1),
          part("b", "Find displacement.", 2),
        ],
        hints: [
          "Use $v=u+at$ for final velocity.",
          "Use $s=ut+\\frac{1}{2}at^2$ for displacement.",
          "Keep units with each answer.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds $v=17\\,\\text{m/s}$."),
          criterion("b", 1, "Uses correct displacement equation."),
          criterion("b", 1, "Finds $s=88\\,\\text{m}$."),
        ]),
        commonErrors: [
          "Using final velocity times time for uniformly accelerated motion.",
          "Forgetting the half in $\\frac{1}{2}at^2$.",
        ],
        workedSolution: [
          solutionPart("a", "Final velocity is", "v=5+1.5(8)=17\\,\\text{m/s}"),
          solutionPart("b", "Displacement is", "s=5(8)+\\frac{1}{2}(1.5)(8^2)=40+48=88\\,\\text{m}"),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A car moving at $20\\,\\text{m/s}$ is brought to rest with uniform retardation $4\\,\\text{m/s}^2$. Find the stopping distance.",
        difficulty: 3,
        skillTags: ["retardation", "stopping_distance"],
        parts: [part("a", "Calculate the stopping distance.", 3)],
        hints: [
          "Final velocity is zero.",
          "Use the equation without time.",
          "Retardation means acceleration is negative.",
        ],
        rubric: rubric([
          criterion("a", 1, "Uses $v^2-u^2=2as$ with correct signs."),
          criterion("a", 1, "Substitutes $v=0$, $u=20$, $a=-4$."),
          criterion("a", 1, "Finds stopping distance as $50\\,\\text{m}$."),
        ]),
        commonErrors: [
          "Using $a=+4\\,\\text{m/s}^2$ while the car is slowing down.",
          "Reporting negative distance.",
        ],
        workedSolution: [
          solutionPart("a", "Use $v^2-u^2=2as$.", "0^2-20^2=2(-4)s"),
          solutionPart("a", "Solving gives", "-400=-8s,\\quad s=50\\,\\text{m}"),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A car starts from rest and accelerates at $2\\,\\text{m/s}^2$ for $6\\,\\text{s}$. A second car moves uniformly at $8\\,\\text{m/s}$ for the same time. Which car is ahead and by how much?",
        difficulty: 4,
        skillTags: ["comparison_motion", "equations_of_motion", "uniform_motion"],
        parts: [
          part("a", "Find the distance travelled by the accelerating car.", 2),
          part("b", "Find the distance travelled by the uniform car and compare.", 2),
        ],
        hints: [
          "For the first car, use accelerated motion from rest.",
          "For the second car, use distance equals speed times time.",
          "Compare the two distances, not the final speeds.",
        ],
        rubric: rubric([
          criterion("a", 1, "Uses $s=\\frac{1}{2}at^2$ for the first car."),
          criterion("a", 1, "Gets $36\\,\\text{m}$."),
          criterion("b", 1, "Gets $48\\,\\text{m}$ for the second car."),
          criterion("b", 1, "States that the second car is ahead by $12\\,\\text{m}$."),
        ]),
        commonErrors: [
          "Comparing only final speeds.",
          "Using $s=at$ for the accelerating car.",
        ],
        workedSolution: [
          solutionPart("a", "For the accelerating car:", "s=\\frac{1}{2}(2)(6^2)=36\\,\\text{m}"),
          solutionPart("b", "For the uniform car:", "s=8\\times 6=48\\,\\text{m}"),
          solutionPart("b", "The second car is ahead by", "48-36=12\\,\\text{m}"),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A child runs $5$ complete rounds of a circular track of radius $14\\,\\text{m}$ in $120\\,\\text{s}$. Take $\\pi=22/7$.",
        difficulty: 3,
        skillTags: ["uniform_circular_motion", "distance_displacement", "average_speed"],
        parts: [
          part("a", "Find the distance covered in one round.", 1),
          part("b", "Find the total distance covered.", 1),
          part("c", "Find the average speed.", 1),
          part("d", "Find the displacement after 5 complete rounds.", 1),
        ],
        hints: [
          "One round is the circumference.",
          "After a complete number of rounds, the child returns to the starting point.",
          "Average speed uses total distance.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds circumference as $88\\,\\text{m}$."),
          criterion("b", 1, "Finds total distance as $440\\,\\text{m}$."),
          criterion("c", 1, "Finds average speed as $11/3\\,\\text{m/s}$."),
          criterion("d", 1, "States displacement as zero."),
        ]),
        commonErrors: [
          "Treating distance and displacement as equal after complete rounds.",
          "Forgetting to multiply by 5 rounds.",
        ],
        workedSolution: [
          solutionPart("a", "Distance in one round is", "2\\pi r=2\\times\\frac{22}{7}\\times 14=88\\,\\text{m}"),
          solutionPart("b", "Total distance is", "5\\times 88=440\\,\\text{m}"),
          solutionPart("c", "Average speed is", "\\frac{440}{120}=\\frac{11}{3}\\,\\text{m/s}"),
          solutionPart("d", "After 5 complete rounds, the child is back at the starting point, so displacement is zero."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Why is a body moving with constant speed in a circle not said to have constant velocity?",
        difficulty: 2,
        skillTags: ["uniform_circular_motion", "velocity_direction"],
        parts: [part("a", "Explain in terms of velocity.", 2)],
        hints: [
          "Velocity is a vector.",
          "A vector has direction as well as magnitude.",
          "The direction of motion along a circle changes continuously.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that velocity has direction."),
          criterion("a", 1, "Explains that the direction changes continuously in circular motion."),
        ]),
        commonErrors: ["Saying constant speed automatically means constant velocity."],
        workedSolution: [
          solutionPart("a", "Velocity includes direction. In circular motion the direction of motion keeps changing, so the velocity changes even when speed is constant."),
        ],
      },
    ],
  },
  {
    topicCode: "3.3",
    title: "Force, Friction and Newton's Laws",
    subtopic:
      "Balanced and unbalanced forces, friction, inertia, Newton's laws and force from mass and acceleration.",
    mc: [
      {
        questionLatex:
          "For the forces shown on the block, the net horizontal force is",
        difficulty: 2,
        skillTags: ["net_force", "force_direction"],
        figure: forceBlockFigure,
        choices: [
          wrong("$17\\,\\text{N}$ to the right", "This adds opposite forces instead of subtracting them."),
          wrong("$7\\,\\text{N}$ to the left", "The larger force is to the right."),
          correct("$7\\,\\text{N}$ to the right"),
          wrong("$0\\,\\text{N}$", "The forces are not equal, so they are not balanced."),
        ],
        hints: [
          "Opposite forces are subtracted.",
          "The rightward force is larger.",
          "Net force has both magnitude and direction.",
        ],
        solution: [
          step(1, "Net force is right force minus left force.", "12-5=7\\,\\text{N}"),
          step(2, "The direction is to the right because 12 N is larger than 5 N."),
        ],
      },
      {
        questionLatex:
          "A box is moving with constant velocity on a horizontal floor. Which statement is most consistent with Newton's first law?",
        difficulty: 2,
        skillTags: ["newtons_first_law", "balanced_forces"],
        choices: [
          wrong("The net force must be in the direction of motion.", "A net force would change velocity."),
          correct("The net force on the box is zero."),
          wrong("There is no friction anywhere on the box.", "Friction may be present but balanced by another force."),
          wrong("The box must be gaining speed.", "Constant velocity means speed and direction are unchanged."),
        ],
        hints: [
          "Constant velocity means no acceleration.",
          "Newton's first law links no acceleration with zero net force.",
          "Individual forces can exist and still balance.",
        ],
        solution: [
          step(1, "For constant velocity, acceleration is zero."),
          step(2, "Since $F=ma$, the net force is zero."),
        ],
      },
      {
        questionLatex:
          "A force gives a $4\\,\\text{kg}$ trolley an acceleration of $3\\,\\text{m/s}^2$. The force is",
        difficulty: 2,
        skillTags: ["newtons_second_law", "force_calculation"],
        choices: [
          wrong("$7\\,\\text{N}$", "This adds mass and acceleration."),
          wrong("$1.33\\,\\text{N}$", "This divides mass by acceleration."),
          wrong("$0.75\\,\\text{N}$", "This divides acceleration by mass."),
          correct("$12\\,\\text{N}$"),
        ],
        hints: [
          "Use Newton's second law.",
          "Force equals mass times acceleration.",
          "Multiply 4 by 3.",
        ],
        solution: [
          step(1, "By Newton's second law,", "F=ma=4\\times 3=12\\,\\text{N}"),
        ],
      },
      {
        questionLatex:
          "A loaded truck is harder to start or stop than an empty truck mainly because the loaded truck has greater",
        difficulty: 2,
        skillTags: ["inertia", "mass"],
        choices: [
          correct("inertia"),
          wrong("speed in every situation", "The comparison is about resistance to change, not guaranteed speed."),
          wrong("volume only", "Volume is not the direct reason for resistance to change in motion."),
          wrong("frictionless motion", "A loaded truck is not frictionless."),
        ],
        hints: [
          "Inertia is resistance to change in state of motion.",
          "Inertia increases with mass.",
          "A loaded truck has more mass.",
        ],
        solution: [
          step(1, "Greater mass means greater inertia."),
          step(2, "The loaded truck resists changes in motion more strongly."),
        ],
      },
      {
        questionLatex:
          "When a person jumps from a boat to the shore, the boat moves backward. This is best explained by",
        difficulty: 3,
        skillTags: ["newtons_third_law", "real_life_application"],
        choices: [
          wrong("only friction between boat and water", "Friction may affect the motion but does not explain the paired push."),
          wrong("Newton's first law only", "The situation involves two bodies exerting forces on each other."),
          correct("Newton's third law of motion"),
          wrong("the law of conservation of energy only", "The key idea is action and reaction forces."),
        ],
        hints: [
          "The person pushes the boat backward.",
          "The boat pushes the person forward.",
          "These forces form an action-reaction pair.",
        ],
        solution: [
          step(1, "The person exerts a backward force on the boat."),
          step(2, "The boat exerts an equal and opposite force on the person, showing Newton's third law."),
        ],
      },
      {
        questionLatex:
          "Assertion (A): Action and reaction forces do not cancel each other. Reason (R): Action and reaction forces act on two different bodies. Choose the correct option.",
        difficulty: 3,
        skillTags: ["assertion_reason", "newtons_third_law"],
        choices: [
          wrong("A is true, but R is false.", "The reason is true; the forces act on different bodies."),
          wrong("Both A and R are true, but R is not the correct explanation of A.", "The reason directly explains why they do not cancel."),
          wrong("A is false, but R is true.", "The assertion is true because the two forces are on different bodies."),
          correct("Both A and R are true, and R is the correct explanation of A."),
        ],
        hints: [
          "For cancellation on one object, forces must act on the same object.",
          "Action and reaction forces are equal and opposite.",
          "But they act on different bodies.",
        ],
        solution: [
          step(1, "Action and reaction forces act on different bodies."),
          step(2, "Therefore they do not cancel each other on a single body."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Define one newton of force.",
        difficulty: 1,
        skillTags: ["newton_unit", "force_unit"],
        parts: [part("a", "Write the definition.", 1)],
        hints: [
          "Use Newton's second law.",
          "Think of a mass of 1 kg.",
          "The acceleration should be $1\\,\\text{m/s}^2$.",
        ],
        rubric: rubric([criterion("a", 1, "Defines one newton as the force that gives $1\\,\\text{kg}$ a $1\\,\\text{m/s}^2$ acceleration.")]),
        commonErrors: ["Writing only that newton is a unit without defining it."],
        workedSolution: [
          solutionPart("a", "One newton is the force that produces an acceleration of $1\\,\\text{m/s}^2$ in a mass of $1\\,\\text{kg}$."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "For the block in the figure, find the net force. If the block has mass $2\\,\\text{kg}$, find its acceleration.",
        difficulty: 3,
        skillTags: ["net_force", "newtons_second_law"],
        figure: forceBlockFigure,
        parts: [
          part("a", "Find the net force with direction.", 1),
          part("b", "Find the acceleration.", 2),
        ],
        hints: [
          "Subtract opposite forces.",
          "Direction is toward the larger force.",
          "Use $a=F/m$.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds net force as $7\\,\\text{N}$ to the right."),
          criterion("b", 1, "Uses $a=F/m$."),
          criterion("b", 1, "Finds acceleration as $3.5\\,\\text{m/s}^2$ to the right."),
        ]),
        commonErrors: [
          "Adding opposite forces.",
          "Forgetting the direction of acceleration.",
        ],
        workedSolution: [
          solutionPart("a", "Net force is", "12-5=7\\,\\text{N}\\text{ to the right}"),
          solutionPart("b", "Acceleration is", "a=\\frac{F}{m}=\\frac{7}{2}=3.5\\,\\text{m/s}^2"),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "In a trolley experiment, the same pulling force is applied first to one trolley and then to two identical trolleys joined together. Predict how the acceleration changes and explain why.",
        difficulty: 3,
        skillTags: ["newtons_second_law", "experimental_reasoning"],
        parts: [part("a", "Predict and explain the change in acceleration.", 3)],
        hints: [
          "The applied force is unchanged.",
          "The mass increases when two trolleys are joined.",
          "Use $a=F/m$.",
        ],
        rubric: rubric([
          criterion("a", 1, "Predicts that acceleration decreases."),
          criterion("a", 1, "States that mass has increased."),
          criterion("a", 1, "Links the prediction to $a=F/m$ for the same force."),
        ]),
        commonErrors: [
          "Saying acceleration increases because there are more trolleys.",
          "Ignoring the condition that force is the same.",
        ],
        workedSolution: [
          solutionPart("a", "The acceleration decreases. For the same pulling force, increasing the mass makes $a=F/m$ smaller, so two joined trolleys accelerate less than one trolley."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A passenger standing in a bus falls forward when the moving bus suddenly stops. Explain using inertia.",
        difficulty: 2,
        skillTags: ["inertia", "real_life_application"],
        parts: [part("a", "Explain the observation.", 2)],
        hints: [
          "Before stopping, the passenger's body is moving with the bus.",
          "The feet stop suddenly with the bus floor.",
          "The upper body tends to continue moving forward.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that the body tends to continue its state of motion."),
          criterion("a", 1, "Connects the forward fall to inertia when the bus stops."),
        ]),
        commonErrors: [
          "Saying a forward force appears without explaining inertia.",
          "Confusing this with Newton's third law.",
        ],
        workedSolution: [
          solutionPart("a", "When the bus stops, the feet stop with the bus floor but the upper body tends to keep moving forward due to inertia of motion. Hence the passenger falls forward."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A student pushes a $3\\,\\text{kg}$ box with a horizontal force of $15\\,\\text{N}$. Friction from the floor is $6\\,\\text{N}$ opposite to the push.",
        difficulty: 4,
        skillTags: ["friction", "net_force", "newtons_second_law"],
        parts: [
          part("a", "Find the net force on the box.", 1),
          part("b", "Find the acceleration.", 1),
          part("c", "State how the acceleration would change if the floor were rougher.", 1),
          part("d", "Explain why friction is not always useless.", 1),
        ],
        hints: [
          "Friction acts opposite to motion or attempted motion.",
          "Use net force in $F=ma$.",
          "A rougher floor gives larger friction.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds net force as $9\\,\\text{N}$."),
          criterion("b", 1, "Finds acceleration as $3\\,\\text{m/s}^2$."),
          criterion("c", 1, "States that acceleration would decrease."),
          criterion("d", 1, "Gives a valid useful role of friction, such as walking or braking."),
        ]),
        commonErrors: [
          "Using applied force instead of net force.",
          "Calling friction always harmful.",
        ],
        workedSolution: [
          solutionPart("a", "The net force is", "15-6=9\\,\\text{N}"),
          solutionPart("b", "Acceleration is", "a=\\frac{9}{3}=3\\,\\text{m/s}^2"),
          solutionPart("c", "If the floor were rougher, friction would be larger, so net force and acceleration would decrease."),
          solutionPart("d", "Friction is useful in walking, writing, holding objects and applying brakes."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A cricketer moves his hands backward while catching a fast ball. Explain how this reduces the force on his hands.",
        difficulty: 3,
        skillTags: ["newtons_second_law", "rate_of_change_of_velocity", "sports_application"],
        parts: [part("a", "Explain the physics of the catching technique.", 3)],
        hints: [
          "The ball's velocity must be reduced to zero.",
          "Moving hands backward increases the stopping time.",
          "For the same change in motion, longer time means smaller force.",
        ],
        rubric: rubric([
          criterion("a", 1, "States that the ball is brought to rest."),
          criterion("a", 1, "States that moving hands backward increases stopping time."),
          criterion("a", 1, "Explains that force is reduced when the change happens over a longer time."),
        ]),
        commonErrors: [
          "Saying the ball has less mass after catching.",
          "Ignoring the change in stopping time.",
        ],
        workedSolution: [
          solutionPart("a", "The ball must be brought from high speed to rest. By moving his hands backward, the cricketer increases the time over which the ball is stopped. The same change in motion occurs over a longer time, so the force on the hands is smaller."),
        ],
      },
    ],
  },
  {
    topicCode: "3.4",
    title: "Work, Energy, Power and Simple Machines",
    subtopic:
      "Work done by a constant force, kinetic energy, potential energy, conservation of energy, power and mechanical advantage.",
    mc: [
      {
        questionLatex:
          "A constant force of $20\\,\\text{N}$ moves a box $5\\,\\text{m}$ in the direction of the force. The work done is",
        difficulty: 2,
        skillTags: ["work_done", "constant_force"],
        choices: [
          wrong("$4\\,\\text{J}$", "This divides displacement by force."),
          wrong("$25\\,\\text{J}$", "This adds force and displacement."),
          correct("$100\\,\\text{J}$"),
          wrong("$0\\,\\text{J}$", "Work is not zero when force and displacement are in the same direction."),
        ],
        hints: [
          "Work equals force times displacement in the direction of force.",
          "Here force and displacement are in the same direction.",
          "Multiply 20 by 5.",
        ],
        solution: [
          step(1, "Work done is", "W=Fs=20\\times 5=100\\,\\text{J}"),
        ],
      },
      {
        questionLatex:
          "A person carries a bag horizontally at constant height. If the upward force on the bag is vertical and displacement is horizontal, the work done by the upward force is",
        difficulty: 2,
        skillTags: ["zero_work", "force_displacement_direction"],
        choices: [
          correct("$0\\,\\text{J}$"),
          wrong("positive, because the bag is moving", "Work by a force depends on displacement in the direction of that force."),
          wrong("negative, because the bag is heavy", "Weight is not the upward force, and direction must be considered."),
          wrong("equal to the weight of the bag", "Weight is a force, not work."),
        ],
        hints: [
          "Work depends on the component of force along displacement.",
          "The upward force is perpendicular to horizontal displacement.",
          "A perpendicular force does no work.",
        ],
        solution: [
          step(1, "Since force and displacement are perpendicular, work by the upward force is zero."),
        ],
      },
      {
        questionLatex:
          "The kinetic energy of a $2\\,\\text{kg}$ object moving at $5\\,\\text{m/s}$ is",
        difficulty: 2,
        skillTags: ["kinetic_energy"],
        choices: [
          wrong("$10\\,\\text{J}$", "This uses $mv$ instead of $\\frac{1}{2}mv^2$."),
          correct("$25\\,\\text{J}$"),
          wrong("$50\\,\\text{J}$", "This omits the factor $\\frac{1}{2}$."),
          wrong("$100\\,\\text{J}$", "This overcounts the velocity factor."),
        ],
        hints: [
          "Use the kinetic energy formula.",
          "Square the speed first.",
          "Then multiply by half the mass.",
        ],
        solution: [
          step(1, "Kinetic energy is", "K=\\frac{1}{2}mv^2=\\frac{1}{2}(2)(5^2)=25\\,\\text{J}"),
        ],
      },
      {
        questionLatex:
          "A $3\\,\\text{kg}$ object is raised through $10\\,\\text{m}$. Taking $g=10\\,\\text{m/s}^2$, the gain in potential energy is",
        difficulty: 2,
        skillTags: ["potential_energy"],
        choices: [
          wrong("$30\\,\\text{J}$", "This multiplies mass and height only."),
          wrong("$100\\,\\text{J}$", "This ignores the mass."),
          wrong("$3000\\,\\text{J}$", "This has an extra factor of 10."),
          correct("$300\\,\\text{J}$"),
        ],
        hints: [
          "Gravitational potential energy is $mgh$.",
          "Use $m=3$, $g=10$, $h=10$.",
          "Check the unit is joule.",
        ],
        solution: [
          step(1, "Potential energy gained is", "mgh=3\\times 10\\times 10=300\\,\\text{J}"),
        ],
      },
      {
        questionLatex:
          "A machine does $600\\,\\text{J}$ of work in $20\\,\\text{s}$. Its power is",
        difficulty: 2,
        skillTags: ["power"],
        choices: [
          wrong("$12\\,\\text{W}$", "This divides time by work incorrectly."),
          wrong("$20\\,\\text{W}$", "This uses the time itself as power."),
          correct("$30\\,\\text{W}$"),
          wrong("$12000\\,\\text{W}$", "This multiplies work and time instead of dividing."),
        ],
        hints: [
          "Power is the rate of doing work.",
          "Divide work by time.",
          "$600/20=30$.",
        ],
        solution: [
          step(1, "Power is", "P=\\frac{W}{t}=\\frac{600}{20}=30\\,\\text{W}"),
        ],
      },
      {
        questionLatex:
          "For the lever shown, the mechanical advantage is",
        difficulty: 3,
        skillTags: ["mechanical_advantage", "simple_machines"],
        figure: leverFigure,
        choices: [
          wrong("$\\frac{1}{3}$", "This uses effort divided by load."),
          wrong("$80$", "This subtracts effort from load."),
          wrong("$160$", "This adds load and effort."),
          correct("$3$"),
        ],
        hints: [
          "Mechanical advantage is load divided by effort.",
          "Read load and effort from the figure.",
          "Compute $120/40$.",
        ],
        solution: [
          step(1, "Mechanical advantage is", "\\text{MA}=\\frac{\\text{load}}{\\text{effort}}=\\frac{120}{40}=3"),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Write the SI unit of power.",
        difficulty: 1,
        skillTags: ["power_unit"],
        parts: [part("a", "State the SI unit.", 1)],
        hints: [
          "Power is work done per unit time.",
          "Work is measured in joule.",
          "Joule per second has a special name.",
        ],
        rubric: rubric([criterion("a", 1, "States watt or W.")]),
        commonErrors: ["Writing joule, which is the unit of work or energy."],
        workedSolution: [
          solutionPart("a", "The SI unit of power is watt.", "\\text{W}"),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Calculate the kinetic energy of a $4\\,\\text{kg}$ object moving at $3\\,\\text{m/s}$.",
        difficulty: 2,
        skillTags: ["kinetic_energy"],
        parts: [part("a", "Show the calculation.", 2)],
        hints: [
          "Use $K=\\frac{1}{2}mv^2$.",
          "Square the speed before multiplying.",
          "Use joule as the unit.",
        ],
        rubric: rubric([
          criterion("a", 1, "Uses the correct formula."),
          criterion("a", 1, "Finds $18\\,\\text{J}$."),
        ]),
        commonErrors: [
          "Using $mv$ instead of $\\frac{1}{2}mv^2$.",
          "Forgetting to square velocity.",
        ],
        workedSolution: [
          solutionPart("a", "Kinetic energy is", "K=\\frac{1}{2}(4)(3^2)=18\\,\\text{J}"),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A $2\\,\\text{kg}$ stone is raised to a height of $5\\,\\text{m}$. Take $g=10\\,\\text{m/s}^2$. Find its potential energy. If it falls freely, what is its kinetic energy just before reaching the ground, ignoring air resistance?",
        difficulty: 3,
        skillTags: ["potential_energy", "conservation_of_energy"],
        parts: [
          part("a", "Find the potential energy at the height.", 1),
          part("b", "Find the kinetic energy just before the ground.", 1),
        ],
        hints: [
          "Use $mgh$ for potential energy.",
          "Mechanical energy is conserved if air resistance is ignored.",
          "Lost potential energy becomes kinetic energy.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds potential energy as $100\\,\\text{J}$."),
          criterion("b", 1, "States kinetic energy just before ground as $100\\,\\text{J}$."),
        ]),
        commonErrors: [
          "Using height as kinetic energy.",
          "Assuming energy disappears during the fall.",
        ],
        workedSolution: [
          solutionPart("a", "Potential energy is", "mgh=2\\times 10\\times 5=100\\,\\text{J}"),
          solutionPart("b", "Ignoring air resistance, the lost potential energy changes into kinetic energy, so kinetic energy just before reaching the ground is $100\\,\\text{J}$."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "A $15\\,\\text{N}$ pull moves a box $6\\,\\text{m}$ along a rough horizontal floor. Friction is $8\\,\\text{N}$ opposite to motion.",
        difficulty: 4,
        skillTags: ["work_done", "friction", "net_work"],
        parts: [
          part("a", "Find the work done by the pulling force.", 1),
          part("b", "Find the work done by friction.", 1),
          part("c", "Find the net work done on the box.", 1),
          part("d", "Explain the sign of the work done by friction.", 1),
        ],
        hints: [
          "For a force along displacement, work is positive.",
          "Friction acts opposite to displacement.",
          "Net work is the algebraic sum of works.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds pull work as $90\\,\\text{J}$."),
          criterion("b", 1, "Finds friction work as $-48\\,\\text{J}$."),
          criterion("c", 1, "Finds net work as $42\\,\\text{J}$."),
          criterion("d", 1, "Explains that friction does negative work because it opposes displacement."),
        ]),
        commonErrors: [
          "Adding friction work as positive.",
          "Ignoring direction while calculating work.",
        ],
        workedSolution: [
          solutionPart("a", "Work done by the pull is", "15\\times 6=90\\,\\text{J}"),
          solutionPart("b", "Work done by friction is negative because it acts opposite to displacement.", "-8\\times 6=-48\\,\\text{J}"),
          solutionPart("c", "Net work is", "90-48=42\\,\\text{J}"),
          solutionPart("d", "Friction opposes the motion, so its force has a component opposite to displacement. Hence its work is negative."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A student uses a simple machine to lift a $200\\,\\text{N}$ load by applying an effort of $50\\,\\text{N}$.",
        difficulty: 3,
        skillTags: ["simple_machines", "mechanical_advantage", "application"],
        parts: [
          part("a", "Calculate the mechanical advantage.", 1),
          part("b", "What does this value mean physically?", 1),
          part("c", "Give one reason why a real machine may waste some energy.", 1),
          part("d", "Name one simple machine from the syllabus.", 1),
        ],
        hints: [
          "Mechanical advantage compares load with effort.",
          "A larger value means less effort is needed than the load.",
          "Real machines often involve friction.",
        ],
        rubric: rubric([
          criterion("a", 1, "Calculates mechanical advantage as 4."),
          criterion("b", 1, "Explains that the machine lets the student lift a load four times the effort."),
          criterion("c", 1, "Names a valid energy loss reason such as friction."),
          criterion("d", 1, "Names pulley, lever or inclined plane."),
        ]),
        commonErrors: [
          "Calculating effort divided by load.",
          "Saying machines create energy.",
        ],
        workedSolution: [
          solutionPart("a", "Mechanical advantage is", "\\frac{\\text{load}}{\\text{effort}}=\\frac{200}{50}=4"),
          solutionPart("b", "The machine helps lift a load four times the applied effort."),
          solutionPart("c", "Some energy may be wasted due to friction or deformation of parts."),
          solutionPart("d", "Examples include a lever, pulley or inclined plane."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A $2\\,\\text{kg}$ trolley is already moving at $3\\,\\text{m/s}$. A constant net force of $5\\,\\text{N}$ acts along its motion for $8\\,\\text{m}$. Use the work-energy theorem to find its final speed.",
        difficulty: 5,
        skillTags: ["work_energy_theorem", "kinetic_energy"],
        parts: [part("a", "Calculate the final speed.", 4)],
        hints: [
          "First find the initial kinetic energy.",
          "The work done by the net force is added to kinetic energy.",
          "Set the final kinetic energy equal to $\\frac{1}{2}mv^2$.",
        ],
        rubric: rubric([
          criterion("a", 1, "States or uses work-energy theorem."),
          criterion("a", 1, "Finds initial kinetic energy as $9\\,\\text{J}$ and work done as $40\\,\\text{J}$."),
          criterion("a", 1, "Finds final kinetic energy as $49\\,\\text{J}$."),
          criterion("a", 1, "Finds final speed as $7\\,\\text{m/s}$."),
        ]),
        commonErrors: [
          "Treating the trolley as if it starts from rest.",
          "Using force directly as kinetic energy.",
        ],
        workedSolution: [
          solutionPart("a", "Initial kinetic energy is", "K_i=\\frac{1}{2}(2)(3^2)=9\\,\\text{J}"),
          solutionPart("a", "Work done by the net force is", "W=Fs=5\\times 8=40\\,\\text{J}"),
          solutionPart("a", "By the work-energy theorem, final kinetic energy is", "K_f=9+40=49\\,\\text{J}"),
          solutionPart("a", "Now set $K_f=\\frac{1}{2}mv^2$.", "49=\\frac{1}{2}(2)v^2=v^2,\\quad v=7\\,\\text{m/s}"),
        ],
      },
    ],
  },
  {
    topicCode: "3.5",
    title: "Sound Waves and Applications",
    subtopic:
      "Production and propagation of sound, longitudinal waves, wavelength, frequency, time period, amplitude, speed, pitch, loudness, echo and reverberation.",
    mc: [
      {
        questionLatex:
          "Sound cannot travel through vacuum because",
        difficulty: 1,
        skillTags: ["sound_medium", "propagation"],
        choices: [
          wrong("vacuum has too much friction", "Vacuum has no material particles to create friction."),
          correct("there are no material particles to vibrate"),
          wrong("sound becomes transverse in vacuum", "The problem is absence of a medium, not the type of wave."),
          wrong("the speed of sound becomes infinite", "Sound does not propagate through vacuum."),
        ],
        hints: [
          "Sound is a mechanical wave.",
          "Mechanical waves require particles of a medium.",
          "Vacuum has no material medium.",
        ],
        solution: [
          step(1, "Sound needs particles of a medium to pass vibrations along."),
          step(2, "Vacuum has no such particles, so sound cannot travel through it."),
        ],
      },
      {
        questionLatex:
          "Sound travelling through air is mainly a",
        difficulty: 2,
        skillTags: ["longitudinal_wave", "compressions_rarefactions"],
        choices: [
          wrong("transverse wave with crests and troughs only", "Sound in air travels through compressions and rarefactions."),
          wrong("stationary wave in every case", "Sound need not be stationary; it propagates through the medium."),
          correct("longitudinal wave with compressions and rarefactions"),
          wrong("wave that needs no medium", "Sound is a mechanical wave and needs a medium."),
        ],
        hints: [
          "Air particles vibrate back and forth along the direction of propagation.",
          "Regions of high pressure are compressions.",
          "Regions of low pressure are rarefactions.",
        ],
        solution: [
          step(1, "In air, particles vibrate parallel to the direction of wave travel."),
          step(2, "Therefore sound in air is a longitudinal wave."),
        ],
      },
      {
        questionLatex:
          "A sound wave has time period $0.005\\,\\text{s}$. Its frequency is",
        difficulty: 2,
        skillTags: ["frequency_time_period"],
        choices: [
          wrong("$0.005\\,\\text{Hz}$", "This is the time period, not frequency."),
          wrong("$5\\,\\text{Hz}$", "This treats milliseconds as seconds incorrectly."),
          wrong("$50\\,\\text{Hz}$", "This is not the reciprocal of 0.005 s."),
          correct("$200\\,\\text{Hz}$"),
        ],
        hints: [
          "Frequency is the reciprocal of time period.",
          "Use $f=1/T$.",
          "$1/0.005=200$.",
        ],
        solution: [
          step(1, "Frequency is", "f=\\frac{1}{T}=\\frac{1}{0.005}=200\\,\\text{Hz}"),
        ],
      },
      {
        questionLatex:
          "In the sound wave graph, the wavelength shown by the crest-to-crest separation is",
        difficulty: 3,
        skillTags: ["sound_wave_graph", "wavelength"],
        figure: soundWaveFigure,
        choices: [
          correct("$4\\,\\text{m}$"),
          wrong("$2\\,\\text{m}$", "This is half the crest-to-crest separation."),
          wrong("$6\\,\\text{m}$", "This uses a non-corresponding pair of points."),
          wrong("$8\\,\\text{m}$", "This spans two wavelengths, not one."),
        ],
        hints: [
          "Wavelength is distance between two consecutive crests or troughs.",
          "Read the two crest positions from the graph.",
          "The crests are at 1 m and 5 m.",
        ],
        solution: [
          step(1, "Crest-to-crest distance is", "5-1=4\\,\\text{m}"),
          step(2, "Therefore the wavelength is $4\\,\\text{m}$."),
        ],
      },
      {
        questionLatex:
          "A person hears an echo $0.10\\,\\text{s}$ after shouting. If speed of sound is $340\\,\\text{m/s}$, the distance of the reflecting wall is",
        difficulty: 3,
        skillTags: ["echo", "speed_distance_time"],
        choices: [
          wrong("$34\\,\\text{m}$", "This is the total sound path to the wall and back, not one-way distance."),
          wrong("$340\\,\\text{m}$", "This uses 1 second instead of 0.10 second and ignores the return path."),
          correct("$17\\,\\text{m}$"),
          wrong("$3.4\\,\\text{m}$", "This divides the path too much."),
        ],
        hints: [
          "The echo time is for the sound to go to the wall and return.",
          "Find total distance travelled by sound first.",
          "One-way distance is half the total distance.",
        ],
        solution: [
          step(1, "Total distance travelled by sound is", "340\\times 0.10=34\\,\\text{m}"),
          step(2, "The wall is half of this distance away.", "\\frac{34}{2}=17\\,\\text{m}"),
        ],
      },
      {
        questionLatex:
          "Assertion (A): A sound of larger amplitude is heard as louder. Reason (R): Larger amplitude generally means the wave carries more energy. Choose the correct option.",
        difficulty: 3,
        skillTags: ["assertion_reason", "amplitude_loudness"],
        choices: [
          wrong("A is true, but R is false.", "The reason is true at this level."),
          wrong("A is false, but R is true.", "The assertion is true; amplitude is linked to loudness."),
          correct("Both A and R are true, and R is the correct explanation of A."),
          wrong("Both A and R are true, but R is not the correct explanation of A.", "The energy carried by a larger-amplitude wave explains greater loudness."),
        ],
        hints: [
          "Loudness is related to amplitude.",
          "Amplitude is linked to energy of vibration.",
          "Check whether the reason explains the assertion.",
        ],
        solution: [
          step(1, "Greater amplitude corresponds to a more energetic vibration."),
          step(2, "Hence the sound is heard as louder, so R correctly explains A."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Which characteristic of a sound wave mainly decides pitch?",
        difficulty: 1,
        skillTags: ["pitch_frequency"],
        parts: [part("a", "Name the characteristic.", 1)],
        hints: [
          "High-pitched sounds have more vibrations per second.",
          "Vibrations per second define frequency.",
          "Pitch is mainly linked to frequency.",
        ],
        rubric: rubric([criterion("a", 1, "States frequency.")]),
        commonErrors: ["Writing amplitude, which is mainly linked to loudness."],
        workedSolution: [
          solutionPart("a", "Pitch is mainly decided by frequency."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A sound wave has frequency $500\\,\\text{Hz}$ and wavelength $0.68\\,\\text{m}$. Calculate its speed.",
        difficulty: 2,
        skillTags: ["speed_of_sound", "frequency_wavelength"],
        parts: [part("a", "Calculate speed using $v=f\\lambda$.", 2)],
        hints: [
          "Use the relation between speed, frequency and wavelength.",
          "Multiply frequency by wavelength.",
          "Keep the unit as metre per second.",
        ],
        rubric: rubric([
          criterion("a", 1, "Uses $v=f\\lambda$."),
          criterion("a", 1, "Finds speed as $340\\,\\text{m/s}$."),
        ]),
        commonErrors: [
          "Dividing frequency by wavelength.",
          "Leaving out the unit.",
        ],
        workedSolution: [
          solutionPart("a", "Speed of sound is", "v=f\\lambda=500\\times 0.68=340\\,\\text{m/s}"),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A clap is heard again after $2\\,\\text{s}$ from a distant wall. If speed of sound is $340\\,\\text{m/s}$, find the distance of the wall.",
        difficulty: 3,
        skillTags: ["echo", "distance_calculation"],
        parts: [part("a", "Calculate the wall distance.", 3)],
        hints: [
          "The 2 s is for going and returning.",
          "Find total distance first.",
          "Divide by 2 for one-way distance.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds total sound path as $680\\,\\text{m}$."),
          criterion("a", 1, "Divides by 2 for one-way distance."),
          criterion("a", 1, "Finds wall distance as $340\\,\\text{m}$."),
        ]),
        commonErrors: [
          "Reporting the total echo path as the wall distance.",
          "Forgetting that echo involves reflection.",
        ],
        workedSolution: [
          solutionPart("a", "Total distance travelled by sound is", "340\\times 2=680\\,\\text{m}"),
          solutionPart("a", "Distance of wall is half the total path.", "\\frac{680}{2}=340\\,\\text{m}"),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Two sounds A and B are described as follows: A has amplitude $4$ units and frequency $200\\,\\text{Hz}$; B has amplitude $2$ units and frequency $500\\,\\text{Hz}$.",
        difficulty: 3,
        skillTags: ["pitch_loudness", "frequency_time_period"],
        parts: [
          part("a", "Which sound is louder? Give a reason.", 1),
          part("b", "Which sound has higher pitch? Give a reason.", 1),
          part("c", "Find the time periods of A and B.", 2),
        ],
        hints: [
          "Loudness is linked mainly with amplitude.",
          "Pitch is linked mainly with frequency.",
          "Use $T=1/f$.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies A as louder because it has larger amplitude."),
          criterion("b", 1, "Identifies B as higher pitched because it has higher frequency."),
          criterion("c", 1, "Finds $T_A=0.005\\,\\text{s}$."),
          criterion("c", 1, "Finds $T_B=0.002\\,\\text{s}$."),
        ]),
        commonErrors: [
          "Using amplitude to decide pitch.",
          "Using frequency to decide loudness only.",
        ],
        workedSolution: [
          solutionPart("a", "Sound A is louder because it has the larger amplitude."),
          solutionPart("b", "Sound B has higher pitch because it has higher frequency."),
          solutionPart("c", "The time periods are", "T_A=\\frac{1}{200}=0.005\\,\\text{s},\\quad T_B=\\frac{1}{500}=0.002\\,\\text{s}"),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A boat sends a sound pulse vertically downward in water and receives the reflected pulse after $0.60\\,\\text{s}$. The speed of sound in water is $1500\\,\\text{m/s}$.",
        difficulty: 4,
        skillTags: ["echo", "echolocation", "speed_distance_time"],
        parts: [
          part("a", "Find the total distance travelled by the pulse.", 1),
          part("b", "Find the depth of water below the boat.", 1),
          part("c", "Why is the depth half the total distance?", 1),
          part("d", "Name the principle used in echolocation.", 1),
        ],
        hints: [
          "The pulse travels down and comes back.",
          "Use distance equals speed times time.",
          "One-way distance is the depth.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds total pulse path as $900\\,\\text{m}$."),
          criterion("b", 1, "Finds depth as $450\\,\\text{m}$."),
          criterion("c", 1, "Explains down-and-back travel."),
          criterion("d", 1, "States reflection of sound."),
        ]),
        commonErrors: [
          "Forgetting to halve the echo distance.",
          "Using speed of sound in air instead of the given speed in water.",
        ],
        workedSolution: [
          solutionPart("a", "Total distance travelled is", "1500\\times 0.60=900\\,\\text{m}"),
          solutionPart("b", "Depth is half the total path.", "\\frac{900}{2}=450\\,\\text{m}"),
          solutionPart("c", "The pulse travels from the boat to the bottom and then returns to the boat, so the measured path is twice the depth."),
          solutionPart("d", "Echolocation uses reflection of sound."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A classroom has strong reverberation. Suggest two changes that can reduce it, and explain why they work.",
        difficulty: 2,
        skillTags: ["reverberation", "sound_absorption"],
        parts: [part("a", "Give two changes with reasons.", 2)],
        hints: [
          "Reverberation is repeated reflection of sound.",
          "Soft or porous materials absorb sound better.",
          "Curtains, carpets and acoustic panels can help.",
        ],
        rubric: rubric([
          criterion("a", 1, "Suggests two valid sound-absorbing changes."),
          criterion("a", 1, "Explains that they reduce reflection or absorb sound."),
        ]),
        commonErrors: [
          "Suggesting harder walls that increase reflection.",
          "Confusing reverberation with echo distance only.",
        ],
        workedSolution: [
          solutionPart("a", "Using curtains, carpets, soft boards or acoustic panels can reduce reverberation because these materials absorb sound and reduce repeated reflections from hard surfaces."),
        ],
      },
    ],
  },
];

export const motionForceWorkSoundTopics: Topic[] = topicSeeds.map(makeTopic);
