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

const COURSE = "calc-ab";
const UNIT = "u7-diff-eqs";
const VERSION = "0.1.1";
const REVIEW_STATUS = "verified" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const VERIFIED_BY = "StudyLoop Review Team" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const MC_DIFFICULTY_FLOORS = [2, 2, 3, 3, 4] as const;

type McLetter = (typeof LETTERS)[number];
type Difficulty = 1 | 2 | 3 | 4 | 5;

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
  rationales?: Partial<Record<McLetter, string>>;
  misconceptionTags?: Partial<Record<McLetter, string>>;
  hints: readonly [string, string, string];
  solution: readonly SolutionStep[];
}

interface FrqSeed {
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
  frq: FrqSeed;
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

function calibrateMcDifficulty(seedDifficulty: Difficulty, index: number): Difficulty {
  return Math.max(seedDifficulty, MC_DIFFICULTY_FLOORS[index] ?? 2) as Difficulty;
}

function calibrateFrqDifficulty(seedDifficulty: Difficulty): Difficulty {
  return Math.max(seedDifficulty, 3) as Difficulty;
}

function feedbackFocus(seed: McSeed): string {
  const tags = new Set(seed.skillTags);

  if (tags.has("modeling")) {
    return "You likely matched the words to the wrong rate relationship, sign, or dependent variable.";
  }
  if (tags.has("verify_solution")) {
    return "You likely checked only the differential equation or only the initial condition, not both.";
  }
  if (tags.has("slope_field")) {
    return "You likely read the slope at the wrong point, missed where slopes are horizontal, or reversed the sign pattern.";
  }
  if (tags.has("separation")) {
    return "You likely separated variables incorrectly, lost a constant, or integrated one side with the wrong antiderivative.";
  }
  if (tags.has("particular_solution")) {
    return "You likely found a general solution but did not use the initial condition correctly.";
  }
  if (tags.has("exponential_model")) {
    return "You likely used the wrong sign for growth or decay, or confused the rate constant with the amount.";
  }
  return "Your choice misses the decisive differential-equation step in this question.";
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck this step: $${keyStep.math}$.` : "";

  return `You chose ${choiceText}. ${feedbackFocus(seed)}${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const unletteredChoices = LETTERS.map((seedLetter, choiceIndex) => {
    const isCorrect = seedLetter === seed.correctLetter;
    return {
      text: seed.choices[choiceIndex],
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : seed.rationales?.[seedLetter] ?? fallbackWrongRationale(seed, seedLetter),
      misconceptionTag: isCorrect
        ? null
        : seed.misconceptionTags?.[seedLetter] ?? "incorrect_differential_equation_reasoning",
    };
  });

  const rotation = index % LETTERS.length;
  const rotatedChoices =
    rotation === 0
      ? unletteredChoices
      : [
          ...unletteredChoices.slice(-rotation),
          ...unletteredChoices.slice(0, -rotation),
        ];
  const choices = rotatedChoices.map((choice, choiceIndex) => ({
    letter: LETTERS[choiceIndex],
    ...choice,
  })) as McChoice[];
  const correctChoice = choices.find((choice) => choice.isCorrect);
  const correctLetter = correctChoice?.letter ?? seed.correctLetter;

  return {
    contentId: `${COURSE}.u7.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateMcDifficulty(seed.difficulty, index),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "confuses_function_value_with_rate_of_change",
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

function makeFrq(meta: TopicMeta, seed: FrqSeed): FrqItem {
  return {
    contentId: `${COURSE}.u7.t${topicSlug(meta.topicCode)}.frq.001`,
    kind: "frq",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateFrqDifficulty(seed.difficulty),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_solution_without_checking_initial_condition",
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
      makeFrq(meta, seed.frq),
    ],
  };
}

interface SlopeFieldConfig {
  title: string;
  description: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xValues: number[];
  yValues: number[];
  slope: (x: number, y: number) => number;
}

function slopeFieldFigure(config: SlopeFieldConfig): ItemFigure {
  const left = 80;
  const right = 600;
  const top = 46;
  const bottom = 350;
  const width = right - left;
  const height = bottom - top;

  const px = (x: number) => left + ((x - config.xMin) / (config.xMax - config.xMin)) * width;
  const py = (y: number) => bottom - ((y - config.yMin) / (config.yMax - config.yMin)) * height;

  const xTicks = config.xValues
    .map((x) => {
      const sx = px(x);
      return `<line x1="${sx.toFixed(1)}" y1="${top}" x2="${sx.toFixed(1)}" y2="${bottom}" stroke="#e2e8f0" stroke-width="1"/>
  <text x="${(sx - 5).toFixed(1)}" y="${bottom + 24}" fill="#475569" font-size="15">${x}</text>`;
    })
    .join("\n  ");

  const yTicks = config.yValues
    .map((y) => {
      const sy = py(y);
      return `<line x1="${left}" y1="${sy.toFixed(1)}" x2="${right}" y2="${sy.toFixed(1)}" stroke="#e2e8f0" stroke-width="1"/>
  <text x="${left - 28}" y="${(sy + 5).toFixed(1)}" fill="#475569" font-size="15">${y}</text>`;
    })
    .join("\n  ");

  const segments = config.xValues
    .flatMap((x) =>
      config.yValues.map((y) => {
        const m = config.slope(x, y);
        const cx = px(x);
        const cy = py(y);
        const len = 14;
        const norm = Math.sqrt(1 + m * m);
        const dx = len / norm;
        const dy = (-m * len) / norm;
        return `<line x1="${(cx - dx).toFixed(1)}" y1="${(cy - dy).toFixed(1)}" x2="${(cx + dx).toFixed(1)}" y2="${(cy + dy).toFixed(1)}" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>`;
      }),
    )
    .join("\n  ");

  const axisX = config.yMin <= 0 && config.yMax >= 0 ? py(0) : bottom;
  const axisY = config.xMin <= 0 && config.xMax >= 0 ? px(0) : left;

  return {
    type: "svg",
    title: config.title,
    description: config.description,
    svg: `<svg viewBox="0 0 680 410" role="img" aria-label="${config.description}">
  <rect width="680" height="410" rx="18" fill="#f8fafc"/>
  ${xTicks}
  ${yTicks}
  <line x1="${left}" y1="${axisX.toFixed(1)}" x2="${right}" y2="${axisX.toFixed(1)}" stroke="#64748b" stroke-width="2"/>
  <line x1="${axisY.toFixed(1)}" y1="${top}" x2="${axisY.toFixed(1)}" y2="${bottom}" stroke="#64748b" stroke-width="2"/>
  <text x="${right + 14}" y="${(axisX + 6).toFixed(1)}" fill="#475569" font-size="18">x</text>
  <text x="${(axisY + 8).toFixed(1)}" y="${top - 14}" fill="#475569" font-size="18">y</text>
  ${segments}
</svg>`,
  };
}

const slopeFieldXMinusY = slopeFieldFigure({
  title: "Slope field",
  description: "Slope field on a coordinate grid.",
  xMin: -2,
  xMax: 2,
  yMin: -2,
  yMax: 4,
  xValues: [-2, -1, 0, 1, 2],
  yValues: [-2, -1, 0, 1, 2, 3, 4],
  slope: (x, y) => x - y,
});

const slopeFieldYTimesTwoMinusY = slopeFieldFigure({
  title: "Slope field",
  description: "Slope field on a coordinate grid with horizontal bands.",
  xMin: -2,
  xMax: 2,
  yMin: -1,
  yMax: 4,
  xValues: [-2, -1, 0, 1, 2],
  yValues: [-1, 0, 1, 2, 3, 4],
  slope: (_x, y) => y * (2 - y),
});

const slopeFieldYTimesFourMinusY = slopeFieldFigure({
  title: "Slope field",
  description: "Slope field on a coordinate grid with horizontal bands.",
  xMin: -2,
  xMax: 2,
  yMin: -1,
  yMax: 5,
  xValues: [-2, -1, 0, 1, 2],
  yValues: [-1, 0, 1, 2, 3, 4, 5],
  slope: (_x, y) => y * (4 - y),
});

const slopeFieldOneMinusY = slopeFieldFigure({
  title: "Slope field",
  description: "Slope field on a coordinate grid with slopes depending only on y.",
  xMin: -2,
  xMax: 2,
  yMin: -1,
  yMax: 3,
  xValues: [-2, -1, 0, 1, 2],
  yValues: [-1, 0, 1, 2, 3],
  slope: (_x, y) => 1 - y,
});

const slopeFieldTwoXOverY = slopeFieldFigure({
  title: "Slope field",
  description: "Slope field for dy/dx equals 2x over y on a positive-y grid.",
  xMin: -2,
  xMax: 2,
  yMin: 0,
  yMax: 5,
  xValues: [-2, -1, 0, 1, 2],
  yValues: [1, 2, 3, 4, 5],
  slope: (x, y) => (2 * x) / y,
});

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "7.1",
    title: "Modeling Situations with Differential Equations",
    subtopic: "Writing differential equations from verbal rate descriptions",
    mc: [
      {
        questionLatex:
          "\\text{A population }P\\text{ grows at a rate proportional to its current size. Which differential equation models the situation, for }k>0?",
        difficulty: 2,
        skillTags: ["modeling", "proportional_growth"],
        choices: ["$\\frac{dP}{dt}=kP$", "$\\frac{dP}{dt}=kt$", "$P(t)=kt$", "$\\frac{dt}{dP}=kP$"],
        correctLetter: "A",
        rationales: {
          B: "This makes the rate proportional to time, not to the population.",
          C: "This is a function formula, not the differential equation describing rate of change.",
          D: "This reverses the dependent and independent variables.",
        },
        hints: [
          "Rate means a derivative with respect to time.",
          "Current size means the expression should involve $P$.",
          "Proportional to $P$ means a constant multiple of $P$.",
        ],
        solution: [
          { step: 1, explanation: "Translate rate of change into a derivative.", math: "\\frac{dP}{dt}" },
          { step: 2, explanation: "Proportional to current population means equal to $kP$.", math: "\\frac{dP}{dt}=kP" },
        ],
      },
      {
        questionLatex:
          "\\text{A cup of coffee at temperature }T\\text{ cools in a }70^\\circ\\text{ room. The cooling rate is proportional to the difference between the coffee temperature and room temperature. Which model has the correct sign for }T>70?",
        difficulty: 2,
        skillTags: ["modeling", "newton_cooling", "sign_reasoning"],
        choices: ["$\\frac{dT}{dt}=k(70-T),\\ k>0$", "$\\frac{dT}{dt}=k(T-70),\\ k>0$", "$\\frac{dT}{dt}=70kT$", "$\\frac{dT}{dt}=T-70$"],
        correctLetter: "A",
        rationales: {
          B: "For $T>70$, this derivative is positive, so it would warm the coffee instead of cooling it.",
          C: "This does not measure the difference from room temperature.",
          D: "This has no proportionality constant and has the wrong sign for cooling when $T>70$.",
        },
        hints: [
          "When the coffee is hotter than the room, $T$ should decrease.",
          "So $dT/dt$ must be negative when $T>70$.",
          "$70-T$ is negative when $T>70$.",
        ],
        solution: [
          { step: 1, explanation: "Require a negative derivative when $T>70$.", math: "70-T<0" },
          { step: 2, explanation: "Use a positive proportionality constant.", math: "\\frac{dT}{dt}=k(70-T)" },
        ],
      },
      {
        questionLatex:
          "\\text{A tank contains }A(t)\\text{ liters of water. Water enters at }8\\text{ L/min and leaves at a rate equal to }0.03A(t)\\text{ L/min. Which differential equation models }A?",
        difficulty: 3,
        skillTags: ["modeling", "inflow_outflow"],
        choices: ["$\\frac{dA}{dt}=8-0.03A$", "$\\frac{dA}{dt}=8+0.03A$", "$A(t)=8-0.03t$", "$\\frac{dA}{dt}=0.03A-8$"],
        correctLetter: "A",
        rationales: {
          B: "Outflow should be subtracted, not added.",
          C: "The leaving rate depends on $A(t)$, so the model is not a linear function of time.",
          D: "This gives outflow minus inflow, the opposite of the amount's rate of change.",
        },
        hints: [
          "Change in amount equals rate in minus rate out.",
          "The inflow is constant.",
          "The outflow is $0.03A(t)$.",
        ],
        solution: [
          { step: 1, explanation: "Use rate in minus rate out.", math: "\\frac{dA}{dt}=8-0.03A" },
        ],
      },
      {
        questionLatex:
          "\\text{A quantity }Q\\text{ decreases at a rate proportional to the square of its current amount. Which differential equation matches this description, for }k>0?",
        difficulty: 3,
        skillTags: ["modeling", "sign_reasoning"],
        choices: ["$\\frac{dQ}{dt}=-kQ^2$", "$\\frac{dQ}{dt}=kQ^2$", "$\\frac{dQ}{dt}=-kQ$", "$\\frac{dQ}{dt}=kQ$"],
        correctLetter: "A",
        rationales: {
          B: "This has the rate proportional to $Q^2$, but the positive sign means the quantity increases.",
          C: "This models a rate proportional to $Q$, not to $Q^2$.",
          D: "This has both the wrong sign and the wrong proportional relationship.",
        },
        hints: [
          "A decreasing quantity has a negative derivative.",
          "Proportional to the square means a constant multiple of $Q^2$.",
          "Use $k>0$ for the proportionality constant.",
        ],
        solution: [
          { step: 1, explanation: "The rate is proportional to $Q^2$.", math: "\\frac{dQ}{dt}=\\pm kQ^2" },
          { step: 2, explanation: "Because the quantity decreases, the sign is negative.", math: "\\frac{dQ}{dt}=-kQ^2" },
        ],
      },
      {
        questionLatex:
          "\\text{A falling object has velocity }v(t).\\text{ Gravity increases velocity at }9.8\\text{ m/s}^2\\text{ while air resistance decreases velocity at a rate proportional to }v.\\text{ Which model is consistent with this description?}",
        difficulty: 4,
        skillTags: ["modeling", "terminal_velocity", "sign_reasoning"],
        choices: ["$\\frac{dv}{dt}=9.8-kv,\\ k>0$", "$\\frac{dv}{dt}=9.8+kv,\\ k>0$", "$\\frac{dv}{dt}=kv-9.8,\\ k>0$", "$v(t)=9.8-kt$"],
        correctLetter: "A",
        rationales: {
          B: "This makes air resistance increase the velocity rather than oppose it.",
          C: "This gives negative acceleration when $v=0$, which contradicts gravity increasing downward velocity.",
          D: "This is a velocity formula, not the differential equation from the rate description.",
        },
        hints: [
          "Gravity contributes a positive constant acceleration in the chosen downward direction.",
          "Air resistance opposes motion, so it subtracts a term proportional to $v$.",
          "Combine the two effects.",
        ],
        solution: [
          { step: 1, explanation: "Add the gravity contribution and subtract drag.", math: "\\frac{dv}{dt}=9.8-kv" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A tank initially contains }120\\text{ liters of solution. Solution enters at }6\\text{ L/min and drains at }0.04A(t)\\text{ L/min, where }A(t)\\text{ is the amount of solution in the tank at time }t.",
      difficulty: 4,
      skillTags: ["modeling", "inflow_outflow", "interpretation"],
      parts: [
        { letter: "a", promptMarkdown: "Write a differential equation for $A(t)$ with the initial condition." , points: 2 },
        { letter: "b", promptMarkdown: "Find the equilibrium amount and explain its meaning in context.", points: 2 },
        { letter: "c", promptMarkdown: "Determine whether $A$ is increasing or decreasing at $t=0$.", points: 1 },
      ],
      hints: [
        "Use rate in minus rate out.",
        "An equilibrium occurs when $dA/dt=0$.",
        "Compare the initial outflow rate with the inflow rate.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Writes $dA/dt=6-0.04A$." },
          { part: "a", points: 1, description: "Includes $A(0)=120$." },
          { part: "b", points: 1, description: "Solves $6-0.04A=0$." },
          { part: "b", points: 1, description: "Interprets the equilibrium as the amount where inflow equals outflow." },
          { part: "c", points: 1, description: "Determines $A'(0)=1.2>0$, so $A$ is increasing." },
        ],
      },
      commonErrors: [
        "Adding inflow and outflow instead of subtracting outflow.",
        "Treating the initial amount as the equilibrium amount.",
        "Not checking the sign of $A'(0)$.",
      ],
      workedSolution: [
        { part: "a", explanation: "The change in amount is inflow minus outflow, so $\\frac{dA}{dt}=6-0.04A$ with $A(0)=120$." },
        { part: "b", explanation: "Set $6-0.04A=0$, giving $A=150$. At 150 liters, the outflow rate equals the inflow rate, so the amount is steady." },
        { part: "c", explanation: "$A'(0)=6-0.04(120)=1.2>0$, so the amount is increasing initially." },
      ],
    },
  },
  {
    topicCode: "7.2",
    title: "Verifying Solutions for Differential Equations",
    subtopic: "Checking both the differential equation and any initial condition",
    mc: [
      {
        questionLatex:
          "\\text{Which function satisfies }\\frac{dy}{dx}=3y\\text{ and }y(0)=4?",
        difficulty: 2,
        skillTags: ["verify_solution", "initial_condition", "exponential_model"],
        choices: ["$y=4e^{3x}$", "$y=3e^{4x}$", "$y=4+3x$", "$y=e^{3x}+3$"],
        correctLetter: "A",
        rationales: {
          B: "This has $y(0)=3$, not $4$, and its derivative is not $3y$.",
          C: "This satisfies the initial value but not the differential equation.",
          D: "This has $y(0)=4$, but $y'=3e^{3x}$ is not $3(e^{3x}+3)$.",
        },
        hints: [
          "Check the initial condition first.",
          "Then differentiate the candidate function.",
          "The derivative must equal $3$ times the function.",
        ],
        solution: [
          { step: 1, explanation: "Check $y(0)$.", math: "4e^0=4" },
          { step: 2, explanation: "Differentiate and compare.", math: "\\frac{d}{dx}(4e^{3x})=12e^{3x}=3(4e^{3x})" },
        ],
      },
      {
        questionLatex:
          "\\text{Let }y=\\sqrt{1+x^2}.\\text{ Which differential equation is satisfied by }y?",
        difficulty: 2,
        skillTags: ["verify_solution", "implicit_rate"],
        choices: ["$\\frac{dy}{dx}=\\frac{x}{y}$", "$\\frac{dy}{dx}=xy$", "$\\frac{dy}{dx}=\\frac{y}{x}$", "$\\frac{dy}{dx}=x+y$"],
        correctLetter: "A",
        rationales: {
          B: "This multiplies by $y$ instead of dividing by $y$.",
          C: "This reverses the relationship between $x$ and $y$.",
          D: "This does not match the derivative of the square-root expression.",
        },
        hints: [
          "Differentiate $y=(1+x^2)^{1/2}$.",
          "Rewrite the square root as $y$.",
          "Compare to the answer choices.",
        ],
        solution: [
          { step: 1, explanation: "Differentiate.", math: "y'=\\frac{x}{\\sqrt{1+x^2}}" },
          { step: 2, explanation: "Since $y=\\sqrt{1+x^2}$, rewrite the derivative.", math: "y'=\\frac{x}{y}" },
        ],
      },
      {
        questionLatex:
          "\\text{The function }y=\\frac{1}{2-x}\\text{ is proposed as a solution to }\\frac{dy}{dx}=y^2.\\text{ Which statement is true on an interval not containing }x=2?",
        difficulty: 3,
        skillTags: ["verify_solution", "domain"],
        choices: ["It is a solution because $y'=\\frac{1}{(2-x)^2}=y^2$.", "It is not a solution because $y'=-\\frac{1}{(2-x)^2}$.", "It is a solution only at $x=0$.", "It is not a solution because $y^2$ cannot be positive."],
        correctLetter: "A",
        rationales: {
          B: "The derivative of $(2-x)^{-1}$ has two negative factors, so it is positive.",
          C: "The derivative relationship holds throughout any interval where the function is defined.",
          D: "The positivity of $y^2$ is consistent with the positive derivative here.",
        },
        hints: [
          "Differentiate $(2-x)^{-1}$ carefully.",
          "The chain rule gives a factor of $-1$ from $2-x$.",
          "Compare the result to $y^2$.",
        ],
        solution: [
          { step: 1, explanation: "Differentiate.", math: "y'=-(2-x)^{-2}(-1)=\\frac{1}{(2-x)^2}" },
          { step: 2, explanation: "Square the function.", math: "y^2=\\frac{1}{(2-x)^2}" },
        ],
      },
      {
        questionLatex:
          "\\text{A student claims }y=x^2+1\\text{ solves }\\frac{dy}{dx}=2xy\\text{ with }y(0)=1.\\text{ Why is the claim false?}",
        difficulty: 3,
        skillTags: ["verify_solution", "error_analysis"],
        choices: ["The initial condition is true, but $y'=2x$ is not equal to $2x(x^2+1)$ for all $x$.", "The differential equation is true, but the initial condition is false.", "Both the differential equation and initial condition are false.", "The claim is true."],
        correctLetter: "A",
        rationales: {
          B: "The initial condition is actually true because $y(0)=1$.",
          C: "Only the differential equation fails.",
          D: "The derivative relationship fails except at isolated values.",
        },
        hints: [
          "Check $y(0)$ separately from the derivative.",
          "Compute $y'$.",
          "Compare $y'$ to $2xy$ as functions, not at one point only.",
        ],
        solution: [
          { step: 1, explanation: "The initial condition holds.", math: "y(0)=0^2+1=1" },
          { step: 2, explanation: "The derivative relationship fails.", math: "y'=2x\\ne 2x(x^2+1)" },
        ],
      },
      {
        questionLatex:
          "\\text{Which value of }C\\text{ makes }y=Ce^{-2x}+5\\text{ satisfy }y(0)=1\\text{?}",
        difficulty: 4,
        skillTags: ["verify_solution", "initial_condition"],
        choices: ["$-4$", "$4$", "$1$", "$5$"],
        correctLetter: "A",
        rationales: {
          B: "This would give $y(0)=9$.",
          C: "This would give $y(0)=6$.",
          D: "This would give $y(0)=10$.",
        },
        hints: [
          "Substitute $x=0$ into the family.",
          "$e^0=1$.",
          "Solve $C+5=1$.",
        ],
        solution: [
          { step: 1, explanation: "Apply the initial condition.", math: "1=Ce^0+5" },
          { step: 2, explanation: "Solve for $C$.", math: "C=-4" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Consider the differential equation }\\frac{dy}{dx}=\\frac{x}{y}\\text{ and the function }y=\\sqrt{x^2+8}.",
      difficulty: 4,
      skillTags: ["verify_solution", "initial_condition", "domain"],
      parts: [
        { letter: "a", promptMarkdown: "Verify that $y=\\sqrt{x^2+8}$ satisfies the differential equation.", points: 2 },
        { letter: "b", promptMarkdown: "Determine the value of $y(1)$ and state whether the function satisfies the initial condition $y(1)=3$.", points: 1 },
        { letter: "c", promptMarkdown: "Explain why the positive square root matters for this initial condition.", points: 1 },
      ],
      hints: [
        "Differentiate using the chain rule.",
        "Rewrite $\\sqrt{x^2+8}$ as $y$ after differentiating.",
        "Evaluate the candidate at $x=1$.",
      ],
      rubric: {
        maxPoints: 4,
        criteria: [
          { part: "a", points: 1, description: "Computes $y'=x/\\sqrt{x^2+8}$." },
          { part: "a", points: 1, description: "Rewrites the derivative as $x/y$." },
          { part: "b", points: 1, description: "Finds $y(1)=3$ and confirms the initial condition." },
          { part: "c", points: 1, description: "Explains that the negative branch would give $y(1)=-3$." },
        ],
      },
      commonErrors: [
        "Checking only the initial condition.",
        "Forgetting the chain rule when differentiating the square root.",
        "Ignoring the branch of the square root.",
      ],
      workedSolution: [
        { part: "a", explanation: "$y'=(1/2)(x^2+8)^{-1/2}(2x)=\\frac{x}{\\sqrt{x^2+8}}=\\frac{x}{y}$, so the function satisfies the differential equation." },
        { part: "b", explanation: "$y(1)=\\sqrt{9}=3$, so it satisfies $y(1)=3$." },
        { part: "c", explanation: "The positive branch gives $3$ at $x=1$; the negative branch also satisfies the differential equation but would not satisfy the initial condition." },
      ],
    },
  },
  {
    topicCode: "7.3",
    title: "Sketching Slope Fields",
    subtopic: "Connecting differential equations to local slope information",
    mc: [
      {
        questionLatex:
          "\\text{For }\\frac{dy}{dx}=x-y,\\text{ what is the slope of the solution curve at }(2,1)?",
        difficulty: 2,
        skillTags: ["slope_field", "point_slope"],
        choices: ["$1$", "$3$", "$-1$", "$2$"],
        correctLetter: "A",
        rationales: {
          B: "This adds the coordinates instead of subtracting $y$ from $x$.",
          C: "This reverses the order to $y-x$.",
          D: "This uses only the $x$-coordinate.",
        },
        hints: [
          "A slope field segment at a point has slope given by the differential equation.",
          "Substitute $x=2$ and $y=1$.",
          "Compute $2-1$.",
        ],
        solution: [
          { step: 1, explanation: "Evaluate the differential equation at the point.", math: "x-y=2-1=1" },
        ],
      },
      {
        questionLatex:
          "\\text{For }\\frac{dy}{dx}=y-x,\\text{ along which line are the slope field segments horizontal?}",
        difficulty: 2,
        skillTags: ["slope_field", "horizontal_segments"],
        choices: ["$y=x$", "$y=-x$", "$x=0$", "$y=1$"],
        correctLetter: "A",
        rationales: {
          B: "That line does not make $y-x=0$ except at the origin.",
          C: "Slopes on the $y$-axis are $y$, not always zero.",
          D: "Slopes on $y=1$ are $1-x$, not always zero.",
        },
        hints: [
          "Horizontal segments have slope $0$.",
          "Set $y-x=0$.",
          "Solve for the relationship between $x$ and $y$.",
        ],
        solution: [
          { step: 1, explanation: "Set the derivative equal to zero.", math: "y-x=0" },
          { step: 2, explanation: "Solve.", math: "y=x" },
        ],
      },
      {
        questionLatex:
          "\\text{A slope field is shown. Which statement is true for the differential equation represented by the field?}",
        difficulty: 3,
        skillTags: ["slope_field", "sign_pattern", "graph_interpretation"],
        figure: slopeFieldXMinusY,
        choices: ["Segments are horizontal on the line $y=x$.", "Segments are horizontal on the line $y=-x$.", "All slopes are positive when $x<0$.", "The slope depends only on $y$."],
        correctLetter: "A",
        rationales: {
          B: "The horizontal pattern follows the diagonal where $x$ and $y$ are equal, not opposites.",
          C: "For example, near $(-1,2)$ the slopes are negative.",
          D: "Segments change as $x$ changes even at the same $y$-value.",
        },
        hints: [
          "Look for where the little segments are flat.",
          "The flat segments form a diagonal line.",
          "Compare the line to $y=x$ and $y=-x$.",
        ],
        solution: [
          { step: 1, explanation: "The horizontal segments occur where the slope is zero.", math: "x-y=0" },
          { step: 2, explanation: "That condition is the line $y=x$.", math: "y=x" },
        ],
      },
      {
        questionLatex:
          "\\text{The slope field shown could represent which differential equation?}",
        difficulty: 3,
        skillTags: ["slope_field", "equation_matching"],
        figure: slopeFieldXMinusY,
        choices: ["$\\frac{dy}{dx}=x-y$", "$\\frac{dy}{dx}=x+y$", "$\\frac{dy}{dx}=y-x$", "$\\frac{dy}{dx}=y(2-y)$"],
        correctLetter: "A",
        rationales: {
          B: "For $x+y$, horizontal segments would lie on $y=-x$.",
          C: "This would reverse the sign pattern above and below $y=x$.",
          D: "This would have slopes depending only on horizontal bands of $y$.",
        },
        hints: [
          "The field has horizontal segments along $y=x$.",
          "Below $y=x$, slopes are positive; above it, slopes are negative.",
          "$x-y$ has exactly that sign pattern.",
        ],
        solution: [
          { step: 1, explanation: "Horizontal segments require $x-y=0$.", math: "y=x" },
          { step: 2, explanation: "The sign pattern matches $x-y$.", math: "x-y>0\\text{ below }y=x" },
        ],
      },
      {
        questionLatex:
          "\\text{The slope field shown has horizontal segments at }y=0\\text{ and }y=2.\\text{ Which differential equation matches this behavior?}",
        difficulty: 4,
        skillTags: ["slope_field", "equilibrium", "equation_matching"],
        figure: slopeFieldYTimesTwoMinusY,
        choices: ["$\\frac{dy}{dx}=y(2-y)$", "$\\frac{dy}{dx}=x-y$", "$\\frac{dy}{dx}=y+2$", "$\\frac{dy}{dx}=2x-y$"],
        correctLetter: "A",
        rationales: {
          B: "This would have horizontal segments on a diagonal line, not horizontal bands.",
          C: "This has only one horizontal band, $y=-2$.",
          D: "This depends on $x$ and would not create the same horizontal bands for every $x$.",
        },
        hints: [
          "Horizontal segments occur when $dy/dx=0$.",
          "The derivative should be zero at $y=0$ and $y=2$ for every $x$.",
          "Look for a factorization with roots $0$ and $2$.",
        ],
        solution: [
          { step: 1, explanation: "A derivative with zeros at $y=0$ and $y=2$ has factors $y$ and $(2-y)$.", math: "y(2-y)" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A slope field for }\\frac{dy}{dx}=x-y\\text{ is shown.}",
      difficulty: 4,
      skillTags: ["slope_field", "point_slope", "graph_interpretation"],
      figure: slopeFieldXMinusY,
      parts: [
        { letter: "a", promptMarkdown: "Find the slope of the solution curve through $(1,0)$ at that point.", points: 1 },
        { letter: "b", promptMarkdown: "Write the equation of the tangent line to the solution curve through $(1,0)$.", points: 1 },
        { letter: "c", promptMarkdown: "Explain why any solution curve has horizontal tangent wherever it crosses the line $y=x$.", points: 2 },
        { letter: "d", promptMarkdown: "At $(0,2)$, state whether the solution is increasing or decreasing and justify.", points: 1 },
      ],
      hints: [
        "Substitute each point into $x-y$.",
        "A horizontal tangent has derivative $0$.",
        "A negative derivative means the solution is decreasing at that point.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Computes slope $1$ at $(1,0)$." },
          { part: "b", points: 1, description: "Writes $y=x-1$." },
          { part: "c", points: 1, description: "Sets $x-y=0$." },
          { part: "c", points: 1, description: "Connects $x-y=0$ to the line $y=x$ and horizontal tangents." },
          { part: "d", points: 1, description: "Computes $0-2=-2$ and concludes decreasing." },
        ],
      },
      commonErrors: [
        "Reading the slope from the visual field without substituting into the differential equation.",
        "Using the point as the slope.",
        "Confusing a negative slope with concavity.",
      ],
      workedSolution: [
        { part: "a", explanation: "At $(1,0)$, $dy/dx=1-0=1$." },
        { part: "b", explanation: "A tangent line through $(1,0)$ with slope $1$ is $y-0=1(x-1)$, or $y=x-1$." },
        { part: "c", explanation: "Horizontal tangents occur when $dy/dx=0$. Since $x-y=0$ exactly when $y=x$, every crossing of $y=x$ has horizontal tangent." },
        { part: "d", explanation: "At $(0,2)$, $dy/dx=0-2=-2<0$, so the solution is decreasing there." },
      ],
    },
  },
  {
    topicCode: "7.4",
    title: "Reasoning Using Slope Fields",
    subtopic: "Using slope fields and differential equations to infer solution behavior",
    mc: [
      {
        questionLatex:
          "\\text{For }\\frac{dy}{dx}=y(2-y),\\text{ which values of }y\\text{ are equilibrium solutions?}",
        difficulty: 2,
        skillTags: ["slope_field", "equilibrium"],
        choices: ["$y=0\\text{ and }y=2$", "$y=1\\text{ only}$", "$y=-2\\text{ and }y=2$", "$y=0\\text{ only}$"],
        correctLetter: "A",
        rationales: {
          B: "At $y=1$, the derivative is positive, not zero.",
          C: "$y=-2$ does not make $y(2-y)$ equal zero.",
          D: "$y=2$ also makes the derivative zero.",
        },
        hints: [
          "Equilibrium solutions have derivative zero for all $x$.",
          "Set $y(2-y)=0$.",
          "Solve both factors.",
        ],
        solution: [
          { step: 1, explanation: "Set the derivative equal to zero.", math: "y(2-y)=0" },
          { step: 2, explanation: "Solve.", math: "y=0\\text{ or }y=2" },
        ],
      },
      {
        questionLatex:
          "\\text{For }\\frac{dy}{dx}=1-y,\\text{ a solution satisfies }y(0)=0.\\text{ What can be concluded about the solution immediately after }x=0?",
        difficulty: 2,
        skillTags: ["slope_field", "solution_behavior"],
        figure: slopeFieldOneMinusY,
        choices: ["It is increasing because $dy/dx=1$ at $(0,0)$.", "It is decreasing because $dy/dx=-1$ at $(0,0)$.", "It is constant because $y=0$.", "It has vertical tangent."],
        correctLetter: "A",
        rationales: {
          B: "Substituting $y=0$ gives $1-y=1$, not $-1$.",
          C: "The equilibrium is $y=1$, not $y=0$.",
          D: "The differential equation gives a finite slope.",
        },
        hints: [
          "Substitute the initial point into the differential equation.",
          "The sign of $dy/dx$ tells whether the solution initially increases or decreases.",
          "$1-0=1$.",
        ],
        solution: [
          { step: 1, explanation: "Evaluate at the initial point.", math: "\\frac{dy}{dx}=1-0=1" },
          { step: 2, explanation: "A positive derivative means increasing.", math: "y\\text{ increases}" },
        ],
      },
      {
        questionLatex:
          "\\text{A solution to }\\frac{dy}{dx}=y(2-y)\\text{ has }y(0)=3.\\text{ Which behavior is consistent with the differential equation?}",
        difficulty: 3,
        skillTags: ["slope_field", "solution_behavior", "equilibrium"],
        figure: slopeFieldYTimesTwoMinusY,
        choices: ["The solution decreases toward $y=2$.", "The solution increases without bound.", "The solution decreases through $y=0$.", "The solution is constant at $y=3$."],
        correctLetter: "A",
        rationales: {
          B: "For $y>2$, $y(2-y)$ is negative, so the solution decreases.",
          C: "The equilibrium at $y=2$ acts as a barrier for this qualitative reasoning.",
          D: "At $y=3$, the derivative is $3(2-3)=-3$, not zero.",
        },
        hints: [
          "Determine the sign of $y(2-y)$ when $y>2$.",
          "Identify the equilibrium line just below $y=3$.",
          "A negative derivative above $y=2$ pushes solutions downward.",
        ],
        solution: [
          { step: 1, explanation: "When $y=3$, the derivative is negative.", math: "3(2-3)=-3" },
          { step: 2, explanation: "The stable equilibrium is $y=2$ for solutions above it.", math: "y\\to2" },
        ],
      },
      {
        questionLatex:
          "\\text{For }\\frac{dy}{dx}=y(2-y),\\text{ where is the rate of increase greatest for }0<y<2?",
        difficulty: 3,
        skillTags: ["slope_field", "max_rate"],
        choices: ["$y=1$", "$y=0$", "$y=2$", "$y=\\frac12$"],
        correctLetter: "A",
        rationales: {
          B: "At $y=0$, the derivative is zero.",
          C: "At $y=2$, the derivative is zero.",
          D: "The product $y(2-y)$ is larger at $y=1$ than at $y=1/2$.",
        },
        hints: [
          "Maximize $y(2-y)$ for $0<y<2$.",
          "This quadratic opens downward.",
          "Its vertex is halfway between the zeros $0$ and $2$.",
        ],
        solution: [
          { step: 1, explanation: "The derivative as a function of $y$ is a downward-opening quadratic.", math: "y(2-y)=2y-y^2" },
          { step: 2, explanation: "The maximum occurs midway between roots $0$ and $2$.", math: "y=1" },
        ],
      },
      {
        questionLatex:
          "\\text{For }\\frac{dy}{dx}=x-y,\\text{ a solution passes through }(0,1).\\text{ What is the slope of the solution at that point, and what does it indicate?}",
        difficulty: 4,
        skillTags: ["slope_field", "point_slope", "solution_behavior"],
        figure: slopeFieldXMinusY,
        choices: ["$-1$, so the solution is decreasing at $(0,1)$.", "$1$, so the solution is increasing at $(0,1)$.", "$0$, so the solution has a horizontal tangent.", "$-1$, so the solution is concave down everywhere."],
        correctLetter: "A",
        rationales: {
          B: "This reverses $x-y$ to $y-x$.",
          C: "The slope is not zero at $(0,1)$.",
          D: "A negative first derivative at one point does not prove concavity everywhere.",
        },
        hints: [
          "Substitute $(0,1)$ into $x-y$.",
          "Interpret the sign of the slope.",
          "Do not infer concavity from first derivative sign alone.",
        ],
        solution: [
          { step: 1, explanation: "Evaluate the derivative.", math: "\\frac{dy}{dx}=0-1=-1" },
          { step: 2, explanation: "A negative derivative means the solution is decreasing at that point.", math: "-1<0" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Consider the differential equation }\\frac{dy}{dx}=y(4-y).",
      difficulty: 4,
      skillTags: ["slope_field", "equilibrium", "solution_behavior", "concavity"],
      figure: slopeFieldYTimesFourMinusY,
      parts: [
        { letter: "a", promptMarkdown: "Find the equilibrium solutions of the differential equation.", points: 1 },
        { letter: "b", promptMarkdown: "For a solution with $y(0)=1$, determine whether the solution is increasing or decreasing at $x=0$.", points: 1 },
        { letter: "c", promptMarkdown: "For $0<y<4$, determine the value of $y$ where $dy/dx$ is greatest.", points: 2 },
        { letter: "d", promptMarkdown: "Describe the long-term behavior suggested by the differential equation for a solution with $0<y(0)<4$.", points: 1 },
      ],
      hints: [
        "Set $y(4-y)=0$ for equilibria.",
        "For $0<y<4$, the derivative is positive.",
        "The maximum of $y(4-y)$ occurs at the midpoint of the roots.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Finds $y=0$ and $y=4$." },
          { part: "b", points: 1, description: "Computes $1(4-1)>0$, so increasing." },
          { part: "c", points: 1, description: "Recognizes the rate is $4y-y^2$." },
          { part: "c", points: 1, description: "Finds maximum at $y=2$." },
          { part: "d", points: 1, description: "States solution approaches $y=4$." },
        ],
      },
      commonErrors: [
        "Using the provided slope-field figure for exact values instead of the equation in the prompt.",
        "Forgetting the equilibrium at $y=0$.",
        "Saying the solution reaches the upper equilibrium in finite time.",
      ],
      workedSolution: [
        { part: "a", explanation: "Equilibria occur when $y(4-y)=0$, so $y=0$ and $y=4$." },
        { part: "b", explanation: "At $y=1$, $dy/dx=1(3)=3>0$, so the solution is increasing." },
        { part: "c", explanation: "$y(4-y)=4y-y^2$ is maximized at $y=2$." },
        { part: "d", explanation: "For $0<y<4$, the derivative is positive, and $y=4$ is an upper equilibrium; the solution approaches $4$." },
      ],
    },
  },
  {
    topicCode: "7.6",
    title: "General Solutions Using Separation of Variables",
    subtopic: "Separating variables and finding families of solutions",
    mc: [
      {
        questionLatex:
          "\\text{Find a general solution to }\\frac{dy}{dx}=\\frac{3x^2}{y}.",
        difficulty: 2,
        skillTags: ["separation", "general_solution"],
        choices: ["$y^2=2x^3+C$", "$y=3x^3+C$", "$y^2=6x+C$", "$\\ln|y|=x^3+C$"],
        correctLetter: "A",
        rationales: {
          B: "This integrates as if $y$ were not in the denominator.",
          C: "This integrates $3x^2$ incorrectly.",
          D: "This would come from $dy/y$, but separation gives $y\\,dy$.",
        },
        hints: [
          "Multiply both sides by $y\\,dx$.",
          "Integrate $y\\,dy=3x^2\\,dx$.",
          "You may absorb constant factors into $C$.",
        ],
        solution: [
          { step: 1, explanation: "Separate variables.", math: "y\\,dy=3x^2\\,dx" },
          { step: 2, explanation: "Integrate.", math: "\\frac{y^2}{2}=x^3+C" },
          { step: 3, explanation: "Rewrite.", math: "y^2=2x^3+C" },
        ],
      },
      {
        questionLatex:
          "\\begin{aligned}\\text{Which list contains exactly the differential equations that can be solved by separation of variables alone?}\\\\ \\text{I. }\\frac{dy}{dx}=x-y\\qquad \\text{II. }\\frac{dy}{dx}=y(2-y)\\\\ \\text{III. }\\frac{dy}{dx}=\\frac{x}{y}\\qquad \\text{IV. }\\frac{dy}{dx}=\\frac{1}{e^x+e^{-y}}\\end{aligned}",
        difficulty: 4,
        skillTags: ["separation", "technique_selection", "equation_matching"],
        choices: ["II and III only", "I and III only", "II and IV only", "All four"],
        correctLetter: "A",
        rationales: {
          B: "$x-y$ is not a product or quotient that can be separated into an $x$-only factor times a $y$-only factor.",
          C: "The expression $1/(e^x+e^{-y})$ has an $x$-term and a $y$-term added in the same denominator, so it does not separate directly.",
          D: "Equations I and IV are not separable by algebraic separation alone.",
        },
        hints: [
          "A separable equation can be rearranged into a $y$-only expression times $dy$ equal to an $x$-only expression times $dx$.",
          "Check whether the right side factors into something depending only on $x$ times something depending only on $y$.",
          "$y(2-y)$ depends only on $y$, and $x/y$ separates as $y\\,dy=x\\,dx$.",
        ],
        solution: [
          { step: 1, explanation: "Equation II separates because the right side depends only on $y$.", math: "\\frac{dy}{y(2-y)}=dx" },
          { step: 2, explanation: "Equation III separates by multiplying by $y\\,dx$.", math: "y\\,dy=x\\,dx" },
          { step: 3, explanation: "Equation I is first-order linear but not separable; equation IV does not factor into separate $x$ and $y$ factors.", math: "\\text{II and III only}" },
        ],
      },
      {
        questionLatex:
          "\\text{A general solution to }\\frac{dy}{dx}=\\frac{y}{x+1}\\text{ for }x>-1\\text{ is}",
        difficulty: 3,
        skillTags: ["separation", "logarithms", "general_solution"],
        choices: ["$y=C(x+1)$", "$y=C\\ln(x+1)$", "$y=(x+1)^2+C$", "$\\ln y=x+1+C$"],
        correctLetter: "A",
        rationales: {
          B: "Exponentiating $\\ln|y|=\\ln(x+1)+C$ gives a constant multiple of $x+1$, not a logarithm.",
          C: "This does not satisfy the differential equation.",
          D: "The right side should be $\\ln(x+1)+C$, not $x+1+C$.",
        },
        hints: [
          "Separate as $dy/y=dx/(x+1)$.",
          "Integrate to get logarithms.",
          "Exponentiate and absorb $e^C$ into a new constant.",
        ],
        solution: [
          { step: 1, explanation: "Separate and integrate.", math: "\\ln|y|=\\ln(x+1)+C" },
          { step: 2, explanation: "Exponentiate.", math: "y=C(x+1)" },
        ],
      },
      {
        questionLatex:
          "\\text{Which implicit relation is a general solution to }\\frac{dy}{dx}=\\frac{\\sin x}{y^2}?",
        difficulty: 3,
        skillTags: ["separation", "implicit_solution"],
        choices: ["$y^3=C-3\\cos x$", "$y^3=3\\sin x+C$", "$y^2=-\\cos x+C$", "$y=C\\sin x$"],
        correctLetter: "A",
        rationales: {
          B: "The antiderivative of $\\sin x$ is $-\\cos x$, not $\\sin x$.",
          C: "The left side should integrate $y^2\\,dy$ to $y^3/3$.",
          D: "This does not follow from separating variables.",
        },
        hints: [
          "Multiply by $y^2\\,dx$.",
          "Integrate $y^2\\,dy$.",
          "The antiderivative of $\\sin x$ is $-\\cos x$.",
        ],
        solution: [
          { step: 1, explanation: "Separate.", math: "y^2\\,dy=\\sin x\\,dx" },
          { step: 2, explanation: "Integrate.", math: "\\frac{y^3}{3}=-\\cos x+C" },
          { step: 3, explanation: "Rewrite.", math: "y^3=C-3\\cos x" },
        ],
      },
      {
        questionLatex:
          "\\text{A student solves }\\frac{dy}{dx}=xy\\text{ and writes }y=\\frac{x^2}{2}+C.\\text{ What is the error?}",
        difficulty: 4,
        skillTags: ["separation", "error_analysis", "exponential_model"],
        choices: ["The student divided by $y$ incorrectly; the solution should involve $\\ln|y|$ and an exponential family.", "The student forgot to add $C$.", "The student should have integrated $x$ as $x^2$.", "There is no error."],
        correctLetter: "A",
        rationales: {
          B: "A constant was included, but the separation step was wrong.",
          C: "The integral of $x$ is $x^2/2$, so that part is not the main error.",
          D: "Substituting the student's answer into $y'=xy$ does not work in general.",
        },
        hints: [
          "Separate variables before integrating.",
          "The left side should be $dy/y$.",
          "Exponentiate after integrating.",
        ],
        solution: [
          { step: 1, explanation: "Separate correctly.", math: "\\frac{dy}{y}=x\\,dx" },
          { step: 2, explanation: "Integrate and exponentiate.", math: "\\ln|y|=\\frac{x^2}{2}+C\\Rightarrow y=Ce^{x^2/2}" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Find the general solution to }\\frac{dy}{dx}=\\frac{2x}{y+1}.",
      difficulty: 4,
      skillTags: ["separation", "general_solution", "implicit_solution"],
      parts: [
        { letter: "a", promptMarkdown: "Separate the variables.", points: 1 },
        { letter: "b", promptMarkdown: "Integrate both sides.", points: 2 },
        { letter: "c", promptMarkdown: "Write the solution as an implicit relation involving $x$, $y$, and a constant.", points: 1 },
      ],
      hints: [
        "Move $y+1$ to the left side.",
        "Integrate $(y+1)\\,dy$ and $2x\\,dx$.",
        "Keep one arbitrary constant.",
      ],
      rubric: {
        maxPoints: 4,
        criteria: [
          { part: "a", points: 1, description: "Writes $(y+1)dy=2x dx$." },
          { part: "b", points: 1, description: "Integrates the left side correctly." },
          { part: "b", points: 1, description: "Integrates the right side correctly." },
          { part: "c", points: 1, description: "Gives $y^2/2+y=x^2+C$ or equivalent." },
        ],
      },
      commonErrors: [
        "Dividing by $y+1$ again after separation.",
        "Forgetting the $+y$ term after integrating $y+1$.",
        "Using two unrelated constants.",
      ],
      workedSolution: [
        { part: "a", explanation: "Separate variables: $(y+1)\\,dy=2x\\,dx$." },
        { part: "b", explanation: "Integrating gives $\\frac{y^2}{2}+y=x^2+C$." },
        { part: "c", explanation: "An implicit general solution is $\\frac{y^2}{2}+y=x^2+C$." },
      ],
    },
  },
  {
    topicCode: "7.7",
    title: "Particular Solutions Using Initial Conditions and Separation of Variables",
    subtopic: "Using initial values to determine constants in separated solutions",
    mc: [
      {
        questionLatex:
          "\\text{Solve }\\frac{dy}{dx}=\\frac{x}{y}\\text{ with }y(0)=3\\text{ and }y>0.",
        difficulty: 2,
        skillTags: ["separation", "particular_solution"],
        choices: ["$y=\\sqrt{x^2+9}$", "$y=x+3$", "$y=\\sqrt{x^2+3}$", "$y=\\frac{x^2}{2}+3$"],
        correctLetter: "A",
        rationales: {
          B: "This does not satisfy $y'=x/y$.",
          C: "This gives $y(0)=\\sqrt3$, not $3$.",
          D: "This treats $y$ as if it were not in the denominator.",
        },
        hints: [
          "Separate as $y\\,dy=x\\,dx$.",
          "Integrate and use $y(0)=3$.",
          "Use the positive branch because $y>0$.",
        ],
        solution: [
          { step: 1, explanation: "Separate and integrate.", math: "\\frac{y^2}{2}=\\frac{x^2}{2}+C" },
          { step: 2, explanation: "Use the initial condition.", math: "9=C'" },
          { step: 3, explanation: "Use the positive branch.", math: "y=\\sqrt{x^2+9}" },
        ],
      },
      {
        questionLatex:
          "\\text{Solve }\\frac{dy}{dx}=y\\cos x\\text{ with }y(0)=2.",
        difficulty: 2,
        skillTags: ["separation", "particular_solution", "exponential_model"],
        choices: ["$y=2e^{\\sin x}$", "$y=2e^{\\cos x}$", "$y=e^{2\\sin x}$", "$y=2+\\sin x$"],
        correctLetter: "A",
        rationales: {
          B: "The antiderivative of $\\cos x$ is $\\sin x$, not $\\cos x$.",
          C: "The initial condition changes the multiplicative constant, not the exponent coefficient.",
          D: "This does not satisfy $y'=y\\cos x$.",
        },
        hints: [
          "Separate as $dy/y=\\cos x\\,dx$.",
          "Integrate to get $\\ln|y|=\\sin x+C$.",
          "Use $y(0)=2$.",
        ],
        solution: [
          { step: 1, explanation: "Separate and integrate.", math: "\\ln|y|=\\sin x+C" },
          { step: 2, explanation: "Exponentiate.", math: "y=Ce^{\\sin x}" },
          { step: 3, explanation: "Use $y(0)=2$.", math: "C=2" },
        ],
      },
      {
        questionLatex:
          "\\text{If }\\frac{dy}{dx}=\\frac{1+x}{y}\\text{ and }y(1)=2,\\text{ then the solution near }x=1\\text{ is}",
        difficulty: 3,
        skillTags: ["separation", "particular_solution"],
        choices: ["$y=x+1$", "$y=x-1$", "$y=\\sqrt{x^2+2x+4}$", "$y=\\frac{x^2}{2}+x+1$"],
        correctLetter: "A",
        rationales: {
          B: "This gives $y(1)=0$, not $2$.",
          C: "This does not use the initial condition correctly.",
          D: "This treats $y$ as absent from the denominator.",
        },
        hints: [
          "Separate as $y\\,dy=(1+x)\\,dx$.",
          "Use the initial condition after integrating.",
          "Near $x=1$, the positive square-root branch is used.",
        ],
        solution: [
          { step: 1, explanation: "Integrate.", math: "y^2=x^2+2x+C" },
          { step: 2, explanation: "Use $(1,2)$.", math: "4=1+2+C\\Rightarrow C=1" },
          { step: 3, explanation: "Use the positive branch.", math: "y=\\sqrt{(x+1)^2}=x+1\\text{ near }x=1" },
        ],
      },
      {
        questionLatex:
          "\\text{Given }\\frac{dy}{dx}=2xy\\text{ and }y(0)=5,\\text{ find }y(1).",
        difficulty: 3,
        skillTags: ["separation", "particular_solution", "exponential_model"],
        choices: ["$5e$", "$5e^2$", "$e^5$", "$5+e$"],
        correctLetter: "A",
        rationales: {
          B: "The exponent after integration is $x^2$, not $2x$.",
          C: "This uses the initial value as the exponent.",
          D: "The solution is exponential, not additive.",
        },
        hints: [
          "Separate as $dy/y=2x\\,dx$.",
          "Integrate to get $y=Ce^{x^2}$.",
          "Use $y(0)=5$ and evaluate at $x=1$.",
        ],
        solution: [
          { step: 1, explanation: "Solve generally.", math: "\\ln|y|=x^2+C\\Rightarrow y=Ce^{x^2}" },
          { step: 2, explanation: "Use the initial condition.", math: "C=5" },
          { step: 3, explanation: "Evaluate.", math: "y(1)=5e" },
        ],
      },
      {
        questionLatex:
          "\\text{A solution to }\\frac{dy}{dx}=\\frac{2x}{y}\\text{ satisfies }y(1)=3\\text{ and }y>0.\\text{ What is }y(2)?",
        difficulty: 4,
        skillTags: ["separation", "particular_solution"],
        choices: ["$\\sqrt{15}$", "$4$", "$\\sqrt{10}$", "$3$"],
        correctLetter: "A",
        rationales: {
          B: "This would follow from an incorrect constant or linear growth assumption.",
          C: "This uses $x^2+C$ instead of $2x^2+C$ after integration.",
          D: "This ignores the change from $x=1$ to $x=2$.",
        },
        hints: [
          "Separate as $y\\,dy=2x\\,dx$.",
          "Integrate to get $y^2=2x^2+C$.",
          "Use $y(1)=3$ before evaluating at $x=2$.",
        ],
        solution: [
          { step: 1, explanation: "Integrate.", math: "y^2=2x^2+C" },
          { step: 2, explanation: "Use the initial condition.", math: "9=2+C\\Rightarrow C=7" },
          { step: 3, explanation: "Evaluate at $x=2$.", math: "y(2)=\\sqrt{8+7}=\\sqrt{15}" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A portion of the slope field for }\\frac{dy}{dx}=\\frac{2x}{y}\\text{ is shown for }y>0.\\text{ Let }y=f(x)\\text{ be the solution with }f(1)=3.",
      difficulty: 5,
      skillTags: [
        "slope_field",
        "separation",
        "particular_solution",
        "domain",
        "evaluation",
      ],
      figure: slopeFieldTwoXOverY,
      parts: [
        {
          letter: "a",
          promptMarkdown:
            "Find the slope of the solution at $(1,3)$ and write an equation for the tangent line there. Explain how the slope agrees with the field.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown:
            "On the positive-$y$ portion of the slope field, where do solution curves have horizontal tangent segments?",
          points: 1,
        },
        {
          letter: "c",
          promptMarkdown: "Find the particular solution $y=f(x)$.",
          points: 2,
        },
        {
          letter: "d",
          promptMarkdown:
            "Determine the largest interval of $x$ containing $x=1$ on which this particular solution is differentiable. Justify your answer.",
          points: 1,
        },
      ],
      hints: [
        "The slope at a point comes from substituting the point into $2x/y$.",
        "Horizontal tangent segments have slope $0$.",
        "After solving, check where the square root and the differential equation both make sense.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          {
            part: "a",
            points: 1,
            description:
              "Computes the slope at $(1,3)$ as $2/3$.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Writes a correct tangent line and connects its positive moderate slope to the field.",
          },
          {
            part: "b",
            points: 1,
            description:
              "Identifies horizontal tangents on the line $x=0$ for $y>0$.",
          },
          {
            part: "c",
            points: 1,
            description: "Separates and integrates to $y^2=2x^2+C$.",
          },
          {
            part: "c",
            points: 1,
            description:
              "Uses $f(1)=3$ and the positive branch to get $f(x)=\\sqrt{2x^2+7}$.",
          },
          {
            part: "d",
            points: 1,
            description:
              "Justifies that the largest differentiability interval containing $1$ is $(-\\infty,\\infty)$.",
          },
        ],
      },
      commonErrors: [
        "Reading the slope field visually but not substituting the point into the differential equation.",
        "Forgetting that horizontal tangent segments occur when the numerator $2x$ is zero and $y\\ne0$.",
        "Using the negative square-root branch despite $f(1)=3$.",
        "Restricting the domain unnecessarily even though $2x^2+7$ is always positive.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "At $(1,3)$, $dy/dx=2(1)/3=2/3$. The tangent line is $y-3=\\frac23(x-1)$. This matches the field because the segment near $(1,3)$ slopes upward but is not steep.",
        },
        {
          part: "b",
          explanation:
            "Horizontal tangent segments occur when $dy/dx=0$. Since $dy/dx=2x/y$ and $y>0$, this happens exactly when $x=0$.",
        },
        {
          part: "c",
          explanation:
            "$y\\,dy=2x\\,dx$, so $y^2/2=x^2+C$, or $y^2=2x^2+C$. Since $f(1)=3$, $9=2+C$ and $C=7$. Because $f(1)>0$, the particular solution is $f(x)=\\sqrt{2x^2+7}$.",
        },
        {
          part: "d",
          explanation:
            "The expression $2x^2+7$ is positive for every real $x$, so $f(x)=\\sqrt{2x^2+7}$ is defined and positive for all real $x$. The right side $2x/y$ is therefore continuous along the solution for all real $x$, so the largest interval is $(-\\infty,\\infty)$.",
        },
      ],
    },
  },
  {
    topicCode: "7.8",
    title: "Exponential Models with Differential Equations",
    subtopic: "Solving and interpreting growth and decay models",
    mc: [
      {
        questionLatex:
          "\\text{A population satisfies }\\frac{dP}{dt}=0.08P\\text{ and }P(0)=500.\\text{ Which expression gives }P(t)?",
        difficulty: 2,
        skillTags: ["exponential_model", "particular_solution"],
        choices: ["$500e^{0.08t}$", "$0.08e^{500t}$", "$500+0.08t$", "$500e^{-0.08t}$"],
        correctLetter: "A",
        rationales: {
          B: "This reverses the initial amount and rate constant.",
          C: "Proportional growth gives an exponential model, not linear growth.",
          D: "The positive rate constant indicates growth, not decay.",
        },
        hints: [
          "The model $P'=kP$ has solution $P=Ce^{kt}$.",
          "Use $P(0)=500$.",
          "The sign of $k$ determines growth or decay.",
        ],
        solution: [
          { step: 1, explanation: "Use the exponential solution form.", math: "P=Ce^{0.08t}" },
          { step: 2, explanation: "Apply $P(0)=500$.", math: "C=500" },
        ],
      },
      {
        questionLatex:
          "\\text{A radioactive substance satisfies }\\frac{dA}{dt}=kA.\\text{ If half remains after }10\\text{ days, what is }k?",
        difficulty: 2,
        skillTags: ["exponential_model", "half_life"],
        choices: ["$-\\frac{\\ln2}{10}$", "$\\frac{\\ln2}{10}$", "$-10\\ln2$", "$\\ln(10/2)$"],
        correctLetter: "A",
        rationales: {
          B: "Decay requires a negative rate constant.",
          C: "This has the reciprocal time factor wrong.",
          D: "This does not come from the half-life equation.",
        },
        hints: [
          "Use $A(t)=A_0e^{kt}$.",
          "Half remains means $A(10)=A_0/2$.",
          "Solve $1/2=e^{10k}$.",
        ],
        solution: [
          { step: 1, explanation: "Set up the half-life equation.", math: "\\frac12=e^{10k}" },
          { step: 2, explanation: "Take natural logs.", math: "k=\\frac{\\ln(1/2)}{10}=-\\frac{\\ln2}{10}" },
        ],
      },
      {
        questionLatex:
          "\\text{A bacteria culture satisfies }P'=0.3P.\\text{ If }P(2)=900,\\text{ what was }P(0)?",
        difficulty: 3,
        skillTags: ["exponential_model", "initial_value"],
        choices: ["$900e^{-0.6}$", "$900e^{0.6}$", "$900-0.6$", "$450$"],
        correctLetter: "A",
        rationales: {
          B: "This projects forward two hours instead of backward to time $0$.",
          C: "Exponential growth is multiplicative, not subtractive.",
          D: "No doubling time information was given.",
        },
        hints: [
          "Write $P(t)=P(0)e^{0.3t}$.",
          "Substitute $t=2$ and $P(2)=900$.",
          "Solve for $P(0)$.",
        ],
        solution: [
          { step: 1, explanation: "Use the model.", math: "900=P(0)e^{0.6}" },
          { step: 2, explanation: "Solve for the initial amount.", math: "P(0)=900e^{-0.6}" },
        ],
      },
      {
        questionLatex:
          "\\text{A temperature }T\\text{ satisfies }\\frac{dT}{dt}=-0.2(T-70)\\text{ and }T(0)=90.\\text{ Which expression gives }T(t)?",
        difficulty: 3,
        skillTags: ["exponential_model", "newton_cooling"],
        choices: ["$70+20e^{-0.2t}$", "$90e^{-0.2t}$", "$70-20e^{-0.2t}$", "$20+70e^{-0.2t}$"],
        correctLetter: "A",
        rationales: {
          B: "This decays toward $0$, not toward the room temperature $70$.",
          C: "This gives $T(0)=50$, not $90$.",
          D: "This gives the wrong limiting temperature.",
        },
        hints: [
          "Let $U=T-70$.",
          "Then $U'=-0.2U$.",
          "Use $U(0)=20$ and add back $70$.",
        ],
        solution: [
          { step: 1, explanation: "Solve for the temperature difference.", math: "T-70=Ce^{-0.2t}" },
          { step: 2, explanation: "Use $T(0)=90$.", math: "C=20" },
          { step: 3, explanation: "Write $T(t)$.", math: "T=70+20e^{-0.2t}" },
        ],
      },
      {
        questionLatex:
          "\\text{A quantity }Q\\text{ satisfies }Q'=kQ\\text{ and triples every }5\\text{ years. Which expression gives }k?",
        difficulty: 4,
        skillTags: ["exponential_model", "growth_constant"],
        choices: ["$\\frac{\\ln3}{5}$", "$5\\ln3$", "$\\ln(5/3)$", "$\\frac{3}{5}$"],
        correctLetter: "A",
        rationales: {
          B: "The time factor should divide $\\ln3$, not multiply it.",
          C: "Tripling means $Q(5)/Q(0)=3$, not $5/3$.",
          D: "The growth constant is not the ordinary ratio $3/5$.",
        },
        hints: [
          "Use $Q(t)=Q_0e^{kt}$.",
          "Triples every 5 years means $Q(5)=3Q_0$.",
          "Solve $3=e^{5k}$.",
        ],
        solution: [
          { step: 1, explanation: "Set up the tripling equation.", math: "3=e^{5k}" },
          { step: 2, explanation: "Take natural logs.", math: "k=\\frac{\\ln3}{5}" },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A bacteria culture grows at a rate proportional to its size. At time }t=0\\text{ there are }800\\text{ bacteria, and at }t=3\\text{ hours there are }1400\\text{ bacteria.}",
      difficulty: 4,
      skillTags: ["exponential_model", "growth_constant", "prediction"],
      parts: [
        { letter: "a", promptMarkdown: "Write and solve a differential equation for the population $P(t)$.", points: 2 },
        { letter: "b", promptMarkdown: "Find the exact value of the growth constant $k$.", points: 1 },
        { letter: "c", promptMarkdown: "Use the model to predict $P(6)$.", points: 2 },
      ],
      hints: [
        "A rate proportional to size means $P'=kP$.",
        "Use $P(3)=1400$ to find $k$.",
        "Once $e^{3k}$ is known, predicting at $t=6$ can be done exactly.",
      ],
      rubric: {
        maxPoints: 5,
        criteria: [
          { part: "a", points: 1, description: "Writes $P'=kP$ and solution $P=Ce^{kt}$." },
          { part: "a", points: 1, description: "Uses $P(0)=800$ to get $P=800e^{kt}$." },
          { part: "b", points: 1, description: "Finds $k=\\frac13\\ln(7/4)$." },
          { part: "c", points: 1, description: "Sets up $P(6)=800e^{6k}$." },
          { part: "c", points: 1, description: "Simplifies to $2450$." },
        ],
      },
      commonErrors: [
        "Using a linear model from the two data points.",
        "Solving for $k$ with common logarithms without consistency.",
        "Rounding $k$ too early.",
      ],
      workedSolution: [
        { part: "a", explanation: "The model is $P'=kP$, so $P=Ce^{kt}$. Since $P(0)=800$, $P=800e^{kt}$." },
        { part: "b", explanation: "$1400=800e^{3k}$, so $e^{3k}=7/4$ and $k=\\frac13\\ln(7/4)$." },
        { part: "c", explanation: "$P(6)=800e^{6k}=800(e^{3k})^2=800(7/4)^2=2450$." },
      ],
    },
  },
];

export const differentialEquationTopics: Topic[] = topicSeeds.map(makeTopic);
