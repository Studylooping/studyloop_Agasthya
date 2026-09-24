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

const COURSE = "cbse-science-10";
const UNIT = "u3-natural-phenomena";
const VERSION = "0.1.5";
const REVIEW_STATUS = "human_review_required" as const;
const SOURCE_TYPE = "original_ai_assisted_question" as const;
const LETTERS = ["A", "B", "C", "D"] as const;
const L = String.raw;

type Difficulty = 1 | 2 | 3 | 4 | 5;
type ResponseType = "vsaq" | "saq" | "laq" | "case";

interface TopicMeta {
  topicCode: string;
  title: string;
  subtopic: string;
}

interface ChoiceSeed {
  text: string;
  correct?: boolean;
  rationale: string;
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

function rubric(
  criteria: readonly FrqRubric["criteria"][number][],
): FrqRubric {
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
  return { text, correct: true, rationale: "" };
}

function wrong(
  text: string,
  rationale: string,
  misconceptionTag?: string,
): ChoiceSeed {
  return { text, rationale, ...(misconceptionTag ? { misconceptionTag } : {}) };
}

function calibrateNaturalDifficulty({
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
    /\b(name|identify|which defect|which lens|which statement|is called)\b/.test(
      text,
    ) && !/\b(calculate|justify|explain|compare|predict|case|data|infer|why|shown)\b/.test(
      text,
    );

  if (kind === "mc_single" && difficulty >= 4 && recallOnly) return 3;
  if (kind === "frq" && responseType === "saq" && difficulty >= 4 && recallOnly) return 3;
  return difficulty;
}

function fallbackWrongRationale(seed: McSeed, choice: ChoiceSeed): string {
  const correctText =
    seed.choices.find((candidate) => candidate.correct)?.text ??
    "the correct option";
  const keyStep = [...seed.solution].reverse().find((item) => item.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choice.text}. Check the ray direction, sign convention, or optical formula before deciding.${checkStep} The correct choice is ${correctText}.`;
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
        "incorrect_cbse_class10_natural_phenomena_reasoning"),
  })) as McChoice[];

  const correctLetter =
    choices.find((choice) => choice.isCorrect)?.letter ?? "A";

  return {
    contentId: `${COURSE}.u3.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateNaturalDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_a_memorised_optics_rule_without_checking_the_ray_or_sign_convention",
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
    contentId: `${COURSE}.u3.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateNaturalDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_an_image_or_defect_without_linking_it_to_rays_formula_or_observation",
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

const concaveMirrorObjectFigure: ItemFigure = {
  type: "svg",
  title: "Concave mirror object position",
  description:
    "A concave mirror setup with object beyond centre of curvature, showing principal focus and centre of curvature but not the image.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 320" role="img" aria-label="Concave mirror with object beyond centre of curvature">
  <rect width="700" height="320" fill="#f8fafc"/>
  <line x1="70" y1="170" x2="640" y2="170" stroke="#334155" stroke-width="2"/>
  <path d="M565 75 Q625 170 565 265" fill="none" stroke="#2563eb" stroke-width="5"/>
  <line x1="550" y1="70" x2="550" y2="270" stroke="#94a3b8" stroke-dasharray="6 6" stroke-width="2"/>
  <line x1="240" y1="154" x2="240" y2="186" stroke="#0f172a" stroke-width="2"/>
  <text x="240" y="212" text-anchor="middle" font-size="16" fill="#0f172a" font-family="Arial">C</text>
  <line x1="395" y1="154" x2="395" y2="186" stroke="#0f172a" stroke-width="2"/>
  <text x="395" y="212" text-anchor="middle" font-size="16" fill="#0f172a" font-family="Arial">F</text>
  <line x1="145" y1="170" x2="145" y2="80" stroke="#dc2626" stroke-width="5"/>
  <path d="M145 74 L132 98 L158 98 Z" fill="#dc2626"/>
  <text x="145" y="238" text-anchor="middle" font-size="15" fill="#7f1d1d" font-family="Arial">object</text>
  <text x="585" y="296" text-anchor="middle" font-size="15" fill="#1d4ed8" font-family="Arial">concave mirror</text>
</svg>`,
};

const glassSlabFigure: ItemFigure = {
  type: "svg",
  title: "Glass slab refraction path",
  description:
    "A ray entering and emerging from a rectangular glass slab with normals and lateral displacement indicated.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" aria-label="Ray through rectangular glass slab">
  <rect width="720" height="360" fill="#f8fafc"/>
  <rect x="260" y="70" width="210" height="220" fill="#dbeafe" fill-opacity="0.65" stroke="#1d4ed8" stroke-width="3"/>
  <line x1="310" y1="50" x2="310" y2="310" stroke="#64748b" stroke-dasharray="6 6" stroke-width="2"/>
  <line x1="420" y1="50" x2="420" y2="310" stroke="#64748b" stroke-dasharray="6 6" stroke-width="2"/>
  <path d="M115 65 L310 150" fill="none" stroke="#dc2626" stroke-width="5" marker-end="url(#arrowSlabRed)"/>
  <path d="M310 150 L420 205" fill="none" stroke="#dc2626" stroke-width="5" marker-end="url(#arrowSlabRed)"/>
  <path d="M420 205 L610 288" fill="none" stroke="#dc2626" stroke-width="5" marker-end="url(#arrowSlabRed)"/>
  <path d="M115 105 L610 322" fill="none" stroke="#94a3b8" stroke-dasharray="6 6" stroke-width="2"/>
  <line x1="578" y1="260" x2="558" y2="306" stroke="#16a34a" stroke-width="3"/>
  <text x="550" y="255" font-size="14" fill="#166534" font-family="Arial">lateral shift</text>
  <text x="355" y="52" text-anchor="middle" font-size="16" fill="#1e3a8a" font-family="Arial">glass slab</text>
  <defs>
    <marker id="arrowSlabRed" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#dc2626"/>
    </marker>
  </defs>
</svg>`,
};

const convexLensObjectFigure: ItemFigure = {
  type: "svg",
  title: "Convex lens object position",
  description:
    "A convex lens with object at twice the focal length, showing focal points and optical centre but not the image.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" role="img" aria-label="Convex lens with object at two F">
  <rect width="720" height="340" fill="#f8fafc"/>
  <line x1="70" y1="180" x2="650" y2="180" stroke="#334155" stroke-width="2"/>
  <path d="M355 70 C315 130 315 230 355 290 C395 230 395 130 355 70 Z" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/>
  <line x1="355" y1="70" x2="355" y2="290" stroke="#1d4ed8" stroke-width="2"/>
  <text x="355" y="205" text-anchor="middle" font-size="15" fill="#1d4ed8" font-family="Arial">O</text>
  <line x1="235" y1="164" x2="235" y2="196" stroke="#0f172a" stroke-width="2"/>
  <text x="235" y="220" text-anchor="middle" font-size="15" fill="#0f172a" font-family="Arial">F</text>
  <line x1="115" y1="164" x2="115" y2="196" stroke="#0f172a" stroke-width="2"/>
  <text x="115" y="220" text-anchor="middle" font-size="15" fill="#0f172a" font-family="Arial">2F</text>
  <line x1="475" y1="164" x2="475" y2="196" stroke="#0f172a" stroke-width="2"/>
  <text x="475" y="220" text-anchor="middle" font-size="15" fill="#0f172a" font-family="Arial">F</text>
  <line x1="595" y1="164" x2="595" y2="196" stroke="#0f172a" stroke-width="2"/>
  <text x="595" y="220" text-anchor="middle" font-size="15" fill="#0f172a" font-family="Arial">2F</text>
  <line x1="115" y1="180" x2="115" y2="95" stroke="#dc2626" stroke-width="5"/>
  <path d="M115 88 L102 112 L128 112 Z" fill="#dc2626"/>
  <text x="115" y="250" text-anchor="middle" font-size="15" fill="#7f1d1d" font-family="Arial">object</text>
</svg>`,
};

const eyeDefectFigure: ItemFigure = {
  type: "svg",
  title: "Eye focusing before retina",
  description:
    "Parallel rays focus before the retina in an eye model, leaving the retina behind the focus.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" aria-label="Eye model with rays focusing before retina">
  <rect width="720" height="360" fill="#f8fafc"/>
  <ellipse cx="430" cy="180" rx="210" ry="120" fill="#e0f2fe" stroke="#0f172a" stroke-width="3"/>
  <path d="M570 105 Q630 180 570 255" fill="none" stroke="#dc2626" stroke-width="5"/>
  <ellipse cx="250" cy="180" rx="28" ry="72" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="3"/>
  <line x1="60" y1="130" x2="250" y2="160" stroke="#2563eb" stroke-width="4" marker-end="url(#eyeArrow)"/>
  <line x1="60" y1="230" x2="250" y2="200" stroke="#2563eb" stroke-width="4" marker-end="url(#eyeArrow)"/>
  <line x1="250" y1="160" x2="470" y2="180" stroke="#2563eb" stroke-width="4"/>
  <line x1="250" y1="200" x2="470" y2="180" stroke="#2563eb" stroke-width="4"/>
  <line x1="470" y1="180" x2="570" y2="150" stroke="#94a3b8" stroke-dasharray="6 6" stroke-width="3"/>
  <line x1="470" y1="180" x2="570" y2="210" stroke="#94a3b8" stroke-dasharray="6 6" stroke-width="3"/>
  <circle cx="470" cy="180" r="6" fill="#dc2626"/>
  <text x="246" y="282" text-anchor="middle" font-size="15" fill="#1d4ed8" font-family="Arial">eye lens</text>
  <text x="590" y="282" text-anchor="middle" font-size="15" fill="#991b1b" font-family="Arial">retina</text>
  <defs>
    <marker id="eyeArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#2563eb"/>
    </marker>
  </defs>
</svg>`,
};

const prismDispersionFigure: ItemFigure = {
  type: "svg",
  title: "White light through a prism",
  description:
    "A narrow beam of white light entering a triangular prism and emerging as separated coloured rays.",
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" aria-label="Dispersion of white light by a glass prism">
  <rect width="720" height="360" fill="#f8fafc"/>
  <path d="M320 75 L205 275 L440 275 Z" fill="#e0f2fe" stroke="#1d4ed8" stroke-width="4"/>
  <line x1="60" y1="175" x2="244" y2="175" stroke="#0f172a" stroke-width="6" marker-end="url(#whiteArrow)"/>
  <text x="115" y="155" font-size="15" fill="#0f172a" font-family="Arial">white light</text>
  <line x1="405" y1="182" x2="650" y2="116" stroke="#dc2626" stroke-width="4"/>
  <line x1="405" y1="186" x2="650" y2="141" stroke="#f97316" stroke-width="4"/>
  <line x1="405" y1="190" x2="650" y2="166" stroke="#eab308" stroke-width="4"/>
  <line x1="405" y1="194" x2="650" y2="191" stroke="#16a34a" stroke-width="4"/>
  <line x1="405" y1="198" x2="650" y2="216" stroke="#2563eb" stroke-width="4"/>
  <line x1="405" y1="202" x2="650" y2="241" stroke="#4f46e5" stroke-width="4"/>
  <line x1="405" y1="206" x2="650" y2="266" stroke="#7c3aed" stroke-width="4"/>
  <text x="502" y="78" font-size="15" fill="#475569" font-family="Arial">spectrum</text>
  <defs>
    <marker id="whiteArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#0f172a"/>
    </marker>
  </defs>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "3.1",
    title: "Reflection by Spherical Mirrors",
    subtopic:
      "Concave and convex mirrors, principal focus, centre of curvature, image formation and ray reasoning.",
    mc: [
      {
        questionLatex:
          "An object is placed beyond the centre of curvature of a concave mirror. The image formed is",
        difficulty: 3,
        skillTags: ["concave_mirror", "image_formation"],
        choices: [
          wrong("virtual, erect and enlarged behind the mirror", "That is the case when the object is between the pole and focus of a concave mirror."),
          correct("real, inverted and diminished between $F$ and $C$"),
          wrong("real, inverted and same size at $C$", "Same-size image occurs when the object is at $C$, not beyond $C$."),
          wrong("virtual, erect and diminished behind the mirror", "That describes a convex mirror; a concave mirror with the object beyond $C$ gives a real image in front of the mirror."),
        ],
        hints: [
          "Recall the standard concave-mirror image table.",
          "Object beyond $C$ gives image between $F$ and $C$.",
          "Real images formed by mirrors are inverted.",
        ],
        solution: [
          step(1, "For a concave mirror, an object beyond $C$ forms its image between $F$ and $C$."),
          step(2, "The image is real, inverted and diminished."),
        ],
      },
      {
        questionLatex:
          "A convex mirror is preferred as a rear-view mirror in vehicles mainly because it",
        difficulty: 2,
        skillTags: ["convex_mirror", "applications"],
        choices: [
          wrong("forms a highly enlarged image of vehicles behind", "A convex mirror forms diminished images, which is why it can show a wider field of traffic."),
          wrong("forms a real image on a screen", "A convex mirror forms a virtual image behind the mirror."),
          wrong("converges rays to give a bright image", "A convex mirror diverges reflected rays; convergence to a bright image is associated with a concave mirror."),
          correct("forms erect diminished images and gives a wider field of view"),
        ],
        hints: [
          "Think about how much road the driver must see.",
          "Convex mirrors always form virtual, erect, diminished images.",
          "A diminished image allows a wider field of view.",
        ],
        solution: [
          step(1, "Convex mirrors form virtual, erect and diminished images."),
          step(2, "This gives a wider field of view, useful for rear-view mirrors."),
        ],
      },
      {
        questionLatex:
          "Assertion (A): A ray parallel to the principal axis of a concave mirror passes through the principal focus after reflection. Reason (R): The principal focus is the point where rays parallel to the principal axis meet after reflection.",
        difficulty: 3,
        skillTags: ["assertion_reason", "principal_focus", "concave_mirror"],
        choices: [
          correct("Both A and R are true, and R correctly explains A."),
          wrong("Both A and R are true, but R does not explain A.", "The reason is exactly the definition used to explain the ray rule."),
          wrong("A is true, but R is false.", "R is true for a concave mirror: rays parallel to the principal axis reflect through the principal focus."),
          wrong("A is false, but R is true.", "A is the standard reflected-ray rule for a concave mirror."),
        ],
        hints: [
          "Use the definition of principal focus.",
          "A concave mirror converges parallel rays.",
          "The reason explains the assertion directly.",
        ],
        solution: [
          step(1, "For a concave mirror, parallel incident rays meet at the principal focus after reflection."),
          step(2, "So both statements are true and R explains A."),
        ],
      },
      {
        questionLatex:
          "A student wants a magnified erect image of a face while shaving. Which mirror and object position should be used?",
        difficulty: 3,
        skillTags: ["concave_mirror", "virtual_image", "application"],
        choices: [
          wrong("convex mirror with the face beyond $C$", "A convex mirror has no real centre of curvature in front and forms diminished images."),
          wrong("plane mirror at any distance", "A plane mirror forms same-size images, not magnified images."),
          correct("concave mirror with the face between pole and focus"),
          wrong("concave mirror with the face beyond $C$", "That placement forms a real, inverted and diminished image between $F$ and $C$, not an enlarged upright face image."),
        ],
        hints: [
          "An erect magnified mirror image must be virtual.",
          "A concave mirror can form a virtual enlarged image.",
          "This happens when the object is between the pole and focus.",
        ],
        solution: [
          step(1, "A concave mirror forms an erect enlarged virtual image when the object lies between $P$ and $F$."),
          step(2, "That is why a concave mirror can be used as a shaving mirror."),
        ],
      },
      {
        questionLatex:
          "For a spherical mirror, the radius of curvature is $40$ cm. The magnitude of its focal length is",
        difficulty: 2,
        skillTags: ["mirror_focus", "radius_focal_length"],
        choices: [
          wrong("$40$ cm", "This uses the radius itself; for a spherical mirror, the focal length magnitude is half the radius of curvature."),
          correct("$20$ cm"),
          wrong("$80$ cm", "This doubles the radius instead of halving it; the relation is $R=2f$, not $f=2R$."),
          wrong("$10$ cm", "This takes one-fourth of the radius; only one halving is needed because $f=R/2$."),
        ],
        hints: [
          "For a spherical mirror, $R=2f$.",
          "So $f=R/2$.",
          "Half of $40$ cm is $20$ cm.",
        ],
        solution: [
          step(1, "Use the relation between radius of curvature and focal length magnitude.", L`R=2f`),
          step(2, "Hence the focal-length magnitude is $40/2=20$ cm.", L`f=20\text{ cm}`),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Name the mirror that always forms a virtual, erect and diminished image of a real object.",
        difficulty: 1,
        skillTags: ["convex_mirror", "image_nature"],
        parts: [part("a", "Name the mirror.", 1)],
        hints: [
          "The image is always diminished.",
          "This mirror is used in vehicle rear-view mirrors.",
          "It is a convex mirror.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names convex mirror."),
        ]),
        commonErrors: [
          "Writing concave mirror because it can also make virtual images.",
          "Writing plane mirror, which gives same-size images.",
        ],
        workedSolution: [
          solutionPart("a", "A convex mirror always forms a virtual, erect and diminished image of a real object."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "The figure shows an object placed beyond $C$ of a concave mirror. State the position, nature and relative size of the image.",
        difficulty: 3,
        skillTags: ["concave_mirror_ray_diagram", "image_formation"],
        figure: concaveMirrorObjectFigure,
        parts: [
          part("a", "State the image position.", 1),
          part("b", "State whether the image is real/virtual and erect/inverted.", 1),
          part("c", "State whether the image is enlarged, diminished or same size.", 1),
        ],
        hints: [
          "Use the object position relative to $C$ and $F$.",
          "Object beyond $C$ gives image between $F$ and $C$.",
          "The image is real, inverted and diminished.",
        ],
        rubric: rubric([
          criterion("a", 1, "States image is formed between $F$ and $C$."),
          criterion("b", 1, "States image is real and inverted."),
          criterion("c", 1, "States image is diminished."),
        ]),
        commonErrors: [
          "Saying the image forms behind the mirror.",
          "Confusing the beyond-$C$ case with object-at-$C$ case.",
        ],
        workedSolution: [
          solutionPart("a", "The image is formed between the focus $F$ and centre of curvature $C$."),
          solutionPart("b", "It is real and inverted."),
          solutionPart("c", "It is diminished compared with the object."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A science club compares three mirrors. Mirror P gives a same-size erect image, mirror Q gives a diminished erect image with a wide field of view, and mirror R can give a magnified erect image when the object is very close.",
        difficulty: 3,
        skillTags: ["mirror_identification_case", "applications"],
        parts: [
          part("a", "Identify mirror P.", 1),
          part("b", "Identify mirror Q.", 1),
          part("c", "Identify mirror R and state where the object must be placed for the magnified erect image.", 2),
        ],
        hints: [
          "Same-size erect image suggests a plane mirror.",
          "Wide field of view and diminished image suggests a convex mirror.",
          "A close object inside focus of a concave mirror gives a magnified erect image.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies P as plane mirror."),
          criterion("b", 1, "Identifies Q as convex mirror."),
          criterion("c", 1, "Identifies R as concave mirror."),
          criterion("c", 1, "States object must be between pole and focus."),
        ]),
        commonErrors: [
          "Treating every magnifying mirror as convex.",
          "Forgetting the object-position condition for the concave mirror.",
        ],
        workedSolution: [
          solutionPart("a", "Mirror P is a plane mirror."),
          solutionPart("b", "Mirror Q is a convex mirror."),
          solutionPart("c", "Mirror R is a concave mirror. For a magnified erect image, the object must be between the pole and focus."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Explain why a concave mirror is used in a torch or vehicle headlamp.",
        difficulty: 3,
        skillTags: ["concave_mirror_application", "focus"],
        parts: [
          part("a", "Where should the light source be placed?", 1),
          part("b", "What kind of reflected beam is obtained?", 1),
          part("c", "Why is this useful?", 1),
        ],
        hints: [
          "A source at the focus sends reflected rays parallel to the principal axis.",
          "Parallel rays form a strong beam.",
          "This sends light over a long distance.",
        ],
        rubric: rubric([
          criterion("a", 1, "States source is placed at or near the focus."),
          criterion("b", 1, "States reflected rays become nearly parallel."),
          criterion("c", 1, "Links parallel beam to useful long-distance illumination."),
        ]),
        commonErrors: [
          "Saying a convex mirror is used to converge the beam.",
          "Not linking focus position to parallel reflected rays.",
        ],
        workedSolution: [
          solutionPart("a", "The bulb is placed at or near the focus of the concave mirror."),
          solutionPart("b", "The reflected rays emerge as a nearly parallel beam."),
          solutionPart("c", "A nearly parallel beam travels far and gives strong illumination in one direction."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Compare image formation by concave, convex and plane mirrors for common daily-life uses.",
        difficulty: 4,
        skillTags: ["mirror_comparison", "applications", "image_nature"],
        parts: [
          part("a", "State one use each of concave, convex and plane mirrors.", 3),
          part("b", "For each use, link the image property to the use.", 3),
        ],
        hints: [
          "Use shaving mirror, rear-view mirror and dressing mirror as possible examples.",
          "Concave can magnify if the object is within focus.",
          "Convex gives a wider field; plane gives same-size erect images.",
        ],
        rubric: rubric([
          criterion("a", 3, "Gives valid uses for concave, convex and plane mirrors."),
          criterion("b", 1, "Links concave use to magnified erect virtual image when object is close."),
          criterion("b", 1, "Links convex use to erect diminished image and wide field of view."),
          criterion("b", 1, "Links plane use to same-size erect virtual image."),
        ]),
        commonErrors: [
          "Saying convex mirrors magnify nearby objects.",
          "Giving uses without explaining the image property.",
        ],
        workedSolution: [
          solutionPart("a", "A concave mirror may be used as a shaving mirror, a convex mirror as a vehicle rear-view mirror, and a plane mirror as a dressing mirror."),
          solutionPart("b", "The concave mirror gives a magnified erect virtual image when the face is between $P$ and $F$. The convex mirror gives an erect diminished image with wide field of view. The plane mirror gives a same-size erect virtual image."),
        ],
      },
    ],
  },
  {
    topicCode: "3.2",
    title: "Mirror Formula and Magnification",
    subtopic:
      "New Cartesian sign convention, mirror formula, focal length, radius of curvature and magnification.",
    mc: [
      {
        questionLatex:
          "Using the Cartesian sign convention, an object is placed $30$ cm in front of a concave mirror of focal length $15$ cm. The image distance is",
        difficulty: 3,
        skillTags: ["mirror_formula", "sign_convention"],
        choices: [
          wrong("$+30$ cm", "For this concave-mirror setup the image is real and forms in front of the mirror, so $v$ is negative."),
          wrong("$-15$ cm", "This is the focal length value repeated as the image distance; the mirror formula must still be solved for $v$."),
          correct("$-30$ cm"),
          wrong("$+15$ cm", "This has both the wrong magnitude and the wrong sign; the real image for this concave mirror is on the object's side."),
        ],
        hints: [
          "For a concave mirror, $f=-15$ cm and the object distance is $u=-30$ cm.",
          "Use $1/f=1/v+1/u$.",
          "Solve for $v$.",
        ],
        solution: [
          step(1, "Use the mirror formula with sign convention.", L`\frac1f=\frac1v+\frac1u`),
          step(2, "Here $f=-15$ cm and $u=-30$ cm.", L`-\frac1{15}=\frac1v-\frac1{30}`),
          step(3, "So $1/v=-1/30$, hence $v=-30$ cm.", L`v=-30\text{ cm}`),
        ],
      },
      {
        questionLatex:
          "A convex mirror has focal length $20$ cm. An object is placed $30$ cm in front of it. The image is formed at about",
        difficulty: 3,
        skillTags: ["convex_mirror", "mirror_formula"],
        choices: [
          correct("$+12$ cm"),
          wrong("$-12$ cm", "A convex mirror forms a virtual image behind the mirror, so $v$ is positive in Cartesian convention."),
          wrong("$+60$ cm", "This comes from subtracting the reciprocal terms instead of adding them correctly."),
          wrong("$-60$ cm", "This sign and magnitude do not match a convex mirror image."),
        ],
        hints: [
          "For a convex mirror, $f=+20$ cm and $u=-30$ cm.",
          "Use $1/f=1/v+1/u$.",
          "$1/v=1/20+1/30$.",
        ],
        solution: [
          step(1, "Use the mirror formula.", L`\frac1{20}=\frac1v-\frac1{30}`),
          step(2, "Therefore $1/v=1/20+1/30=1/12$.", L`\frac1v=\frac1{12}`),
          step(3, "Hence $v=+12$ cm.", L`v=+12\text{ cm}`),
        ],
      },
      {
        questionLatex:
          "For a concave mirror, $u=-20$ cm and $v=-60$ cm. The magnification is",
        difficulty: 3,
        skillTags: ["mirror_magnification", "sign_convention"],
        choices: [
          wrong("$+3$", "Positive magnification would mean an erect image; this real image is inverted."),
          wrong("$-\\frac{1}{3}$", "This reverses the ratio; magnification is $m=-v/u$, not $-u/v$."),
          wrong("$+\\frac{1}{3}$", "This reverses the ratio and gives the wrong sign; the image is inverted, so the magnification must be negative."),
          correct("$-3$"),
        ],
        hints: [
          "For mirrors, $m=-v/u$.",
          "Substitute the signed values.",
          "A negative value means inverted image.",
        ],
        solution: [
          step(1, "Use mirror magnification.", L`m=-\frac vu`),
          step(2, "Substitute $v=-60$ cm and $u=-20$ cm.", L`m=-\frac{-60}{-20}`),
          step(3, "The magnification is $-3$.", L`m=-3`),
        ],
      },
      {
        questionLatex:
          "An image formed by a mirror has magnification $m=+0.5$. Which interpretation is correct?",
        difficulty: 3,
        skillTags: ["magnification_interpretation", "image_nature"],
        choices: [
          wrong("The image is inverted and enlarged.", "Positive magnification indicates an erect image, not inverted."),
          correct("The image is erect and diminished."),
          wrong("The image is erect and enlarged.", "The magnitude $0.5$ is less than $1$, so the image is diminished."),
          wrong("The image is inverted and diminished.", "Negative magnification would indicate inversion, but the given value is positive, so the image is erect."),
        ],
        hints: [
          "The sign tells erect or inverted.",
          "The magnitude tells enlarged or diminished.",
          "$+0.5$ means erect and half the object size.",
        ],
        solution: [
          step(1, "Positive magnification means the image is erect."),
          step(2, "Since $|m|=0.5<1$, the image is diminished."),
        ],
      },
      {
        questionLatex:
          "A concave mirror forms an image of the same size as the object. The object is placed",
        difficulty: 2,
        skillTags: ["concave_mirror", "image_size"],
        choices: [
          wrong("between the pole and focus", "This gives a virtual, erect and enlarged image, so it cannot be obtained on a screen."),
          wrong("at the focus", "The reflected rays are parallel and image is formed at infinity."),
          correct("at the centre of curvature"),
          wrong("beyond the centre of curvature", "This gives a diminished real image, so it does not match an enlarged screen image."),
        ],
        hints: [
          "Same-size image is a special concave-mirror case.",
          "The image also forms at $C$.",
          "The object must be at the centre of curvature.",
        ],
        solution: [
          step(1, "For a concave mirror, an object at $C$ forms a real, inverted image at $C$."),
          step(2, "The image is the same size as the object."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Write the mirror formula used for spherical mirrors.",
        difficulty: 1,
        skillTags: ["mirror_formula"],
        parts: [part("a", "Write the formula.", 1)],
        hints: [
          "The formula relates $f$, $v$ and $u$.",
          "Use reciprocals.",
          "$1/f=1/v+1/u$.",
        ],
        rubric: rubric([
          criterion("a", 1, "Writes $1/f=1/v+1/u$."),
        ]),
        commonErrors: [
          "Writing the lens formula instead of mirror formula.",
          "Forgetting reciprocals.",
        ],
        workedSolution: [
          solutionPart("a", "The mirror formula is $\\frac1f=\\frac1v+\\frac1u$.", L`\frac1f=\frac1v+\frac1u`),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A concave mirror of focal length $12$ cm forms a real image of an object placed $36$ cm in front of it. Find the image distance using the sign convention.",
        difficulty: 3,
        skillTags: ["mirror_formula", "numerical"],
        parts: [
          part("a", "Write the signed values of $f$ and $u$.", 1),
          part("b", "Calculate $v$.", 2),
        ],
        hints: [
          "For a concave mirror, $f$ is negative.",
          "The object in front gives $u<0$.",
          "Use $1/f=1/v+1/u$.",
        ],
        rubric: rubric([
          criterion("a", 1, "Writes $f=-12$ cm and $u=-36$ cm."),
          criterion("b", 1, "Substitutes correctly into the mirror formula."),
          criterion("b", 1, "Obtains $v=-18$ cm."),
        ]),
        commonErrors: [
          "Taking $f$ positive for a concave mirror.",
          "Dropping the sign of image distance.",
        ],
        workedSolution: [
          solutionPart("a", "Using Cartesian sign convention, $f=-12$ cm and $u=-36$ cm.", L`f=-12,\quad u=-36`),
          solutionPart("b", "From $\\frac1f=\\frac1v+\\frac1u$, $-\\frac1{12}=\\frac1v-\\frac1{36}$, so $\\frac1v=-\\frac1{18}$ and $v=-18$ cm.", L`v=-18\text{ cm}`),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A lab group uses a concave mirror and records $u=-24$ cm and $v=-48$ cm for a sharp image on a screen.",
        difficulty: 4,
        skillTags: ["mirror_formula_case", "magnification", "sign_convention"],
        parts: [
          part("a", "Find the focal length.", 2),
          part("b", "Find the magnification.", 1),
          part("c", "State the nature of the image.", 1),
        ],
        hints: [
          "Use $1/f=1/v+1/u$.",
          "For mirrors, $m=-v/u$.",
          "A screen image is real and a negative magnification means inverted.",
        ],
        rubric: rubric([
          criterion("a", 2, "Calculates $f=-16$ cm."),
          criterion("b", 1, "Calculates $m=-2$."),
          criterion("c", 1, "States image is real, inverted and enlarged."),
        ]),
        commonErrors: [
          "Using the lens formula for a mirror.",
          "Interpreting $m=-2$ as diminished.",
        ],
        workedSolution: [
          solutionPart("a", "$\\frac1f=\\frac1{-48}+\\frac1{-24}=-\\frac1{48}-\\frac2{48}=-\\frac3{48}=-\\frac1{16}$, so $f=-16$ cm.", L`f=-16\text{ cm}`),
          solutionPart("b", "$m=-v/u=-(-48)/(-24)=-2$.", L`m=-2`),
          solutionPart("c", "The image is real because it is on a screen, inverted because $m$ is negative, and enlarged because $|m|=2$."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A convex mirror has radius of curvature $32$ cm. Find its focal length and explain the sign of focal length.",
        difficulty: 3,
        skillTags: ["convex_mirror", "focal_length", "sign_convention"],
        parts: [
          part("a", "Find the magnitude of focal length.", 1),
          part("b", "State the signed focal length using Cartesian convention.", 1),
          part("c", "Explain the sign.", 1),
        ],
        hints: [
          "Use $R=2f$ in magnitude.",
          "A convex mirror has its focus behind the mirror.",
          "Distances measured in the direction of reflected light are positive.",
        ],
        rubric: rubric([
          criterion("a", 1, "Finds focal length magnitude $16$ cm."),
          criterion("b", 1, "Writes $f=+16$ cm."),
          criterion("c", 1, "Explains that focus of a convex mirror lies behind the mirror in the positive direction."),
        ]),
        commonErrors: [
          "Writing $32$ cm as the focal length.",
          "Making convex-mirror focal length negative.",
        ],
        workedSolution: [
          solutionPart("a", "The focal length magnitude is half the radius of curvature.", L`f=\frac R2=\frac{32}{2}=16\text{ cm}`),
          solutionPart("b", "For a convex mirror, $f=+16$ cm."),
          solutionPart("c", "The focus is behind the mirror, which is positive by the Cartesian sign convention for mirrors."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "A concave mirror has focal length $15$ cm. An object is placed $20$ cm in front of it.",
        difficulty: 4,
        skillTags: ["mirror_formula", "magnification", "interpretation"],
        parts: [
          part("a", "Find the image distance.", 2),
          part("b", "Find the magnification.", 1),
          part("c", "State the image nature and size.", 2),
        ],
        hints: [
          "Use $f=-15$ cm and $u=-20$ cm.",
          "Apply $1/f=1/v+1/u$.",
          "Use $m=-v/u$ to interpret size and orientation.",
        ],
        rubric: rubric([
          criterion("a", 2, "Calculates $v=-60$ cm."),
          criterion("b", 1, "Calculates $m=-3$."),
          criterion("c", 1, "States image is real and inverted."),
          criterion("c", 1, "States image is enlarged three times."),
        ]),
        commonErrors: [
          "Using $f=+15$ cm for a concave mirror.",
          "Forgetting that negative magnification means inverted.",
        ],
        workedSolution: [
          solutionPart("a", "Here $f=-15$ cm and $u=-20$ cm. From $\\frac1f=\\frac1v+\\frac1u$, $-\\frac1{15}=\\frac1v-\\frac1{20}$, so $\\frac1v=-\\frac1{60}$ and $v=-60$ cm.", L`v=-60\text{ cm}`),
          solutionPart("b", "$m=-v/u=-(-60)/(-20)=-3$.", L`m=-3`),
          solutionPart("c", "The image is real and inverted because it forms in front of the mirror and $m$ is negative. It is enlarged three times because $|m|=3$."),
        ],
      },
    ],
  },
  {
    topicCode: "3.3",
    title: "Refraction and Refractive Index",
    subtopic:
      "Laws of refraction, bending of light, refractive index, glass slab and apparent depth reasoning.",
    mc: [
      {
        questionLatex:
          "A ray of light travels from air into glass at an oblique angle. It bends",
        difficulty: 2,
        skillTags: ["refraction", "denser_medium"],
        choices: [
          wrong("away from the normal because glass is optically denser", "Entering an optically denser medium bends the ray towards the normal."),
          wrong("along the surface because speed becomes zero", "The ray continues through glass with lower speed, not zero speed."),
          wrong("without changing direction for every angle of incidence", "Direction changes except for normal incidence; bending is the visible evidence of refraction."),
          correct("towards the normal because its speed decreases"),
        ],
        hints: [
          "Air to glass means rarer to denser medium.",
          "Speed of light decreases in glass.",
          "The refracted ray bends towards the normal.",
        ],
        solution: [
          step(1, "Glass is optically denser than air, so light slows down on entering it."),
          step(2, "For oblique incidence from rarer to denser medium, the ray bends towards the normal."),
        ],
      },
      {
        questionLatex:
          "The speed of light in a transparent medium is $2.0\\times10^8\\,\\text{m/s}$. Taking speed of light in vacuum as $3.0\\times10^8\\,\\text{m/s}$, the refractive index is",
        difficulty: 3,
        skillTags: ["refractive_index", "numerical"],
        choices: [
          wrong("$0.67$", "This uses medium speed divided by vacuum speed; refractive index is $c/v$."),
          correct("$1.5$"),
          wrong("$2.0$", "This treats the medium speed itself as the index; refractive index is the ratio $c/v$."),
          wrong("$5.0$", "This comes from adding the speeds instead of taking the ratio."),
        ],
        hints: [
          "Use $n=c/v$.",
          "Substitute $3.0\\times10^8$ and $2.0\\times10^8$.",
          "The powers of ten cancel.",
        ],
        solution: [
          step(1, "Use refractive index formula.", L`n=\frac cv`),
          step(2, "Substitute values.", L`n=\frac{3.0\times10^8}{2.0\times10^8}=1.5`),
        ],
      },
      {
        questionLatex:
          "Assertion (A): A pencil partly dipped in water appears bent at the water surface. Reason (R): Light from the part under water changes direction while passing from water to air.",
        difficulty: 3,
        skillTags: ["assertion_reason", "refraction", "apparent_position"],
        choices: [
          correct("Both A and R are true, and R correctly explains A."),
          wrong("Both A and R are true, but R does not explain A.", "The change in direction at the water-air surface is the reason for apparent bending."),
          wrong("A is true, but R is false.", "R is the basic refraction explanation: speed changes in the second medium, so the ray bends."),
          wrong("A is false, but R is true.", "The apparent bending is a standard observation due to refraction."),
        ],
        hints: [
          "The submerged part is seen through a water-air boundary.",
          "Refraction changes the apparent position.",
          "The reason explains the observation.",
        ],
        solution: [
          step(1, "Light from the underwater part refracts at the water-air surface."),
          step(2, "The apparent position shifts, so the pencil appears bent."),
        ],
      },
      {
        questionLatex:
          "For a ray passing through a rectangular glass slab with parallel faces, the emergent ray is usually",
        difficulty: 2,
        skillTags: ["glass_slab", "emergent_ray"],
        choices: [
          wrong("perpendicular to the incident ray", "The emergent ray is not generally perpendicular to the incident ray."),
          wrong("convergent at the second surface", "A rectangular slab does not focus the ray; its parallel faces make the emergent ray parallel to the incident ray."),
          correct("parallel to the incident ray but laterally displaced"),
          wrong("reflected back along the same path for every angle", "That describes neither ordinary slab refraction nor lateral shift; the ray emerges forward and parallel."),
        ],
        hints: [
          "The two faces of the slab are parallel.",
          "The ray bends at both surfaces.",
          "The final direction matches the incident direction but the path shifts sideways.",
        ],
        solution: [
          step(1, "At the first surface the ray bends towards the normal; at the second it bends away from the normal."),
          step(2, "Because the slab faces are parallel, the emergent ray is parallel to the incident ray but laterally displaced."),
        ],
      },
      {
        questionLatex:
          "A coin at the bottom of a beaker appears raised when viewed from above after water is poured in. The main reason is",
        difficulty: 3,
        skillTags: ["apparent_depth", "refraction"],
        choices: [
          wrong("reflection from the coin becomes stronger", "The apparent rise is due to refraction at the water-air surface, not stronger reflection alone."),
          wrong("water magnifies the actual thickness of the coin", "The physical coin is unchanged; its apparent position changes."),
          wrong("light travels in a curve inside water", "In a uniform medium light travels in straight lines; it changes direction at the boundary."),
          correct("rays from the coin bend away from the normal as they pass from water to air"),
        ],
        hints: [
          "The observer sees rays after they emerge into air.",
          "Water to air is denser to rarer.",
          "The rays bend away from normal and appear to come from a raised point.",
        ],
        solution: [
          step(1, "Light from the coin travels from water to air."),
          step(2, "It bends away from the normal, so the backward extensions of rays meet at a raised apparent position."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Define absolute refractive index of a medium.",
        difficulty: 1,
        skillTags: ["refractive_index_definition"],
        parts: [part("a", "Write the definition or formula.", 1)],
        hints: [
          "It compares speed in vacuum and speed in the medium.",
          "Use $c$ and $v$.",
          "$n=c/v$.",
        ],
        rubric: rubric([
          criterion("a", 1, "Defines refractive index as ratio of speed of light in vacuum to speed in the medium."),
        ]),
        commonErrors: [
          "Writing $v/c$ instead of $c/v$.",
          "Defining it as density of the medium.",
        ],
        workedSolution: [
          solutionPart("a", "Absolute refractive index is the ratio of speed of light in vacuum to speed of light in the medium.", L`n=\frac cv`),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "A ray enters a rectangular glass slab obliquely and emerges from the other side. Explain why the emergent ray is parallel to the incident ray but shifted sideways.",
        difficulty: 3,
        skillTags: ["glass_slab", "refraction_explanation"],
        figure: glassSlabFigure,
        parts: [
          part("a", "State how the ray bends at the first surface.", 1),
          part("b", "State how it bends at the second surface.", 1),
          part("c", "Explain the final direction and lateral shift.", 1),
        ],
        hints: [
          "Air to glass: ray bends towards normal.",
          "Glass to air: ray bends away from normal.",
          "The faces are parallel, so the final ray is parallel but displaced.",
        ],
        rubric: rubric([
          criterion("a", 1, "States ray bends towards the normal at air-glass surface."),
          criterion("b", 1, "States ray bends away from the normal at glass-air surface."),
          criterion("c", 1, "Explains emergent ray is parallel to incident ray with lateral displacement due to parallel faces."),
        ]),
        commonErrors: [
          "Saying the emergent ray follows the original line with no displacement.",
          "Reversing towards-normal and away-from-normal bending.",
        ],
        workedSolution: [
          solutionPart("a", "At the air-glass surface, light enters an optically denser medium and bends towards the normal."),
          solutionPart("b", "At the glass-air surface, it enters an optically rarer medium and bends away from the normal."),
          solutionPart("c", "Since the opposite faces of the slab are parallel, the emergent ray becomes parallel to the incident ray, but its path is shifted sideways."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "A student shines the same laser beam through water, glass and diamond. The measured speeds are highest in water and lowest in diamond.",
        difficulty: 3,
        skillTags: ["refractive_index_case", "speed_of_light"],
        parts: [
          part("a", "Which medium has the greatest refractive index?", 1),
          part("b", "Explain using the relation between speed and refractive index.", 2),
          part("c", "If light enters diamond from air obliquely, will it bend towards or away from the normal?", 1),
        ],
        hints: [
          "Refractive index is inversely related to speed in the medium.",
          "Lowest speed means highest refractive index.",
          "Air to diamond is rarer to denser.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies diamond."),
          criterion("b", 2, "Uses $n=c/v$ to explain that lower speed gives higher refractive index."),
          criterion("c", 1, "States ray bends towards the normal."),
        ]),
        commonErrors: [
          "Thinking greater speed means greater refractive index.",
          "Saying a denser medium always bends light away from the normal.",
        ],
        workedSolution: [
          solutionPart("a", "Diamond has the greatest refractive index."),
          solutionPart("b", "Since $n=c/v$, a smaller speed $v$ in the medium gives a larger value of $n$."),
          solutionPart("c", "From air to diamond, the ray goes from rarer to denser medium, so it bends towards the normal."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Light travels in a medium at $2.25\\times10^8\\,\\text{m/s}$. Calculate its refractive index. Take $c=3.0\\times10^8\\,\\text{m/s}$.",
        difficulty: 3,
        skillTags: ["refractive_index_numerical"],
        parts: [
          part("a", "Write the formula.", 1),
          part("b", "Calculate the refractive index.", 2),
        ],
        hints: [
          "Use $n=c/v$.",
          "The powers of ten cancel.",
          "$3.0/2.25=4/3$.",
        ],
        rubric: rubric([
          criterion("a", 1, "Writes $n=c/v$."),
          criterion("b", 1, "Substitutes values correctly."),
          criterion("b", 1, "Obtains $n=1.33$ approximately."),
        ]),
        commonErrors: [
          "Using $v/c$ and getting less than 1.",
          "Adding speeds instead of taking a ratio.",
        ],
        workedSolution: [
          solutionPart("a", "Absolute refractive index is $n=c/v$."),
          solutionPart("b", "Substitute $c=3.0\\times10^8$ and $v=2.25\\times10^8$.", L`n=\frac{3.0\times10^8}{2.25\times10^8}=1.33`),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "Explain refraction using the examples of a glass slab and apparent depth of a coin in water.",
        difficulty: 4,
        skillTags: ["refraction_explanation", "glass_slab", "apparent_depth"],
        parts: [
          part("a", "State the cause of refraction at a boundary.", 1),
          part("b", "Explain lateral displacement in a glass slab.", 2),
          part("c", "Explain why a coin in water appears raised.", 2),
        ],
        hints: [
          "Refraction occurs because speed changes when medium changes.",
          "A slab has two parallel refracting surfaces.",
          "For the coin, rays go from water to air and bend away from normal.",
        ],
        rubric: rubric([
          criterion("a", 1, "States refraction occurs due to change in speed of light between media."),
          criterion("b", 2, "Explains bending at both parallel slab surfaces and lateral displacement."),
          criterion("c", 2, "Explains water-air refraction and raised apparent position of coin."),
        ]),
        commonErrors: [
          "Explaining apparent depth only by reflection.",
          "Saying light curves continuously inside the slab.",
        ],
        workedSolution: [
          solutionPart("a", "Refraction occurs because the speed of light changes when it passes from one transparent medium to another."),
          solutionPart("b", "In a glass slab, the ray bends towards the normal on entering glass and away from the normal on leaving. Because the slab faces are parallel, the emergent ray is parallel to the incident ray but laterally displaced."),
          solutionPart("c", "Light from the coin travels from water to air and bends away from the normal. The eye traces the rays backward in straight lines, so the coin appears raised."),
        ],
      },
    ],
  },
  {
    topicCode: "3.4",
    title: "Spherical Lenses and Power",
    subtopic:
      "Convex and concave lenses, lens formula, magnification, power of a lens and image interpretation.",
    mc: [
      {
        questionLatex:
          "A convex lens has focal length $12$ cm. An object is placed $18$ cm in front of it. The image distance is",
        difficulty: 3,
        skillTags: ["lens_formula", "convex_lens_numerical"],
        choices: [
          correct("$+36$ cm"),
          wrong("$-36$ cm", "For this real image on the other side of a convex lens, $v$ is positive."),
          wrong("$+12$ cm", "This repeats the focal length as the image distance; the lens formula gives a different image distance."),
          wrong("$-12$ cm", "This has the wrong sign and uses focal length as image distance."),
        ],
        hints: [
          "For a convex lens, $f=+12$ cm and $u=-18$ cm.",
          "Use $1/f=1/v-1/u$.",
          "Solve for $v$.",
        ],
        solution: [
          step(1, "Use the lens formula.", L`\frac1f=\frac1v-\frac1u`),
          step(2, "Substitute $f=+12$ cm and $u=-18$ cm.", L`\frac1{12}=\frac1v+\frac1{18}`),
          step(3, "So $1/v=1/36$ and $v=+36$ cm.", L`v=+36\text{ cm}`),
        ],
      },
      {
        questionLatex:
          "A concave lens has focal length $-25$ cm. Its power is",
        difficulty: 2,
        skillTags: ["power_of_lens", "concave_lens"],
        choices: [
          wrong("$+4$ D", "A concave lens has negative focal length and negative power."),
          wrong("$-0.04$ D", "Focal length must be converted to metres before using $P=1/f$."),
          correct("$-4$ D"),
          wrong("$+0.04$ D", "This has the wrong sign and wrong unit conversion; convert centimetres to metres before using $P=1/f$."),
        ],
        hints: [
          "Convert $-25$ cm to metres.",
          "$-25$ cm is $-0.25$ m.",
          "Power $P=1/f$ in metres.",
        ],
        solution: [
          step(1, "Convert focal length to metres.", L`f=-25\text{ cm}=-0.25\text{ m}`),
          step(2, "Use power formula.", L`P=\frac1f=\frac1{-0.25}=-4\text{ D}`),
        ],
      },
      {
        questionLatex:
          "An object is placed at $2F$ in front of a convex lens. The image formed is",
        difficulty: 2,
        skillTags: ["convex_lens", "image_formation"],
        choices: [
          wrong("virtual, erect and enlarged on the same side", "That occurs when the object is between optical centre and focus."),
          correct("real, inverted and same size at $2F$ on the other side"),
          wrong("real, inverted and diminished between $F$ and $2F$", "That is for an object beyond $2F$, not an object placed exactly at $2F$."),
          wrong("virtual, erect and diminished between lens and focus", "That is the usual concave-lens image, but the question uses a convex lens."),
        ],
        hints: [
          "This is the lens analogue of object at $C$ for a mirror.",
          "At $2F$, the image forms at $2F$ on the other side.",
          "It is real, inverted and same size.",
        ],
        solution: [
          step(1, "For a convex lens, an object at $2F$ forms image at $2F$ on the other side."),
          step(2, "The image is real, inverted and of the same size."),
        ],
      },
      {
        questionLatex:
          "A lens always forms a virtual, erect and diminished image for a real object. The lens is",
        difficulty: 2,
        skillTags: ["concave_lens", "image_nature"],
        choices: [
          wrong("convex lens", "A convex lens can form real images and can form enlarged virtual images for close objects."),
          wrong("plane glass slab", "A glass slab does not form the described lens image; it mainly gives lateral displacement."),
          wrong("convex mirror", "This is a mirror, not a lens, and it does not have the lens power asked in the question."),
          correct("concave lens"),
        ],
        hints: [
          "The question asks for a lens.",
          "A diverging lens always forms a virtual, erect, diminished image.",
          "A diverging lens is concave.",
        ],
        solution: [
          step(1, "A concave lens is a diverging lens."),
          step(2, "For a real object it always gives a virtual, erect and diminished image."),
        ],
      },
      {
        questionLatex:
          "A convex lens forms a real image of the same size as the object. The object is placed",
        difficulty: 2,
        skillTags: ["convex_lens_image_table"],
        choices: [
          correct("at $2F$"),
          wrong("between $F$ and $2F$", "This gives a real, inverted, enlarged image beyond $2F$."),
          wrong("at $F$", "The object is at $F$; for a convex lens in this case, the refracted rays are parallel and the image is at infinity."),
          wrong("between optical centre and $F$", "This object position gives a virtual, erect and enlarged image on the same side of the lens."),
        ],
        hints: [
          "Same-size image is a special convex-lens case.",
          "The image also forms at $2F$ on the other side.",
          "The object is at $2F$.",
        ],
        solution: [
          step(1, "A convex lens gives a real same-size inverted image when the object is at $2F$."),
          step(2, "The image also forms at $2F$ on the other side."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Write the SI unit of power of a lens.",
        difficulty: 1,
        skillTags: ["power_of_lens_unit"],
        parts: [part("a", "Name the SI unit.", 1)],
        hints: [
          "Power is reciprocal of focal length in metres.",
          "Its unit is commonly used in spectacles.",
          "The unit is dioptre.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names dioptre or D."),
        ]),
        commonErrors: [
          "Writing metre as the unit of power.",
          "Writing watt, which is not used for optical power.",
        ],
        workedSolution: [
          solutionPart("a", "The SI unit of power of a lens is dioptre, written as D."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "The figure shows an object at $2F$ of a convex lens. State the position, nature and size of the image.",
        difficulty: 3,
        skillTags: ["convex_lens_ray_diagram", "image_formation"],
        figure: convexLensObjectFigure,
        parts: [
          part("a", "State the image position.", 1),
          part("b", "State the nature of the image.", 1),
          part("c", "State the relative size.", 1),
        ],
        hints: [
          "Object at $2F$ is a standard convex-lens case.",
          "The image forms at $2F$ on the other side.",
          "It is real, inverted and same size.",
        ],
        rubric: rubric([
          criterion("a", 1, "States image forms at $2F$ on the other side of the lens."),
          criterion("b", 1, "States image is real and inverted."),
          criterion("c", 1, "States image is same size as the object."),
        ]),
        commonErrors: [
          "Putting the image between $F$ and $2F$.",
          "Calling the real image erect.",
        ],
        workedSolution: [
          solutionPart("a", "The image forms at $2F$ on the other side of the convex lens."),
          solutionPart("b", "It is real and inverted."),
          solutionPart("c", "It is the same size as the object."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "An optician has lenses marked $+2.0$ D, $-1.5$ D and $+4.0$ D.",
        difficulty: 3,
        skillTags: ["power_of_lens_case", "focal_length"],
        parts: [
          part("a", "Which marked lenses are convex?", 1),
          part("b", "Find the focal length of the $+2.0$ D lens.", 1),
          part("c", "Which lens has the smallest focal length magnitude?", 2),
        ],
        hints: [
          "Positive power means convex lens.",
          "Use $P=1/f$ with $f$ in metres.",
          "Greater power magnitude means smaller focal length magnitude.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies $+2.0$ D and $+4.0$ D as convex lenses."),
          criterion("b", 1, "Finds $f=0.5$ m for $+2.0$ D."),
          criterion("c", 2, "Identifies $+4.0$ D and explains it has largest power magnitude among the options."),
        ]),
        commonErrors: [
          "Thinking negative power means stronger convex lens.",
          "Using centimetres directly in $P=1/f$.",
        ],
        workedSolution: [
          solutionPart("a", "Convex lenses have positive power, so $+2.0$ D and $+4.0$ D are convex."),
          solutionPart("b", "$P=1/f$, so $f=1/2.0=0.5$ m.", L`f=0.5\text{ m}`),
          solutionPart("c", "The $+4.0$ D lens has the greatest power magnitude, so it has the smallest focal length magnitude."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "An object is placed $30$ cm in front of a concave lens of focal length $20$ cm. Find the image distance using sign convention.",
        difficulty: 3,
        skillTags: ["concave_lens_formula", "numerical"],
        parts: [
          part("a", "Write signed values of $u$ and $f$.", 1),
          part("b", "Calculate $v$.", 2),
        ],
        hints: [
          "A concave lens has negative focal length.",
          "A real object in front has $u=-30$ cm.",
          "Use $1/f=1/v-1/u$.",
        ],
        rubric: rubric([
          criterion("a", 1, "Writes $u=-30$ cm and $f=-20$ cm."),
          criterion("b", 1, "Substitutes correctly into lens formula."),
          criterion("b", 1, "Obtains $v=-12$ cm."),
        ]),
        commonErrors: [
          "Using mirror formula instead of lens formula.",
          "Making concave-lens focal length positive.",
        ],
        workedSolution: [
          solutionPart("a", "For a real object, $u=-30$ cm. For a concave lens, $f=-20$ cm.", L`u=-30,\quad f=-20`),
          solutionPart("b", "Using $\\frac1f=\\frac1v-\\frac1u$, $-\\frac1{20}=\\frac1v+\\frac1{30}$, so $\\frac1v=-\\frac1{12}$ and $v=-12$ cm.", L`v=-12\text{ cm}`),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "A convex lens of focal length $15$ cm forms a sharp image of an object placed $40$ cm in front of it.",
        difficulty: 4,
        skillTags: ["convex_lens_formula", "magnification", "image_nature"],
        parts: [
          part("a", "Find the image distance.", 2),
          part("b", "Find the magnification.", 1),
          part("c", "State the nature and size of the image.", 2),
        ],
        hints: [
          "Use $f=+15$ cm and $u=-40$ cm.",
          "Lens formula is $1/f=1/v-1/u$.",
          "Lens magnification is $m=v/u$.",
        ],
        rubric: rubric([
          criterion("a", 2, "Calculates $v=+24$ cm."),
          criterion("b", 1, "Calculates $m=-\\frac35$ or $-0.6$."),
          criterion("c", 1, "States image is real and inverted."),
          criterion("c", 1, "States image is diminished to $0.6$ times the object size."),
        ]),
        commonErrors: [
          "Using mirror magnification $-v/u$ for a lens.",
          "Calling a negative magnification erect.",
        ],
        workedSolution: [
          solutionPart("a", "$\\frac1{15}=\\frac1v-\\frac1{-40}=\\frac1v+\\frac1{40}$, so $\\frac1v=\\frac1{15}-\\frac1{40}=\\frac1{24}$ and $v=+24$ cm.", L`v=+24\text{ cm}`),
          solutionPart("b", "For a lens, $m=v/u=24/(-40)=-\\frac35=-0.6$.", L`m=-\frac35`),
          solutionPart("c", "The image is real and inverted because $v$ is positive and $m$ is negative. It is diminished because $|m|=0.6<1$."),
        ],
      },
    ],
  },
  {
    topicCode: "3.5",
    title: "Human Eye, Prism and Scattering",
    subtopic:
      "Human eye, accommodation, myopia, hypermetropia, prism refraction, dispersion and scattering applications.",
    mc: [
      {
        questionLatex:
          "In the human eye, the power of accommodation is mainly due to change in",
        difficulty: 2,
        skillTags: ["human_eye", "accommodation"],
        choices: [
          wrong("retina position", "The retina does not move forward and backward for focusing."),
          correct("curvature and focal length of the eye lens"),
          wrong("colour of the iris", "Iris controls pupil size, not the focusing power directly."),
          wrong("distance between cornea and retina only", "The eye does not mainly focus by changing this distance; the ciliary muscles change the lens curvature."),
        ],
        hints: [
          "Accommodation means focusing near and far objects.",
          "The ciliary muscles adjust the lens.",
          "Changing lens curvature changes focal length.",
        ],
        solution: [
          step(1, "Ciliary muscles change the curvature of the eye lens."),
          step(2, "This changes its focal length and focusing power."),
        ],
      },
      {
        questionLatex:
          "A student can see nearby objects clearly but distant objects appear blurred. The defect and correcting lens are",
        difficulty: 2,
        skillTags: ["myopia", "corrective_lens"],
        choices: [
          wrong("hypermetropia, concave lens", "Hypermetropia affects near vision and is corrected by a convex lens."),
          wrong("myopia, convex lens", "Myopia is the correct defect, but its correction uses a concave lens, not a convex lens."),
          wrong("hypermetropia, cylindrical lens", "Cylindrical lenses are associated with astigmatism, not this standard Class 10 case."),
          correct("myopia, concave lens"),
        ],
        hints: [
          "Near clear, far blurred means short-sightedness.",
          "Short-sightedness is myopia.",
          "A concave lens diverges rays before they enter the eye.",
        ],
        solution: [
          step(1, "The student has difficulty seeing distant objects, so the defect is myopia."),
          step(2, "Myopia is corrected by a concave lens."),
        ],
      },
      {
        questionLatex:
          "The figure shows parallel rays focusing before the retina. Which correction is suitable?",
        difficulty: 3,
        skillTags: ["myopia_ray_diagram", "eye_defect"],
        figure: eyeDefectFigure,
        choices: [
          wrong("a convex lens, because the rays must be converged further", "The rays are already focusing too early, so they must be diverged before entering the eye."),
          wrong("a plane glass slab, because it only shifts rays sideways", "A slab shifts the ray sideways but does not make the rays diverge enough to move the focus back to the retina."),
          correct("a concave lens, because it diverges the rays before they enter the eye"),
          wrong("no lens, because the image is already on the retina", "The diagram shows the focus before the retina, not on it."),
        ],
        hints: [
          "Focus before retina indicates myopia.",
          "The correction must move the focus backward onto the retina.",
          "A concave lens diverges incoming rays.",
        ],
        solution: [
          step(1, "The rays focus before the retina, which indicates myopia."),
          step(2, "A concave lens diverges the rays so the eye lens focuses them on the retina."),
        ],
      },
      {
        questionLatex:
          "White light splits into different colours through a prism because",
        difficulty: 3,
        skillTags: ["dispersion", "prism"],
        choices: [
          correct("different colours travel with different speeds in glass and refract by different amounts"),
          wrong("the prism absorbs white light and emits new colours", "The colours are components of white light; they are not newly emitted by the prism."),
          wrong("all colours have exactly the same refractive index in glass", "If refractive index were exactly the same for all colours, dispersion would not occur."),
          wrong("reflection inside the prism destroys red light first", "Dispersion is due to refraction, not destruction of colours."),
        ],
        hints: [
          "White light is a mixture of colours.",
          "The refractive index of glass depends slightly on colour.",
          "Different deviations separate the colours.",
        ],
        solution: [
          step(1, "White light contains many colours."),
          step(2, "In glass, different colours have slightly different speeds and refractive indices, so they bend by different amounts."),
        ],
      },
      {
        questionLatex:
          "A fine beam of sunlight becomes visible in a dusty room. This is mainly due to",
        difficulty: 2,
        skillTags: ["scattering", "tyndall_effect"],
        choices: [
          wrong("total internal reflection inside dust particles", "The beam visibility here is due to scattering, not total internal reflection."),
          wrong("dispersion by each dust particle into a spectrum", "A visible beam in dust does not require spectrum formation."),
          correct("scattering of light by small suspended particles"),
          wrong("regular reflection by a smooth surface", "Dust particles scatter light irregularly in many directions."),
        ],
        hints: [
          "The dust particles redirect light into your eyes.",
          "This is not mirror-like reflection.",
          "It is scattering, also related to Tyndall effect.",
        ],
        solution: [
          step(1, "Dust particles suspended in air scatter light from the beam."),
          step(2, "Some scattered light reaches the eye, making the beam visible."),
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex:
          "Name the eye defect corrected by a concave lens.",
        difficulty: 1,
        skillTags: ["myopia", "corrective_lens"],
        parts: [part("a", "Name the defect.", 1)],
        hints: [
          "A concave lens diverges rays.",
          "It is used when distant objects are blurred.",
          "The defect is myopia.",
        ],
        rubric: rubric([
          criterion("a", 1, "Names myopia or short-sightedness."),
        ]),
        commonErrors: [
          "Writing hypermetropia, which needs a convex lens.",
          "Writing cataract, which is not corrected by a concave lens.",
        ],
        workedSolution: [
          solutionPart("a", "A concave lens is used to correct myopia, also called short-sightedness."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "The figure shows an eye model in which rays focus before the retina. Identify the defect and explain the correction.",
        difficulty: 3,
        skillTags: ["myopia", "ray_diagram", "corrective_lens"],
        figure: eyeDefectFigure,
        parts: [
          part("a", "Identify the defect.", 1),
          part("b", "Name the correcting lens.", 1),
          part("c", "Explain how the lens helps.", 1),
        ],
        hints: [
          "Focus before retina means the eye is too converging for distant rays.",
          "The correction must reduce convergence before the rays enter the eye.",
          "Use a concave lens.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies myopia."),
          criterion("b", 1, "Names concave lens."),
          criterion("c", 1, "Explains that the lens diverges rays so the final image forms on the retina."),
        ]),
        commonErrors: [
          "Calling the defect hypermetropia.",
          "Using a convex lens, which would increase convergence.",
        ],
        workedSolution: [
          solutionPart("a", "The defect is myopia."),
          solutionPart("b", "It is corrected using a concave lens."),
          solutionPart("c", "The concave lens diverges incoming rays slightly, so the eye lens focuses them on the retina instead of before it."),
        ],
      },
      {
        responseType: "case",
        questionLatex:
          "An eye specialist examines two students. Student P cannot see the blackboard clearly from the back bench. Student Q holds a book far away to read it comfortably.",
        difficulty: 3,
        skillTags: ["eye_defects_case", "myopia", "hypermetropia"],
        parts: [
          part("a", "Identify the defect in student P.", 1),
          part("b", "Identify the defect in student Q.", 1),
          part("c", "Name the correcting lens for each.", 2),
        ],
        hints: [
          "Blackboard difficulty means distant vision problem.",
          "Holding a book far away means near vision problem.",
          "Myopia uses concave lens; hypermetropia uses convex lens.",
        ],
        rubric: rubric([
          criterion("a", 1, "Identifies P as myopic."),
          criterion("b", 1, "Identifies Q as hypermetropic."),
          criterion("c", 1, "States P needs concave lens."),
          criterion("c", 1, "States Q needs convex lens."),
        ]),
        commonErrors: [
          "Swapping myopia and hypermetropia.",
          "Using concave lens for both defects.",
        ],
        workedSolution: [
          solutionPart("a", "Student P has myopia because distant objects are blurred."),
          solutionPart("b", "Student Q has hypermetropia because near objects are difficult to see clearly."),
          solutionPart("c", "P needs a concave lens. Q needs a convex lens."),
        ],
      },
      {
        responseType: "saq",
        questionLatex:
          "Explain dispersion of white light by a glass prism.",
        difficulty: 3,
        skillTags: ["dispersion", "prism"],
        figure: prismDispersionFigure,
        parts: [
          part("a", "State what dispersion means.", 1),
          part("b", "Explain why a prism disperses white light.", 2),
        ],
        hints: [
          "White light contains different colours.",
          "Different colours refract by different amounts in glass.",
          "This separates the colours into a spectrum.",
        ],
        rubric: rubric([
          criterion("a", 1, "Defines dispersion as splitting of white light into constituent colours."),
          criterion("b", 1, "States different colours have different refractive indices/speeds in glass."),
          criterion("b", 1, "Links different refraction to separation into a spectrum."),
        ]),
        commonErrors: [
          "Saying the prism creates colours from nothing.",
          "Explaining dispersion only as reflection.",
        ],
        workedSolution: [
          solutionPart("a", "Dispersion is the splitting of white light into its constituent colours."),
          solutionPart("b", "In glass, different colours travel with different speeds and have different refractive indices. Therefore they refract by different amounts in the prism and separate into a spectrum."),
        ],
      },
      {
        responseType: "laq",
        questionLatex:
          "A teacher connects eye defects, prism dispersion and scattering as examples of light changing direction or spreading.",
        difficulty: 4,
        skillTags: ["human_eye", "dispersion", "scattering", "concept_integration"],
        parts: [
          part("a", "Explain myopia and its correction.", 2),
          part("b", "Explain why a prism produces a spectrum from white light.", 2),
          part("c", "Explain how scattering makes a narrow light beam visible in a dusty room.", 1),
        ],
        hints: [
          "For myopia, image forms before the retina.",
          "For prism dispersion, different colours refract differently.",
          "For dust, small particles scatter light into the eye.",
        ],
        rubric: rubric([
          criterion("a", 1, "States in myopia distant objects are blurred/image forms before retina."),
          criterion("a", 1, "States concave lens correction and its diverging action."),
          criterion("b", 2, "Explains dispersion using different refractive indices/speeds of colours in prism glass."),
          criterion("c", 1, "Explains visibility of beam by scattering from suspended particles."),
        ]),
        commonErrors: [
          "Using convex lens for myopia.",
          "Saying prism colours are produced by chemical change.",
          "Explaining a dusty light beam as regular reflection.",
        ],
        workedSolution: [
          solutionPart("a", "In myopia, distant objects are not seen clearly because rays focus before the retina. A concave lens diverges incoming rays so the eye lens focuses them on the retina."),
          solutionPart("b", "White light is made of different colours. In a prism, different colours have different speeds and refractive indices, so they deviate by different amounts and form a spectrum."),
          solutionPart("c", "Dust particles scatter light from the beam in different directions. Some scattered light reaches the eye, so the beam becomes visible."),
        ],
      },
    ],
  },
];

export const naturalPhenomenaXTopics: Topic[] = topicSeeds.map(makeTopic);
