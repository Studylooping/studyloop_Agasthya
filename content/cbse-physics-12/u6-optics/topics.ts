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
const UNIT = "u6-optics";
const VERSION = "0.1.2";
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
  return `You chose ${choiceText}. Recheck the sign convention, ray direction, optical path difference, or whether the formula applies to mirrors, lenses, prisms, instruments, or wave optics.${checkStep} The correct choice is ${correctText}.`;
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
          "incorrect_cbse_class12_physics_optics_reasoning"),
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
    contentId: `${COURSE}.u6.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
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
      "uses_an_optics_formula_without_checking_signs_or_conditions",
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
    contentId: `${COURSE}.u6.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
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
      "states_a_formula_without_justifying_the_optical_condition_used",
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

type ReindexKind = "mc" | ResponseType | "frq";

function itemId(topicCode: string, kind: ReindexKind, index: number) {
  return `${COURSE}.u6.t${topicSlug(topicCode)}.${kind}.${String(index + 1).padStart(3, "0")}`;
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

function relocateOpticsItems(topics: Topic[]): Topic[] {
  const byCode = new Map(
    topics.map((topic) => [
      topic.topicCode,
      { ...topic, items: [...topic.items] },
    ]),
  );
  const source = byCode.get("6.1");
  const target = byCode.get("6.3");

  const stemsToMove = [
    "Light travels from glass of refractive index",
    "Assertion: At the critical angle for a denser-to-rarer interface",
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

const concaveMirrorFigure: ItemFigure = {
  type: "svg",
  title: "Concave mirror object position",
  description:
    "A concave mirror with pole P, focus F and centre C. The object is placed beyond C; no image rays are drawn.",
  svg: `<svg viewBox="0 0 700 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="700" height="330" fill="#ffffff"/>
  <defs>
    <marker id="axis-arrow-optics" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
    <marker id="obj-arrow" markerWidth="10" markerHeight="10" refX="5" refY="1" orient="auto">
      <path d="M0 10 L5 0 L10 10 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <line x1="70" y1="185" x2="635" y2="185" stroke="#334155" stroke-width="2.5" marker-end="url(#axis-arrow-optics)"/>
  <path d="M565 80 Q515 185 565 290" fill="none" stroke="#0f172a" stroke-width="4"/>
  <line x1="210" y1="185" x2="210" y2="115" stroke="#2563eb" stroke-width="5" marker-end="url(#obj-arrow)"/>
  <g stroke="#94a3b8" stroke-width="2">
    <line x1="330" y1="176" x2="330" y2="194"/>
    <line x1="445" y1="176" x2="445" y2="194"/>
    <line x1="535" y1="176" x2="535" y2="194"/>
  </g>
  <g font-family="Arial, sans-serif" font-size="17" fill="#0f172a" text-anchor="middle">
    <text x="210" y="105">object</text>
    <text x="330" y="220">C</text>
    <text x="445" y="220">F</text>
    <text x="535" y="220">P</text>
    <text x="600" y="92">concave mirror</text>
  </g>
</svg>`,
};

const lensScreenFigure: ItemFigure = {
  type: "svg",
  title: "Lens and screen arrangement",
  description:
    "A convex lens is placed between an object and a screen, with object distance 30 cm and screen distance 60 cm marked.",
  svg: `<svg viewBox="0 0 720 340" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="720" height="340" fill="#ffffff"/>
  <defs>
    <marker id="dim-tick-lens" markerWidth="4" markerHeight="12" refX="2" refY="6" orient="auto">
      <path d="M2 0 L2 12" stroke="#64748b" stroke-width="2"/>
    </marker>
    <marker id="object-up" markerWidth="10" markerHeight="10" refX="5" refY="1" orient="auto">
      <path d="M0 10 L5 0 L10 10 Z" fill="#2563eb"/>
    </marker>
  </defs>
  <line x1="80" y1="190" x2="650" y2="190" stroke="#334155" stroke-width="2"/>
  <line x1="230" y1="190" x2="230" y2="120" stroke="#2563eb" stroke-width="5" marker-end="url(#object-up)"/>
  <path d="M360 72 Q405 170 360 268 Q315 170 360 72" fill="#dbeafe" stroke="#2563eb" stroke-width="3"/>
  <line x1="590" y1="85" x2="590" y2="280" stroke="#0f172a" stroke-width="4"/>
  <path d="M230 300 L360 300" stroke="#64748b" stroke-width="2" marker-start="url(#dim-tick-lens)" marker-end="url(#dim-tick-lens)"/>
  <path d="M360 315 L590 315" stroke="#64748b" stroke-width="2" marker-start="url(#dim-tick-lens)" marker-end="url(#dim-tick-lens)"/>
  <g font-family="Arial, sans-serif" font-size="17" fill="#0f172a" text-anchor="middle">
    <text x="230" y="108">object</text>
    <text x="360" y="55">convex lens</text>
    <text x="590" y="73">screen</text>
    <text x="295" y="292">30 cm</text>
    <text x="475" y="307">60 cm</text>
  </g>
</svg>`,
};

const prismDeviationFigure: ItemFigure = {
  type: "svg",
  title: "Prism deviation graph",
  description:
    "A smooth U-shaped graph of angle of deviation against angle of incidence for a prism; the lowest marked point has i = 50 degrees and D = 38 degrees.",
  svg: `<svg viewBox="0 0 680 420" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="680" height="420" fill="#ffffff"/>
  <defs>
    <marker id="axis-arrow-prism" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#334155"/>
    </marker>
  </defs>
  <g stroke="#e2e8f0" stroke-width="1">
    <line x1="100" y1="320" x2="610" y2="320"/>
    <line x1="100" y1="260" x2="610" y2="260"/>
    <line x1="100" y1="200" x2="610" y2="200"/>
    <line x1="100" y1="140" x2="610" y2="140"/>
    <line x1="100" y1="80" x2="610" y2="80"/>
    <line x1="180" y1="60" x2="180" y2="330"/>
    <line x1="300" y1="60" x2="300" y2="330"/>
    <line x1="420" y1="60" x2="420" y2="330"/>
    <line x1="540" y1="60" x2="540" y2="330"/>
  </g>
  <line x1="90" y1="330" x2="625" y2="330" stroke="#334155" stroke-width="2.5" marker-end="url(#axis-arrow-prism)"/>
  <line x1="100" y1="340" x2="100" y2="55" stroke="#334155" stroke-width="2.5" marker-end="url(#axis-arrow-prism)"/>
  <path d="M145 130 C220 245 315 306 420 285 C500 270 555 190 590 110" fill="none" stroke="#2563eb" stroke-width="4"/>
  <circle cx="360" cy="290" r="7" fill="#dc2626"/>
  <line x1="360" y1="290" x2="360" y2="330" stroke="#dc2626" stroke-width="2" stroke-dasharray="5 5"/>
  <line x1="100" y1="290" x2="360" y2="290" stroke="#dc2626" stroke-width="2" stroke-dasharray="5 5"/>
  <g font-family="Arial, sans-serif" font-size="17" fill="#0f172a">
    <text x="630" y="335">i</text>
    <text x="58" y="62">D</text>
    <text x="342" y="355">50&#176;</text>
    <text x="56" y="296">38&#176;</text>
    <text x="383" y="285">lowest point</text>
  </g>
</svg>`,
};

const ydseSetupFigure: ItemFigure = {
  type: "svg",
  title: "Young double-slit geometry",
  description:
    "A Young double-slit setup with slit separation d = 0.40 mm and screen distance D = 1.6 m marked; no fringe spacing value is written.",
  svg: `<svg viewBox="0 0 740 360" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="740" height="360" fill="#ffffff"/>
  <defs>
    <marker id="ray-arrow-ydse" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
      <path d="M0 0 L9 4.5 L0 9 Z" fill="#2563eb"/>
    </marker>
    <marker id="dim-tick-ydse" markerWidth="4" markerHeight="12" refX="2" refY="6" orient="auto">
      <path d="M2 0 L2 12" stroke="#64748b" stroke-width="2"/>
    </marker>
  </defs>
  <line x1="170" y1="70" x2="170" y2="290" stroke="#0f172a" stroke-width="4"/>
  <rect x="164" y="138" width="12" height="10" fill="#ffffff"/>
  <rect x="164" y="212" width="12" height="10" fill="#ffffff"/>
  <line x1="610" y1="60" x2="610" y2="300" stroke="#0f172a" stroke-width="4"/>
  <line x1="40" y1="180" x2="156" y2="143" stroke="#2563eb" stroke-width="2.5" marker-end="url(#ray-arrow-ydse)"/>
  <line x1="40" y1="180" x2="156" y2="217" stroke="#2563eb" stroke-width="2.5" marker-end="url(#ray-arrow-ydse)"/>
  <line x1="176" y1="143" x2="610" y2="180" stroke="#2563eb" stroke-width="2.5" opacity="0.85"/>
  <line x1="176" y1="217" x2="610" y2="180" stroke="#2563eb" stroke-width="2.5" opacity="0.85"/>
  <path d="M130 143 L130 217" stroke="#64748b" stroke-width="2" marker-start="url(#dim-tick-ydse)" marker-end="url(#dim-tick-ydse)"/>
  <path d="M170 325 L610 325" stroke="#64748b" stroke-width="2" marker-start="url(#dim-tick-ydse)" marker-end="url(#dim-tick-ydse)"/>
  <g font-family="Arial, sans-serif" font-size="17" fill="#0f172a" text-anchor="middle">
    <text x="170" y="48">double slit</text>
    <text x="610" y="45">screen</text>
    <text x="104" y="184">d = 0.40 mm</text>
    <text x="390" y="350">D = 1.6 m</text>
    <text x="630" y="186">O</text>
  </g>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "6.1",
    title: "Reflection and Refraction",
    subtopic:
      "Plane mirrors, mirror formula, Snell's law, apparent depth, and refraction at spherical surfaces",
    mc: [
      {
        questionLatex: L`A concave mirror has focal length $15\text{ cm}$. An object is placed $30\text{ cm}$ in front of it. Using the Cartesian sign convention, the image distance is`,
        difficulty: 3,
        skillTags: ["mirror_formula", "cartesian_sign_convention"],
        choices: [
          L`$-30\text{ cm}$`,
          L`$+30\text{ cm}$`,
          L`$-15\text{ cm}$`,
          L`$+60\text{ cm}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "A real image in front of a mirror has negative image distance in this convention.",
          C: "This uses the focal length as if the object were at infinity.",
          D: "This mixes the mirror sign convention with the lens result.",
        },
        hints: [
          L`For a concave mirror, $f=-15\text{ cm}$ and $u=-30\text{ cm}$.`,
          L`Use $\frac1f=\frac1v+\frac1u$.`,
          "Keep the sign of u while substituting.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Substitute the signed quantities in the mirror formula.",
            math: L`-\frac1{15}=\frac1v-\frac1{30}`,
          },
          {
            step: 2,
            explanation: "Solve for the image distance.",
            math: L`\frac1v=-\frac1{30}\Rightarrow v=-30\ \mathrm{cm}`,
          },
        ],
      },
      {
        questionLatex: L`Light travels from glass of refractive index $1.50$ to air. If the angle of incidence inside glass is $45^\circ$, the ray will`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["critical_angle", "total_internal_reflection"],
        choices: [
          "refract into air making 45 degrees with the normal",
          "bend towards the normal in air",
          "undergo total internal reflection",
          "travel along the interface",
        ],
        correctLetter: "C",
        rationales: {
          A: "Equal angles would require equal refractive indices.",
          B: "On going from glass to air, a refracted ray bends away from the normal if refraction occurs.",
          D: "The ray travels along the interface only at the critical angle, not above it.",
        },
        hints: [
          "Check whether the incident angle is greater than the critical angle.",
          L`For glass-air, $\sin C=1/1.50$.`,
          L`$C\approx 41.8^\circ$, which is less than $45^\circ$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Find the critical angle for glass to air.",
            math: L`\sin C=\frac{1}{1.50}=0.667\Rightarrow C\approx41.8^\circ`,
          },
          {
            step: 2,
            explanation:
              "Since the incident angle is larger than the critical angle, no refracted ray emerges.",
          },
        ],
      },
      {
        questionLatex: L`A ray travels from air into glass of refractive index $1.50$. If $\sin i=0.60$, the value of $\sin r$ is`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["snells_law", "refraction"],
        choices: [L`$0.30$`, L`$0.40$`, L`$0.60$`, L`$0.90$`],
        correctLetter: "B",
        rationales: {
          A: "This divides by 2 instead of using the given refractive index 1.50.",
          C: "This assumes the ray does not bend at the boundary.",
          D: "This multiplies by 1.50 instead of dividing by 1.50.",
        },
        hints: [
          L`Use Snell's law $n_1\sin i=n_2\sin r$.`,
          L`Here $n_1=1$ for air and $n_2=1.50$.`,
          L`So $\sin r=0.60/1.50$.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply Snell's law for air to glass.",
            math: L`1\times0.60=1.50\sin r`,
          },
          {
            step: 2,
            explanation: "Solve for the sine of the refracted angle.",
            math: L`\sin r=0.40`,
          },
        ],
      },
      {
        questionLatex: L`A coin at the bottom of a liquid appears $12\text{ cm}$ below the surface when viewed normally from air. If the real depth is $16\text{ cm}$, the refractive index of the liquid is`,
        difficulty: 2,
        skillTags: ["apparent_depth", "refractive_index"],
        choices: [
          L`$\frac34$`,
          L`$\frac43$`,
          L`$\frac{7}{4}$`,
          L`$\frac{16}{28}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This reverses real depth and apparent depth.",
          C: "This adds the depths instead of taking their ratio.",
          D: "This uses the sum of depths in the denominator.",
        },
        hints: [
          "For normal viewing from air, use real depth divided by apparent depth.",
          "The apparent depth is smaller than the real depth.",
          L`\mu=16/12.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the apparent-depth relation.",
            math: L`\mu=\frac{\text{real depth}}{\text{apparent depth}}=\frac{16}{12}=\frac43`,
          },
        ],
      },
      {
        questionLatex: L`For a real object placed in front of a convex mirror, the image is always`,
        difficulty: 2,
        skillTags: ["convex_mirror", "image_nature"],
        choices: [
          "real, inverted and enlarged",
          "real, erect and diminished",
          "virtual, erect and diminished",
          "virtual, inverted and enlarged",
        ],
        correctLetter: "C",
        rationales: {
          A: "A convex mirror does not form a real image of a real object.",
          B: "The image is erect and diminished, but it is virtual.",
          D: "A virtual image in a mirror is erect here, not inverted.",
        },
        hints: [
          "Think of rear-view mirrors.",
          "A convex mirror diverges reflected rays.",
          "The image appears behind the mirror between P and F.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A convex mirror makes reflected rays diverge; their backward extensions meet behind the mirror.",
          },
          {
            step: 2,
            explanation:
              "The image is therefore virtual, erect and diminished for every real object position.",
          },
        ],
      },
      {
        questionLatex: L`An object is $12\text{ cm}$ in front of a plane mirror. It is moved $3\text{ cm}$ towards the mirror. The distance between the object and its image`,
        difficulty: 2,
        skillTags: ["plane_mirror_image", "law_of_reflection"],
        choices: [
          L`decreases by $3\text{ cm}$`,
          L`decreases by $6\text{ cm}$`,
          L`increases by $3\text{ cm}$`,
          L`remains unchanged`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This counts only the object's movement and forgets that the image moves symmetrically.",
          C: "This reverses the direction of the change; moving towards the mirror reduces the separation.",
          D: "The image position changes when the object position changes.",
        },
        hints: [
          "In a plane mirror, image distance behind the mirror equals object distance in front.",
          "The object-image separation is twice the object distance from the mirror.",
          "Compare the initial and final separations.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Initially the object-image separation is twice 12 cm.",
            math: L`2\times12=24\ \mathrm{cm}`,
          },
          {
            step: 2,
            explanation:
              "After the object moves 3 cm closer, its distance from the mirror is 9 cm.",
            math: L`2\times9=18\ \mathrm{cm}`,
          },
          {
            step: 3,
            explanation: "So the separation decreases by 6 cm.",
            math: L`24-18=6\ \mathrm{cm}`,
          },
        ],
      },
      {
        questionLatex: L`Assertion: At the critical angle for a denser-to-rarer interface, the refracted ray grazes the boundary. Reason: At the critical angle, the angle of refraction is $90^\circ$.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "critical_angle"],
        choices: [
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Both Assertion and Reason are true, but Reason does not correctly explain Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains the grazing ray: refraction at 90 degrees means along the surface.",
          C: "The reason is the definition of critical angle.",
          D: "The assertion is true for denser-to-rarer incidence.",
        },
        hints: [
          "Critical angle is defined only for denser-to-rarer incidence.",
          "Grazing means the refracted ray is along the boundary.",
          "Along the boundary corresponds to angle of refraction 90 degrees.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At the critical angle, Snell's law gives the limiting refracted ray.",
            math: L`r=90^\circ`,
          },
          {
            step: 2,
            explanation:
              "A ray refracted at 90 degrees travels along the interface, so the reason explains the assertion.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`A plane mirror is rotated through $5^\circ$ while the incident ray is kept fixed. Find the angle through which the reflected ray rotates.`,
        difficulty: 1,
        skillTags: ["plane_mirror_rotation"],
        parts: onePart("Find the rotation of the reflected ray.", 1),
        hints: [
          "For a plane mirror, reflected ray rotation is twice the mirror rotation.",
          L`Use $\Delta\theta_r=2\Delta\theta_m$.`,
          "The incident ray is fixed.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Uses twice-the-mirror-rotation result.",
          },
        ]),
        commonErrors: ["Reporting 5 degrees instead of twice the angle."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "When the mirror turns by theta, the normal also turns by theta, so the reflected ray turns by twice that angle.",
            math: L`\Delta\theta_r=2(5^\circ)=10^\circ`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A point object is $60\text{ cm}$ in front of a convex spherical glass surface of radius $20\text{ cm}$. Light travels from air into glass of refractive index $1.50$. Find the image distance from the surface using the Cartesian convention.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: [
          "refraction_spherical_surface",
          "cartesian_sign_convention",
        ],
        parts: onePart(
          "Find the image distance and state whether the image is real or virtual.",
          3,
        ),
        hints: [
          L`Use $\frac{n_2}{v}-\frac{n_1}{u}=\frac{n_2-n_1}{R}$.`,
          L`Here $n_1=1,\ n_2=1.5,\ u=-60\text{ cm},\ R=+20\text{ cm}$.`,
          "Positive v means the image lies inside the glass.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Substitutes signed quantities correctly.",
          },
          {
            part: "a",
            points: 1,
            description:
              "Finds positive image distance and identifies a real image.",
          },
        ]),
        commonErrors: [
          "Using the mirror formula for a refracting surface.",
          "Taking the radius as negative for this surface orientation.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Substitute in the refraction formula.",
            math: L`\frac{1.5}{v}-\frac{1}{-60}=\frac{0.5}{20}`,
          },
          {
            part: "a",
            explanation: "Solve for v.",
            math: L`\frac{1.5}{v}=\frac1{40}-\frac1{60}=\frac1{120}\Rightarrow v=180\ \mathrm{cm}`,
          },
          {
            part: "a",
            explanation:
              "The positive sign means the image is formed on the refracted side, so it is real.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A ray of light enters glass of refractive index $1.50$ from air at an incidence angle of $45^\circ$. Find the angle of refraction and the speed of light in glass. Take $c=3.0\times10^8\text{ m s}^{-1}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["snells_law", "speed_in_medium"],
        parts: [
          part("a", "Find the angle of refraction.", 2),
          part("b", "Find the speed of light in glass.", 1),
        ],
        hints: [
          L`Use $\sin i/\sin r=n_2/n_1$.`,
          L`Here $\sin r=\sin45^\circ/1.50$.`,
          L`Use $v=c/n$ for speed in a medium.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Applies Snell's law and obtains r near 28 degrees.",
          },
          {
            part: "b",
            points: 1,
            description: "Computes c divided by refractive index.",
          },
        ]),
        commonErrors: [
          "Making the ray bend away from the normal while entering glass.",
          "Multiplying c by n instead of dividing.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use Snell's law from air to glass.",
            math: L`\sin r=\frac{\sin45^\circ}{1.50}=0.471\Rightarrow r\approx28.1^\circ`,
          },
          {
            part: "b",
            explanation: "Speed in glass is c over refractive index.",
            math: L`v=\frac{3.0\times10^8}{1.50}=2.0\times10^8\ \mathrm{m\,s^{-1}}`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`An object is placed $30\text{ cm}$ in front of a concave mirror of focal length $20\text{ cm}$. Determine the image distance, magnification, and nature of the image.`,
        difficulty: 4,
        figure: concaveMirrorFigure,
        skillTags: ["mirror_formula", "magnification", "image_nature"],
        parts: [
          part("a", "Find the image distance.", 2),
          part("b", "Find the magnification.", 2),
          part("c", "State the nature of the image.", 1),
        ],
        hints: [
          L`Use $u=-30\text{ cm}$ and $f=-20\text{ cm}$.`,
          L`For mirrors, $m=-v/u$.`,
          "A negative magnification indicates an inverted real image.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Uses mirror formula with correct signs.",
          },
          {
            part: "b",
            points: 2,
            description: "Computes magnification with sign.",
          },
          {
            part: "c",
            points: 1,
            description: "States real, inverted and enlarged.",
          },
        ]),
        commonErrors: [
          "Using positive focal length for the concave mirror.",
          "Dropping the sign of magnification.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Apply the mirror formula.",
            math: L`-\frac1{20}=\frac1v-\frac1{30}\Rightarrow \frac1v=-\frac1{60}`,
          },
          {
            part: "a",
            explanation: "The image distance is negative.",
            math: L`v=-60\ \mathrm{cm}`,
          },
          {
            part: "b",
            explanation: "Find mirror magnification.",
            math: L`m=-\frac{v}{u}=-\frac{-60}{-30}=-2`,
          },
          {
            part: "c",
            explanation:
              "The image is real, inverted and twice the size of the object.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A swimming pool is filled with water of refractive index $4/3$. A lamp fixed at the bottom is actually $2.4\text{ m}$ below the surface and is viewed normally from air.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["apparent_depth", "refractive_index", "speed_in_medium"],
        parts: [
          part("a", "Find the apparent depth of the lamp.", 2),
          part("b", "Find the upward apparent shift.", 1),
          part("c", "Find the speed of light in water.", 2),
        ],
        hints: [
          L`For normal viewing, $\mu=\text{real depth}/\text{apparent depth}$.`,
          "Apparent shift is real depth minus apparent depth.",
          L`Use $v=c/\mu$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Finds apparent depth using refractive index.",
          },
          {
            part: "b",
            points: 1,
            description: "Computes apparent shift.",
          },
          {
            part: "c",
            points: 2,
            description: "Finds speed of light in water.",
          },
        ]),
        commonErrors: [
          "Multiplying instead of dividing the real depth by refractive index.",
          "Treating apparent shift as the apparent depth.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use the apparent-depth relation.",
            math: L`d_\text{app}=\frac{2.4}{4/3}=1.8\ \mathrm m`,
          },
          {
            part: "b",
            explanation: "Subtract apparent depth from real depth.",
            math: L`\text{shift}=2.4-1.8=0.6\ \mathrm m`,
          },
          {
            part: "c",
            explanation: "Speed in water is c over refractive index.",
            math: L`v=\frac{3.0\times10^8}{4/3}=2.25\times10^8\ \mathrm{m\,s^{-1}}`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.2",
    title: "Lenses and Optical Power",
    subtopic:
      "Thin lens formula, lens maker's formula, magnification, power, combinations, and common eye-defect correction",
    mc: [
      {
        questionLatex: L`A convex lens of focal length $20\text{ cm}$ forms an image of an object placed $30\text{ cm}$ in front of it. The image is formed at`,
        difficulty: 3,
        skillTags: ["thin_lens_formula", "image_distance"],
        choices: [
          L`$12\text{ cm}$ on the same side as the object`,
          L`$60\text{ cm}$ on the other side of the lens`,
          L`$30\text{ cm}$ on the other side of the lens`,
          L`$60\text{ cm}$ on the same side as the object`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This comes from adding reciprocals incorrectly and also puts the image on the wrong side.",
          C: "This treats the object as if it were at twice the focal length.",
          D: "A positive image distance for a lens is on the other side, not the object side.",
        },
        hints: [
          L`Use $u=-30\text{ cm}$ and $f=+20\text{ cm}$.`,
          L`For lenses, $\frac1v-\frac1u=\frac1f$.`,
          L`\frac1v=\frac1{20}-\frac1{30}.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the thin lens formula.",
            math: L`\frac1v+\frac1{30}=\frac1{20}`,
          },
          {
            step: 2,
            explanation: "Solve for v.",
            math: L`\frac1v=\frac1{60}\Rightarrow v=60\ \mathrm{cm}`,
          },
        ],
      },
      {
        questionLatex: L`Two thin lenses of powers $+4.0\text{ D}$ and $-1.5\text{ D}$ are kept in contact. The equivalent focal length is`,
        difficulty: 2,
        skillTags: ["lens_power", "lenses_in_contact"],
        choices: [
          L`$0.25\text{ m}$`,
          L`$0.40\text{ m}$`,
          L`$2.5\text{ m}$`,
          L`$5.5\text{ m}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This uses only the +4 D lens.",
          C: "This treats power as focal length instead of using reciprocal.",
          D: "This adds magnitudes instead of algebraic powers.",
        },
        hints: [
          "Powers of thin lenses in contact add algebraically.",
          L`$P_\text{eq}=4.0-1.5=2.5\text{ D}$.`,
          L`Use $f=1/P$ when f is in metre.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Add the powers.",
            math: L`P_\text{eq}=+4.0-1.5=+2.5\ \mathrm D`,
          },
          {
            step: 2,
            explanation: "Convert power to focal length.",
            math: L`f=\frac1P=\frac1{2.5}=0.40\ \mathrm m`,
          },
        ],
      },
      {
        questionLatex: L`A thin symmetric biconvex lens has $R_1=+20\text{ cm}$ and $R_2=-20\text{ cm}$. If the refractive index of glass is $1.50$, its focal length in air is`,
        difficulty: 3,
        skillTags: ["lens_makers_formula", "sign_convention"],
        choices: [
          L`$10\text{ cm}$`,
          L`$20\text{ cm}$`,
          L`$40\text{ cm}$`,
          L`$80\text{ cm}$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This forgets the factor n minus 1.",
          C: "This halves the curvature contribution.",
          D: "This treats one surface as plane.",
        },
        hints: [
          L`Use $\frac1f=(n-1)(1/R_1-1/R_2)$.`,
          "For a biconvex lens, the second radius is negative in this convention.",
          L`1/R_1-1/R_2=1/20+1/20.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Apply the lens maker formula.",
            math: L`\frac1f=(1.5-1)\left(\frac1{20}-\frac1{-20}\right)`,
          },
          {
            step: 2,
            explanation: "Evaluate the reciprocal focal length.",
            math: L`\frac1f=0.5\left(\frac2{20}\right)=\frac1{20}\Rightarrow f=20\ \mathrm{cm}`,
          },
        ],
      },
      {
        questionLatex: L`A glass converging lens is immersed in water. Compared with its focal length in air, its focal length in water becomes`,
        difficulty: 3,
        skillTags: ["lens_in_medium", "relative_refractive_index"],
        choices: [
          "smaller, because water bends rays more strongly than air",
          "larger, because the refractive index contrast is reduced",
          "unchanged, because radii of curvature do not change",
          "negative, so the lens always becomes diverging",
        ],
        correctLetter: "B",
        rationales: {
          A: "Water reduces the glass-medium contrast, so the lens is weaker.",
          C: "Lens power also depends on refractive-index contrast, not only curvature.",
          D: "A glass lens in water generally remains converging if glass still has larger refractive index than water.",
        },
        hints: [
          "Lens maker formula in a medium uses relative refractive index.",
          "The relative index of glass with respect to water is closer to 1 than glass with respect to air.",
          "Lower power means longer focal length.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In a surrounding medium, lens power is proportional to relative refractive index minus one.",
          },
          {
            step: 2,
            explanation:
              "Water reduces the refractive contrast, so the lens has smaller power and larger focal length.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: The power of a converging lens in air is positive. Reason: In the Cartesian convention, its focal length is positive and $P=1/f$ in SI units.`,
        difficulty: 2,
        skillTags: ["assertion_reason", "lens_power"],
        choices: [
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Both Assertion and Reason are true, but Reason does not correctly explain Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The sign of power follows directly from the sign of focal length.",
          C: "The reason is true for the lens sign convention.",
          D: "A converging lens has positive focal length and positive power.",
        },
        hints: [
          "Check the sign of focal length for a convex lens.",
          "Power is reciprocal focal length in metre.",
          "Positive reciprocal of a positive focal length is positive.",
        ],
        solution: [
          {
            step: 1,
            explanation: "A converging lens has positive focal length.",
            math: L`P=\frac1f`,
          },
          {
            step: 2,
            explanation:
              "Therefore its power is positive when f is measured in metre.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the power of a concave lens of focal length $25\text{ cm}$.`,
        difficulty: 1,
        skillTags: ["lens_power", "concave_lens"],
        parts: onePart("Find the power in dioptre.", 1),
        hints: [
          "A concave lens has negative focal length.",
          L`Convert $25\text{ cm}$ to $0.25\text{ m}$.`,
          L`P=1/f.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Finds negative four dioptre.",
          },
        ]),
        commonErrors: ["Forgetting the negative sign of a concave lens."],
        workedSolution: [
          {
            part: "a",
            explanation: "Use f in metre and keep the sign.",
            math: L`P=\frac1{-0.25}=-4.0\ \mathrm D`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student has a far point $80\text{ cm}$ from the eye. Find the power of the spectacle lens required for seeing distant objects clearly.`,
        difficulty: 3,
        skillTags: ["myopia_correction", "lens_power"],
        parts: onePart("Find the lens power and identify the lens type.", 2),
        hints: [
          "For a distant object, the corrective lens must form a virtual image at the far point.",
          L`For object at infinity, the image is at the focal point of the lens.`,
          L`Use $f=-0.80\text{ m}$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Identifies concave lens with focal length -0.80 m.",
          },
          {
            part: "a",
            points: 1,
            description: "Computes power -1.25 D.",
          },
        ]),
        commonErrors: [
          "Using a convex lens for myopia.",
          "Using centimetre directly in P = 1/f.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For a distant object, the lens forms a virtual image at the far point.",
            math: L`f=-0.80\ \mathrm m`,
          },
          {
            part: "a",
            explanation: "Find the power.",
            math: L`P=\frac1f=\frac1{-0.80}=-1.25\ \mathrm D`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two thin lenses of powers $+5.0\text{ D}$ and $-2.0\text{ D}$ are placed in contact. Find the equivalent power and focal length.`,
        difficulty: 2,
        skillTags: ["lenses_in_contact", "lens_power"],
        parts: [
          part("a", "Find the equivalent power.", 1),
          part("b", "Find the focal length.", 1),
        ],
        hints: [
          "Powers add algebraically for lenses in contact.",
          L`$P_\text{eq}=5-2$.`,
          "Use f in metre.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Adds powers algebraically.",
          },
          {
            part: "b",
            points: 1,
            description: "Finds reciprocal focal length.",
          },
        ]),
        commonErrors: [
          "Adding focal lengths instead of powers.",
          "Dropping the negative sign of the diverging lens.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Add lens powers.",
            math: L`P_\text{eq}=+5.0-2.0=+3.0\ \mathrm D`,
          },
          {
            part: "b",
            explanation: "Convert power to focal length.",
            math: L`f=\frac1{3.0}=0.333\ \mathrm m`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`In the lens-screen arrangement shown, the sharp image of a $2.0\text{ cm}$ tall object is obtained on the screen. Determine the focal length of the lens, the magnification, and the image height.`,
        difficulty: 4,
        figure: lensScreenFigure,
        skillTags: ["thin_lens_formula", "magnification", "image_height"],
        parts: [
          part("a", "Find the focal length of the lens.", 2),
          part("b", "Find the magnification.", 2),
          part("c", "Find the image height and orientation.", 1),
        ],
        hints: [
          L`Use $u=-30\text{ cm}$ and $v=+60\text{ cm}$.`,
          L`For a lens, $\frac1v-\frac1u=\frac1f$.`,
          L`Magnification is $m=v/u$ for a thin lens.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Finds focal length from object and image distances.",
          },
          {
            part: "b",
            points: 2,
            description: "Finds signed magnification.",
          },
          {
            part: "c",
            points: 1,
            description: "Finds image height and inverted orientation.",
          },
        ]),
        commonErrors: [
          "Using both distances as positive in the lens formula.",
          "Missing the negative sign of magnification.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Apply the thin lens formula.",
            math: L`\frac1f=\frac1{60}-\frac1{-30}=\frac1{60}+\frac1{30}=\frac1{20}`,
          },
          {
            part: "a",
            explanation: "So the lens focal length is 20 cm.",
            math: L`f=20\ \mathrm{cm}`,
          },
          {
            part: "b",
            explanation: "Find the magnification.",
            math: L`m=\frac vu=\frac{60}{-30}=-2`,
          },
          {
            part: "c",
            explanation: "The image is inverted and twice as tall.",
            math: L`h_i=mh_o=(-2)(2.0\ \mathrm{cm})=-4.0\ \mathrm{cm}`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A camera lens of focal length $5.0\text{ cm}$ is initially focused on a very distant object, so the sensor is $5.0\text{ cm}$ behind the lens. The camera is then focused on an object $45\text{ cm}$ in front of the lens.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["camera_lens", "thin_lens_formula", "magnification"],
        parts: [
          part("a", "Find the new lens-to-sensor distance.", 2),
          part(
            "b",
            "Find the shift of the sensor from the infinity-focus position.",
            1,
          ),
          part("c", "Find the magnification.", 2),
        ],
        hints: [
          L`Use $u=-45\text{ cm}$ and $f=+5\text{ cm}$.`,
          "For a nearer object, the image distance is slightly more than f.",
          L`Use $m=v/u$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Computes image distance for the near object.",
          },
          {
            part: "b",
            points: 1,
            description: "Finds sensor shift from 5.0 cm.",
          },
          {
            part: "c",
            points: 2,
            description: "Finds signed magnification.",
          },
        ]),
        commonErrors: [
          "Assuming the image remains at the focal plane for every object distance.",
          "Using object distance as positive.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Apply the lens formula.",
            math: L`\frac1v-\frac1{-45}=\frac15\Rightarrow \frac1v=\frac15-\frac1{45}=\frac8{45}`,
          },
          {
            part: "a",
            explanation: "Find the image distance.",
            math: L`v=\frac{45}{8}=5.625\ \mathrm{cm}`,
          },
          {
            part: "b",
            explanation: "Compare with the original 5.0 cm sensor position.",
            math: L`\Delta v=5.625-5.0=0.625\ \mathrm{cm}`,
          },
          {
            part: "c",
            explanation: "Find magnification.",
            math: L`m=\frac vu=\frac{5.625}{-45}=-0.125`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.3",
    title: "Prism, Dispersion and Total Internal Reflection",
    subtopic:
      "Prism minimum deviation, dispersion, critical angle, total internal reflection, lateral shift, and optical fibres",
    mc: [
      {
        questionLatex: L`A prism has angle $A=60^\circ$ and minimum deviation $D_m=40^\circ$. Its refractive index is closest to`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["prism_minimum_deviation"],
        choices: [L`$1.22$`, L`$1.73$`, L`$1.53$`, L`$2.00$`],
        correctLetter: "C",
        rationales: {
          A: "This uses sine of the deviation alone rather than the prism formula.",
          B: "This would be closer to a 60 degree minimum-deviation numerator.",
          D: "This overestimates by treating the denominator as much smaller than sin 30 degrees.",
        },
        hints: [
          L`Use $\mu=\frac{\sin((A+D_m)/2)}{\sin(A/2)}$.`,
          L`$(A+D_m)/2=50^\circ$ and $A/2=30^\circ$.`,
          L`\mu=\sin50^\circ/\sin30^\circ.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Substitute in the prism formula at minimum deviation.",
            math: L`\mu=\frac{\sin50^\circ}{\sin30^\circ}`,
          },
          {
            step: 2,
            explanation: "Evaluate.",
            math: L`\mu\approx\frac{0.766}{0.500}=1.53`,
          },
        ],
      },
      {
        questionLatex: L`The critical angle for light going from a medium of refractive index $\sqrt2$ to air is`,
        difficulty: 2,
        skillTags: ["critical_angle"],
        choices: [L`$30^\circ$`, L`$45^\circ$`, L`$60^\circ$`, L`$90^\circ$`],
        correctLetter: "B",
        rationales: {
          A: "This would require refractive index 2.",
          C: "This uses sin C as sqrt 3 over 2 instead of 1 over sqrt 2.",
          D: "At 90 degrees the refracted ray would not be a limiting ray from this medium.",
        },
        hints: [
          L`For medium-air, $\sin C=1/\mu$.`,
          L`1/\sqrt2=\sin45^\circ.`,
          "Critical angle is measured inside the denser medium.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the critical-angle relation.",
            math: L`\sin C=\frac1{\sqrt2}`,
          },
          {
            step: 2,
            explanation: "Therefore C is 45 degrees.",
            math: L`C=45^\circ`,
          },
        ],
      },
      {
        questionLatex: L`In an optical fibre, light is guided mainly because`,
        difficulty: 2,
        skillTags: ["optical_fibre", "total_internal_reflection"],
        choices: [
          "the core has lower refractive index than the cladding",
          "successive refractions bend the ray back into the core",
          "total internal reflection occurs at the core-cladding boundary",
          "the cladding absorbs all escaping light",
        ],
        correctLetter: "C",
        rationales: {
          A: "For total internal reflection at the boundary, the core must have higher refractive index.",
          B: "The guiding mechanism is reflection after the critical-angle condition is met.",
          D: "Absorption would waste signal energy; it is not the guiding principle.",
        },
        hints: [
          "The ray must remain inside the core after repeated boundary encounters.",
          "Check the refractive-index condition for total internal reflection.",
          "Core refractive index is slightly higher than cladding refractive index.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At the core-cladding boundary, the ray goes from optically denser core to rarer cladding.",
          },
          {
            step: 2,
            explanation:
              "For incidence above the critical angle, total internal reflection keeps the ray inside the fibre.",
          },
        ],
      },
      {
        questionLatex: L`When white light passes through a glass prism, the colour that deviates most is`,
        difficulty: 2,
        skillTags: ["dispersion", "prism"],
        choices: ["violet", "red", "yellow", "green"],
        correctLetter: "A",
        rationales: {
          B: "Red has the smallest refractive index in glass among visible colours, so it deviates least.",
          C: "Yellow is intermediate, not maximum deviation.",
          D: "Green is also intermediate.",
        },
        hints: [
          "Deviation is larger for larger refractive index.",
          "In glass, refractive index is larger for shorter wavelengths.",
          "Violet has the shortest wavelength among the listed visible colours.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In normal dispersion, glass has a larger refractive index for violet light than for red light.",
          },
          {
            step: 2,
            explanation: "Therefore violet deviates the most.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: At minimum deviation in a prism, the ray passes symmetrically through the prism. Reason: At minimum deviation, the angle of incidence equals the angle of emergence.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "prism_minimum_deviation"],
        choices: [
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Both Assertion and Reason are true, but Reason does not correctly explain Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The equality i = e is exactly the symmetry condition at minimum deviation.",
          C: "The reason is true at minimum deviation.",
          D: "The assertion is true because the path is symmetric.",
        },
        hints: [
          "Recall the special condition for minimum deviation.",
          "Symmetric path means equal incidence and emergence angles.",
          "Then the two internal refraction angles are also equal.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "At minimum deviation, the path through the prism is symmetric.",
            math: L`i=e,\qquad r_1=r_2=A/2`,
          },
          {
            step: 2,
            explanation: "So the reason correctly explains the assertion.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the critical angle for water-air interface if the refractive index of water is $4/3$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["critical_angle"],
        parts: onePart("Find the critical angle.", 1),
        hints: [
          L`Use $\sin C=1/\mu$.`,
          L`Here $\sin C=3/4$.`,
          "Take inverse sine.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Computes critical angle near 48.6 degrees.",
          },
        ]),
        commonErrors: ["Using 4/3 instead of 3/4 as sin C."],
        workedSolution: [
          {
            part: "a",
            explanation: "Apply the critical-angle formula.",
            math: L`\sin C=\frac{1}{4/3}=\frac34\Rightarrow C\approx48.6^\circ`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A prism of angle $60^\circ$ has minimum deviation $30^\circ$. Find its refractive index.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["prism_minimum_deviation"],
        parts: onePart("Find the refractive index.", 2),
        hints: [
          L`Use $\mu=\sin((A+D_m)/2)/\sin(A/2)$.`,
          L`$(60^\circ+30^\circ)/2=45^\circ$.`,
          L`\sin45^\circ/\sin30^\circ=\sqrt2.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Uses minimum deviation formula correctly.",
          },
        ]),
        commonErrors: [
          "Using A + D instead of half angles.",
          "Forgetting that sin 30 degrees is one half.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Substitute in the prism formula.",
            math: L`\mu=\frac{\sin45^\circ}{\sin30^\circ}=\frac{1/\sqrt2}{1/2}=\sqrt2`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A ray passes through a parallel-sided glass slab of thickness $6.0\text{ cm}$. The angle of incidence is $45^\circ$ and the angle of refraction inside the slab is $30^\circ$. Find the lateral displacement.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["glass_slab", "lateral_displacement"],
        parts: onePart("Find the lateral displacement.", 3),
        hints: [
          L`For a slab, $s=t\sin(i-r)/\cos r$.`,
          L`Here $t=6.0\text{ cm},\ i-r=15^\circ,\ r=30^\circ$.`,
          "Use degrees consistently.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Substitutes correctly in lateral displacement formula.",
          },
          {
            part: "a",
            points: 1,
            description: "Computes the numerical displacement.",
          },
        ]),
        commonErrors: [
          "Using sin i instead of sin(i - r).",
          "Omitting the cos r denominator.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use the slab lateral-displacement formula.",
            math: L`s=\frac{6.0\sin15^\circ}{\cos30^\circ}`,
          },
          {
            part: "a",
            explanation: "Evaluate.",
            math: L`s\approx\frac{6.0(0.259)}{0.866}\approx1.79\ \mathrm{cm}`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`An optical fibre has core refractive index $1.50$ and cladding refractive index $1.47$. For a ray incident from core to cladding, find the critical angle and state the condition for guiding by total internal reflection.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: [
          "optical_fibre",
          "critical_angle",
          "total_internal_reflection",
        ],
        parts: [
          part(
            "a",
            "Find the critical angle at the core-cladding interface.",
            3,
          ),
          part(
            "b",
            "State the condition on the internal angle of incidence for guiding.",
            2,
          ),
        ],
        hints: [
          L`Use $\sin C=n_\text{cladding}/n_\text{core}$.`,
          "The ray goes from the denser core to the slightly rarer cladding.",
          "Total internal reflection requires incidence angle greater than the critical angle.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 3,
            description: "Computes critical angle using index ratio.",
          },
          {
            part: "b",
            points: 2,
            description: "States incidence angle must exceed critical angle.",
          },
        ]),
        commonErrors: [
          "Using n_core/n_cladding, which is greater than 1 and cannot be sin C.",
          "Stating the condition as less than critical angle.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Use the critical-angle relation for core to cladding.",
            math: L`\sin C=\frac{1.47}{1.50}=0.980`,
          },
          {
            part: "a",
            explanation: "Find C.",
            math: L`C=\sin^{-1}(0.980)\approx78.5^\circ`,
          },
          {
            part: "b",
            explanation:
              "Guiding occurs when each core-cladding incidence angle is greater than about 78.5 degrees.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A prism has angle $A=60^\circ$. The graph shows its angle of deviation $D$ as the incidence angle $i$ is varied.`,
        difficulty: 4,
        calculatorAllowed: true,
        figure: prismDeviationFigure,
        skillTags: ["prism_deviation_graph", "minimum_deviation"],
        parts: [
          part("a", "Read the minimum deviation from the graph.", 1),
          part("b", "Find the refractive index of the prism material.", 3),
          part(
            "c",
            "State the relation between incidence and emergence angles at this point.",
            1,
          ),
        ],
        hints: [
          "Use the lowest point of the D versus i curve.",
          L`Use $\mu=\sin((A+D_m)/2)/\sin(A/2)$.`,
          "At minimum deviation the prism path is symmetric.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Reads Dmin as 38 degrees.",
          },
          {
            part: "b",
            points: 3,
            description: "Uses prism minimum-deviation formula.",
          },
          {
            part: "c",
            points: 1,
            description: "States i equals e at minimum deviation.",
          },
        ]),
        commonErrors: [
          "Using the incidence angle 50 degrees as the deviation.",
          "Using A + D without halving.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The lowest marked point gives the minimum deviation.",
            math: L`D_m=38^\circ`,
          },
          {
            part: "b",
            explanation: "Apply the prism formula.",
            math: L`\mu=\frac{\sin((60^\circ+38^\circ)/2)}{\sin30^\circ}=\frac{\sin49^\circ}{0.5}`,
          },
          {
            part: "b",
            explanation: "Evaluate.",
            math: L`\mu\approx\frac{0.755}{0.5}=1.51`,
          },
          {
            part: "c",
            explanation:
              "At minimum deviation the ray path is symmetric, so the angle of incidence equals the angle of emergence.",
            math: L`i=e`,
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.4",
    title: "Optical Instruments",
    subtopic:
      "Simple microscope, compound microscope, refracting and reflecting astronomical telescopes, normal adjustment, brightness and magnification",
    mc: [
      {
        questionLatex: L`A simple microscope has focal length $5.0\text{ cm}$. Its magnifying power for final image at the near point is`,
        difficulty: 2,
        skillTags: ["simple_microscope", "magnifying_power"],
        choices: [L`$5$`, L`$6$`, L`$0.2$`, L`$30$`],
        correctLetter: "B",
        rationales: {
          A: "This is D/f only, which applies to relaxed viewing, not near-point viewing.",
          C: "This uses f/D instead of D/f.",
          D: "This adds D and f instead of using the magnifying-power formula.",
        },
        hints: [
          L`For near-point viewing, $M=1+D/f$.`,
          L`Use $D=25\text{ cm}$.`,
          L`1+25/5=6.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use near-point magnifying power.",
            math: L`M=1+\frac{D}{f}=1+\frac{25}{5}=6`,
          },
        ],
      },
      {
        questionLatex: L`An astronomical telescope in normal adjustment has objective focal length $100\text{ cm}$ and eyepiece focal length $5\text{ cm}$. Its angular magnifying power is`,
        difficulty: 2,
        skillTags: ["astronomical_telescope", "normal_adjustment"],
        choices: [L`$5$`, L`$20$`, L`$100$`, L`$105$`],
        correctLetter: "B",
        rationales: {
          A: "This uses eyepiece over objective focal length.",
          C: "This uses the objective focal length alone.",
          D: "This adds focal lengths, which gives tube length, not magnification.",
        },
        hints: [
          L`For normal adjustment, $M=f_o/f_e$ in magnitude.`,
          "Use the ratio, not the sum.",
          L`100/5=20.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use telescope magnifying power in normal adjustment.",
            math: L`M=\frac{f_o}{f_e}=\frac{100}{5}=20`,
          },
        ],
      },
      {
        questionLatex: L`A compound microscope has tube length $16\text{ cm}$, objective focal length $1.0\text{ cm}$ and eyepiece focal length $4.0\text{ cm}$. For final image at infinity, its approximate magnifying power is`,
        difficulty: 3,
        skillTags: ["compound_microscope", "magnifying_power"],
        choices: [L`$20$`, L`$64$`, L`$100$`, L`$160$`],
        correctLetter: "C",
        rationales: {
          A: "This multiplies only one of the microscope factors.",
          B: "This uses L/f_e and D/f_o in the wrong pairing.",
          D: "This uses near-point eyepiece magnification as if final image were at infinity.",
        },
        hints: [
          L`For final image at infinity, $M\approx(L/f_o)(D/f_e)$.`,
          L`Use $D=25\text{ cm}$.`,
          L`(16/1)(25/4)=100.`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the approximate microscope formula.",
            math: L`M\approx\frac{L}{f_o}\frac{D}{f_e}=\frac{16}{1}\cdot\frac{25}{4}=100`,
          },
        ],
      },
      {
        questionLatex: L`In a reflecting astronomical telescope, the light-gathering objective is a`,
        difficulty: 2,
        skillTags: ["reflecting_telescope", "optical_instruments"],
        choices: [
          "convex lens",
          "plane glass slab",
          "concave mirror",
          "glass prism",
        ],
        correctLetter: "C",
        rationales: {
          A: "A convex lens is used as the objective in a refracting telescope, not a reflecting telescope.",
          B: "A plane slab can shift a ray but cannot collect and focus parallel light.",
          D: "A prism deviates or disperses light; it is not the focusing objective of a reflecting telescope.",
        },
        hints: [
          "Reflecting telescopes form the primary image by reflection.",
          "The objective must collect nearly parallel light from a distant object and focus it.",
          "A concave mirror converges reflected parallel rays.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A reflecting astronomical telescope uses a concave mirror as its objective.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: A telescope objective of larger aperture gives a brighter image of a distant star. Reason: A larger aperture collects more light from the star.`,
        difficulty: 2,
        skillTags: ["assertion_reason", "telescope_aperture"],
        choices: [
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Both Assertion and Reason are true, but Reason does not correctly explain Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason directly explains the increase in image brightness.",
          C: "The reason is true.",
          D: "The assertion is true for distant faint objects.",
        },
        hints: [
          "Brightness depends on light-gathering area.",
          "Area increases with aperture diameter.",
          "The reason links aperture to collected light.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A large objective aperture has larger collecting area.",
          },
          {
            step: 2,
            explanation:
              "It collects more light, so the image of a distant star appears brighter.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`An astronomical telescope has $f_o=120\text{ cm}$ and $f_e=6\text{ cm}$. Find its magnifying power in normal adjustment.`,
        difficulty: 1,
        skillTags: ["astronomical_telescope", "normal_adjustment"],
        parts: onePart("Find the magnifying power.", 1),
        hints: [
          L`Use $M=f_o/f_e$.`,
          "Normal adjustment means final image at infinity.",
          L`120/6=20.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Computes magnifying power 20.",
          },
        ]),
        commonErrors: ["Adding the focal lengths instead of taking the ratio."],
        workedSolution: [
          {
            part: "a",
            explanation: "Use telescope magnification.",
            math: L`M=\frac{120}{6}=20`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A simple microscope has focal length $10\text{ cm}$. Find its magnifying power for final image at infinity and at the near point. Take $D=25\text{ cm}$.`,
        difficulty: 2,
        skillTags: ["simple_microscope", "magnifying_power"],
        parts: [
          part("a", "Find M for final image at infinity.", 1),
          part("b", "Find M for final image at the near point.", 1),
        ],
        hints: [
          L`For relaxed viewing, $M=D/f$.`,
          L`For near-point viewing, $M=1+D/f$.`,
          "Use the same units for D and f.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Finds relaxed-viewing magnification.",
          },
          {
            part: "b",
            points: 1,
            description: "Finds near-point magnification.",
          },
        ]),
        commonErrors: [
          "Using the near-point formula for both cases.",
          "Using f in metre while D is in centimetre.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "For final image at infinity.",
            math: L`M_\infty=\frac{D}{f}=\frac{25}{10}=2.5`,
          },
          {
            part: "b",
            explanation: "For final image at near point.",
            math: L`M_D=1+\frac{D}{f}=1+\frac{25}{10}=3.5`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A compound microscope has tube length $15\text{ cm}$, objective focal length $1.5\text{ cm}$ and eyepiece focal length $5.0\text{ cm}$. Estimate its magnifying power for final image at infinity.`,
        difficulty: 3,
        skillTags: ["compound_microscope", "magnifying_power"],
        parts: onePart("Find the approximate magnifying power.", 3),
        hints: [
          L`Use $M\approx(L/f_o)(D/f_e)$.`,
          L`Take $D=25\text{ cm}$.`,
          "Compute the objective and eyepiece factors separately.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Uses the microscope magnification formula.",
          },
          {
            part: "a",
            points: 1,
            description: "Computes the numerical magnification.",
          },
        ]),
        commonErrors: [
          "Adding magnifications instead of multiplying.",
          "Using focal lengths in inconsistent units.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Use the approximate formula for final image at infinity.",
            math: L`M\approx\frac{15}{1.5}\cdot\frac{25}{5.0}=10\cdot5=50`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`An astronomical telescope has objective focal length $80\text{ cm}$ and eyepiece focal length $4.0\text{ cm}$. Find its magnifying power and tube length in normal adjustment. Then find the magnifying power when final image is formed at the near point $D=25\text{ cm}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: [
          "astronomical_telescope",
          "normal_adjustment",
          "near_point",
        ],
        parts: [
          part("a", "Find magnifying power in normal adjustment.", 1),
          part("b", "Find tube length in normal adjustment.", 1),
          part(
            "c",
            "Find magnifying power for final image at the near point.",
            3,
          ),
        ],
        hints: [
          L`Normal adjustment: $M=f_o/f_e$ and length $f_o+f_e$.`,
          L`Near-point telescope magnification magnitude is $\frac{f_o}{f_e}(1+\frac{f_e}{D})$.`,
          "Use centimetres consistently.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Computes normal-adjustment magnification.",
          },
          {
            part: "b",
            points: 1,
            description: "Computes normal-adjustment tube length.",
          },
          {
            part: "c",
            points: 3,
            description: "Uses near-point telescope magnification formula.",
          },
        ]),
        commonErrors: [
          "Using eyepiece over objective focal length.",
          "Using the simple microscope formula without the objective factor.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Normal-adjustment magnification.",
            math: L`M_\infty=\frac{80}{4.0}=20`,
          },
          {
            part: "b",
            explanation: "Normal-adjustment tube length.",
            math: L`L=f_o+f_e=80+4=84\ \mathrm{cm}`,
          },
          {
            part: "c",
            explanation: "Use near-point magnification.",
            math: L`M_D=\frac{f_o}{f_e}\left(1+\frac{f_e}{D}\right)=20\left(1+\frac4{25}\right)=23.2`,
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A school laboratory has a compound microscope whose objective gives a linear magnification of $30$ and whose eyepiece acts as a simple microscope of magnifying power $8$.`,
        difficulty: 3,
        skillTags: ["compound_microscope", "magnification"],
        parts: [
          part("a", "Find the total magnifying power.", 1),
          part(
            "b",
            "If a different eyepiece of magnifying power 10 is used with the same objective, find the new total magnifying power.",
            2,
          ),
          part(
            "c",
            "State why the objective focal length is chosen small in a compound microscope.",
            2,
          ),
        ],
        hints: [
          "Total magnification is product of objective and eyepiece magnifications.",
          "Only the eyepiece factor changes in part (b).",
          "A short-focal-length objective gives large objective magnification.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "Finds product 240.",
          },
          {
            part: "b",
            points: 2,
            description: "Updates the eyepiece factor and finds 300.",
          },
          {
            part: "c",
            points: 2,
            description:
              "Links small objective focal length to high magnification.",
          },
        ]),
        commonErrors: [
          "Adding 30 and 8 instead of multiplying.",
          "Changing the objective magnification in part (b).",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Multiply objective and eyepiece magnifications.",
            math: L`M=30\times8=240`,
          },
          {
            part: "b",
            explanation: "Use the new eyepiece factor.",
            math: L`M'=30\times10=300`,
          },
          {
            part: "c",
            explanation:
              "A small objective focal length gives a large objective magnification for a short object distance near the focus.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "6.5",
    title: "Wave Optics",
    subtopic:
      "Huygens' principle, coherent sources, Young's double-slit experiment, fringe width, and qualitative single-slit diffraction",
    mc: [
      {
        questionLatex: L`In Young's double-slit experiment, $\lambda=600\text{ nm}$, $D=2.0\text{ m}$ and $d=0.50\text{ mm}$. The fringe width is`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["ydse", "fringe_width"],
        choices: [
          L`$0.24\text{ mm}$`,
          L`$1.2\text{ mm}$`,
          L`$2.4\text{ mm}$`,
          L`$24\text{ mm}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This is a factor-of-ten error in converting millimetre or nanometre.",
          B: "This halves the correct value.",
          D: "This is a factor-of-ten overestimate.",
        },
        hints: [
          L`Use $\beta=\lambda D/d$.`,
          "Convert nm and mm to metre.",
          L`\beta=(600\times10^{-9})(2.0)/(0.50\times10^{-3}).`,
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the fringe-width formula.",
            math: L`\beta=\frac{\lambda D}{d}=\frac{(600\times10^{-9})(2.0)}{0.50\times10^{-3}}`,
          },
          {
            step: 2,
            explanation: "Evaluate.",
            math: L`\beta=2.4\times10^{-3}\ \mathrm m=2.4\ \mathrm{mm}`,
          },
        ],
      },
      {
        questionLatex: L`If a Young's double-slit experiment is completely immersed in water of refractive index $4/3$, the fringe width becomes`,
        difficulty: 3,
        skillTags: ["ydse", "fringe_width_in_medium"],
        choices: [
          "unchanged",
          L`$\frac43$ times its value in air`,
          L`$\frac34$ times its value in air`,
          "zero because interference stops in water",
        ],
        correctLetter: "C",
        rationales: {
          A: "Wavelength changes in a medium, so fringe width changes.",
          B: "The wavelength decreases by factor mu, not increases.",
          D: "Coherent light still interferes in water.",
        },
        hints: [
          "Frequency remains the same, but wavelength changes in a medium.",
          L`$\lambda_{\mathrm{water}}=\lambda_{\mathrm{air}}/\mu$.`,
          L`$\beta\propto\lambda$.`,
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In water the wavelength becomes lambda over refractive index.",
            math: L`\lambda'=\frac{\lambda}{4/3}=\frac34\lambda`,
          },
          {
            step: 2,
            explanation:
              "Since fringe width is proportional to wavelength, it becomes three-fourths.",
          },
        ],
      },
      {
        questionLatex: L`For sustained interference of light, the two sources must be`,
        difficulty: 2,
        skillTags: ["coherent_sources", "interference"],
        choices: [
          "of different frequencies and random phase difference",
          "coherent with a constant phase difference",
          "separated by several metres in every experiment",
          "individually very intense but mutually incoherent",
        ],
        correctLetter: "B",
        rationales: {
          A: "Random phase difference washes out a steady fringe pattern.",
          C: "Separation is not the defining condition for coherence.",
          D: "High intensity cannot replace coherence.",
        },
        hints: [
          "A steady pattern needs a steady phase relation.",
          "Coherent sources have same frequency and constant phase difference.",
          "Intensity alone is not enough.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Sustained interference requires a fixed phase relation between the waves.",
          },
          {
            step: 2,
            explanation:
              "Therefore the sources must be coherent with constant phase difference.",
          },
        ],
      },
      {
        questionLatex: L`In single-slit diffraction, if the slit is made wider while wavelength and screen distance remain unchanged, the central maximum generally`,
        difficulty: 3,
        skillTags: ["single_slit_diffraction", "central_maximum_width"],
        choices: [
          "spreads out more",
          "becomes narrower",
          "disappears completely",
          "remains unchanged",
        ],
        correctLetter: "B",
        rationales: {
          A: "A wider slit reduces diffraction spread; a narrower slit would spread light more.",
          C: "A wider slit narrows the central maximum; it does not remove diffraction entirely.",
          D: "Changing slit width changes the diffraction spread.",
        },
        hints: [
          "A wider slit causes less spreading of the diffracted light.",
          "The central maximum becomes narrower when slit width increases.",
          "This is the qualitative slit-width dependence of single-slit diffraction.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "In single-slit diffraction, increasing the slit width reduces the angular spread of the central maximum.",
          },
          {
            step: 2,
            explanation:
              "Thus, making the slit wider makes the central maximum narrower.",
          },
        ],
      },
      {
        questionLatex: L`Assertion: Diffraction is more noticeable when the aperture size is comparable with the wavelength. Reason: Then secondary wavelets from different parts of the aperture can produce appreciable path differences in the observation region.`,
        difficulty: 3,
        skillTags: ["assertion_reason", "diffraction", "huygens_principle"],
        choices: [
          "Both Assertion and Reason are true, and Reason correctly explains Assertion.",
          "Both Assertion and Reason are true, but Reason does not correctly explain Assertion.",
          "Assertion is true, but Reason is false.",
          "Assertion is false, but Reason is true.",
        ],
        correctLetter: "A",
        rationales: {
          B: "The reason explains why aperture size relative to wavelength matters.",
          C: "The reason is true under Huygens' wavelet picture.",
          D: "The assertion is true for diffraction.",
        },
        hints: [
          "Diffraction is a wave effect.",
          "Compare aperture size with wavelength.",
          "Huygens wavelets from different aperture points superpose.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Diffraction spread is appreciable when aperture width is not much larger than wavelength.",
          },
          {
            step: 2,
            explanation:
              "The stated wavelet path-difference reasoning explains the assertion.",
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`In Young's double-slit experiment, what path difference gives the third bright fringe from the central maximum?`,
        difficulty: 1,
        skillTags: ["ydse", "path_difference"],
        parts: onePart("State the path difference.", 1),
        hints: [
          "Bright fringes occur for path difference n lambda.",
          "The central maximum is n = 0.",
          "The third bright fringe has n = 3.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 1,
            description: "States path difference 3 lambda.",
          },
        ]),
        commonErrors: [
          "Counting the central maximum as the first bright fringe.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For the third bright fringe from the central maximum.",
            math: L`\Delta=3\lambda`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`In the Young's double-slit setup shown, the measured fringe width is $2.0\text{ mm}$. Find the wavelength of light used.`,
        difficulty: 3,
        calculatorAllowed: true,
        figure: ydseSetupFigure,
        skillTags: ["ydse", "wavelength_from_fringe_width"],
        parts: onePart("Find the wavelength.", 3),
        hints: [
          L`Use $\beta=\lambda D/d$.`,
          "Read d and D from the figure and convert units.",
          L`\lambda=\beta d/D.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Rearranges the fringe-width formula and converts units.",
          },
          {
            part: "a",
            points: 1,
            description: "Finds wavelength 5.0e-7 m.",
          },
        ]),
        commonErrors: [
          "Using D/d instead of d/D while solving for wavelength.",
          "Forgetting to convert millimetre to metre.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Use the fringe-width formula.",
            math: L`\lambda=\frac{\beta d}{D}`,
          },
          {
            part: "a",
            explanation: "Substitute the data.",
            math: L`\lambda=\frac{(2.0\times10^{-3})(0.40\times10^{-3})}{1.6}=5.0\times10^{-7}\ \mathrm m`,
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A plane wavefront travelling in air is incident obliquely on a plane glass surface. Using Huygens' principle, explain why the refracted ray bends towards the normal and state the refraction law obtained.`,
        difficulty: 3,
        skillTags: ["huygens_principle", "refraction_wavefront", "snells_law"],
        parts: [
          part(
            "a",
            "Explain the bending of the refracted ray using wavefronts.",
            2,
          ),
          part("b", "State the refraction law obtained.", 1),
        ],
        hints: [
          "In glass, the speed of light is smaller than in air.",
          "The part of the wavefront entering glass first slows first, so the wavefront rotates.",
          L`The wavefront construction gives $n_1\sin i=n_2\sin r$.`,
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description:
              "Explains speed reduction and rotation of the refracted wavefront.",
          },
          {
            part: "b",
            points: 1,
            description: "States Snell's law in standard form.",
          },
        ]),
        commonErrors: [
          "Saying the ray bends away from the normal when entering a denser medium.",
          "Quoting Snell's law without linking it to the wavefront speed change.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "When the wavefront enters glass obliquely, the portion entering glass first travels more slowly while the rest is still moving faster in air.",
          },
          {
            part: "a",
            explanation:
              "This rotation of the refracted wavefront makes the normal to the wavefront, the ray, bend towards the normal.",
          },
          {
            part: "b",
            explanation: "The Huygens construction gives Snell's law.",
            math: L`n_1\sin i=n_2\sin r`,
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`In a Young's double-slit experiment, $\lambda=600\text{ nm}$ and the fringe width is $2.0\text{ mm}$. A transparent sheet of thickness $6.0\,\mu\text{m}$ and refractive index $1.50$ is introduced in front of one slit. Find the optical path difference introduced, the fringe shift, and the direction of shift of the central fringe.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["ydse", "fringe_shift", "optical_path_difference"],
        parts: [
          part(
            "a",
            "Find the optical path difference introduced by the sheet.",
            2,
          ),
          part("b", "Find the fringe shift on the screen.", 2),
          part("c", "State the direction of shift of the central fringe.", 1),
        ],
        hints: [
          L`Extra optical path is $(\mu-1)t$.`,
          L`Fringe shift is $\beta(\Delta/\lambda)$.`,
          "The central fringe shifts toward the slit with the sheet.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Computes extra optical path.",
          },
          {
            part: "b",
            points: 2,
            description: "Converts optical path difference to fringe shift.",
          },
          {
            part: "c",
            points: 1,
            description: "States shift toward the covered slit.",
          },
        ]),
        commonErrors: [
          "Using mu times thickness instead of (mu - 1)t.",
          "Shifting the central fringe away from the sheet.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "The sheet adds optical path.",
            math: L`\Delta=(\mu-1)t=(1.50-1)(6.0\,\mu\mathrm m)=3.0\,\mu\mathrm m`,
          },
          {
            part: "b",
            explanation: "Convert this to number of wavelengths.",
            math: L`\frac{\Delta}{\lambda}=\frac{3.0\times10^{-6}}{600\times10^{-9}}=5`,
          },
          {
            part: "b",
            explanation: "The shift is five fringe widths.",
            math: L`s=5\beta=5(2.0\ \mathrm{mm})=10\ \mathrm{mm}`,
          },
          {
            part: "c",
            explanation:
              "The central fringe shifts toward the slit in front of which the sheet is introduced.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A Young's double-slit experiment is performed with slit separation $0.50\text{ mm}$ and screen distance $2.0\text{ m}$. Monochromatic light of wavelength $600\text{ nm}$ is used.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["ydse", "fringe_width", "interference_pattern"],
        parts: [
          part("a", "Find the fringe width.", 2),
          part(
            "b",
            "Find the distance of the second bright fringe from the central maximum.",
            1,
          ),
          part(
            "c",
            "State what happens to the fringe width if the wavelength is decreased.",
            2,
          ),
        ],
        hints: [
          L`Use $\beta=\lambda D/d$.`,
          "The second bright fringe is at y = 2 beta.",
          "Fringe width is directly proportional to wavelength.",
        ],
        rubric: rubric([
          {
            part: "a",
            points: 2,
            description: "Computes fringe width.",
          },
          {
            part: "b",
            points: 1,
            description: "Finds second bright distance.",
          },
          {
            part: "c",
            points: 2,
            description: "States proportional decrease with wavelength.",
          },
        ]),
        commonErrors: [
          "Using first bright formula for the second bright.",
          "Saying fringe width increases when wavelength decreases.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Find fringe width.",
            math: L`\beta=\frac{(600\times10^{-9})(2.0)}{0.50\times10^{-3}}=2.4\times10^{-3}\ \mathrm m=2.4\ \mathrm{mm}`,
          },
          {
            part: "b",
            explanation: "Second bright is two fringe widths from the centre.",
            math: L`y_2=2\beta=4.8\ \mathrm{mm}`,
          },
          {
            part: "c",
            explanation:
              "Since beta is directly proportional to wavelength, decreasing wavelength decreases the fringe width.",
          },
        ],
      },
    ],
  },
];

export const opticsTopics: Topic[] = relocateOpticsItems(
  topicSeeds.map(makeTopic),
);
