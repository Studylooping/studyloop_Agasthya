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
import { calibrateCbseChemistryDifficulty } from "../../../lib/content/difficulty-calibration.mjs";

const COURSE = "cbse-chemistry-11";
const UNIT = "u2-structure-of-atom";
const VERSION = "0.1.7";
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
  mc: readonly McSeed[];
  constructed: readonly ConstructedSeed[];
}

function topicSlug(topicCode: string) {
  return topicCode.replace(".", "-");
}

function hints(items: readonly [string, string, string]): Hint[] {
  return items.map((body, index) => ({
    level: (index + 1) as Hint["level"],
    body: repairInlineLatex(body),
  }));
}

function repairInlineLatex(text: string): string {
  return text.replace(/\$[^$]*\$/g, (segment) =>
    segment
      .replace(/\t(?=imes|ext)/g, "\\t")
      .replace(/\r(?=ightleftharpoons|ightarrow)/g, "\\r")
      .replace(/\f(?=rac)/g, "\\f")
      .replace(/,mathrm/g, "\\,\\mathrm")
      .replace(
        /(^|[^\\])\b(mathrm|text|frac|log|Delta|alpha|lambda|nu|psi|circ|rightleftharpoons|rightarrow|approx)\b/g,
        "$1\\$2",
      ),
  );
}

function repairSolutionStep(step: SolutionStep): SolutionStep {
  return {
    ...step,
    explanation: repairInlineLatex(step.explanation),
    ...(step.math ? { math: repairInlineLatex(step.math) } : {}),
  };
}

function repairPart(part: FrqPart): FrqPart {
  return { ...part, promptMarkdown: repairInlineLatex(part.promptMarkdown) };
}

function repairRubric(rubric: FrqRubric): FrqRubric {
  return {
    maxPoints: rubric.maxPoints,
    criteria: rubric.criteria.map((criterion) => ({
      ...criterion,
      description: repairInlineLatex(criterion.description),
    })),
  };
}

function repairWorkedSolution(part: FrqSolutionPart): FrqSolutionPart {
  return {
    ...part,
    explanation: repairInlineLatex(part.explanation),
    ...(part.math ? { math: repairInlineLatex(part.math) } : {}),
  };
}

function fallbackWrongRationale(seed: McSeed, seedLetter: McLetter): string {
  const choiceText = seed.choices[LETTERS.indexOf(seedLetter)];
  const correctText = seed.choices[LETTERS.indexOf(seed.correctLetter)];
  const keyStep = [...seed.solution].reverse().find((step) => step.math);
  const checkStep = keyStep?.math ? ` Recheck: $${keyStep.math}$.` : "";
  return `You chose ${choiceText}. Recheck the atomic model, quantum number, or electronic-configuration rule before choosing.${checkStep} The correct choice is ${correctText}.`;
}

