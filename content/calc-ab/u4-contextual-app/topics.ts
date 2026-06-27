import type {
  FrqItem,
  FrqPart,
  FrqRubric,
  FrqSolutionPart,
  Hint,
  McChoice,
  McSingleItem,
  SolutionStep,
  Topic,
} from "@/lib/content/types";

const COURSE = "calc-ab";
const UNIT = "u4-contextual-app";
const VERSION = "0.5.3";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;

type McLetter = (typeof LETTERS)[number];

interface TopicMeta {
  topicCode: string;
  title: string;
  subtopic: string;
}

interface McSeed {
  questionLatex: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  calculatorAllowed?: boolean;
  skillTags: string[];
  commonMisconceptions?: string[];
  choices: readonly [string, string, string, string];
  correctLetter: McLetter;
  rationales?: Partial<Record<McLetter, string>>;
  misconceptionTags?: Partial<Record<McLetter, string>>;
  hints: readonly [string, string, string];
  solution: readonly SolutionStep[];
}

interface FrqSeed {
  questionLatex: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  calculatorAllowed?: boolean;
  skillTags: string[];
  commonMisconceptions?: string[];
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

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const unletteredChoices = LETTERS.map((seedLetter, choiceIndex) => {
    const isCorrect = seedLetter === seed.correctLetter;
    return {
      text: seed.choices[choiceIndex],
      isCorrect,
      rationaleIfWrong: isCorrect
        ? null
        : seed.rationales?.[seedLetter] ??
          "This answer uses the wrong contextual rate, sign, unit, or derivative relationship.",
      misconceptionTag: isCorrect
        ? null
        : seed.misconceptionTags?.[seedLetter] ?? "incorrect_contextual_rate",
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
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.mc.${String(
      index + 1,
    ).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "confuses_quantity_with_rate_of_change",
    ],
    questionLatex: seed.questionLatex,
    choices,
    correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: [...seed.solution],
    reviewStatus: REVIEW_STATUS,
    version: VERSION,
    sourceType: SOURCE_TYPE,
  };
}

function makeFrq(meta: TopicMeta, seed: FrqSeed): FrqItem {
  return {
    contentId: `${COURSE}.u4.t${topicSlug(meta.topicCode)}.frq.001`,
    kind: "frq",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: seed.difficulty,
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "confuses_quantity_with_rate_of_change",
    ],
    questionLatex: seed.questionLatex,
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

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "4.1",
    title: "Interpreting the Meaning of the Derivative in Context",
    subtopic:
      "Reading derivative values, signs, and units as rates of change in real situations",
    mc: [
      {
        questionLatex:
          "\\text{Water enters a tank at rate }R(t)\\text{ gallons per minute. If }R'(6)=-1.8,\\text{ what does this mean?}",
        difficulty: 2,
        skillTags: ["derivative_interpretation", "units"],
        choices: [
          "\\text{At }t=6,\\text{ the inflow rate is decreasing at }1.8\\text{ gallons per minute per minute.}",
          "\\text{At }t=6,\\text{ the tank contains }1.8\\text{ fewer gallons.}",
          "\\text{At }t=6,\\text{ water is leaving the tank at }1.8\\text{ gallons per minute.}",
          "\\text{During the first 6 minutes, }1.8\\text{ gallons entered the tank.}",
        ],
        correctLetter: "A",
        rationales: {
          B: "A derivative of a rate describes how the rate changes, not the amount of water.",
          C: "A negative $R'(6)$ means the inflow rate is decreasing, not necessarily that the flow itself is negative.",
          D: "This confuses an instantaneous derivative with an accumulated amount.",
        },
        hints: [
          "$R(t)$ is already a rate.",
          "$R'(t)$ describes how that rate is changing.",
          "Differentiate the units of $R$: gallons per minute per minute.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Interpret the derivative of a rate.",
            math: "R'(6)=-1.8\\ \\frac{\\text{gal/min}}{\\text{min}}",
          },
          {
            step: 2,
            explanation: "The negative sign means the inflow rate is decreasing.",
            math: "\\text{The inflow rate decreases by }1.8\\text{ gal/min each minute at }t=6.",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A company has cost }C(q)\\text{ dollars to produce }q\\text{ items. If }C'(200)=4.75,\\text{ which statement is best?}",
        difficulty: 2,
        skillTags: ["marginal_cost", "units"],
        choices: [
          "\\text{The 201st item costs about }\\$4.75\\text{ to produce.}",
          "\\text{The first 200 items cost }\\$4.75\\text{ total.}",
          "\\text{The average cost for 200 items is }\\$4.75.",
          "\\text{The company produced 4.75 items after 200 dollars.}",
        ],
        correctLetter: "A",
        rationales: {
          B: "That would describe $C(200)$, not $C'(200)$.",
          C: "Average cost would be $C(200)/200$.",
          D: "This reverses the dependent and independent variables.",
        },
        hints: [
          "$C'(q)$ is marginal cost.",
          "Marginal cost approximates the cost of producing one more item near q.",
          "The units are dollars per item.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Interpret marginal cost.",
            math: "C'(200)=4.75\\ \\frac{\\text{dollars}}{\\text{item}}",
          },
          {
            step: 2,
            explanation: "Use the one-more-item approximation.",
            math: "C(201)-C(200)\\approx C'(200)(1)=4.75",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The temperature }T(t)\\text{ of tea is measured in degrees Celsius, with }t\\text{ in minutes. If }T'(8)<0\\text{ and }T''(8)>0,\\text{ which is true at }t=8?",
        difficulty: 3,
        skillTags: ["first_second_derivative_context", "sign_interpretation"],
        choices: [
          "\\text{The tea is cooling, but the cooling rate is becoming less negative.}",
          "\\text{The tea is warming, and the warming rate is increasing.}",
          "\\text{The tea is cooling faster and faster.}",
          "\\text{The tea has temperature }0\\text{ degrees Celsius.}",
        ],
        correctLetter: "A",
        rationales: {
          B: "$T'(8)<0$ means temperature is decreasing.",
          C: "$T''(8)>0$ means the derivative is increasing, so a negative cooling rate is becoming less negative.",
          D: "The signs of derivatives do not give the actual temperature value.",
        },
        hints: [
          "$T'(8)<0$ tells whether temperature is increasing or decreasing.",
          "$T''(8)>0$ tells whether $T'$ is increasing or decreasing.",
          "A negative derivative that is increasing is moving toward zero.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Interpret the first derivative.",
            math: "T'(8)<0\\Rightarrow T\\text{ is decreasing}",
          },
          {
            step: 2,
            explanation: "Interpret the second derivative.",
            math: "T''(8)>0\\Rightarrow T'\\text{ is increasing, so cooling is slowing down}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A population }P(t)\\text{ is measured in people, with }t\\text{ in years. If }P(4)=1200\\text{ and }P'(4)=85,\\text{ what is }P(4.2)\\text{ approximately?}",
        difficulty: 3,
        skillTags: ["local_linear_interpretation", "units"],
        choices: ["$1217$", "$1285$", "$1200.2$", "$1115$"],
        correctLetter: "A",
        rationales: {
          B: "This uses a one-year change instead of a 0.2-year change.",
          C: "This treats the derivative as people rather than people per year.",
          D: "This uses the correct magnitude with the wrong sign.",
        },
        hints: [
          "Use the derivative as an approximate rate near t=4.",
          "The change in time from 4 to 4.2 is 0.2 years.",
          "Approximate change is $85(0.2)$ people.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use a local linear estimate.",
            math: "P(4.2)\\approx P(4)+P'(4)(0.2)",
          },
          {
            step: 2,
            explanation: "Compute the estimate.",
            math: "1200+85(0.2)=1217",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The amount of medicine in a bloodstream is }M(t)\\text{ mg. Which units should }M''(t)\\text{ have if }t\\text{ is measured in hours?}",
        difficulty: 2,
        skillTags: ["units", "second_derivative_context"],
        choices: [
          "\\text{mg per hour per hour}",
          "\\text{mg per hour}",
          "\\text{hours per mg}",
          "\\text{mg times hours}",
        ],
        correctLetter: "A",
        rationales: {
          B: "Those are the units of $M'(t)$.",
          C: "This reverses the units.",
          D: "A derivative divides by time; it does not multiply by time.",
        },
        hints: [
          "$M'(t)$ has units of mg per hour.",
          "$M''(t)$ is the rate of change of $M'(t)$ with respect to time.",
          "Differentiate with respect to hours one more time.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Track units through derivatives.",
            math: "M'(t):\\frac{\\text{mg}}{\\text{hour}},\\quad M''(t):\\frac{\\text{mg/hour}}{\\text{hour}}",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{The temperature of a metal rod is }T(t)\\text{ degrees Celsius }t\\text{ minutes after heating begins. Suppose }T(5)=84,\\ T'(5)=6.4,\\text{ and }T''(5)=-1.2.",
      difficulty: 3,
      skillTags: ["derivative_interpretation", "units", "local_linear_interpretation"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Interpret $T'(5)=6.4$ in context, including units.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown: "Use a tangent-line approximation to estimate $T(5.25)$.",
          points: 2,
        },
        {
          letter: "c",
          promptMarkdown:
            "Use the sign of $T''(5)$ to explain whether the estimate in part (b) is likely an overestimate or underestimate, assuming the concavity does not change near $t=5$.",
          points: 2,
        },
      ],
      hints: [
        "Part (a) asks about the rate of change of temperature at one instant.",
        "For part (b), the time change is $0.25$ minutes.",
        "If $T''<0$, the graph is concave down and the tangent line lies above the graph nearby.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "States that temperature is increasing at t=5." },
          { part: "a", points: 1, description: "Includes correct units, degrees Celsius per minute." },
          { part: "b", points: 1, description: "Sets up tangent-line approximation correctly." },
          { part: "b", points: 1, description: "Computes $85.6$ degrees Celsius." },
          { part: "c", points: 1, description: "Uses $T''(5)<0$ to identify concave down behavior." },
          { part: "c", points: 1, description: "Concludes the tangent estimate is likely an overestimate." },
        ],
      },
      commonErrors: [
        "Saying $T'(5)$ is a temperature instead of a rate.",
        "Using $5.25$ instead of the change $0.25$ in the linear approximation.",
        "Reversing tangent-line error for concave down functions.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "At $t=5$ minutes, the rod's temperature is increasing at $6.4$ degrees Celsius per minute.",
        },
        {
          part: "b",
          explanation:
            "$T(5.25)\\approx T(5)+T'(5)(0.25)=84+6.4(0.25)=85.6$ degrees Celsius.",
        },
        {
          part: "c",
          explanation:
            "Because $T''(5)<0$, the graph is concave down near $t=5$. A tangent line to a concave-down graph lies above the graph, so the estimate is likely an overestimate.",
        },
      ],
    },
  },
  {
    topicCode: "4.2",
    title: "Straight-Line Motion: Connecting Position, Velocity, and Acceleration",
    subtopic:
      "Using derivatives to connect position, velocity, acceleration, direction, rest, and speed behavior",
    mc: [
      {
        questionLatex:
          "\\text{A particle has position }s(t)=\\frac53t^3-11t^2+8t\\text{ meters. What is its velocity at }t=2?",
        difficulty: 2,
        skillTags: ["motion", "velocity"],
        choices: ["$-16\\text{ m/s}$", "$16\\text{ m/s}$", "$2\\text{ m/s}$", "$-8\\text{ m/s}$"],
        correctLetter: "A",
        rationales: {
          B: "This has the wrong sign.",
          C: "This is the input time, not velocity.",
          D: "This is the position value at t=2.",
        },
        hints: [
          "Velocity is the derivative of position.",
          "$v(t)=5t^2-22t+8$.",
          "Evaluate at t=2.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate position and evaluate.",
            math: "v(2)=5(2)^2-22(2)+8=-16",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For }s(t)=\\frac53t^3-11t^2+8t\\text{ on }0\\le t\\le5,\\text{ when is the particle at rest?}",
        difficulty: 2,
        skillTags: ["motion", "particle_at_rest"],
        choices: ["$t=\\frac25\\text{ and }t=4$", "$t=0\\text{ and }t=5$", "$t=2$", "\\text{Never}"],
        correctLetter: "A",
        rationales: {
          B: "Those are interval endpoints, not zeros of velocity.",
          C: "At t=2, velocity is -16.",
          D: "The velocity polynomial has zeros in the interval.",
        },
        hints: [
          "A particle is at rest when velocity is 0.",
          "$v(t)=5t^2-22t+8=(5t-2)(t-4)$.",
          "Solve within the given interval.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Set velocity equal to 0.",
            math: "(5t-2)(t-4)=0\\Rightarrow t=\\frac25,4",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A particle has velocity }v(t)=t^2-4\\text{ ft/s. At }t=1,\\text{ what is true about its speed?}",
        difficulty: 3,
        skillTags: ["motion", "speed_increasing_decreasing", "acceleration"],
        choices: [
          "\\text{Speed is decreasing because }v(1)<0\\text{ and }a(1)>0.",
          "\\text{Speed is increasing because }v(1)<0\\text{ and }a(1)>0.",
          "\\text{Speed is zero because }a(1)>0.",
          "\\text{Speed cannot be determined without position.}",
        ],
        correctLetter: "A",
        rationales: {
          B: "Opposite signs for velocity and acceleration mean speed is decreasing.",
          C: "Acceleration is not speed; speed is $|v(1)|=3$ ft/s.",
          D: "Speed behavior can be determined from the signs of velocity and acceleration.",
        },
        hints: [
          "Speed changes according to the signs of velocity and acceleration.",
          "$a(t)=v'(t)=2t$.",
          "At t=1, velocity is negative and acceleration is positive.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute velocity and acceleration at t=1.",
            math: "v(1)=-3,\\quad a(1)=v'(1)=2",
          },
          {
            step: 2,
            explanation:
              "Velocity and acceleration have opposite signs, so the speed is decreasing.",
            math: null,
          },
        ],
      },
      {
        questionLatex:
          "\\text{At }t=4,\\text{ a particle has }v(4)=9\\text{ and }a(4)=12.\\text{ What is true about its speed at }t=4?",
        difficulty: 2,
        skillTags: ["motion", "speed_increasing_decreasing"],
        choices: [
          "\\text{Speed is increasing because velocity and acceleration have the same sign.}",
          "\\text{Speed is decreasing because acceleration is positive.}",
          "\\text{Speed is zero because acceleration is positive.}",
          "\\text{Speed cannot be determined because position is not given.}",
        ],
        correctLetter: "A",
        rationales: {
          B: "A positive acceleration increases speed only when velocity is also positive.",
          C: "Speed is the magnitude of velocity, and $v(4)=9$.",
          D: "Speed behavior depends on velocity and acceleration signs, not position.",
        },
        hints: [
          "Speed increases when velocity and acceleration have the same sign.",
          "Here both values are positive.",
          "Same sign means the velocity is moving farther from 0.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compare signs of velocity and acceleration.",
            math: "v(4)>0,\\quad a(4)>0\\Rightarrow \\text{speed is increasing}",
          },
        ],
      },
      {
        questionLatex:
          "\\begin{array}{c|ccc}t&1&2&3\\\\\\hline v(t)&-4&-1&2\\\\ a(t)&3&4&5\\end{array}\\quad \\text{At which listed time is the particle slowing down?}",
        difficulty: 3,
        skillTags: ["motion", "speed_increasing_decreasing", "table_values"],
        choices: ["$t=1\\text{ and }t=2$", "$t=3\\text{ only}$", "$t=1\\text{ only}$", "\\text{None of them}"],
        correctLetter: "A",
        rationales: {
          B: "At t=3, velocity and acceleration are both positive, so speed is increasing.",
          C: "At t=2, velocity is negative and acceleration is positive, so speed is also decreasing there.",
          D: "There are listed times where velocity and acceleration have opposite signs.",
        },
        hints: [
          "A particle slows down when velocity and acceleration have opposite signs.",
          "Check the sign pair at each time.",
          "At t=1 and t=2, velocity is negative and acceleration is positive.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compare signs from the table.",
            math: "t=1,2:\\ v<0<a\\Rightarrow \\text{slowing down};\\quad t=3:\\ v>0,a>0\\Rightarrow \\text{speeding up}",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A particle moves on the }x\\text{-axis with velocity }v(t)=(5t-2)(t-4)\\text{ meters per second for }0\\le t\\le5.",
      difficulty: 4,
      skillTags: ["motion", "particle_at_rest", "acceleration", "speed_increasing_decreasing"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Find all times in $0\\le t\\le4$ when the particle is at rest.",
          points: 1,
        },
        {
          letter: "b",
          promptMarkdown: "Find the acceleration function $a(t)$ and the value of $a(2)$.",
          points: 1,
        },
        {
          letter: "c",
          promptMarkdown:
            "Determine whether the particle moves left or right on each interval $(0,\\frac25)$, $(\\frac25,4)$, and $(4,5)$. Justify your answer.",
          points: 2,
        },
        {
          letter: "d",
          promptMarkdown:
            "At $t=1$, is the speed increasing, decreasing, or neither? Justify your answer.",
          points: 2,
        },
      ],
      hints: [
        "Rest occurs where $v(t)=0$.",
        "Direction comes from the sign of velocity.",
        "Speed increases when velocity and acceleration have the same sign, and decreases when they have opposite signs.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Finds rest times $t=\\frac25$ and $t=4$." },
          { part: "b", points: 1, description: "Finds $a(t)=10t-22$ and $a(2)=-2$." },
          { part: "c", points: 1, description: "Correctly determines the sign of $v(t)$ on the three intervals." },
          { part: "c", points: 1, description: "Connects positive velocity to moving right and negative velocity to moving left." },
          { part: "d", points: 1, description: "Uses $v(1)=-9$ and $a(1)=-12$." },
          { part: "d", points: 1, description: "Concludes speed is increasing at $t=1$." },
        ],
      },
      commonErrors: [
        "Using position zeros instead of velocity zeros for rest.",
        "Using acceleration sign alone to decide direction.",
        "Treating zero acceleration as if it automatically means the particle is slowing down.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$v(t)=(5t-2)(t-4)$, so the particle is at rest at $t=\\frac25$ and $t=4$.",
        },
        {
          part: "b",
          explanation:
            "$v(t)=5t^2-22t+8$, so $a(t)=v'(t)=10t-22$ and $a(2)=-2$ meters per second per second.",
        },
        {
          part: "c",
          explanation:
            "$v(t)=(5t-2)(t-4)$ is positive on $(0,\\frac25)$, negative on $(\\frac25,4)$, and positive on $(4,5)$. Therefore the particle moves right on $(0,\\frac25)$ and $(4,5)$, and left on $(\\frac25,4)$.",
        },
        {
          part: "d",
          explanation:
            "$v(1)=-9$ and $a(t)=v'(t)=10t-22$, so $a(1)=-12$. Since velocity and acceleration have the same sign, the speed is increasing at $t=1$.",
        },
      ],
    },
  },
  {
    topicCode: "4.3",
    title: "Rates of Change in Applied Contexts Other Than Motion",
    subtopic:
      "Applying derivative relationships in area, volume, cost, revenue, temperature, and population contexts",
    mc: [
      {
        questionLatex:
          "\\text{The radius of a circular oil slick is increasing at }0.5\\text{ m/min. When }r=4\\text{ m, how fast is the area increasing?}",
        difficulty: 3,
        skillTags: ["rates_other_contexts", "area_rate"],
        choices: ["$4\\pi\\text{ m}^2/\\text{min}$", "$8\\pi\\text{ m}^2/\\text{min}$", "$2\\pi\\text{ m}^2/\\text{min}$", "$16\\pi\\text{ m}^2/\\text{min}$"],
        correctLetter: "A",
        rationales: {
          B: "This uses $dr/dt=1$ instead of $0.5$.",
          C: "This omits the radius value in $dA/dt=2\\pi r\\,dr/dt$.",
          D: "This gives the area, not its rate of change.",
        },
        hints: [
          "Area is $A=\\pi r^2$.",
          "Differentiate with respect to time.",
          "Use $dA/dt=2\\pi r\\,dr/dt$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate and substitute.",
            math: "\\frac{dA}{dt}=2\\pi(4)(0.5)=4\\pi",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Demand for a product is }q(p)=100-2p\\text{ items at price }p\\text{ dollars. Revenue is }R(p)=p q(p).\\text{ What is }R'(20)?",
        difficulty: 3,
        skillTags: ["rates_other_contexts", "revenue_derivative", "product_rule"],
        choices: ["$20$", "$60$", "$100$", "$-20$"],
        correctLetter: "A",
        rationales: {
          B: "This is the demand $q(20)$, not marginal revenue.",
          C: "This omits the derivative of the demand factor.",
          D: "This uses the wrong sign for $q'(p)$ contribution.",
        },
        hints: [
          "Revenue is $R(p)=p(100-2p)$.",
          "Simplify or use product rule.",
          "$R'(p)=100-4p$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Find marginal revenue with respect to price.",
            math: "R(p)=100p-2p^2,\\quad R'(20)=100-80=20",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The volume of a spherical balloon is }V=\\frac43\\pi r^3.\\text{ If }\\frac{dV}{dt}=36\\pi\\text{ cm}^3/\\text{s}\\text{ when }r=3,\\text{ then }\\frac{dr}{dt}=",
        difficulty: 3,
        skillTags: ["rates_other_contexts", "volume_rate"],
        choices: ["$1\\text{ cm/s}$", "$3\\text{ cm/s}$", "$4\\text{ cm/s}$", "$\\frac13\\text{ cm/s}$"],
        correctLetter: "A",
        rationales: {
          B: "This divides by $12\\pi$ instead of $36\\pi$.",
          C: "This confuses surface area with radius rate.",
          D: "This reverses the rate equation.",
        },
        hints: [
          "Differentiate $V=\\frac43\\pi r^3$ with respect to time.",
          "$dV/dt=4\\pi r^2 dr/dt$.",
          "At r=3, the coefficient is $36\\pi$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate and solve for $dr/dt$.",
            math: "36\\pi=4\\pi(3)^2\\frac{dr}{dt}\\Rightarrow \\frac{dr}{dt}=1",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The temperature in a freezer is }F(t)=-18+6e^{-0.2t}\\text{ degrees Celsius. What is }F'(0)?",
        difficulty: 2,
        skillTags: ["rates_other_contexts", "temperature_rate", "chain_rule"],
        choices: ["$-1.2\\text{ deg C/min}$", "$6\\text{ deg C/min}$", "$-18\\text{ deg C/min}$", "$1.2\\text{ deg C/min}$"],
        correctLetter: "A",
        rationales: {
          B: "This is the initial exponential offset, not the derivative.",
          C: "This is the long-term temperature term, not a rate.",
          D: "The exponential term is decreasing.",
        },
        hints: [
          "Differentiate the exponential term.",
          "$F'(t)=6(-0.2)e^{-0.2t}$.",
          "Evaluate at t=0.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate and evaluate.",
            math: "F'(0)=-1.2e^0=-1.2",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A cube has side length }s(t)\\text{ cm. If }s=5\\text{ and }\\frac{ds}{dt}=0.2\\text{ cm/s, what is }\\frac{d}{dt}(s^3)?",
        difficulty: 2,
        skillTags: ["rates_other_contexts", "volume_rate", "chain_rule"],
        choices: ["$15\\text{ cm}^3/\\text{s}$", "$3\\text{ cm}^3/\\text{s}$", "$25\\text{ cm}^3/\\text{s}$", "$75\\text{ cm}^3/\\text{s}$"],
        correctLetter: "A",
        rationales: {
          B: "This uses $3s\\,ds/dt$ instead of $3s^2\\,ds/dt$.",
          C: "This is $s^2$, not the rate of change of volume.",
          D: "This omits the factor $ds/dt=0.2$.",
        },
        hints: [
          "The cube volume is $V=s^3$.",
          "Differentiate with respect to time.",
          "$dV/dt=3s^2 ds/dt$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Compute the volume rate.",
            math: "\\frac{dV}{dt}=3(5)^2(0.2)=15",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A circular stain has radius }r(t)\\text{ centimeters at time }t\\text{ minutes. At }t=10,\\ r=6\\text{ and }\\frac{dr}{dt}=0.4.",
      difficulty: 4,
      skillTags: ["rates_other_contexts", "area_rate", "second_derivative_context"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Find the rate at which the area of the stain is changing at $t=10$.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown:
            "Suppose also that $\\frac{d^2r}{dt^2}=-0.03$ at $t=10$. Find $\\frac{d^2A}{dt^2}$ at $t=10$.",
          points: 3,
        },
        {
          letter: "c",
          promptMarkdown:
            "Interpret the sign of your answer in part (b) in context.",
          points: 1,
        },
      ],
      hints: [
        "Use $A=\\pi r^2$.",
        "For part (b), differentiate $dA/dt=2\\pi r r'$ with respect to time.",
        "The second derivative of area describes how the area growth rate is changing.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Sets up $dA/dt=2\\pi r r'$." },
          { part: "a", points: 1, description: "Computes $4.8\\pi$ cm²/min." },
          { part: "b", points: 1, description: "Differentiates $2\\pi r r'$ correctly." },
          { part: "b", points: 1, description: "Substitutes all values correctly." },
          { part: "b", points: 1, description: "Computes $-0.04\\pi$ cm²/min²." },
          { part: "c", points: 1, description: "Interprets the negative sign as the area growth rate decreasing." },
        ],
      },
      commonErrors: [
        "Reporting area instead of area rate.",
        "Forgetting the $(dr/dt)^2$ term when differentiating again.",
        "Interpreting $d^2A/dt^2$ as area rather than change in area rate.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$A=\\pi r^2$, so $\\frac{dA}{dt}=2\\pi r\\frac{dr}{dt}=2\\pi(6)(0.4)=4.8\\pi$ cm²/min.",
        },
        {
          part: "b",
          explanation:
            "$\\frac{d^2A}{dt^2}=2\\pi\\left[\\left(\\frac{dr}{dt}\\right)^2+r\\frac{d^2r}{dt^2}\\right]=2\\pi(0.16-0.18)=-0.04\\pi$ cm²/min².",
        },
        {
          part: "c",
          explanation:
            "The area is still increasing because $dA/dt>0$, but the negative second derivative means the area growth rate is decreasing at $t=10$.",
        },
      ],
    },
  },
  {
    topicCode: "4.4",
    title: "Introduction to Related Rates",
    subtopic:
      "Choosing variables and differentiating geometric relationships with respect to time",
    mc: [
      {
        questionLatex:
          "\\text{A square has side length }s\\text{ and area }A.\\text{ Which equation correctly relates }\\frac{dA}{dt}\\text{ and }\\frac{ds}{dt}?",
        difficulty: 2,
        skillTags: ["related_rates_setup", "area_rate"],
        choices: ["$\\frac{dA}{dt}=2s\\frac{ds}{dt}$", "$\\frac{dA}{dt}=s^2\\frac{ds}{dt}$", "$\\frac{dA}{dt}=2\\frac{ds}{dt}$", "$\\frac{dA}{dt}=\\frac{ds}{dt}$"],
        correctLetter: "A",
        rationales: {
          B: "This multiplies by the original area instead of differentiating $s^2$.",
          C: "This omits the factor of s.",
          D: "Area and side length do not change at the same rate.",
        },
        hints: [
          "Start with $A=s^2$.",
          "Differentiate both sides with respect to time.",
          "Use chain rule: $d(s^2)/dt=2s\\,ds/dt$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate the area relationship.",
            math: "A=s^2\\Rightarrow \\frac{dA}{dt}=2s\\frac{ds}{dt}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A ladder of length }13\\text{ ft leans against a wall. If }x\\text{ is the bottom's distance from the wall and }y\\text{ is the top's height, which differentiated equation is correct?}",
        difficulty: 2,
        skillTags: ["related_rates_setup", "pythagorean_relation"],
        choices: [
          "$x\\frac{dx}{dt}+y\\frac{dy}{dt}=0$",
          "$x+y=13$",
          "$\\frac{dx}{dt}+\\frac{dy}{dt}=0$",
          "$2x\\frac{dy}{dt}+2y\\frac{dx}{dt}=0$",
        ],
        correctLetter: "A",
        rationales: {
          B: "The distances satisfy $x^2+y^2=13^2$, not $x+y=13$.",
          C: "This differentiates the wrong relationship.",
          D: "The rates are attached to the wrong variables.",
        },
        hints: [
          "Start with $x^2+y^2=169$.",
          "Differentiate with respect to time.",
          "Divide by 2 after differentiating.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate the Pythagorean relationship.",
            math: "2x\\frac{dx}{dt}+2y\\frac{dy}{dt}=0\\Rightarrow x\\frac{dx}{dt}+y\\frac{dy}{dt}=0",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A spherical balloon has radius }r\\text{ and volume }V=\\frac43\\pi r^3.\\text{ Which equation is the best starting point for a related-rates problem involving }\\frac{dV}{dt}?",
        difficulty: 2,
        skillTags: ["related_rates_setup", "volume_rate"],
        choices: [
          "$\\frac{dV}{dt}=4\\pi r^2\\frac{dr}{dt}$",
          "$\\frac{dV}{dt}=4\\pi r^2$",
          "$V=4\\pi r^2\\frac{dr}{dt}$",
          "$\\frac{dr}{dt}=4\\pi r^2\\frac{dV}{dt}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This is surface area, not volume rate.",
          C: "This puts the rate into the volume equation incorrectly.",
          D: "This reverses the relationship between $dV/dt$ and $dr/dt$.",
        },
        hints: [
          "Differentiate volume with respect to time.",
          "The derivative of $r^3$ is $3r^2 dr/dt$.",
          "The constant $4/3\\pi$ remains.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate the volume formula.",
            math: "\\frac{dV}{dt}=\\frac43\\pi(3r^2)\\frac{dr}{dt}=4\\pi r^2\\frac{dr}{dt}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A }6\\text{-ft person walks away from a }15\\text{-ft lamp. If }x\\text{ is the person's distance from the lamp and }y\\text{ is the shadow length, which relation follows from similar triangles?}",
        difficulty: 3,
        skillTags: ["related_rates_setup", "similar_triangles"],
        choices: ["$\\frac{15}{x+y}=\\frac6y$", "$\\frac{15}{x}=\\frac6y$", "$\\frac6{x+y}=\\frac{15}{y}$", "$15y=6x$"],
        correctLetter: "A",
        rationales: {
          B: "The large triangle's base is $x+y$, not x.",
          C: "The heights are reversed.",
          D: "This misses the full base $x+y$ before simplifying.",
        },
        hints: [
          "The large triangle uses the lamp height and distance from lamp to shadow tip.",
          "The small triangle uses the person's height and the shadow length.",
          "The large base is $x+y$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Set up similar triangles.",
            math: "\\frac{15}{x+y}=\\frac6y",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A cone has fixed shape with height }h=3r.\\text{ Which formula expresses volume only in terms of }h?",
        difficulty: 3,
        skillTags: ["related_rates_setup", "cone_volume"],
        choices: ["$V=\\frac{\\pi h^3}{27}$", "$V=\\pi h^3$", "$V=\\frac{\\pi h^3}{9}$", "$V=\\frac{\\pi h^2}{9}$"],
        correctLetter: "A",
        rationales: {
          B: "This ignores both the cone formula and the radius-height relationship.",
          C: "This uses cylinder volume, not cone volume.",
          D: "Volume should be cubic in h.",
        },
        hints: [
          "Cone volume is $V=\\frac13\\pi r^2h$.",
          "Since $h=3r$, $r=h/3$.",
          "Substitute $r=h/3$ into the cone formula.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Rewrite the radius in terms of height.",
            math: "V=\\frac13\\pi\\left(\\frac h3\\right)^2h=\\frac{\\pi h^3}{27}",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A spherical balloon is being inflated. Its radius is }r\\text{ cm and volume is }V=\\frac43\\pi r^3.",
      difficulty: 3,
      skillTags: ["related_rates_setup", "volume_rate", "interpretation"],
      parts: [
        {
          letter: "a",
          promptMarkdown:
            "Differentiate the volume formula with respect to time.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown:
            "If $\\frac{dV}{dt}=48\\pi$ cm³/s, write an expression for $\\frac{dr}{dt}$ in terms of $r$.",
          points: 2,
        },
        {
          letter: "c",
          promptMarkdown:
            "Use your expression to find $\\frac{dr}{dt}$ when $r=4$ cm.",
          points: 2,
        },
      ],
      hints: [
        "Differentiate with respect to t, not r.",
        "Solve the differentiated equation for $dr/dt$.",
        "Substitute $r=4$ only after solving or setting up the equation.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Uses chain rule on $r^3$." },
          { part: "a", points: 1, description: "Gets $dV/dt=4\\pi r^2 dr/dt$." },
          { part: "b", points: 1, description: "Substitutes $dV/dt=48\\pi$." },
          { part: "b", points: 1, description: "Solves for $dr/dt=12/r^2$." },
          { part: "c", points: 1, description: "Substitutes $r=4$." },
          { part: "c", points: 1, description: "Finds $dr/dt=3/4$ cm/s." },
        ],
      },
      commonErrors: [
        "Differentiating $r^3$ as $3r^2$ without $dr/dt$.",
        "Substituting radius before differentiating in a way that makes volume constant.",
        "Forgetting units for radius rate.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$\\frac{dV}{dt}=4\\pi r^2\\frac{dr}{dt}$.",
        },
        {
          part: "b",
          explanation:
            "$48\\pi=4\\pi r^2\\frac{dr}{dt}$, so $\\frac{dr}{dt}=\\frac{12}{r^2}$.",
        },
        {
          part: "c",
          explanation:
            "When $r=4$, $\\frac{dr}{dt}=\\frac{12}{16}=\\frac34$ cm/s.",
        },
      ],
    },
  },
  {
    topicCode: "4.5",
    title: "Solving Related Rates Problems",
    subtopic:
      "Completing multi-step related rates problems in geometric and applied contexts",
    mc: [
      {
        questionLatex:
          "\\text{The radius of a circle is increasing at }2\\text{ cm/s. When }r=5\\text{ cm, how fast is the area increasing?}",
        difficulty: 2,
        skillTags: ["related_rates", "area_rate"],
        choices: ["$20\\pi\\text{ cm}^2/\\text{s}$", "$10\\pi\\text{ cm}^2/\\text{s}$", "$25\\pi\\text{ cm}^2/\\text{s}$", "$4\\pi\\text{ cm}^2/\\text{s}$"],
        correctLetter: "A",
        rationales: {
          B: "This uses $dr/dt=1$ instead of 2.",
          C: "This is the area, not the rate of change of area.",
          D: "This omits the radius value.",
        },
        hints: [
          "Use $A=\\pi r^2$.",
          "$dA/dt=2\\pi r\\,dr/dt$.",
          "Substitute r=5 and $dr/dt=2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate and substitute.",
            math: "\\frac{dA}{dt}=2\\pi(5)(2)=20\\pi",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A }13\\text{-ft ladder slides down a wall. When the top is }5\\text{ ft high, it is moving downward at }2\\text{ ft/s. How fast is the bottom moving away from the wall?}",
        difficulty: 3,
        skillTags: ["related_rates", "ladder_problem"],
        choices: ["$\\frac56\\text{ ft/s}$", "$\\frac{10}{13}\\text{ ft/s}$", "$\\frac{12}{5}\\text{ ft/s}$", "$\\frac65\\text{ ft/s}$"],
        correctLetter: "A",
        rationales: {
          B: "This uses the ladder length as the horizontal distance.",
          C: "This solves for the wrong rate ratio.",
          D: "This reverses x and y in the related-rates equation.",
        },
        hints: [
          "Use $x^2+y^2=13^2$.",
          "When y=5, x=12.",
          "$dy/dt=-2$ because the top moves downward.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate and substitute.",
            math: "x\\frac{dx}{dt}+y\\frac{dy}{dt}=0\\Rightarrow 12\\frac{dx}{dt}+5(-2)=0",
          },
          {
            step: 2,
            explanation: "Solve for the bottom's rate.",
            math: "\\frac{dx}{dt}=\\frac{10}{12}=\\frac56",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Water flows into a cone at }3\\text{ cm}^3/\\text{s}. The water height }h\\text{ and radius }r\\text{ satisfy }h=2r.\\text{ When }h=6,\\text{ what is }\\frac{dh}{dt}?",
        difficulty: 4,
        skillTags: ["related_rates", "cone_volume"],
        choices: ["$\\frac1{3\\pi}\\text{ cm/s}$", "$\\frac1{9\\pi}\\text{ cm/s}$", "$\\frac3\\pi\\text{ cm/s}$", "$\\frac1\\pi\\text{ cm/s}$"],
        correctLetter: "A",
        rationales: {
          B: "This uses an incorrect volume-height relationship.",
          C: "This reverses the coefficient when solving for $dh/dt$.",
          D: "This misses the factor 3 from the derivative of $h^3$.",
        },
        hints: [
          "Write cone volume only in terms of h.",
          "Since $r=h/2$, $V=\\frac13\\pi(h/2)^2h=\\frac{\\pi h^3}{12}$.",
          "Differentiate with respect to time.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Differentiate the height-only volume formula.",
            math: "V=\\frac{\\pi h^3}{12}\\Rightarrow \\frac{dV}{dt}=\\frac{\\pi h^2}{4}\\frac{dh}{dt}",
          },
          {
            step: 2,
            explanation: "Substitute $h=6$ and $dV/dt=3$.",
            math: "3=\\frac{\\pi(36)}4\\frac{dh}{dt}=9\\pi\\frac{dh}{dt}\\Rightarrow \\frac{dh}{dt}=\\frac1{3\\pi}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A }6\\text{-ft person walks away from a }15\\text{-ft lamp at }4\\text{ ft/s. How fast is the tip of the shadow moving away from the lamp?}",
        difficulty: 4,
        skillTags: ["related_rates", "shadow_problem", "similar_triangles"],
        choices: ["$\\frac{20}{3}\\text{ ft/s}$", "$\\frac83\\text{ ft/s}$", "$4\\text{ ft/s}$", "$\\frac{12}{5}\\text{ ft/s}$"],
        correctLetter: "A",
        rationales: {
          B: "This is the rate at which the shadow length changes, not the tip's distance from the lamp.",
          C: "The shadow tip moves faster than the person.",
          D: "This comes from reversing the similar-triangles ratio.",
        },
        hints: [
          "Let x be the person's distance from the lamp and y be the shadow length.",
          "Similar triangles give $15/(x+y)=6/y$.",
          "The tip's distance from the lamp is $x+y$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use similar triangles to relate x and y.",
            math: "15y=6(x+y)\\Rightarrow 9y=6x\\Rightarrow y=\\frac23x",
          },
          {
            step: 2,
            explanation: "Differentiate the tip distance.",
            math: "\\frac{d}{dt}(x+y)=\\frac{d}{dt}\\left(\\frac53x\\right)=\\frac53(4)=\\frac{20}{3}",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A spherical balloon's volume increases at }12\\pi\\text{ in}^3/\\text{s}. When }r=2\\text{ in, how fast is the radius increasing?}",
        difficulty: 2,
        skillTags: ["related_rates", "sphere_volume"],
        choices: ["$\\frac34\\text{ in/s}$", "$3\\text{ in/s}$", "$\\frac{3}{16}\\text{ in/s}$", "$12\\pi\\text{ in/s}$"],
        correctLetter: "A",
        rationales: {
          B: "This divides by $4\\pi$ instead of $16\\pi$.",
          C: "This divides by $64\\pi$.",
          D: "This reports the volume rate as the radius rate.",
        },
        hints: [
          "$dV/dt=4\\pi r^2 dr/dt$.",
          "At r=2, the coefficient is $16\\pi$.",
          "Solve $12\\pi=16\\pi dr/dt$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Substitute into the related-rates equation.",
            math: "12\\pi=4\\pi(2)^2\\frac{dr}{dt}\\Rightarrow \\frac{dr}{dt}=\\frac34",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{A }10\\text{-ft ladder leans against a vertical wall. The bottom of the ladder moves away from the wall at }1.5\\text{ ft/s. Let }x\\text{ be the bottom's distance from the wall and }y\\text{ be the top's height.}",
      difficulty: 4,
      skillTags: ["related_rates", "ladder_problem", "speed_interpretation"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Write an equation relating $x$ and $y$, then differentiate it with respect to time.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown:
            "Find $\\frac{dy}{dt}$ when the bottom of the ladder is 6 ft from the wall.",
          points: 2,
        },
        {
          letter: "c",
          promptMarkdown:
            "At that instant, is the top of the ladder moving faster or slower than the bottom? Justify your answer.",
          points: 2,
        },
      ],
      hints: [
        "Use the Pythagorean theorem.",
        "When x=6, find y from $x^2+y^2=100$.",
        "Compare the magnitude of $dy/dt$ with 1.5.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Writes $x^2+y^2=100$." },
          { part: "a", points: 1, description: "Differentiates to $x dx/dt+y dy/dt=0$ or equivalent." },
          { part: "b", points: 1, description: "Finds $y=8$ when $x=6$." },
          { part: "b", points: 1, description: "Computes $dy/dt=-9/8$ ft/s." },
          { part: "c", points: 1, description: "Compares speed magnitudes $9/8$ and $3/2$." },
          { part: "c", points: 1, description: "Concludes the top is moving slower." },
        ],
      },
      commonErrors: [
        "Forgetting that $dy/dt$ is negative as the top moves down.",
        "Comparing signed velocity instead of speed magnitude.",
        "Using $x+y=10$ instead of $x^2+y^2=100$.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$x^2+y^2=100$. Differentiating gives $2x\\frac{dx}{dt}+2y\\frac{dy}{dt}=0$, or $x\\frac{dx}{dt}+y\\frac{dy}{dt}=0$.",
        },
        {
          part: "b",
          explanation:
            "When $x=6$, $y=8$. Thus $6(1.5)+8\\frac{dy}{dt}=0$, so $\\frac{dy}{dt}=-\\frac98$ ft/s.",
        },
        {
          part: "c",
          explanation:
            "The top's speed is $|dy/dt|=9/8=1.125$ ft/s, which is less than the bottom's speed $1.5$ ft/s. The top is moving slower.",
        },
      ],
    },
  },
  {
    topicCode: "4.6",
    title: "Approximating Values of a Function Using Local Linearity and Linearization",
    subtopic:
      "Using tangent lines and differentials to approximate values and reason about overestimates or underestimates",
    mc: [
      {
        questionLatex:
          "\\text{If }f(4)=10\\text{ and }f'(4)=-0.3,\\text{ what is the tangent-line estimate for }f(4.2)?",
        difficulty: 2,
        skillTags: ["linearization", "local_linearity"],
        choices: ["$9.94$", "$10.06$", "$9.7$", "$10.2$"],
        correctLetter: "A",
        rationales: {
          B: "The derivative is negative, so the estimate should decrease.",
          C: "This uses a change of 1 instead of 0.2.",
          D: "This uses the input change as the output change.",
        },
        hints: [
          "Use $L(x)=f(4)+f'(4)(x-4)$.",
          "The input change is 0.2.",
          "Multiply $-0.3$ by 0.2.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use local linearity.",
            math: "f(4.2)\\approx 10+(-0.3)(0.2)=9.94",
          },
        ],
      },
      {
        questionLatex:
          "\\text{Using linearization of }f(x)=\\sqrt{x}\\text{ at }x=16,\\text{ approximate }\\sqrt{16.5}.",
        difficulty: 2,
        skillTags: ["linearization", "radical_approximation"],
        choices: ["$4.0625$", "$4.125$", "$4.5$", "$4.03125$"],
        correctLetter: "A",
        rationales: {
          B: "This uses derivative $1/4$ instead of $1/8$.",
          C: "This adds the entire input change to the square root.",
          D: "This uses an input change of 0.25 instead of 0.5.",
        },
        hints: [
          "$f(16)=4$.",
          "$f'(x)=1/(2\\sqrt{x})$, so $f'(16)=1/8$.",
          "The input change is 0.5.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Build and evaluate the linearization.",
            math: "\\sqrt{16.5}\\approx4+\\frac18(0.5)=4.0625",
          },
        ],
      },
      {
        questionLatex:
          "\\text{If }f''(x)<0\\text{ near }x=a,\\text{ then the tangent-line approximation to }f(a+h)\\text{ for small }h\\text{ is usually}",
        difficulty: 3,
        skillTags: ["linearization", "concavity_error"],
        choices: ["\\text{an overestimate}", "\\text{an underestimate}", "\\text{exact}", "\\text{impossible to compare from concavity}"],
        correctLetter: "A",
        rationales: {
          B: "For concave down functions, tangent lines lie above the graph locally.",
          C: "A tangent line is exact only for linear functions or special points.",
          D: "Concavity gives the tangent-line error direction locally.",
        },
        hints: [
          "$f''<0$ means the graph is concave down.",
          "Visualize a tangent line touching a cap-shaped curve.",
          "For concave down, the tangent line lies above the curve nearby.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the concavity relationship.",
            math: "f''<0\\Rightarrow \\text{concave down}\\Rightarrow L(x)\\text{ is above }f(x)",
          },
        ],
      },
      {
        questionLatex:
          "\\text{A sphere has radius }3\\text{ cm. Use differentials to approximate the change in volume if the radius increases by }0.1\\text{ cm.}",
        difficulty: 3,
        skillTags: ["differentials", "volume_approximation"],
        choices: ["$3.6\\pi\\text{ cm}^3$", "$0.9\\pi\\text{ cm}^3$", "$36\\pi\\text{ cm}^3$", "$4\\pi\\text{ cm}^3$"],
        correctLetter: "A",
        rationales: {
          B: "This uses $\\pi r^2dr$ instead of $4\\pi r^2dr$.",
          C: "This omits multiplying by the small change $dr=0.1$.",
          D: "This uses the surface area at radius 1.",
        },
        hints: [
          "Sphere volume is $V=\\frac43\\pi r^3$.",
          "The differential is $dV=4\\pi r^2dr$.",
          "Use r=3 and dr=0.1.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the volume differential.",
            math: "dV=4\\pi(3)^2(0.1)=3.6\\pi",
          },
        ],
      },
      {
        questionLatex:
          "\\text{The linearization of }f(x)=\\ln x\\text{ at }x=1\\text{ gives which estimate for }\\ln(1.1)?",
        difficulty: 2,
        skillTags: ["linearization", "log_derivative"],
        choices: ["$0.1$", "$1.1$", "$0$", "$\\frac1{1.1}$"],
        correctLetter: "A",
        rationales: {
          B: "This uses the input value as the logarithm.",
          C: "This is $\\ln1$ but ignores the input change.",
          D: "This is the derivative near 1.1, not the linear estimate from x=1.",
        },
        hints: [
          "$f(1)=0$.",
          "$f'(1)=1$.",
          "Use $L(x)=x-1$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the tangent line at x=1.",
            math: "\\ln(1.1)\\approx L(1.1)=1.1-1=0.1",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Let }f(x)=\\sqrt{x+5}.",
      difficulty: 4,
      skillTags: ["linearization", "concavity_error", "tangent_line"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "Find the linearization $L(x)$ of $f$ at $x=4$.",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown: "Use $L(x)$ to approximate $f(4.3)$.",
          points: 2,
        },
        {
          letter: "c",
          promptMarkdown:
            "Determine whether the approximation in part (b) is an overestimate or underestimate. Justify your answer.",
          points: 2,
        },
      ],
      hints: [
        "At x=4, $f(4)=3$.",
        "$f'(x)=1/(2\\sqrt{x+5})$.",
        "Use concavity to decide the error direction.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Finds $f(4)=3$ and $f'(4)=1/6$." },
          { part: "a", points: 1, description: "Writes $L(x)=3+\\frac16(x-4)$." },
          { part: "b", points: 1, description: "Substitutes x=4.3 correctly." },
          { part: "b", points: 1, description: "Computes $3.05$." },
          { part: "c", points: 1, description: "Identifies that $f''(x)<0$." },
          { part: "c", points: 1, description: "Concludes the tangent-line approximation is an overestimate." },
        ],
      },
      commonErrors: [
        "Using x=4.3 instead of the change 0.3 in the linearization.",
        "Forgetting the factor 2 in the derivative of the square root.",
        "Reversing the error direction for concave down functions.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "$f(4)=3$ and $f'(x)=\\frac1{2\\sqrt{x+5}}$, so $f'(4)=\\frac16$. Thus $L(x)=3+\\frac16(x-4)$.",
        },
        {
          part: "b",
          explanation:
            "$f(4.3)\\approx L(4.3)=3+\\frac16(0.3)=3.05$.",
        },
        {
          part: "c",
          explanation:
            "$f''(x)=-\\frac1{4(x+5)^{3/2}}<0$, so the graph is concave down. The tangent line lies above the graph, so the approximation is an overestimate.",
        },
      ],
    },
  },
  {
    topicCode: "4.7",
    title: "Using L'Hospital's Rule for Determining Limits of Indeterminate Forms",
    subtopic:
      "Applying L'Hospital's Rule with justification, including repeated use and non-applicable forms",
    mc: [
      {
        questionLatex:
          "\\lim_{x\\to0}\\frac{\\sin(3x)}{x}=",
        difficulty: 2,
        skillTags: ["lhospital", "trig_limit"],
        choices: ["$3$", "$1$", "$0$", "\\text{Does not exist}"],
        correctLetter: "A",
        rationales: {
          B: "This ignores the inner derivative factor 3.",
          C: "The original expression has a 0/0 form, but the limit is not 0.",
          D: "The L'Hospital result exists.",
        },
        hints: [
          "The expression has form 0/0.",
          "Differentiate numerator and denominator separately.",
          "The derivative of $\\sin(3x)$ is $3\\cos(3x)$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply L'Hospital's Rule.",
            math: "\\lim_{x\\to0}\\frac{\\sin(3x)}{x}=\\lim_{x\\to0}\\frac{3\\cos(3x)}1=3",
          },
        ],
      },
      {
        questionLatex:
          "\\lim_{x\\to\\infty}\\frac{x}{e^x}=",
        difficulty: 2,
        skillTags: ["lhospital", "infinity_over_infinity"],
        choices: ["$0$", "$1$", "\\infty", "\\text{Does not exist}"],
        correctLetter: "A",
        rationales: {
          B: "After L'Hospital, the limit is $1/e^x$, which approaches 0.",
          C: "The exponential grows faster than x.",
          D: "The limit exists.",
        },
        hints: [
          "The form is $\\infty/\\infty$.",
          "Differentiate numerator and denominator separately.",
          "$\\lim_{x\\to\\infty}1/e^x=0$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use L'Hospital's Rule.",
            math: "\\lim_{x\\to\\infty}\\frac{x}{e^x}=\\lim_{x\\to\\infty}\\frac1{e^x}=0",
          },
        ],
      },
      {
        questionLatex:
          "\\lim_{x\\to0}\\frac{e^{2x}-1}{x}=",
        difficulty: 2,
        skillTags: ["lhospital", "exponential_limit"],
        choices: ["$2$", "$1$", "$0$", "$e^2$"],
        correctLetter: "A",
        rationales: {
          B: "This omits the chain-rule factor 2.",
          C: "The original expression is 0/0, but the limiting ratio is nonzero.",
          D: "The exponential is evaluated at $2x\\to0$, not 2.",
        },
        hints: [
          "The expression has form 0/0.",
          "Differentiate $e^{2x}-1$ carefully.",
          "Evaluate $2e^{2x}$ at x=0.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply L'Hospital's Rule.",
            math: "\\lim_{x\\to0}\\frac{e^{2x}-1}{x}=\\lim_{x\\to0}\\frac{2e^{2x}}1=2",
          },
        ],
      },
      {
        questionLatex:
          "\\lim_{x\\to0}\\frac{1-\\cos x}{x^2}=",
        difficulty: 3,
        skillTags: ["lhospital", "repeated_lhospital"],
        choices: ["$\\frac12$", "$1$", "$0$", "\\text{Does not exist}"],
        correctLetter: "A",
        rationales: {
          B: "This is the result after differentiating only once incorrectly or forgetting the denominator derivative.",
          C: "After repeated L'Hospital, the limit is not 0.",
          D: "The repeated L'Hospital limit exists.",
        },
        hints: [
          "The first application still gives 0/0.",
          "Apply L'Hospital's Rule twice.",
          "The second derivative ratio is $\\cos x/2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply L'Hospital once.",
            math: "\\lim_{x\\to0}\\frac{1-\\cos x}{x^2}=\\lim_{x\\to0}\\frac{\\sin x}{2x}",
          },
          {
            step: 2,
            explanation: "Apply it again.",
            math: "\\lim_{x\\to0}\\frac{\\cos x}{2}=\\frac12",
          },
        ],
      },
      {
        questionLatex:
          "\\text{For which limit is L'Hospital's Rule directly applicable without algebraic rewriting?}",
        difficulty: 3,
        skillTags: ["lhospital", "indeterminate_forms"],
        choices: [
          "$\\lim_{x\\to0}\\frac{\\ln(1+x)}{x}$",
          "$\\lim_{x\\to0}\\frac{x+1}{x}$",
          "$\\lim_{x\\to0}(1+x)^{1/x}$",
          "$\\lim_{x\\to0}\\frac{1}{x^2}$",
        ],
        correctLetter: "A",
        rationales: {
          B: "This is not 0/0 or $\\infty/\\infty$; the numerator approaches 1.",
          C: "This has form $1^\\infty$ and needs logarithmic rewriting before L'Hospital.",
          D: "This tends to infinity and is not a quotient indeterminate form.",
        },
        hints: [
          "Direct L'Hospital requires 0/0 or $\\infty/\\infty$.",
          "Check the numerator and denominator limits separately.",
          "$\\ln(1+x)\\to0$ and $x\\to0$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Identify the direct indeterminate quotient.",
            math: "\\frac{\\ln(1+x)}{x}\\to\\frac00",
          },
        ],
      },
    ],
    frq: {
      questionLatex:
        "\\text{Evaluate the following limits. Justify each use of L'Hospital's Rule by identifying the indeterminate form.}",
      difficulty: 4,
      skillTags: ["lhospital", "repeated_lhospital", "justification"],
      parts: [
        {
          letter: "a",
          promptMarkdown: "$\\displaystyle \\lim_{x\\to0}\\frac{e^x-1-x}{x^2}$",
          points: 2,
        },
        {
          letter: "b",
          promptMarkdown: "$\\displaystyle \\lim_{x\\to\\infty}\\frac{\\ln x}{x}$",
          points: 2,
        },
        {
          letter: "c",
          promptMarkdown:
            "Explain why L'Hospital's Rule is not directly applicable to $\\displaystyle \\lim_{x\\to0}\\frac{x+1}{x}$.",
          points: 2,
        },
      ],
      hints: [
        "Part (a) needs L'Hospital's Rule twice.",
        "Part (b) has form $\\infty/\\infty$.",
        "For part (c), check whether numerator and denominator both approach 0 or both approach infinity.",
      ],
      rubric: {
        maxPoints: 6,
        criteria: [
          { part: "a", points: 1, description: "Identifies 0/0 and applies L'Hospital appropriately." },
          { part: "a", points: 1, description: "Applies L'Hospital twice and obtains $1/2$." },
          { part: "b", points: 1, description: "Identifies $\\infty/\\infty$ and differentiates correctly." },
          { part: "b", points: 1, description: "Obtains 0." },
          { part: "c", points: 1, description: "States the numerator tends to 1 and denominator tends to 0." },
          { part: "c", points: 1, description: "Concludes the form is not 0/0 or $\\infty/\\infty$, so direct L'Hospital is not allowed." },
        ],
      },
      commonErrors: [
        "Applying L'Hospital's Rule without checking the indeterminate form.",
        "Stopping part (a) after one application when the form remains 0/0.",
        "Treating any quotient with denominator approaching 0 as a L'Hospital problem.",
      ],
      workedSolution: [
        {
          part: "a",
          explanation:
            "The form is $0/0$. Applying L'Hospital gives $\\lim_{x\\to0}\\frac{e^x-1}{2x}$, still $0/0$. Applying again gives $\\lim_{x\\to0}\\frac{e^x}{2}=\\frac12$.",
        },
        {
          part: "b",
          explanation:
            "The form is $\\infty/\\infty$. L'Hospital gives $\\lim_{x\\to\\infty}\\frac{1/x}{1}=0$.",
        },
        {
          part: "c",
          explanation:
            "As $x\\to0$, the numerator $x+1\\to1$ and the denominator $x\\to0$. This is not $0/0$ or $\\infty/\\infty$, so L'Hospital's Rule is not directly applicable.",
        },
      ],
    },
  },
];

export const contextualApplicationTopics: Topic[] = topicSeeds.map(makeTopic);