function makeMc(meta: TopicMeta, seed: McSeed, index: number): McSingleItem {
  const unletteredChoices = LETTERS.map((seedLetter, choiceIndex) => {
    const isCorrect = seedLetter === seed.correctLetter;
    const fallbackRationale =
      seed.rationales[seedLetter] ?? fallbackWrongRationale(seed, seedLetter);
    return {
      text: repairInlineLatex(seed.choices[choiceIndex]),
      isCorrect,
      rationaleIfWrong: isCorrect ? null : repairInlineLatex(fallbackRationale),
      misconceptionTag: isCorrect
        ? null
        : (seed.misconceptionTags?.[seedLetter] ??
          "incorrect_cbse_class11_chemistry_atomic_structure_reasoning"),
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
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.mc.${String(index + 1).padStart(3, "0")}`,
    kind: "mc_single",
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbseChemistryDifficulty({
      difficulty: seed.difficulty,
      kind: "mc_single",
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "uses_a_rule_without_checking_the_model_or_allowed_quantum_numbers",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    choices,
    correctLetter,
    hintLadder: hints(seed.hints),
    workedSolution: seed.solution.map(repairSolutionStep),
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
    contentId: `${COURSE}.u2.t${topicSlug(meta.topicCode)}.${seed.responseType}.${String(index + 1).padStart(3, "0")}`,
    kind: "frq",
    responseType: seed.responseType,
    course: COURSE,
    unit: UNIT,
    topic: meta.topicCode,
    difficulty: calibrateCbseChemistryDifficulty({
      difficulty: seed.difficulty,
      kind: "frq",
      responseType: seed.responseType,
      questionLatex: seed.questionLatex,
    }),
    calculatorAllowed: seed.calculatorAllowed ?? false,
    skillTags: seed.skillTags,
    commonMisconceptions: seed.commonMisconceptions ?? [
      "states_the_final_value_without_showing_model_or_configuration_reasoning",
    ],
    questionLatex: repairInlineLatex(seed.questionLatex),
    ...(seed.figure ? { figure: seed.figure } : {}),
    parts: seed.parts.map(repairPart),
    hintLadder: hints(seed.hints),
    rubric: repairRubric(seed.rubric),
    commonErrors: seed.commonErrors.map(repairInlineLatex),
    workedSolution: seed.workedSolution.map(repairWorkedSolution),
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

function singlePart(
  letter: string,
  promptMarkdown: string,
  points: number,
): readonly FrqPart[] {
  return [{ letter, promptMarkdown, points }];
}

function singleRubric(
  part: string,
  points: number,
  description: string,
): FrqRubric {
  return {
    maxPoints: points,
    criteria: [{ part, points, description }],
  };
}

const cathodeRayFigure: ItemFigure = {
  type: "svg",
  title: "Cathode ray deflection",
  description:
    "A cathode ray beam passes between charged plates and bends toward the positive plate.",
  svg: `<svg viewBox="0 0 560 280" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="560" height="280" fill="#ffffff"/>
  <text x="280" y="32" text-anchor="middle" font-family="Arial" font-size="17" fill="#111827">Cathode ray tube observation</text>
  <rect x="52" y="74" width="456" height="140" rx="70" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
  <line x1="104" y1="144" x2="214" y2="144" stroke="#2563eb" stroke-width="4"/>
  <path d="M214 144 C282 144 314 104 382 92" fill="none" stroke="#2563eb" stroke-width="4"/>
  <polygon points="382,92 366,85 369,101" fill="#2563eb"/>
  <rect x="238" y="80" width="130" height="12" fill="#fecaca" stroke="#b91c1c" stroke-width="2"/>
  <rect x="238" y="188" width="130" height="12" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="2"/>
  <text x="303" y="73" text-anchor="middle" font-family="Arial" font-size="18" fill="#b91c1c">+</text>
  <text x="303" y="224" text-anchor="middle" font-family="Arial" font-size="20" fill="#1d4ed8">-</text>
  <text x="106" y="236" text-anchor="middle" font-family="Arial" font-size="14" fill="#475569">cathode</text>
  <text x="448" y="236" text-anchor="middle" font-family="Arial" font-size="14" fill="#475569">fluorescent screen</text>
</svg>`,
};

const hydrogenTransitionFigure: ItemFigure = {
  type: "svg",
  title: "Hydrogen atom transition",
  description:
    "Energy levels of hydrogen with a downward transition ending at n equals 2.",
  svg: `<svg viewBox="0 0 520 330" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="520" height="330" fill="#ffffff"/>
  <text x="260" y="30" text-anchor="middle" font-family="Arial" font-size="17" fill="#111827">Hydrogen energy levels</text>
  <line x1="110" y1="270" x2="410" y2="270" stroke="#334155" stroke-width="3"/>
  <line x1="130" y1="176" x2="390" y2="176" stroke="#334155" stroke-width="3"/>
  <line x1="150" y1="112" x2="370" y2="112" stroke="#334155" stroke-width="3"/>
  <line x1="170" y1="80" x2="350" y2="80" stroke="#334155" stroke-width="3"/>
  <text x="78" y="275" font-family="Arial" font-size="15" fill="#111827">n=1</text>
  <text x="96" y="181" font-family="Arial" font-size="15" fill="#111827">n=2</text>
  <text x="116" y="117" font-family="Arial" font-size="15" fill="#111827">n=3</text>
  <text x="136" y="85" font-family="Arial" font-size="15" fill="#111827">n=4</text>
  <line x1="280" y1="112" x2="280" y2="176" stroke="#dc2626" stroke-width="4"/>
  <polygon points="280,176 271,158 289,158" fill="#dc2626"/>
  <text x="302" y="148" font-family="Arial" font-size="14" fill="#7f1d1d">emission</text>
  <text x="260" y="308" text-anchor="middle" font-family="Arial" font-size="14" fill="#475569">Energy increases upward</text>
</svg>`,
};

const pOrbitalFigure: ItemFigure = {
  type: "svg",
  title: "Orbital with nodal plane",
  description:
    "A dumbbell-shaped orbital has two lobes separated by a nodal plane through the nucleus.",
  svg: `<svg viewBox="0 0 420 260" xmlns="http://www.w3.org/2000/svg" role="img">
  <rect width="420" height="260" fill="#ffffff"/>
  <text x="210" y="30" text-anchor="middle" font-family="Arial" font-size="17" fill="#111827">Orbital shape</text>
  <line x1="210" y1="56" x2="210" y2="220" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 6"/>
  <ellipse cx="155" cy="138" rx="72" ry="40" fill="#bfdbfe" stroke="#2563eb" stroke-width="3"/>
  <ellipse cx="265" cy="138" rx="72" ry="40" fill="#fecaca" stroke="#dc2626" stroke-width="3"/>
  <circle cx="210" cy="138" r="6" fill="#111827"/>
  <text x="210" y="238" text-anchor="middle" font-family="Arial" font-size="14" fill="#475569">nodal plane passes through nucleus</text>
</svg>`,
};

const topicSeeds: readonly TopicSeed[] = [
  {
    topicCode: "2.1",
    title: "Subatomic Particles and Atomic Models",
    subtopic:
      "Discovery of electron, proton and neutron; atomic number, mass number, isotopes, isobars, Thomson model and Rutherford model.",
    mc: [
      {
        questionLatex: L`In the cathode ray experiment shown, the beam bends toward the positive plate. The particles in the beam are therefore`,
        figure: cathodeRayFigure,
        difficulty: 2,
        skillTags: ["cathode_rays", "electron_discovery", "charge"],
        choices: [
          L`positively charged protons`,
          L`neutral atoms`,
          L`uncharged neutrons`,
          L`negatively charged electrons`,
        ],
        correctLetter: "D",
        rationales: {
          A: "A positively charged particle would be repelled by the positive plate, not attracted toward it.",
          B: "A neutral beam would not bend due to the electric field between the plates.",
          C: "Neutrons are neutral and were not the particles of cathode rays.",
        },
        hints: [
          "Opposite charges attract.",
          "The beam is attracted toward the positive plate.",
          "Cathode rays are streams of electrons.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The beam is deflected by an electric field, so it contains charged particles.",
            math: null,
          },
          {
            step: 2,
            explanation:
              "Since it bends toward the positive plate, the particles must carry negative charge.",
            math: L`\text{cathode ray particles}=\text{electrons}`,
          },
        ],
      },
      {
        questionLatex: L`In Rutherford's alpha-particle scattering experiment, most alpha particles passed through the gold foil without deflection. The strongest inference from this observation is that`,
        difficulty: 2,
        skillTags: ["rutherford_model", "gold_foil_experiment"],
        choices: [
          L`most of the atom is empty space`,
          L`the atom has no positive charge`,
          L`electrons are present inside the nucleus`,
          L`all positive charge is spread uniformly through the atom`,
        ],
        correctLetter: "A",
        rationales: {
          B: "Rutherford's experiment did show concentrated positive charge, but this inference comes from the rare large deflections.",
          C: "The experiment did not place electrons inside the nucleus.",
          D: "Uniformly spread positive charge is the Thomson model, which Rutherford's large-deflection data contradicted.",
        },
        hints: [
          "Most alpha particles did not meet a strong repulsive region.",
          "If matter filled the atom uniformly, frequent deflections would be expected.",
          "Rutherford inferred that the atom is mostly empty space with a tiny dense nucleus.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Most alpha particles passed straight through, so they encountered little matter or charge over most of the atom.",
            math: null,
          },
          {
            step: 2,
            explanation: "Therefore, most of the atom must be empty space.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`Which observation from the gold foil experiment could not be explained by Thomson's plum-pudding model?`,
        difficulty: 3,
        skillTags: ["atomic_models", "rutherford_limitation_of_thomson"],
        choices: [
          L`alpha particles have positive charge`,
          L`most alpha particles pass through undeflected`,
          L`atoms contain electrons`,
          L`a few alpha particles are deflected through very large angles`,
        ],
        correctLetter: "D",
        rationales: {
          A: "The charge of alpha particles is not the observation that falsified the Thomson model.",
          B: "Small or no deflection is not the strongest contradiction to a diffuse positive sphere.",
          C: "Thomson's model already included electrons.",
        },
        hints: [
          "Thomson's model had positive charge spread throughout the atom.",
          "A diffuse positive sphere cannot strongly repel a heavy alpha particle at a tiny point.",
          "Large-angle scattering implies a small, dense, positively charged nucleus.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Large-angle deflection requires a strong repulsive force in a very small region.",
            math: null,
          },
          {
            step: 2,
            explanation:
              "This contradicts a uniform positive cloud and supports Rutherford's nuclear model.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`Which pair correctly represents isotopes of the same element?`,
        difficulty: 3,
        skillTags: ["isotopes", "atomic_number", "mass_number"],
        choices: [
          L`$^{35}_{17}\mathrm{X}$ and $^{37}_{17}\mathrm{X}$`,
          L`$^{40}_{18}\mathrm{X}$ and $^{40}_{20}\mathrm{Y}$`,
          L`$^{23}_{11}\mathrm{X}$ and $^{23}_{11}\mathrm{X}^{+}$`,
          L`$^{14}_{6}\mathrm{X}$ and $^{14}_{7}\mathrm{Y}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "These have the same mass number but different atomic numbers, so they are isobars.",
          C: "These differ only by charge, not by mass number.",
          D: "These have the same mass number but different atomic numbers, so they are isobars.",
        },
        hints: [
          "Isotopes must belong to the same element.",
          "Same element means same atomic number.",
          "Isotopes have the same atomic number but different mass numbers.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Isotopes have the same atomic number but different mass numbers.",
            math: null,
          },
          {
            step: 2,
            explanation:
              "$^{35}_{17}\\mathrm{X}$ and $^{37}_{17}\\mathrm{X}$ both have atomic number 17, but their mass numbers are 35 and 37.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`For the ion $\mathrm{X^{2+}}$, the atomic number of $X$ is $20$ and the mass number is $40$. The numbers of protons, neutrons and electrons are respectively`,
        difficulty: 3,
        skillTags: ["atomic_number", "mass_number", "ions"],
        choices: [
          L`$20,\ 20,\ 20$`,
          L`$20,\ 40,\ 18$`,
          L`$18,\ 20,\ 20$`,
          L`$20,\ 20,\ 18$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This is the neutral atom's electron count, not the $2+$ ion's electron count.",
          B: "Mass number is protons plus neutrons, not neutrons alone.",
          C: "Atomic number gives protons, not electrons in the ion.",
        },
        hints: [
          "Atomic number gives number of protons.",
          "Neutrons $=$ mass number $-$ atomic number.",
          "A $2+$ ion has lost two electrons.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Protons and neutrons are",
            math: L`p=20,\quad n=40-20=20`,
          },
          {
            step: 2,
            explanation:
              "A $2+$ ion has two fewer electrons than the neutral atom.",
            math: L`e=20-2=18`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`State the charge and approximate relative mass of an electron compared with a proton.`,
        difficulty: 1,
        skillTags: ["electron_properties", "subatomic_particles"],
        parts: singlePart(
          "a",
          "Give the charge and relative mass comparison.",
          2,
        ),
        hints: [
          "An electron carries negative charge.",
          "A proton is much heavier than an electron.",
          "Electron mass is about $1/1837$ of proton mass.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "States negative charge and mass about $1/1837$ of proton mass.",
        ),
        commonErrors: [
          "Calling the electron neutral or giving it the same mass as a proton.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "An electron has charge $-1$ in relative units and mass about $1/1837$ of the mass of a proton.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Two neutral atoms are represented as $^{35}_{17}\mathrm{Cl}$ and $^{37}_{17}\mathrm{Cl}$.`,
        difficulty: 2,
        skillTags: ["isotopes", "atomic_number", "neutrons"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "State why the two atoms are isotopes of chlorine.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the number of neutrons in each atom.",
            points: 2,
          },
        ],
        hints: [
          "The lower number is the atomic number.",
          "The upper number is the mass number.",
          "Neutrons $=$ mass number $-$ atomic number.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "States same atomic number/same element but different mass numbers.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Finds 18 neutrons in $^{35}\\mathrm{Cl}$ and 20 neutrons in $^{37}\\mathrm{Cl}$.",
            },
          ],
        },
        commonErrors: [
          "Using the atomic number itself as the neutron count.",
          "Calling isotopes different elements because their mass numbers differ.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Both atoms have atomic number 17, so both are chlorine atoms. Their mass numbers are different, 35 and 37, so they are isotopes.",
          },
          {
            part: "b",
            explanation:
              "For $^{35}_{17}\\mathrm{Cl}$, neutrons $=35-17=18$. For $^{37}_{17}\\mathrm{Cl}$, neutrons $=37-17=20$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Consider $^{40}_{18}\mathrm{Ar}$, $^{40}_{20}\mathrm{Ca}$ and $^{39}_{19}\mathrm{K}$.`,
        difficulty: 3,
        skillTags: ["isotopes", "isobars", "atomic_number"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Identify one pair of isobars from the given species.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Explain why they are isobars and not isotopes.",
            points: 2,
          },
        ],
        hints: [
          "Isobars have the same mass number.",
          "Isotopes have the same atomic number but different mass numbers.",
          "Compare the upper and lower numbers separately.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "Identifies $^{40}\\mathrm{Ar}$ and $^{40}\\mathrm{Ca}$.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Explains same mass number 40 but different atomic numbers 18 and 20.",
            },
          ],
        },
        commonErrors: [
          "Calling species of different elements isotopes because their mass numbers match.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$^{40}_{18}\\mathrm{Ar}$ and $^{40}_{20}\\mathrm{Ca}$ form an isobaric pair.",
          },
          {
            part: "b",
            explanation:
              "They have the same mass number, 40, but different atomic numbers, 18 and 20. Isotopes must have the same atomic number, so these are isobars, not isotopes.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Rutherford's gold foil experiment replaced Thomson's model with the nuclear model of the atom.`,
        difficulty: 4,
        skillTags: ["rutherford_model", "atomic_models", "evidence_reasoning"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "State two observations from the alpha-particle scattering experiment.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Give the inference drawn from each observation.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State one limitation of Rutherford's model.",
            points: 1,
          },
        ],
        hints: [
          "Use both the common observation and the rare observation.",
          "Match observations to inferences, not just to conclusions.",
          "Think about accelerating electrons in circular motion.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "States most particles pass through and a few deflect strongly or rebound.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Connects empty space and small dense positive nucleus to the observations.",
            },
            {
              part: "c",
              points: 1,
              description:
                "States instability of orbiting electrons or inability to explain line spectra.",
            },
          ],
        },
        commonErrors: [
          "Listing conclusions without linking them to observations.",
          "Saying Rutherford explained stability completely.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Most alpha particles passed through the foil without deflection, while a very small number were deflected through large angles or even rebounded.",
          },
          {
            part: "b",
            explanation:
              "The first observation shows that most of the atom is empty space. The rare large deflections show that positive charge and most mass are concentrated in a small dense nucleus.",
          },
          {
            part: "c",
            explanation:
              "Rutherford's model could not explain why revolving electrons do not lose energy continuously and collapse into the nucleus; it also could not explain discrete line spectra.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`An ion has mass number $27$, contains $14$ neutrons and has charge $3+$.`,
        difficulty: 4,
        skillTags: ["atomic_number", "ions", "subatomic_particle_count"],
        parts: [
          { letter: "a", promptMarkdown: "Find its atomic number.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "Find the number of protons.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Find the number of electrons in the ion.",
            points: 2,
          },
        ],
        hints: [
          "Mass number equals protons plus neutrons.",
          "Atomic number equals protons.",
          "A $3+$ ion has lost three electrons.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Finds atomic number 13." },
            { part: "b", points: 1, description: "Finds 13 protons." },
            { part: "c", points: 2, description: "Finds 10 electrons." },
          ],
        },
        commonErrors: [
          "Subtracting charge from mass number instead of electron count.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Mass number $A=p+n$. Therefore $p=27-14=13$, so atomic number is 13.",
          },
          {
            part: "b",
            explanation:
              "Number of protons is equal to atomic number, so it is 13.",
          },
          {
            part: "c",
            explanation:
              "A neutral atom with atomic number 13 has 13 electrons. The $3+$ ion has lost 3 electrons, so electrons $=13-3=10$.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.2",
    title: "Radiation, Photoelectric Effect and Matter Waves",
    subtopic:
      "Electromagnetic radiation, Planck quantum theory, photoelectric effect, de Broglie relation and Heisenberg uncertainty principle.",
    mc: [
      {
        questionLatex: L`The frequency of light of wavelength $400\text{ nm}$ is closest to`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["electromagnetic_radiation", "frequency_wavelength"],
        choices: [
          L`$7.5\times10^{14}\text{ s}^{-1}$`,
          L`$1.2\times10^{11}\text{ s}^{-1}$`,
          L`$7.5\times10^{5}\text{ s}^{-1}$`,
          L`$4.0\times10^{-7}\text{ s}^{-1}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This usually comes from using wavelength in nanometres without converting to metres.",
          C: "This is far too low for visible light.",
          D: "This is the wavelength value written with units of frequency.",
        },
        hints: [
          "Use $c=\\lambda\\nu$.",
          "Convert $400\\text{ nm}$ to $4.00\\times10^{-7}\\text{ m}$.",
          "$\\nu=c/\\lambda$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Convert wavelength and use $c=\\lambda\\nu$.",
            math: L`\nu=\frac{3.00\times10^8}{4.00\times10^{-7}}`,
          },
          {
            step: 2,
            explanation: "Calculate the frequency.",
            math: L`\nu=7.5\times10^{14}\text{ s}^{-1}`,
          },
        ],
      },
      {
        questionLatex: L`The energy of one photon of frequency $6.0\times10^{14}\text{ s}^{-1}$ is approximately. Use $h=6.63\times10^{-34}\text{ J s}$.`,
        difficulty: 2,
        calculatorAllowed: true,
        skillTags: ["planck_relation", "photon_energy"],
        choices: [
          L`$1.10\times10^{-48}\text{ J}$`,
          L`$6.63\times10^{-34}\text{ J}$`,
          L`$9.05\times10^{47}\text{ J}$`,
          L`$3.98\times10^{-19}\text{ J}$`,
        ],
        correctLetter: "D",
        rationales: {
          A: "This multiplies powers incorrectly.",
          C: "This divides by Planck's constant instead of multiplying.",
          B: "This is Planck's constant, not photon energy.",
        },
        hints: [
          "Use $E=h\\nu$.",
          "Multiply $6.63\\times10^{-34}$ by $6.0\\times10^{14}$.",
          "Combine powers of ten: $10^{-34}10^{14}=10^{-20}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use Planck's relation.",
            math: L`E=h\nu=(6.63\times10^{-34})(6.0\times10^{14})`,
          },
          {
            step: 2,
            explanation: "Calculate.",
            math: L`E=3.98\times10^{-19}\text{ J}`,
          },
        ],
      },
      {
        questionLatex: L`In the photoelectric effect, light above threshold frequency falls on a metal surface. Increasing only the intensity of this light mainly increases`,
        difficulty: 3,
        skillTags: ["photoelectric_effect", "intensity_frequency"],
        choices: [
          L`the maximum kinetic energy of each emitted electron`,
          L`the charge on each emitted electron`,
          L`the threshold frequency of the metal`,
          L`the number of emitted electrons per second`,
        ],
        correctLetter: "D",
        rationales: {
          A: "Kinetic energy depends on frequency above threshold, not on intensity.",
          C: "Threshold frequency is a property of the metal.",
          B: "The electron charge is fixed.",
        },
        hints: [
          "Intensity changes the number of photons arriving per second.",
          "Each photon can eject at most one electron.",
          "Energy per photon depends on frequency.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "For light above threshold frequency, increasing intensity increases the number of incident photons.",
            math: null,
          },
          {
            step: 2,
            explanation:
              "Therefore, the number of emitted electrons per second increases, while the maximum kinetic energy depends on frequency.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`An electron of mass $9.1\times10^{-31}\text{ kg}$ moves with speed $2.0\times10^6\text{ m s}^{-1}$. Its de Broglie wavelength is closest to. Use $h=6.63\times10^{-34}\text{ J s}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["de_broglie_relation", "matter_waves"],
        choices: [
          L`$3.6\times10^{-10}\text{ m}$`,
          L`$3.6\times10^{10}\text{ m}$`,
          L`$1.2\times10^{-54}\text{ m}$`,
          L`$3.0\times10^8\text{ m}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "The power of ten is inverted; the electron wavelength should be very small, not astronomical.",
          C: "This multiplies $h$, $m$ and $v$ instead of dividing by momentum.",
          D: "This is the speed of light scale, not a wavelength from $h/mv$.",
        },
        hints: [
          "Use $\\lambda=h/(mv)$.",
          "Momentum $mv=(9.1\\times10^{-31})(2.0\\times10^6)$.",
          "Divide $6.63\\times10^{-34}$ by about $1.82\\times10^{-24}$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Calculate momentum.",
            math: L`mv=(9.1\times10^{-31})(2.0\times10^6)=1.82\times10^{-24}`,
          },
          {
            step: 2,
            explanation: "Use de Broglie's relation.",
            math: L`\lambda=\frac{6.63\times10^{-34}}{1.82\times10^{-24}}=3.64\times10^{-10}\text{ m}`,
          },
        ],
      },
      {
        questionLatex: L`Heisenberg's uncertainty principle states that, for a microscopic particle, it is impossible to know simultaneously and exactly its`,
        difficulty: 2,
        skillTags: ["uncertainty_principle", "quantum_model"],
        choices: [
          L`charge and mass`,
          L`atomic number and mass number`,
          L`frequency and wavelength`,
          L`position and momentum`,
        ],
        correctLetter: "D",
        rationales: {
          A: "Charge and mass are fixed particle properties, not the uncertainty-principle pair.",
          B: "Atomic number and mass number are nuclear identifiers.",
          C: "Frequency and wavelength are related by wave speed; this is not Heisenberg's statement.",
        },
        hints: [
          "Momentum is mass times velocity.",
          "The principle limits simultaneous precision for two conjugate quantities.",
          "The pair is position and momentum.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Heisenberg's uncertainty principle concerns simultaneous measurement of position and momentum.",
            math: L`\Delta x\,\Delta p \geq \frac{h}{4\pi}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Red light and violet light have different frequencies. Which photon has greater energy, and why?`,
        difficulty: 1,
        skillTags: ["photon_energy", "frequency"],
        parts: singlePart("a", "Answer with reason.", 2),
        hints: [
          "Photon energy is proportional to frequency.",
          "Violet light has higher frequency than red light.",
          "Use $E=h\\nu$.",
        ],
        rubric: singleRubric(
          "a",
          2,
          "States violet photon has greater energy because $E=h\\nu$ and violet has higher frequency.",
        ),
        commonErrors: [
          "Choosing red because it has longer wavelength without connecting wavelength inversely to frequency.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Violet light has greater frequency than red light. Since $E=h\\nu$, a violet photon has greater energy.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A photon has wavelength $500\text{ nm}$. Use $h=6.63\times10^{-34}\text{ J s}$ and $c=3.00\times10^8\text{ m s}^{-1}$.`,
        difficulty: 3,
        calculatorAllowed: true,
        skillTags: ["photon_energy", "mole_of_photons"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the energy of one photon.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the energy of one mole of such photons in kJ.",
            points: 2,
          },
        ],
        hints: [
          "Use $E=hc/\\lambda$.",
          "Convert $500\\text{ nm}$ to metres.",
          "For one mole, multiply by $N_A$ and convert J to kJ.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds about $3.98\\times10^{-19}\\text{ J}$.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds about $240\\text{ kJ mol}^{-1}$.",
            },
          ],
        },
        commonErrors: [
          "Using wavelength in nanometres directly without converting to metres.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$E=hc/\\lambda=(6.63\\times10^{-34})(3.00\\times10^8)/(500\\times10^{-9})=3.98\\times10^{-19}\\text{ J}$.",
          },
          {
            part: "b",
            explanation:
              "Energy per mole $=(3.98\\times10^{-19})(6.022\\times10^{23})=2.40\\times10^5\\text{ J mol}^{-1}\\approx240\\text{ kJ mol}^{-1}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A metal has threshold frequency $5.0\times10^{14}\text{ s}^{-1}$. Radiation of frequency $6.0\times10^{14}\text{ s}^{-1}$ falls on it. Use $h=6.63\times10^{-34}\text{ J s}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["photoelectric_effect", "threshold_frequency"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Will photoelectrons be emitted?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the maximum kinetic energy of the emitted electrons.",
            points: 2,
          },
        ],
        hints: [
          "Compare incident frequency with threshold frequency.",
          "Use $K_{\\max}=h(\\nu-\\nu_0)$.",
          "Only the excess frequency contributes to kinetic energy.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description:
                "States emission occurs because incident frequency is above threshold.",
            },
            {
              part: "b",
              points: 2,
              description: "Finds $6.63\\times10^{-20}\\text{ J}$.",
            },
          ],
        },
        commonErrors: [
          "Using $h\\nu$ as kinetic energy without subtracting threshold energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Since $6.0\\times10^{14}>5.0\\times10^{14}\\text{ s}^{-1}$, photoelectrons are emitted.",
          },
          {
            part: "b",
            explanation:
              "$K_{\\max}=h(\\nu-\\nu_0)=6.63\\times10^{-34}(1.0\\times10^{14})=6.63\\times10^{-20}\\text{ J}$.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`A moving electron and a moving dust particle both have momentum. Explain why wave character is observable for the electron but not for the dust particle in ordinary conditions.`,
        difficulty: 4,
        skillTags: [
          "de_broglie_relation",
          "matter_waves",
          "conceptual_reasoning",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write the de Broglie relation and identify the quantities.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Use the relation to explain the difference in observability.",
            points: 3,
          },
        ],
        hints: [
          "Use $\\lambda=h/p$.",
          "A dust particle has much larger momentum than an electron moving at microscopic scales.",
          "Very small wavelengths are not observable in ordinary experiments.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "Writes $\\lambda=h/p=h/(mv)$ and identifies wavelength and momentum.",
            },
            {
              part: "b",
              points: 3,
              description:
                "Explains inverse relation and why macroscopic momentum gives negligible wavelength.",
            },
          ],
        },
        commonErrors: [
          "Saying only electrons have de Broglie wavelength; all moving matter has one, but it may be too small to observe.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The de Broglie relation is $\\lambda=h/p=h/(mv)$, where $\\lambda$ is matter wavelength and $p$ is momentum.",
          },
          {
            part: "b",
            explanation:
              "A dust particle has a much larger mass and hence much larger ordinary momentum than an electron. Since $\\lambda$ is inversely proportional to momentum, its wavelength is extremely small and not observable in ordinary conditions. Electron wavelengths can be comparable to atomic dimensions, so diffraction can be observed.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A student compares three radiations: A has $\lambda=700\text{ nm}$, B has $\lambda=350\text{ nm}$ and C has $\lambda=1400\text{ nm}$.`,
        difficulty: 3,
        skillTags: ["wavelength_frequency_energy", "case_based"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Arrange them in increasing frequency.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Arrange them in increasing photon energy.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown:
              "If radiation A just causes photoemission from a metal, will B cause photoemission? Give reason.",
            points: 2,
          },
        ],
        hints: [
          "Frequency is inversely proportional to wavelength.",
          "Photon energy is proportional to frequency.",
          "A shorter wavelength means higher photon energy.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            { part: "a", points: 1, description: "Gives C, A, B." },
            { part: "b", points: 1, description: "Gives C, A, B." },
            {
              part: "c",
              points: 2,
              description:
                "States yes, because B has shorter wavelength and greater frequency/energy than A.",
            },
          ],
        },
        commonErrors: ["Assuming longer wavelength means greater energy."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Frequency increases as wavelength decreases, so increasing frequency order is C $(1400\\text{ nm})$, A $(700\\text{ nm})$, B $(350\\text{ nm})$.",
          },
          {
            part: "b",
            explanation:
              "Since $E=h\\nu$, increasing energy has the same order: C, A, B.",
          },
          {
            part: "c",
            explanation:
              "Yes. B has shorter wavelength and therefore higher frequency and higher photon energy than A, so it will exceed the threshold if A just reaches it.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.3",
    title: "Bohr Model and Hydrogen Spectrum",
    subtopic:
      "Bohr postulates, radius and energy of hydrogen-like orbits, line spectra and spectral series.",
    mc: [
      {
        questionLatex: L`According to Bohr's model for hydrogen, the radius of the third orbit is`,
        difficulty: 2,
        skillTags: ["bohr_radius", "hydrogen_atom"],
        choices: [L`$3a_0$`, L`$6a_0$`, L`$9a_0$`, L`$\frac{a_0}{9}$`],
        correctLetter: "C",
        rationales: {
          A: "Bohr radius varies as $n^2$, not as $n$.",
          B: "This is not the $n^2$ dependence for $n=3$.",
          D: "The radius increases with $n$, not decreases.",
        },
        hints: ["For hydrogen, $r_n=n^2a_0$.", "Here $n=3$.", "$3^2=9$."],
        solution: [
          {
            step: 1,
            explanation: "Use Bohr's radius expression for hydrogen.",
            math: L`r_n=n^2a_0`,
          },
          {
            step: 2,
            explanation: "For the third orbit",
            math: L`r_3=3^2a_0=9a_0`,
          },
        ],
      },
      {
        questionLatex: L`The energy of the electron in the $n=2$ level of hydrogen is`,
        difficulty: 2,
        skillTags: ["bohr_energy", "hydrogen_atom"],
        choices: [
          L`$-13.6\text{ eV}$`,
          L`$-6.8\text{ eV}$`,
          L`$-3.4\text{ eV}$`,
          L`$+3.4\text{ eV}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This is the ground-state energy for $n=1$.",
          B: "Energy varies as $1/n^2$, not $1/n$.",
          D: "Bound-state energies in Bohr's model are negative relative to the separated electron.",
        },
        hints: [
          "Use $E_n=-13.6/n^2\\text{ eV}$.",
          "Substitute $n=2$.",
          "Keep the negative sign for a bound electron.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use Bohr's energy expression.",
            math: L`E_2=-\frac{13.6}{2^2}\text{ eV}`,
          },
          { step: 2, explanation: "Calculate.", math: L`E_2=-3.4\text{ eV}` },
        ],
      },
      {
        questionLatex: L`The transition shown in the hydrogen atom ends at $n=2$. The emitted spectral line belongs to the`,
        figure: hydrogenTransitionFigure,
        difficulty: 3,
        skillTags: ["hydrogen_spectrum", "spectral_series"],
        choices: [
          L`Lyman series`,
          L`Balmer series`,
          L`Paschen series`,
          L`Brackett series`,
        ],
        correctLetter: "B",
        rationales: {
          A: "Lyman lines end at $n=1$.",
          C: "Paschen lines end at $n=3$.",
          D: "Brackett lines end at $n=4$.",
        },
        hints: [
          "Spectral series are identified by the final energy level.",
          "The figure shows final level $n=2$.",
          "Hydrogen transitions ending at $n=2$ form the Balmer series.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The final level is $n=2$, and all hydrogen lines ending at $n=2$ belong to the Balmer series.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`The minimum energy needed to remove the electron from the ground state of hydrogen is`,
        difficulty: 2,
        skillTags: ["ionization_energy", "bohr_energy"],
        choices: [
          L`$3.4\text{ eV}$`,
          L`$10.2\text{ eV}$`,
          L`$13.6\text{ eV}$`,
          L`$27.2\text{ eV}$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This is the magnitude of the $n=2$ energy, not ground-state ionization.",
          B: "This is the energy gap from $n=1$ to $n=2$.",
          D: "This doubles the hydrogen ground-state binding energy.",
        },
        hints: [
          "Ground-state energy is $-13.6\\text{ eV}$.",
          "Ionization means taking the electron to $E=0$.",
          "Required energy is the difference between 0 and $-13.6\\text{ eV}$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "Ionization from the ground state takes the electron from $-13.6\\text{ eV}$ to 0.",
            math: L`\Delta E=0-(-13.6)=13.6\text{ eV}`,
          },
        ],
      },
      {
        questionLatex: L`For the hydrogen transition $n=2$ to $n=1$, the Rydberg expression gives $\frac{1}{\lambda}=R\left(1-\frac14\right)$. If $R=1.097\times10^7\text{ m}^{-1}$, the wavelength is closest to`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["rydberg_formula", "hydrogen_spectrum"],
        choices: [
          L`$122\text{ nm}$`,
          L`$486\text{ nm}$`,
          L`$656\text{ nm}$`,
          L`$1.22\times10^7\text{ nm}$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is close to the $n=4$ to $n=2$ Balmer line, not $n=2$ to $n=1$.",
          C: "This is close to the $n=3$ to $n=2$ Balmer line.",
          D: "This confuses inverse wavelength with wavelength.",
        },
        hints: [
          "Simplify $1-1/4=3/4$.",
          "Find $\\lambda=1/[(3/4)R]$.",
          "Convert metres to nanometres by multiplying by $10^9$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Calculate inverse wavelength.",
            math: L`\frac{1}{\lambda}=\frac{3}{4}(1.097\times10^7)=8.23\times10^6\text{ m}^{-1}`,
          },
          {
            step: 2,
            explanation: "Invert and convert to nm.",
            math: L`\lambda=1.215\times10^{-7}\text{ m}=122\text{ nm}`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Find the energy emitted when a hydrogen electron falls from $n=2$ to $n=1$. Use $E_n=-13.6/n^2\text{ eV}$.`,
        difficulty: 2,
        skillTags: ["bohr_energy", "emission_energy"],
        parts: singlePart("a", "Find the emitted energy in eV.", 2),
        hints: [
          "Find $E_1$ and $E_2$ separately.",
          "Emission energy is the magnitude of the decrease in electronic energy.",
          "$E_1=-13.6\\text{ eV}$ and $E_2=-3.4\\text{ eV}$.",
        ],
        rubric: singleRubric("a", 2, "Finds emitted energy $10.2\\text{ eV}$."),
        commonErrors: [
          "Reporting a negative emitted energy instead of the positive photon energy.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$E_1=-13.6\\text{ eV}$ and $E_2=-13.6/4=-3.4\\text{ eV}$. The photon energy emitted is $|-13.6-(-3.4)|=10.2\\text{ eV}$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For the hydrogen transition $n=4$ to $n=2$, use $\frac{1}{\lambda}=R\left(\frac{1}{2^2}-\frac{1}{4^2}\right)$ and $R=1.097\times10^7\text{ m}^{-1}$.`,
        difficulty: 4,
        calculatorAllowed: true,
        skillTags: ["rydberg_formula", "balmer_series"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the wavelength approximately in nm.",
            points: 3,
          },
          {
            letter: "b",
            promptMarkdown: "Name the spectral series.",
            points: 1,
          },
        ],
        hints: [
          "Simplify $1/4-1/16=3/16$.",
          "Then invert to get wavelength.",
          "The final level is $n=2$.",
        ],
        rubric: {
          maxPoints: 4,
          criteria: [
            {
              part: "a",
              points: 3,
              description: "Finds about $486\\text{ nm}$.",
            },
            { part: "b", points: 1, description: "Names Balmer series." },
          ],
        },
        commonErrors: [
          "Using $n=1$ as the final level despite the given expression.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$1/\\lambda=R(3/16)=1.097\\times10^7\\times0.1875=2.057\\times10^6\\text{ m}^{-1}$. Hence $\\lambda=4.86\\times10^{-7}\\text{ m}=486\\text{ nm}$.",
          },
          {
            part: "b",
            explanation:
              "Since the transition ends at $n=2$, it belongs to the Balmer series.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`According to Bohr's model, $r_n=n^2a_0/Z$ for a hydrogen-like species. Compare the radius of the first orbit of $\mathrm{He^+}$ with the first orbit of hydrogen.`,
        difficulty: 3,
        skillTags: ["hydrogen_like_species", "bohr_radius"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find $r_1$ for hydrogen in terms of $a_0$.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find $r_1$ for $\\mathrm{He^+}$ in terms of $a_0$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State which is smaller and why.",
            points: 1,
          },
        ],
        hints: [
          "Hydrogen has $Z=1$.",
          "$\\mathrm{He^+}$ is hydrogen-like but has $Z=2$.",
          "Greater nuclear charge pulls the electron closer.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds $a_0$." },
            { part: "b", points: 1, description: "Finds $a_0/2$." },
            {
              part: "c",
              points: 1,
              description:
                "States $\\mathrm{He^+}$ orbit is smaller due to larger $Z$.",
            },
          ],
        },
        commonErrors: [
          "Forgetting the division by $Z$ for hydrogen-like ions.",
        ],
        workedSolution: [
          { part: "a", explanation: "For H, $Z=1$ and $n=1$, so $r_1=a_0$." },
          {
            part: "b",
            explanation: "For $\\mathrm{He^+}$, $Z=2$, so $r_1=a_0/2$.",
          },
          {
            part: "c",
            explanation:
              "$\\mathrm{He^+}$ has the smaller first orbit because the electron experiences a higher nuclear charge.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Bohr's model successfully explained the spectrum of hydrogen but failed as a complete atomic model.`,
        difficulty: 4,
        skillTags: ["bohr_model", "limitations", "line_spectrum"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "State two postulates of Bohr's model that explain discrete spectra.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Explain why emission lines are discrete in this model.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "State one limitation of Bohr's model.",
            points: 1,
          },
        ],
        hints: [
          "Electrons occupy stationary states of fixed energy.",
          "Radiation is emitted or absorbed only during transitions.",
          "Think about multi-electron atoms and fine structure.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description:
                "States stationary orbits and quantized angular momentum/energy.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Connects fixed energy gaps to photons of definite frequencies.",
            },
            {
              part: "c",
              points: 1,
              description:
                "States failure for multi-electron atoms or fine structure/Zeeman effect.",
            },
          ],
        },
        commonErrors: ["Saying Bohr's model explains all atoms exactly."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Electrons can revolve only in certain stationary states without radiating energy, and their angular momentum is quantized. Radiation is emitted or absorbed only when an electron jumps between two allowed states.",
          },
          {
            part: "b",
            explanation:
              "Because only certain energies are allowed, only certain energy differences are possible. Each difference gives a photon with $\\Delta E=h\\nu$, so the spectrum contains discrete lines.",
          },
          {
            part: "c",
            explanation:
              "Bohr's model could not satisfactorily explain spectra of multi-electron atoms and finer splitting of spectral lines.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A sample of hydrogen atoms is excited to $n=4$ and then returns to lower levels.`,
        difficulty: 4,
        skillTags: ["hydrogen_spectrum", "case_based", "transition_count"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "How many different spectral lines can be produced as the electron returns to the ground state through all possible paths?",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown:
              "Name the series for transitions ending at $n=1$ and at $n=2$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Which transition from $n=4$ emits the highest-energy photon?",
            points: 1,
          },
        ],
        hints: [
          "Count all pairs of energy levels among $n=1,2,3,4$.",
          "The number of lines from level $n$ is $n(n-1)/2$.",
          "The largest energy drop gives the highest-energy photon.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds 6 possible spectral lines.",
            },
            {
              part: "b",
              points: 2,
              description: "Names Lyman for $n=1$ and Balmer for $n=2$.",
            },
            { part: "c", points: 1, description: "Identifies $n=4$ to $n=1$." },
          ],
        },
        commonErrors: [
          "Counting only direct transition from 4 to 1 and ignoring cascades.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "Among levels $1,2,3,4$, possible transitions are the pairs $(4,3),(4,2),(4,1),(3,2),(3,1),(2,1)$, so 6 lines are possible.",
          },
          {
            part: "b",
            explanation:
              "Transitions ending at $n=1$ form the Lyman series; transitions ending at $n=2$ form the Balmer series.",
          },
          {
            part: "c",
            explanation:
              "The largest energy drop is from $n=4$ to $n=1$, so it emits the highest-energy photon.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.4",
    title: "Quantum Mechanical Model and Orbitals",
    subtopic:
      "Quantum numbers, shells, subshells, orbitals, nodal planes, orbital shapes and capacities.",
    mc: [
      {
        questionLatex: L`Which set of quantum numbers is not allowed for an electron in an atom?`,
        difficulty: 3,
        skillTags: ["quantum_numbers", "allowed_values"],
        choices: [
          L`$n=3,\ l=2,\ m_l=0$`,
          L`$n=3,\ l=3,\ m_l=0$`,
          L`$n=4,\ l=1,\ m_l=-1$`,
          L`$n=2,\ l=0,\ m_l=0$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "For $n=3$, allowed $l$ values are 0, 1 and 2.",
          C: "For $l=1$, allowed $m_l$ values include $-1$.",
          D: "For an s orbital, $l=0$ and $m_l=0$ are allowed.",
        },
        hints: [
          "For a given $n$, $l$ can be $0$ to $n-1$.",
          "For $n=3$, the largest allowed $l$ is 2.",
          "So $l=3$ is not allowed when $n=3$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Allowed $l$ values for a shell are",
            math: L`l=0,1,2,\ldots,n-1`,
          },
          {
            step: 2,
            explanation:
              "For $n=3$, $l$ can only be 0, 1 or 2. Therefore $n=3,l=3$ is impossible.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`The number of orbitals present in the shell with $n=3$ is`,
        difficulty: 2,
        skillTags: ["shell_capacity", "orbitals_count"],
        choices: [L`$3$`, L`$6$`, L`$9$`, L`$18$`],
        correctLetter: "C",
        rationales: {
          A: "This counts subshells, not orbitals.",
          B: "This is not the orbital count for the third shell.",
          D: "This is the maximum number of electrons, not orbitals.",
        },
        hints: [
          "Total orbitals in shell $n$ equals $n^2$.",
          "For $n=3$, subshells are 3s, 3p and 3d.",
          "They contain $1+3+5=9$ orbitals.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Use the formula for total orbitals in a shell.",
            math: L`n^2=3^2=9`,
          },
        ],
      },
      {
        questionLatex: L`The maximum number of electrons that can be accommodated in a $3d$ subshell is`,
        difficulty: 2,
        skillTags: ["subshell_capacity", "d_orbitals"],
        choices: [L`$2$`, L`$6$`, L`$10$`, L`$14$`],
        correctLetter: "C",
        rationales: {
          A: "Two electrons fit in one orbital, but a d subshell has five orbitals.",
          B: "Six is the capacity of a p subshell.",
          D: "Fourteen is the capacity of an f subshell.",
        },
        hints: [
          "A d subshell has five orbitals.",
          "Each orbital can hold two electrons.",
          "Capacity $=5\\times2$.",
        ],
        solution: [
          {
            step: 1,
            explanation: "A d subshell contains five orbitals.",
            math: L`5\times2=10`,
          },
        ],
      },
      {
        questionLatex: L`An orbital is described by $n=4$ and $l=1$. The subshell notation is`,
        difficulty: 2,
        skillTags: ["quantum_numbers", "subshell_notation"],
        choices: [L`$4s$`, L`$4p$`, L`$4d$`, L`$1p$`],
        correctLetter: "B",
        rationales: {
          A: "$s$ corresponds to $l=0$, not $l=1$.",
          C: "$d$ corresponds to $l=2$.",
          D: "$n$ is 4, not 1.",
        },
        hints: [
          "$l=0,1,2,3$ correspond to $s,p,d,f$.",
          "Here $l=1$.",
          "Keep the given principal quantum number $n=4$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "$l=1$ denotes a p subshell and $n=4$ gives the shell.",
            math: L`n=4,\ l=1\Rightarrow4p`,
          },
        ],
      },
      {
        questionLatex: L`The orbital shown has two lobes separated by a nodal plane passing through the nucleus. It is best identified as a`,
        figure: pOrbitalFigure,
        difficulty: 2,
        skillTags: ["orbital_shape", "p_orbital"],
        choices: [
          L`$s$ orbital`,
          L`$p$ orbital`,
          L`$d_{z^2}$ orbital`,
          L`$f$ orbital`,
        ],
        correctLetter: "B",
        rationales: {
          A: "An s orbital is spherical and has no angular nodal plane.",
          C: "$d_{z^2}$ has a different shape with a torus-like region.",
          D: "The figure shows the standard dumbbell shape of a p orbital, not an f orbital.",
        },
        hints: [
          "A p orbital is dumbbell-shaped.",
          "It has one angular node.",
          "The figure shows two lobes separated by a nodal plane.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "A two-lobed dumbbell shape with one nodal plane is characteristic of a p orbital.",
            math: null,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`For a $2p$ electron, state the possible values of $l$ and $m_l$.`,
        difficulty: 2,
        skillTags: ["quantum_numbers", "p_subshell"],
        parts: singlePart("a", "Give $l$ and all possible $m_l$ values.", 2),
        hints: [
          "For a p subshell, $l=1$.",
          "$m_l$ ranges from $-l$ to $+l$.",
          "List all integer values.",
        ],
        rubric: singleRubric("a", 2, "States $l=1$ and $m_l=-1,0,+1$."),
        commonErrors: [
          "Giving only one value of $m_l$ for the whole p subshell.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For any p subshell, $l=1$. Therefore $m_l$ can be $-1,0,+1$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`For a $4p$ orbital, find the number of radial nodes, angular nodes and total nodes.`,
        difficulty: 4,
        skillTags: ["nodes", "orbital_quantum_numbers"],
        parts: [
          { letter: "a", promptMarkdown: "Find radial nodes.", points: 1 },
          { letter: "b", promptMarkdown: "Find angular nodes.", points: 1 },
          { letter: "c", promptMarkdown: "Find total nodes.", points: 1 },
        ],
        hints: [
          "For $4p$, $n=4$ and $l=1$.",
          "Radial nodes $=n-l-1$.",
          "Angular nodes $=l$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Finds 2 radial nodes." },
            { part: "b", points: 1, description: "Finds 1 angular node." },
            { part: "c", points: 1, description: "Finds 3 total nodes." },
          ],
        },
        commonErrors: ["Using $n-l$ instead of $n-l-1$ for radial nodes."],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For $4p$, $n=4$ and $l=1$, so radial nodes $=4-1-1=2$.",
          },
          { part: "b", explanation: "Angular nodes $=l=1$." },
          { part: "c", explanation: "Total nodes $=n-1=3$, also $2+1=3$." },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Consider the shell $n=3$.`,
        difficulty: 3,
        skillTags: ["shell_subshell_orbitals", "electron_capacity"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "List all subshells present in this shell.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Find the number of orbitals in each subshell and the total number of orbitals.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the maximum number of electrons in the $n=3$ shell.",
            points: 2,
          },
        ],
        hints: [
          "Allowed $l$ values are $0,1,2$.",
          "$s,p,d$ subshells have $1,3,5$ orbitals respectively.",
          "Each orbital holds two electrons.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Lists 3s, 3p and 3d." },
            {
              part: "b",
              points: 2,
              description: "Finds $1,3,5$ orbitals and total 9.",
            },
            {
              part: "c",
              points: 2,
              description: "Finds maximum 18 electrons.",
            },
          ],
        },
        commonErrors: [
          "Stopping at 3p and forgetting the 3d subshell exists in the shell.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For $n=3$, allowed $l$ values are 0, 1 and 2, so the subshells are 3s, 3p and 3d.",
          },
          {
            part: "b",
            explanation:
              "3s has 1 orbital, 3p has 3 orbitals and 3d has 5 orbitals. Total orbitals $=1+3+5=9$.",
          },
          {
            part: "c",
            explanation:
              "Each orbital holds 2 electrons, so maximum electrons $=9\\times2=18$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`An electron is said to have $n=2$, $l=1$, $m_l=+2$.`,
        difficulty: 3,
        skillTags: ["quantum_numbers", "validity_check"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Is this set allowed?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Justify using the rule for $m_l$.",
            points: 2,
          },
        ],
        hints: [
          "For $l=1$, possible $m_l$ values are limited.",
          "$m_l$ ranges from $-l$ to $+l$.",
          "Check whether $+2$ lies in that range.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "States not allowed." },
            {
              part: "b",
              points: 2,
              description: "Explains $m_l$ can only be $-1,0,+1$ for $l=1$.",
            },
          ],
        },
        commonErrors: ["Checking only $l<n$ and forgetting to check $m_l$."],
        workedSolution: [
          { part: "a", explanation: "The set is not allowed." },
          {
            part: "b",
            explanation:
              "For $l=1$, the allowed $m_l$ values are $-1,0,+1$. Since $+2$ is outside this range, the set is invalid.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`A subshell has $l=2$.`,
        difficulty: 4,
        skillTags: [
          "subshell_capacity",
          "magnetic_quantum_number",
          "case_based",
        ],
        parts: [
          { letter: "a", promptMarkdown: "Name the subshell type.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "List the possible values of $m_l$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Find the number of orbitals and maximum number of electrons in this subshell.",
            points: 2,
          },
        ],
        hints: [
          "$l=2$ corresponds to a d subshell.",
          "$m_l$ values run from $-2$ to $+2$.",
          "Each $m_l$ value represents one orbital.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            { part: "a", points: 1, description: "Names d subshell." },
            { part: "b", points: 2, description: "Lists $-2,-1,0,+1,+2$." },
            {
              part: "c",
              points: 2,
              description: "Finds 5 orbitals and 10 electrons.",
            },
          ],
        },
        commonErrors: [
          "Confusing d subshell capacity with p subshell capacity.",
        ],
        workedSolution: [
          { part: "a", explanation: "$l=2$ corresponds to a d subshell." },
          {
            part: "b",
            explanation: "$m_l=-2,-1,0,+1,+2$.",
          },
          {
            part: "c",
            explanation:
              "There are five possible $m_l$ values, hence five orbitals. Each orbital holds two electrons, so maximum capacity is 10 electrons.",
          },
        ],
      },
    ],
  },
  {
    topicCode: "2.5",
    title: "Electronic Configuration and Stability",
    subtopic:
      "Aufbau principle, Pauli exclusion principle, Hund's rule, electronic configurations of atoms and ions, and stability of half-filled and completely filled subshells.",
    mc: [
      {
        questionLatex: L`The ground-state electronic configuration of chromium is`,
        difficulty: 4,
        skillTags: [
          "electronic_configuration",
          "half_filled_stability",
          "chromium",
        ],
        choices: [
          L`$[\mathrm{Ar}]\,3d^4\,4s^2$`,
          L`$[\mathrm{Ar}]\,3d^5\,4s^1$`,
          L`$[\mathrm{Ar}]\,3d^6$`,
          L`$[\mathrm{Ar}]\,4s^2\,4p^4$`,
        ],
        correctLetter: "B",
        rationales: {
          A: "This follows the naive Aufbau order but misses the extra stability of half-filled $3d^5$.",
          C: "This has no $4s$ electron and is not chromium's ground-state configuration.",
          D: "Chromium does not fill $4p$ before completing the relevant $3d/4s$ arrangement.",
        },
        hints: [
          "Chromium has atomic number 24.",
          "Half-filled $d^5$ subshell has extra stability.",
          "One $4s$ electron is promoted to make $3d^5\\,4s^1$.",
        ],
        solution: [
          {
            step: 1,
            explanation:
              "The expected Aufbau configuration would be $[\\mathrm{Ar}]3d^4 4s^2$.",
            math: null,
          },
          {
            step: 2,
            explanation:
              "Chromium adopts a more stable half-filled d subshell.",
            math: L`[\mathrm{Ar}]\,3d^5\,4s^1`,
          },
        ],
      },
      {
        questionLatex: L`For nitrogen, $Z=7$, Hund's rule is correctly represented in the $2p$ subshell by`,
        difficulty: 3,
        skillTags: ["hund_rule", "orbital_filling"],
        choices: [
          L`three $2p$ electrons paired in one orbital as far as possible`,
          L`three $2p$ electrons singly occupying three orbitals with parallel spins`,
          L`two electrons in $2s$ and one electron in $3s$`,
          L`an empty $2p$ subshell`,
        ],
        correctLetter: "B",
        rationales: {
          A: "Hund's rule requires singly filling degenerate orbitals before pairing.",
          C: "Nitrogen fills $2p$ before moving to $3s$.",
          D: "Nitrogen has configuration $1s^2 2s^2 2p^3$, so $2p$ is not empty.",
        },
        hints: [
          "Nitrogen configuration is $1s^2 2s^2 2p^3$.",
          "The three p orbitals are degenerate.",
          "Hund's rule maximizes unpaired electrons with parallel spins.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Nitrogen has three electrons in the $2p$ subshell.",
            math: L`1s^2\,2s^2\,2p^3`,
          },
          {
            step: 2,
            explanation:
              "By Hund's rule, they occupy the three p orbitals singly with parallel spins before pairing.",
            math: null,
          },
        ],
      },
      {
        questionLatex: L`The electronic configuration of $\mathrm{O^{2-}}$ is`,
        difficulty: 2,
        skillTags: ["ionic_configuration", "oxide_ion"],
        choices: [
          L`$1s^2\,2s^2\,2p^2$`,
          L`$1s^2\,2s^2\,2p^4$`,
          L`$1s^2\,2s^2\,2p^6$`,
          L`$1s^2\,2s^2\,2p^6\,3s^2$`,
        ],
        correctLetter: "C",
        rationales: {
          A: "This has only six electrons, fewer than neutral oxygen.",
          B: "This is neutral oxygen, not oxide ion.",
          D: "This has twelve electrons and goes beyond the oxide ion.",
        },
        hints: [
          "Oxygen has atomic number 8.",
          "$\\mathrm{O^{2-}}$ has gained two electrons.",
          "Total electrons are 10.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Oxide ion has 10 electrons.",
            math: L`8+2=10`,
          },
          {
            step: 2,
            explanation: "Fill orbitals for 10 electrons.",
            math: L`1s^2\,2s^2\,2p^6`,
          },
        ],
      },
      {
        questionLatex: L`The electronic configuration of $\mathrm{Fe^{3+}}$ is best written as. Atomic number of Fe is 26.`,
        difficulty: 4,
        skillTags: ["transition_metal_ion", "electronic_configuration"],
        choices: [
          L`$[\mathrm{Ar}]\,3d^5$`,
          L`$[\mathrm{Ar}]\,3d^6\,4s^2$`,
          L`$[\mathrm{Ar}]\,3d^3\,4s^2$`,
          L`$[\mathrm{Ar}]\,4s^2\,4p^3$`,
        ],
        correctLetter: "A",
        rationales: {
          B: "This is neutral iron, not the $3+$ ion.",
          C: "For transition-metal cations, $4s$ electrons are removed before $3d$ electrons.",
          D: "Iron does not form the ion by filling $4p$ orbitals.",
        },
        hints: [
          "Neutral Fe is $[\\mathrm{Ar}]3d^6 4s^2$.",
          "Remove $4s$ electrons before $3d$ electrons for cations.",
          "Remove three electrons total.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Neutral iron is",
            math: L`[\mathrm{Ar}]\,3d^6\,4s^2`,
          },
          {
            step: 2,
            explanation: "Remove two $4s$ electrons and one $3d$ electron.",
            math: L`\mathrm{Fe^{3+}}=[\mathrm{Ar}]\,3d^5`,
          },
        ],
      },
      {
        questionLatex: L`An element has valence-shell configuration $3s^2\,3p^5$. Its atomic number is`,
        difficulty: 3,
        skillTags: ["valence_configuration", "atomic_number"],
        choices: [L`$9$`, L`$15$`, L`$17$`, L`$18$`],
        correctLetter: "C",
        rationales: {
          A: "This is fluorine, with valence shell $2s^2 2p^5$.",
          B: "This corresponds to $3s^2 3p^3$.",
          D: "This would be $3s^2 3p^6$.",
        },
        hints: [
          "The inner core before $3s$ is $1s^2 2s^2 2p^6$, which has 10 electrons.",
          "The valence shell has 7 electrons.",
          "Total electrons in the neutral atom give atomic number.",
        ],
        solution: [
          {
            step: 1,
            explanation: "Count electrons.",
            math: L`1s^2\,2s^2\,2p^6=10,\quad 3s^2\,3p^5=7`,
          },
          {
            step: 2,
            explanation: "Total electrons are 17.",
            math: L`Z=17`,
          },
        ],
      },
    ],
    constructed: [
      {
        responseType: "vsaq",
        questionLatex: L`Write the electronic configuration of magnesium, $Z=12$.`,
        difficulty: 1,
        skillTags: ["electronic_configuration", "aufbau_principle"],
        parts: singlePart("a", "Write the complete configuration.", 2),
        hints: [
          "Fill orbitals in increasing energy.",
          "The first ten electrons give neon core.",
          "The remaining two electrons enter $3s$.",
        ],
        rubric: singleRubric("a", 2, "Writes $1s^2 2s^2 2p^6 3s^2$."),
        commonErrors: [
          "Putting the last two electrons in $3p$ before filling $3s$.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "For 12 electrons, the configuration is $1s^2 2s^2 2p^6 3s^2$.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`A student writes the orbital filling of carbon, $Z=6$, as $1s^2\,2s^2\,2p_x^2$.`,
        difficulty: 3,
        skillTags: ["hund_rule", "configuration_error"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Identify the rule violated.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown:
              "Write the correct distribution of the two $2p$ electrons.",
            points: 2,
          },
        ],
        hints: [
          "The three $2p$ orbitals have equal energy.",
          "Electrons occupy degenerate orbitals singly before pairing.",
          "Carbon has $2p^2$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            { part: "a", points: 1, description: "Identifies Hund's rule." },
            {
              part: "b",
              points: 2,
              description:
                "Shows two $2p$ electrons singly in separate p orbitals with parallel spins.",
            },
          ],
        },
        commonErrors: [
          "Pairing electrons in one p orbital before using the other degenerate p orbitals.",
        ],
        workedSolution: [
          { part: "a", explanation: "The configuration violates Hund's rule." },
          {
            part: "b",
            explanation:
              "The correct filling is $1s^2 2s^2 2p^2$, with the two $2p$ electrons occupying two different p orbitals singly with parallel spins.",
          },
        ],
      },
      {
        responseType: "laq",
        questionLatex: L`Vanadium has atomic number $23$.`,
        difficulty: 4,
        skillTags: ["transition_metal_configuration", "ion_configuration"],
        parts: [
          {
            letter: "a",
            promptMarkdown:
              "Write the ground-state configuration of neutral V.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Write the configuration of $\\mathrm{V^{2+}}$.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "State which electrons are removed first when forming the cation.",
            points: 1,
          },
        ],
        hints: [
          "Neutral V follows $[\\mathrm{Ar}]3d^3 4s^2$.",
          "For cations, remove $4s$ electrons before $3d$ electrons.",
          "$\\mathrm{V^{2+}}$ has lost two electrons.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Writes $[\\mathrm{Ar}]3d^3 4s^2$.",
            },
            {
              part: "b",
              points: 2,
              description: "Writes $[\\mathrm{Ar}]3d^3$.",
            },
            {
              part: "c",
              points: 1,
              description: "States $4s$ electrons are removed first.",
            },
          ],
        },
        commonErrors: [
          "Removing $3d$ electrons before $4s$ electrons in a transition-metal cation.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation: "Neutral vanadium is $[\\mathrm{Ar}]3d^3 4s^2$.",
          },
          {
            part: "b",
            explanation:
              "$\\mathrm{V^{2+}}$ is formed by removing the two $4s$ electrons, so its configuration is $[\\mathrm{Ar}]3d^3$.",
          },
          {
            part: "c",
            explanation:
              "Although $4s$ fills before $3d$ in neutral atoms, $4s$ electrons are removed first when transition-metal cations form.",
          },
        ],
      },
      {
        responseType: "saq",
        questionLatex: L`Explain why $\mathrm{Cu}$ has configuration $[\mathrm{Ar}]\,3d^{10}\,4s^1$ rather than $[\mathrm{Ar}]\,3d^9\,4s^2$.`,
        difficulty: 4,
        skillTags: ["copper_configuration", "filled_subshell_stability"],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Name the stability factor involved.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Explain the electron rearrangement briefly.",
            points: 2,
          },
        ],
        hints: [
          "A fully filled d subshell has extra stability.",
          "$3d^{10}$ is more stable than $3d^9$.",
          "One $4s$ electron is promoted to $3d$.",
        ],
        rubric: {
          maxPoints: 3,
          criteria: [
            {
              part: "a",
              points: 1,
              description: "Mentions completely filled d-subshell stability.",
            },
            {
              part: "b",
              points: 2,
              description:
                "Explains one $4s$ electron shifts to make $3d^{10}4s^1$.",
            },
          ],
        },
        commonErrors: [
          "Saying copper violates Aufbau randomly without explaining filled-subshell stability.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "The factor is the extra stability of a completely filled d subshell.",
          },
          {
            part: "b",
            explanation:
              "The expected arrangement $[\\mathrm{Ar}]3d^9 4s^2$ changes by promotion of one $4s$ electron to $3d$, giving the more stable $[\\mathrm{Ar}]3d^{10}4s^1$.",
          },
        ],
      },
      {
        responseType: "case",
        questionLatex: L`Three species are given: $\mathrm{Na^+}$, $\mathrm{Mg^{2+}}$ and $\mathrm{Al^{3+}}$. Their atomic numbers are $11$, $12$ and $13$ respectively.`,
        difficulty: 4,
        skillTags: [
          "isoelectronic_species",
          "ionic_configuration",
          "case_based",
        ],
        parts: [
          {
            letter: "a",
            promptMarkdown: "Find the number of electrons in each species.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Write their common electronic configuration.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Name the noble gas with the same electronic configuration.",
            points: 1,
          },
        ],
        hints: [
          "Positive ions have fewer electrons than their neutral atoms.",
          "Subtract the charge from the atomic number.",
          "Ten electrons correspond to the neon configuration.",
        ],
        rubric: {
          maxPoints: 5,
          criteria: [
            {
              part: "a",
              points: 2,
              description: "Finds 10 electrons in each ion.",
            },
            { part: "b", points: 2, description: "Writes $1s^2 2s^2 2p^6$." },
            { part: "c", points: 1, description: "Names neon." },
          ],
        },
        commonErrors: [
          "Adding electrons to cations instead of subtracting them.",
        ],
        workedSolution: [
          {
            part: "a",
            explanation:
              "$\\mathrm{Na^+}$ has $11-1=10$ electrons; $\\mathrm{Mg^{2+}}$ has $12-2=10$; $\\mathrm{Al^{3+}}$ has $13-3=10$.",
          },
          {
            part: "b",
            explanation: "All three have configuration $1s^2 2s^2 2p^6$.",
          },
          {
            part: "c",
            explanation: "This is the electronic configuration of neon.",
          },
        ],
      },
    ],
  },
];

function extraMc(
  questionLatex: string,
  choices: readonly [string, string, string, string],
  correctLetter: McLetter,
  rationales: Partial<Record<McLetter, string>>,
  hintsList: readonly [string, string, string],
  explanation: string,
  skillTags: string[],
  difficulty: Difficulty = 3,
  calculatorAllowed = false,
): McSeed {
  return {
    questionLatex,
    choices,
    correctLetter,
    rationales,
    hints: hintsList,
    solution: [{ step: 1, explanation }],
    skillTags,
    difficulty,
    calculatorAllowed,
  };
}

function extraFrq(
  responseType: ResponseType,
  questionLatex: string,
  difficulty: Difficulty,
  skillTags: string[],
  parts: readonly FrqPart[],
  hintsList: readonly [string, string, string],
  workedSolution: readonly FrqSolutionPart[],
  commonErrors: readonly string[],
): ConstructedSeed {
  return {
    responseType,
    questionLatex,
    difficulty,
    skillTags,
    parts,
    hints: hintsList,
    rubric: {
      maxPoints: parts.reduce((sum, part) => sum + part.points, 0),
      criteria: parts.map((part) => ({
        part: part.letter,
        points: part.points,
        description: `Correctly completes part ${part.letter} with model, calculation, or rule-based reasoning.`,
      })),
    },
    commonErrors,
    workedSolution,
  };
}

const largeTopicExpansions: Record<
  string,
  { mc: readonly McSeed[]; constructed: readonly ConstructedSeed[] }
> = {
  "2.1": {
    mc: [
      extraMc(
        L`Cathode rays produced using different gases have the same value of $e/m$. This supports the conclusion that`,
        [
          "electrons are present in all atoms",
          "canal rays are neutral",
          "neutrons carry negative charge",
          "atomic mass is always constant",
        ],
        "A",
        {
          B: "Canal rays depend on the gas and are positive.",
          C: "Neutrons are neutral and were not identified by cathode-ray $e/m$.",
          D: "Same $e/m$ for electrons does not mean all atoms have same mass.",
        },
        [
          "Cathode rays are streams of electrons.",
          "Their nature did not depend on electrode material or gas.",
          "That points to a universal constituent of atoms.",
        ],
        "The identical $e/m$ value shows that electrons are common negatively charged constituents of atoms.",
        ["cathode_rays", "electron_discovery"],
      ),
      extraMc(
        L`In Rutherford's alpha-particle experiment, the very small fraction of particles that rebounded indicated that the atom contains`,
        [
          "a large empty region only",
          "a small massive positively charged nucleus",
          "electrons spread uniformly in a positive sphere",
          "neutrons in circular orbits",
        ],
        "B",
        {
          A: "Most particles passing through indicates empty space, but rebounding needs a dense positive centre.",
          C: "This is closer to Thomson's model, which Rutherford's result challenged.",
          D: "Neutrons do not explain strong repulsion of alpha particles.",
        },
        [
          "Alpha particles are positively charged.",
          "Strong deflection needs strong repulsion in a tiny region.",
          "That region is the nucleus.",
        ],
        "Large-angle scattering shows that positive charge and most mass are concentrated in a very small nucleus.",
        ["rutherford_model"],
      ),
      extraMc(
        L`An ion has $17$ protons, $18$ neutrons and $18$ electrons. Its symbol is best represented as`,
        [
          L`$^{35}_{17}\mathrm{Cl^-}$`,
          L`$^{35}_{18}\mathrm{Ar^+}$`,
          L`$^{18}_{17}\mathrm{Cl^-}$`,
          L`$^{35}_{17}\mathrm{Cl^+}$`,
        ],
        "A",
        {
          B: "Atomic number is the number of protons, not neutrons or electrons.",
          C: "Mass number is protons plus neutrons, not neutrons alone.",
          D: "One extra electron gives a negative charge.",
        },
        [
          "Atomic number equals protons.",
          "Mass number equals protons plus neutrons.",
          "More electrons than protons gives negative charge.",
        ],
        "$Z=17$, $A=17+18=35$, and charge is $-1$, so the ion is $^{35}_{17}\\mathrm{Cl^-}$.",
        ["atomic_number", "ions"],
      ),
      extraMc(
        L`The pair $^{12}_{6}\mathrm{C}$ and $^{14}_{6}\mathrm{C}$ represents`,
        ["isobars", "isotopes", "isotones", "allotropes"],
        "B",
        {
          A: "Isobars have same mass number but different atomic number.",
          C: "Isotones have same neutron number.",
          D: "Allotropes are different structural forms of an element.",
        },
        [
          "Compare atomic numbers.",
          "The atomic number is the same.",
          "The mass number is different.",
        ],
        "Same atomic number but different mass numbers means the pair consists of isotopes.",
        ["isotopes"],
      ),
      extraMc(
        L`Which statement correctly compares proton, neutron and electron?`,
        [
          "Proton and neutron have nearly equal mass; electron has much smaller mass.",
          "Electron and proton are neutral.",
          "Neutron has charge $+1$.",
          "Electron has mass number $1$.",
        ],
        "A",
        {
          B: "Electron is negative and proton is positive.",
          C: "Neutron is neutral.",
          D: "Electron mass is negligible on the mass-number scale.",
        },
        [
          "Recall relative masses.",
          "Proton and neutron each have mass close to 1 u.",
          "Electron mass is about $1/1837$ of proton mass.",
        ],
        "Protons and neutrons contribute almost all atomic mass; electrons are much lighter.",
        ["subatomic_particles"],
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`An ion of element X has $19$ protons, $20$ neutrons and $18$ electrons.`,
        3,
        ["atomic_structure", "ions"],
        [
          {
            letter: "a",
            promptMarkdown: "Find atomic number and mass number.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Find the charge on the ion.",
            points: 2,
          },
        ],
        [
          "Atomic number is proton count.",
          "Mass number is protons plus neutrons.",
          "Compare protons and electrons for charge.",
        ],
        [
          { part: "a", explanation: "$Z=19$ and $A=19+20=39$." },
          {
            part: "b",
            explanation:
              "There is one more proton than electron, so the charge is $+1$.",
          },
        ],
        ["Using electrons to determine atomic number."],
      ),
      extraFrq(
        "vsaq",
        L`State one observation from Rutherford's scattering experiment and the conclusion drawn from it.`,
        3,
        ["rutherford_model"],
        singlePart("a", "Give one observation-conclusion pair.", 3),
        [
          "Most particles passed through.",
          "Some were strongly deflected.",
          "Link observation to empty space or small nucleus.",
        ],
        [
          {
            part: "a",
            explanation:
              "For example, most alpha particles passed through undeflected, showing that most of the atom is empty space. A few rebounded, showing a small dense positive nucleus.",
          },
        ],
        ["Stating only the observation without conclusion."],
      ),
      extraFrq(
        "saq",
        L`Compare Thomson's and Rutherford's atomic models in terms of positive charge distribution.`,
        3,
        ["atomic_models"],
        [
          { letter: "a", promptMarkdown: "State Thomson's idea.", points: 2 },
          {
            letter: "b",
            promptMarkdown: "State Rutherford's idea.",
            points: 2,
          },
        ],
        [
          "Thomson spread positive charge through the atom.",
          "Rutherford concentrated positive charge.",
          "Use nucleus in Rutherford's model.",
        ],
        [
          {
            part: "a",
            explanation:
              "Thomson's model had positive charge spread throughout the atom with electrons embedded in it.",
          },
          {
            part: "b",
            explanation:
              "Rutherford's model placed positive charge and most mass in a tiny central nucleus.",
          },
        ],
        ["Mixing the two models."],
      ),
      extraFrq(
        "laq",
        L`For two species $^{24}_{12}\mathrm{Mg}$ and $^{25}_{12}\mathrm{Mg}$:`,
        3,
        ["isotopes", "subatomic_particles"],
        [
          {
            letter: "a",
            promptMarkdown: "State whether they are isotopes.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Find neutron number in each.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Explain why their chemical properties are very similar.",
            points: 2,
          },
        ],
        [
          "Isotopes have same atomic number.",
          "Neutrons equal mass number minus atomic number.",
          "Chemical properties depend mainly on electronic configuration.",
        ],
        [
          {
            part: "a",
            explanation:
              "They are isotopes because both have atomic number $12$ but different mass numbers.",
          },
          { part: "b", explanation: "Neutrons are $24-12=12$ and $25-12=13$." },
          {
            part: "c",
            explanation:
              "Neutral atoms of both have $12$ electrons and the same electronic configuration, so their chemical properties are very similar.",
          },
        ],
        [
          "Assuming different mass number means completely different chemical properties.",
        ],
      ),
      extraFrq(
        "case",
        L`A new particle beam is deflected towards the negative plate in an electric field. Its deflection depends strongly on the gas used in the discharge tube.`,
        4,
        ["case_based", "canal_rays"],
        [
          {
            letter: "a",
            promptMarkdown: "State the sign of charge on the particles.",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Are these cathode rays or canal rays?",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Why does gas dependence matter?",
            points: 2,
          },
        ],
        [
          "A beam attracted to the negative plate is positive.",
          "Canal rays are positive rays.",
          "Positive ions depend on gas atoms.",
        ],
        [
          { part: "a", explanation: "The particles are positively charged." },
          { part: "b", explanation: "They are canal rays, not cathode rays." },
          {
            part: "c",
            explanation:
              "Canal rays are positive ions formed from gas particles, so their properties depend on the gas used.",
          },
        ],
        ["Calling every discharge-tube beam an electron beam."],
      ),
    ],
  },
  "2.2": {
    mc: [
      extraMc(
        L`If frequency of radiation is doubled, energy of each photon`,
        ["becomes half", "doubles", "becomes four times", "remains unchanged"],
        "B",
        {
          A: "Photon energy is directly proportional to frequency.",
          C: "There is no square dependence on frequency.",
          D: "Changing frequency changes photon energy.",
        },
        [
          "Use $E=h\\nu$.",
          "$h$ is constant.",
          "Energy is proportional to frequency.",
        ],
        "Since $E=h\\nu$, doubling frequency doubles photon energy.",
        ["photon_energy"],
      ),
      extraMc(
        L`Radiation of frequency $6.0\times10^{14}\text{ Hz}$ has wavelength closest to $(c=3.0\times10^8\text{ m s}^{-1})$`,
        [
          L`$5.0\times10^{-7}\text{ m}$`,
          L`$2.0\times10^6\text{ m}$`,
          L`$1.8\times10^{23}\text{ m}$`,
          L`$5.0\times10^7\text{ m}$`,
        ],
        "A",
        {
          B: "This divides frequency by speed.",
          C: "This multiplies speed and frequency.",
          D: "This has the wrong power of ten.",
        },
        [
          "Use $c=\\lambda\\nu$.",
          "So $\\lambda=c/\\nu$.",
          "Compute $3.0\\times10^8/6.0\\times10^{14}$.",
        ],
        "$\\lambda=5.0\\times10^{-7}\\text{ m}$.",
        ["wavelength_frequency"],
        3,
        true,
      ),
      extraMc(
        L`In photoelectric emission, light below threshold frequency causes`,
        [
          "electron emission with lower kinetic energy",
          "no photoelectron emission",
          "more intense emission",
          "emission only after long exposure",
        ],
        "B",
        {
          A: "Below threshold, each photon lacks minimum required energy.",
          C: "Intensity cannot compensate for insufficient photon energy in this model.",
          D: "Long exposure does not fix too-low photon frequency.",
        },
        [
          "Threshold frequency is a minimum frequency.",
          "Photon energy is $h\\nu$.",
          "Below threshold, energy is insufficient.",
        ],
        "No photoelectrons are emitted below threshold frequency.",
        ["photoelectric_effect"],
      ),
      extraMc(
        L`For a moving particle, de Broglie wavelength is largest when`,
        [
          "mass and speed are both large",
          "momentum is small",
          "frequency is zero",
          "charge is positive",
        ],
        "B",
        {
          A: "Large momentum gives small wavelength.",
          C: "The de Broglie relation uses momentum directly here.",
          D: "Charge sign is not the deciding factor.",
        },
        [
          "Use $\\lambda=h/p$.",
          "Wavelength is inversely proportional to momentum.",
          "Smaller momentum gives larger wavelength.",
        ],
        "Since $\\lambda=h/p$, the wavelength is largest for the smallest momentum.",
        ["de_broglie_relation"],
      ),
      extraMc(
        L`Which relation correctly connects photon energy and wavelength?`,
        [
          L`$E=h\lambda$`,
          L`$E=\frac{hc}{\lambda}$`,
          L`$E=\frac{\lambda}{hc}$`,
          L`$E=mc^2\lambda$`,
        ],
        "B",
        {
          A: "Energy is inversely proportional to wavelength.",
          C: "This is the reciprocal of the correct expression.",
          D: "This mixes unrelated forms for this question.",
        },
        [
          "Start with $E=h\\nu$.",
          "Use $c=\\lambda\\nu$.",
          "Thus $\\nu=c/\\lambda$.",
        ],
        "Substituting $\\nu=c/\\lambda$ into $E=h\\nu$ gives $E=hc/\\lambda$.",
        ["photon_energy", "wavelength"],
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`Calculate the energy of a photon of frequency $5.0\times10^{14}\text{ s}^{-1}$. Take $h=6.63\times10^{-34}\text{ J s}$.`,
        3,
        ["photon_energy"],
        [
          { letter: "a", promptMarkdown: "Write the formula used.", points: 1 },
          { letter: "b", promptMarkdown: "Calculate energy.", points: 3 },
        ],
        [
          "Use Planck's equation.",
          "Multiply $h$ and frequency.",
          "Track powers of ten.",
        ],
        [
          { part: "a", explanation: "$E=h\\nu$." },
          {
            part: "b",
            explanation:
              "$E=(6.63\\times10^{-34})(5.0\\times10^{14})=3.315\\times10^{-19}\\text{ J}$.",
          },
        ],
        ["Adding exponents incorrectly."],
      ),
      extraFrq(
        "saq",
        L`A photon has wavelength $400\text{ nm}$. Find its frequency. Take $c=3.0\times10^8\text{ m s}^{-1}$.`,
        3,
        ["wavelength_frequency"],
        [
          {
            letter: "a",
            promptMarkdown: "Convert wavelength to metre.",
            points: 1,
          },
          { letter: "b", promptMarkdown: "Calculate frequency.", points: 3 },
        ],
        [
          "$1\\text{ nm}=10^{-9}\\text{ m}$.",
          "Use $\\nu=c/\\lambda$.",
          "Keep powers of ten carefully.",
        ],
        [
          {
            part: "a",
            explanation: "$400\\text{ nm}=4.00\\times10^{-7}\\text{ m}$.",
          },
          {
            part: "b",
            explanation:
              "$\\nu=(3.0\\times10^8)/(4.00\\times10^{-7})=7.5\\times10^{14}\\text{ s}^{-1}$.",
          },
        ],
        ["Using nanometres directly as metres."],
      ),
      extraFrq(
        "vsaq",
        L`Why is the photoelectric effect evidence for particle nature of light?`,
        3,
        ["photoelectric_effect"],
        singlePart("a", "Give the reason.", 2),
        [
          "Photoemission depends on photon energy.",
          "A minimum frequency is required.",
          "Energy arrives in packets.",
        ],
        [
          {
            part: "a",
            explanation:
              "Photoelectric emission requires photons of sufficient energy $h\\nu$ and shows a threshold frequency, indicating that light energy is delivered in discrete packets.",
          },
        ],
        ["Explaining it only with wave intensity."],
      ),
      extraFrq(
        "laq",
        L`An electron and a cricket ball move with the same speed.`,
        3,
        ["de_broglie_relation", "matter_waves"],
        [
          {
            letter: "a",
            promptMarkdown: "Which has larger de Broglie wavelength?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Justify using $\\lambda=h/mv$.",
            points: 3,
          },
          {
            letter: "c",
            promptMarkdown:
              "Why is wave nature not normally observed for the cricket ball?",
            points: 1,
          },
        ],
        [
          "Same speed means compare mass.",
          "Smaller mass gives smaller momentum.",
          "Larger mass gives extremely tiny wavelength.",
        ],
        [
          { part: "a", explanation: "The electron has the larger wavelength." },
          {
            part: "b",
            explanation:
              "For the same speed, $\\lambda=h/mv$ is inversely proportional to mass; the electron has much smaller mass.",
          },
          {
            part: "c",
            explanation:
              "The ball's wavelength is too small to observe in ordinary situations.",
          },
        ],
        ["Saying larger object has larger matter wave."],
      ),
      extraFrq(
        "case",
        L`A metal surface is illuminated with light in three trials: frequency below threshold, frequency just above threshold, and higher intensity at the below-threshold frequency.`,
        4,
        ["case_based", "photoelectric_effect"],
        [
          {
            letter: "a",
            promptMarkdown: "What happens below threshold?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "What happens just above threshold?",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown:
              "Does higher intensity below threshold cause emission?",
            points: 2,
          },
        ],
        [
          "Threshold frequency is a minimum.",
          "Above threshold photons can eject electrons.",
          "Below threshold, intensity does not fix photon energy.",
        ],
        [
          { part: "a", explanation: "No photoelectrons are emitted." },
          {
            part: "b",
            explanation:
              "Photoelectrons are emitted, with small kinetic energy if the frequency is just above threshold.",
          },
          {
            part: "c",
            explanation:
              "No. More below-threshold photons still have insufficient energy per photon.",
          },
        ],
        ["Treating intensity as equivalent to frequency."],
      ),
    ],
  },
  "2.3": {
    mc: [
      extraMc(
        L`In Bohr's model, angular momentum of an electron in the $n$th orbit is`,
        [L`$nh/2\pi$`, L`$2\pi h/n$`, L`$n^2h$`, L`$h/n^2$`],
        "A",
        {
          B: "This inverts the Bohr quantisation condition.",
          C: "The dependence is linear in $n$, not $n^2$.",
          D: "This decreases with $n$ incorrectly.",
        },
        [
          "Recall Bohr's quantisation postulate.",
          "Angular momentum is integral multiple of $h/2\\pi$.",
          "Use quantum number $n$.",
        ],
        "Bohr proposed $mvr=nh/2\\pi$.",
        ["bohr_postulates"],
      ),
      extraMc(
        L`For hydrogen, which level has the lowest energy?`,
        [L`$n=1$`, L`$n=2$`, L`$n=3$`, L`$n=\infty$`],
        "A",
        {
          B: "Higher $n$ levels are less negative and therefore higher in energy.",
          C: "This is still above the ground state.",
          D: "At infinity the electron is free with zero energy.",
        },
        [
          "Hydrogen energies are negative.",
          "$E_n=-13.6/n^2\\text{ eV}$.",
          "Most negative energy is lowest.",
        ],
        "The $n=1$ level has energy $-13.6\\text{ eV}$ and is the lowest.",
        ["bohr_energy"],
      ),
      extraMc(
        L`A spectral line ending at $n=1$ in hydrogen belongs to the`,
        ["Lyman series", "Balmer series", "Paschen series", "Brackett series"],
        "A",
        {
          B: "Balmer lines end at $n=2$.",
          C: "Paschen lines end at $n=3$.",
          D: "Brackett lines end at $n=4$.",
        },
        [
          "Series are named by final level.",
          "The final level is $n=1$.",
          "That is Lyman series.",
        ],
        "Transitions ending at $n=1$ form the Lyman series.",
        ["hydrogen_spectrum"],
      ),
      extraMc(
        L`For hydrogen, radius of the third Bohr orbit compared with the first is`,
        ["three times", "six times", "nine times", "one-third"],
        "C",
        {
          A: "Radius varies as $n^2$, not $n$.",
          B: "This has no Bohr-radius basis.",
          D: "Radius increases with $n$.",
        },
        ["Use $r_n\\propto n^2$.", "Compare $n=3$ with $n=1$.", "$3^2=9$."],
        "$r_3/r_1=3^2/1^2=9$.",
        ["bohr_radius"],
      ),
      extraMc(
        L`Absorption of energy by a hydrogen atom corresponds to transition from`,
        [
          L`$n=3$ to $n=2$`,
          L`$n=4$ to $n=1$`,
          L`$n=2$ to $n=5$`,
          "any higher level to lower level",
        ],
        "C",
        {
          A: "This emits energy because final level is lower.",
          B: "This also emits energy.",
          D: "Higher to lower transitions emit energy.",
        },
        [
          "Absorption moves electron upward.",
          "Energy increases with $n$.",
          "Choose lower $n$ to higher $n$.",
        ],
        "A transition from $n=2$ to $n=5$ requires absorption of energy.",
        ["absorption_emission"],
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`For hydrogen atom, $E_n=-13.6/n^2\text{ eV}$.`,
        3,
        ["bohr_energy"],
        [
          { letter: "a", promptMarkdown: "Find $E_2$.", points: 2 },
          {
            letter: "b",
            promptMarkdown:
              "Find energy absorbed in transition $n=2$ to $n=4$.",
            points: 2,
          },
        ],
        [
          "Substitute $n=2$.",
          "Find $E_4$ also.",
          "Absorbed energy is final minus initial.",
        ],
        [
          { part: "a", explanation: "$E_2=-13.6/4=-3.40\\text{ eV}$." },
          {
            part: "b",
            explanation:
              "$E_4=-13.6/16=-0.85\\text{ eV}$; absorbed energy $=-0.85-(-3.40)=2.55\\text{ eV}$.",
          },
        ],
        ["Subtracting energies in the wrong direction for absorption."],
      ),
      extraFrq(
        "vsaq",
        L`Why did Bohr's model explain line spectra better than Rutherford's model?`,
        3,
        ["bohr_model", "line_spectra"],
        singlePart("a", "Give the reason.", 2),
        [
          "Rutherford did not have quantised orbits.",
          "Bohr allowed only certain energies.",
          "Transitions between fixed levels give fixed frequencies.",
        ],
        [
          {
            part: "a",
            explanation:
              "Bohr introduced quantised stationary orbits. Electrons emit or absorb only when jumping between these levels, giving discrete spectral lines.",
          },
        ],
        ["Saying only that Bohr added circular paths."],
      ),
      extraFrq(
        "saq",
        L`The radius of the first Bohr orbit of hydrogen is $a_0$.`,
        2,
        ["bohr_radius"],
        [
          {
            letter: "a",
            promptMarkdown: "Write radius of the fourth orbit.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "State the proportionality used.",
            points: 2,
          },
        ],
        [
          "Use $r_n=n^2a_0$.",
          "For $n=4$, square $4$.",
          "State radius varies as $n^2$.",
        ],
        [
          { part: "a", explanation: "$r_4=4^2a_0=16a_0$." },
          {
            part: "b",
            explanation: "Bohr radius of orbit varies as $n^2$ for hydrogen.",
          },
        ],
        ["Using $4a_0$ instead of $16a_0$."],
      ),
      extraFrq(
        "laq",
        L`A hydrogen atom emits radiation when an electron moves from $n=4$ to $n=2$.`,
        4,
        ["hydrogen_spectrum", "emission"],
        [
          {
            letter: "a",
            promptMarkdown: "Does the atom absorb or emit energy?",
            points: 1,
          },
          {
            letter: "b",
            promptMarkdown: "Name the spectral series.",
            points: 2,
          },
          {
            letter: "c",
            promptMarkdown: "Explain the basis of the series name.",
            points: 2,
          },
        ],
        [
          "The final level is lower.",
          "Series name depends on final level.",
          "Final level $n=2$ means Balmer.",
        ],
        [
          { part: "a", explanation: "The atom emits energy." },
          { part: "b", explanation: "It belongs to the Balmer series." },
          {
            part: "c",
            explanation:
              "All hydrogen transitions ending at $n=2$ are in the Balmer series.",
          },
        ],
        ["Naming the series from initial level."],
      ),
      extraFrq(
        "case",
        L`A set of hydrogen spectral lines has final level $n=1$, another has final level $n=2$, and a third has final level $n=3$.`,
        3,
        ["case_based", "spectral_series"],
        [
          { letter: "a", promptMarkdown: "Name the first set.", points: 1 },
          { letter: "b", promptMarkdown: "Name the second set.", points: 1 },
          { letter: "c", promptMarkdown: "Name the third set.", points: 1 },
          {
            letter: "d",
            promptMarkdown:
              "Which set lies in the visible region for hydrogen?",
            points: 2,
          },
        ],
        [
          "Recall final-level series names.",
          "$n=1$ is Lyman.",
          "$n=2$ is Balmer and visible.",
        ],
        [
          { part: "a", explanation: "$n=1$ final level gives Lyman series." },
          { part: "b", explanation: "$n=2$ final level gives Balmer series." },
          { part: "c", explanation: "$n=3$ final level gives Paschen series." },
          {
            part: "d",
            explanation: "The Balmer series contains visible hydrogen lines.",
          },
        ],
        ["Confusing initial and final quantum levels."],
      ),
    ],
  },
  "2.4": {
    mc: [
      extraMc(
        L`Which set of quantum numbers is not allowed?`,
        [
          L`$n=3,\ l=2,\ m_l=0$`,
          L`$n=3,\ l=3,\ m_l=0$`,
          L`$n=4,\ l=0,\ m_l=0$`,
          L`$n=2,\ l=1,\ m_l=-1$`,
        ],
        "B",
        {
          A: "For $n=3$, $l=2$ is allowed.",
          C: "For any $n$, $l=0$ and $m_l=0$ are allowed.",
          D: "For $l=1$, $m_l=-1,0,+1$ are allowed.",
        },
        [
          "For a given $n$, $l$ ranges from $0$ to $n-1$.",
          "If $n=3$, maximum $l$ is $2$.",
          "$l=3$ is invalid.",
        ],
        "$n=3,l=3$ is not allowed because $l$ must be $0,1,2$.",
        ["quantum_numbers"],
      ),
      extraMc(
        L`The number of orbitals in a $d$ subshell is`,
        ["1", "3", "5", "7"],
        "C",
        {
          A: "One orbital belongs to an $s$ subshell.",
          B: "Three orbitals belong to a $p$ subshell.",
          D: "Seven orbitals belong to an $f$ subshell.",
        },
        [
          "For $d$, $l=2$.",
          "$m_l$ values run from $-2$ to $+2$.",
          "Count five values.",
        ],
        "A $d$ subshell has five orbitals.",
        ["orbitals"],
      ),
      extraMc(
        L`For a $4p$ orbital, the number of radial nodes is`,
        ["0", "1", "2", "3"],
        "C",
        {
          A: "This ignores the principal quantum number.",
          B: "This would fit $3p$.",
          D: "This is total nodes for $4p$, not radial nodes.",
        },
        ["Use radial nodes $=n-l-1$.", "For $p$, $l=1$.", "$4-1-1=2$."],
        "Radial nodes in $4p$ are $4-1-1=2$.",
        ["nodes", "quantum_model"],
      ),
      extraMc(
        L`The angular momentum quantum number for a $p$ orbital is`,
        [L`$0$`, L`$1$`, L`$2$`, L`$3$`],
        "B",
        {
          A: "$l=0$ is for $s$ orbitals.",
          C: "$l=2$ is for $d$ orbitals.",
          D: "$l=3$ is for $f$ orbitals.",
        },
        [
          "Map subshell letters to $l$ values.",
          "$s,p,d,f$ correspond to $0,1,2,3$.",
          "Thus $p$ has $l=1$.",
        ],
        "For a $p$ subshell, $l=1$.",
        ["quantum_numbers"],
      ),
      extraMc(
        L`The maximum number of electrons in the shell $n=3$ is`,
        ["6", "9", "18", "32"],
        "C",
        {
          A: "This counts only $p$ orbitals.",
          B: "This is $n^2$, the number of orbitals.",
          D: "This is for $n=4$.",
        },
        [
          "Maximum electrons in a shell is $2n^2$.",
          "Substitute $n=3$.",
          "$2(9)=18$.",
        ],
        "The $n=3$ shell can hold $2n^2=18$ electrons.",
        ["shell_capacity"],
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`For the subshell $3d$:`,
        3,
        ["quantum_numbers", "orbitals"],
        [
          { letter: "a", promptMarkdown: "State $n$ and $l$.", points: 2 },
          {
            letter: "b",
            promptMarkdown: "State possible $m_l$ values.",
            points: 2,
          },
        ],
        [
          "The first number gives $n$.",
          "$d$ means $l=2$.",
          "$m_l$ ranges from $-l$ to $+l$.",
        ],
        [
          { part: "a", explanation: "$n=3$ and $l=2$." },
          { part: "b", explanation: "$m_l=-2,-1,0,+1,+2$." },
        ],
        ["Writing only positive $m_l$ values."],
      ),
      extraFrq(
        "vsaq",
        L`What is the physical meaning of an atomic orbital in the quantum mechanical model?`,
        2,
        ["orbital_concept"],
        singlePart("a", "State the meaning.", 2),
        [
          "It is not a fixed circular path.",
          "It is related to probability.",
          "Mention region around nucleus.",
        ],
        [
          {
            part: "a",
            explanation:
              "An orbital is a three-dimensional region around the nucleus where the probability of finding an electron is high.",
          },
        ],
        ["Calling an orbital a fixed Bohr orbit."],
      ),
      extraFrq(
        "saq",
        L`Find total and angular nodes in a $3p$ orbital.`,
        4,
        ["nodes"],
        [
          { letter: "a", promptMarkdown: "Find total nodes.", points: 2 },
          { letter: "b", promptMarkdown: "Find angular nodes.", points: 2 },
        ],
        ["Total nodes are $n-1$.", "Angular nodes are $l$.", "For $p$, $l=1$."],
        [
          { part: "a", explanation: "Total nodes $=n-1=3-1=2$." },
          { part: "b", explanation: "Angular nodes $=l=1$ for a $p$ orbital." },
        ],
        ["Confusing radial and angular nodes."],
      ),
      extraFrq(
        "laq",
        L`Check whether the following quantum-number sets are possible: P: $n=2,l=1,m_l=0,m_s=+1/2$; Q: $n=2,l=2,m_l=0,m_s=-1/2$; R: $n=3,l=0,m_l=1,m_s=+1/2$.`,
        5,
        ["quantum_numbers", "validation"],
        [
          { letter: "a", promptMarkdown: "Judge P.", points: 1 },
          { letter: "b", promptMarkdown: "Judge Q.", points: 2 },
          { letter: "c", promptMarkdown: "Judge R.", points: 2 },
        ],
        [
          "For a given $n$, $l=0$ to $n-1$.",
          "For a given $l$, $m_l=-l$ to $+l$.",
          "Spin can be $+1/2$ or $-1/2$.",
        ],
        [
          { part: "a", explanation: "P is possible." },
          {
            part: "b",
            explanation:
              "Q is impossible because for $n=2$, $l$ can only be $0$ or $1$.",
          },
          {
            part: "c",
            explanation:
              "R is impossible because if $l=0$, then $m_l$ must be $0$.",
          },
        ],
        ["Checking spin only and ignoring $l,m_l$ restrictions."],
      ),
      extraFrq(
        "case",
        L`A student lists $2s$, $2p$, $3d$ and $4f$ subshells while arranging orbitals by quantum numbers.`,
        3,
        ["case_based", "subshells"],
        [
          { letter: "a", promptMarkdown: "State $l$ for $2s$.", points: 1 },
          {
            letter: "b",
            promptMarkdown: "State number of orbitals in $2p$.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "State number of orbitals in $3d$.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "State maximum electrons in $4f$.",
            points: 2,
          },
        ],
        [
          "Map $s,p,d,f$ to $0,1,2,3$.",
          "Number of orbitals in a subshell is $2l+1$.",
          "Each orbital holds two electrons.",
        ],
        [
          { part: "a", explanation: "For $s$, $l=0$." },
          { part: "b", explanation: "$p$ has three orbitals." },
          { part: "c", explanation: "$d$ has five orbitals." },
          {
            part: "d",
            explanation:
              "$f$ has seven orbitals, so it can hold $14$ electrons.",
          },
        ],
        ["Using shell number as number of orbitals."],
      ),
    ],
  },
  "2.5": {
    mc: [
      extraMc(
        L`The correct electronic configuration of $\mathrm{Cr}$ is`,
        [
          L`$[\mathrm{Ar}]3d^4 4s^2$`,
          L`$[\mathrm{Ar}]3d^5 4s^1$`,
          L`$[\mathrm{Ar}]3d^6$`,
          L`$[\mathrm{Ar}]4s^2 4p^4$`,
        ],
        "B",
        {
          A: "Chromium is an exception due to half-filled $3d$ stability.",
          C: "This omits the $4s$ electron arrangement.",
          D: "This puts electrons in the wrong subshell.",
        },
        [
          "Recall exceptional stability.",
          "Half-filled $d^5$ is stable.",
          "Chromium has $3d^5 4s^1$.",
        ],
        "Chromium adopts $[\\mathrm{Ar}]3d^5 4s^1$ due to the stability of half-filled $d$ subshell.",
        ["electronic_configuration", "exceptional_configuration"],
      ),
      extraMc(
        L`According to Hund's rule, electrons entering degenerate orbitals first`,
        [
          "pair up in one orbital",
          "occupy singly with parallel spins",
          "enter higher shell first",
          "avoid all orbitals",
        ],
        "B",
        {
          A: "Pairing occurs after each degenerate orbital is singly occupied.",
          C: "Hund's rule compares degenerate orbitals in the same subshell.",
          D: "Electrons must occupy orbitals.",
        },
        [
          "Degenerate means same energy.",
          "Repulsion is reduced by single occupation.",
          "Spins remain parallel before pairing.",
        ],
        "Hund's rule says electrons occupy degenerate orbitals singly with parallel spins before pairing.",
        ["hund_rule"],
      ),
      extraMc(
        L`The maximum number of electrons in one orbital is two because of`,
        [
          "Aufbau principle",
          "Pauli exclusion principle",
          "Hund's rule",
          "Heisenberg uncertainty principle",
        ],
        "B",
        {
          A: "Aufbau gives filling order.",
          C: "Hund's rule governs degenerate orbital occupation.",
          D: "Uncertainty principle does not set two electrons per orbital.",
        },
        [
          "An orbital is described by three quantum numbers.",
          "Two electrons in it must differ in spin.",
          "This is Pauli exclusion.",
        ],
        "Pauli exclusion principle limits an orbital to two electrons with opposite spins.",
        ["pauli_principle"],
      ),
      extraMc(
        L`The configuration of $\mathrm{Mg^{2+}}$ is`,
        [
          L`$1s^2 2s^2 2p^6$`,
          L`$1s^2 2s^2 2p^6 3s^2$`,
          L`$1s^2 2s^2 2p^4$`,
          L`$1s^2 2s^2 2p^6 3p^2$`,
        ],
        "A",
        {
          B: "This is neutral magnesium.",
          C: "This removes too many electrons.",
          D: "This uses the wrong subshell.",
        },
        [
          "Neutral magnesium has 12 electrons.",
          "$\\mathrm{Mg^{2+}}$ has lost two electrons.",
          "Ten electrons give neon configuration.",
        ],
        "$\\mathrm{Mg^{2+}}$ has 10 electrons, so its configuration is $1s^2 2s^2 2p^6$.",
        ["ionic_configuration"],
      ),
      extraMc(
        L`The extra stability of half-filled and fully-filled subshells is commonly associated with`,
        [
          "symmetry and exchange energy",
          "larger nuclear size only",
          "absence of protons",
          "formation of photons inside orbitals",
        ],
        "A",
        {
          B: "Nuclear size alone does not explain the configuration exception.",
          C: "Atoms still contain protons.",
          D: "This is not the reason for subshell stability.",
        },
        [
          "Half-filled and fully-filled arrangements are more symmetrical.",
          "Exchange energy also contributes.",
          "This explains cases like Cr and Cu.",
        ],
        "Symmetrical distribution and exchange energy give extra stability to half-filled and fully-filled subshells.",
        ["subshell_stability"],
      ),
    ],
    constructed: [
      extraFrq(
        "saq",
        L`Write the electronic configuration of phosphorus, $Z=15$, and identify its valence shell electrons.`,
        3,
        ["electronic_configuration"],
        [
          {
            letter: "a",
            promptMarkdown: "Write full configuration.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Identify valence shell electrons.",
            points: 2,
          },
        ],
        [
          "Fill orbitals by Aufbau order.",
          "Phosphorus has 15 electrons.",
          "The outermost shell is $n=3$.",
        ],
        [
          { part: "a", explanation: "$1s^2 2s^2 2p^6 3s^2 3p^3$." },
          {
            part: "b",
            explanation: "Valence shell electrons are $3s^2 3p^3$, total $5$.",
          },
        ],
        ["Stopping after noble-gas core without valence electrons."],
      ),
      extraFrq(
        "vsaq",
        L`Why is $\mathrm{Cu}$ written as $[\mathrm{Ar}]3d^{10}4s^1$ instead of $[\mathrm{Ar}]3d^9 4s^2$?`,
        3,
        ["exceptional_configuration"],
        singlePart("a", "Give the reason.", 2),
        [
          "Copper is an exception.",
          "A filled $3d^{10}$ subshell is especially stable.",
          "One $4s$ electron is promoted to $3d$.",
        ],
        [
          {
            part: "a",
            explanation:
              "Copper attains the extra stability of a completely filled $3d^{10}$ subshell, so its configuration is $[\\mathrm{Ar}]3d^{10}4s^1$.",
          },
        ],
        [
          "Saying Aufbau principle is simply wrong rather than noting stability exception.",
        ],
      ),
      extraFrq(
        "saq",
        L`For nitrogen atom, $Z=7$:`,
        3,
        ["hund_rule", "electronic_configuration"],
        [
          {
            letter: "a",
            promptMarkdown: "Write electronic configuration.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "State number of unpaired electrons.",
            points: 2,
          },
        ],
        [
          "Fill $1s$, $2s$, then $2p$.",
          "Nitrogen has $2p^3$.",
          "Hund's rule keeps the three $p$ electrons unpaired.",
        ],
        [
          { part: "a", explanation: "$1s^2 2s^2 2p^3$." },
          {
            part: "b",
            explanation:
              "The three $2p$ electrons occupy separate orbitals, so nitrogen has $3$ unpaired electrons.",
          },
        ],
        ["Pairing $p$ electrons before single occupation."],
      ),
      extraFrq(
        "laq",
        L`Explain Aufbau principle, Pauli exclusion principle and Hund's rule using the filling of oxygen atom, $Z=8$.`,
        5,
        ["filling_rules", "electronic_configuration"],
        [
          {
            letter: "a",
            promptMarkdown: "Write oxygen configuration.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "Name how Aufbau is used.",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Name how Pauli principle is used.",
            points: 1,
          },
          {
            letter: "d",
            promptMarkdown: "Name how Hund's rule is used.",
            points: 1,
          },
        ],
        [
          "Oxygen has eight electrons.",
          "Fill lower-energy orbitals first.",
          "In $2p^4$, three orbitals get one electron before pairing.",
        ],
        [
          {
            part: "a",
            explanation: "Oxygen configuration is $1s^2 2s^2 2p^4$.",
          },
          {
            part: "b",
            explanation: "Aufbau principle fills $1s$, then $2s$, then $2p$.",
          },
          {
            part: "c",
            explanation:
              "Pauli principle allows at most two opposite-spin electrons in one orbital.",
          },
          {
            part: "d",
            explanation:
              "Hund's rule places electrons singly in the three $2p$ orbitals before pairing the fourth.",
          },
        ],
        ["Listing rules without connecting them to the configuration."],
      ),
      extraFrq(
        "case",
        L`Three species have $10$ electrons each: $\mathrm{Ne}$, $\mathrm{Na^+}$ and $\mathrm{F^-}$.`,
        4,
        ["case_based", "isoelectronic_species"],
        [
          {
            letter: "a",
            promptMarkdown: "Write their common electronic configuration.",
            points: 2,
          },
          {
            letter: "b",
            promptMarkdown: "What term describes such species?",
            points: 1,
          },
          {
            letter: "c",
            promptMarkdown: "Why can their sizes still differ?",
            points: 2,
          },
        ],
        [
          "Ten electrons give neon configuration.",
          "Same electron count means isoelectronic.",
          "Nuclear charge differs.",
        ],
        [
          {
            part: "a",
            explanation: "All have configuration $1s^2 2s^2 2p^6$.",
          },
          { part: "b", explanation: "They are isoelectronic species." },
          {
            part: "c",
            explanation:
              "They have different numbers of protons, so the same electron cloud is attracted with different nuclear charge.",
          },
        ],
        ["Assuming same electron count always means same radius."],
      ),
    ],
  },
};

const expandedTopicSeeds: readonly TopicSeed[] = topicSeeds.map((seed) => {
  const extra = largeTopicExpansions[seed.topicCode];
  if (!extra) return seed;

  return {
    ...seed,
    mc: [...seed.mc, ...extra.mc],
    constructed: [...seed.constructed, ...extra.constructed],
  };
});

export const structureOfAtomTopics: Topic[] = expandedTopicSeeds.map(makeTopic);
