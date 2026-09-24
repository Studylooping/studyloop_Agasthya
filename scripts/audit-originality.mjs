import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { calibrateCbsePhysicsDifficulty } from "../lib/content/difficulty-calibration.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const unitConfigs = [
  {
    slug: "u1-limits",
    exportName: "limitTopics",
    sourceParts: ["content", "calc-ab", "u1-limits", "topics.ts"],
  },
  {
    slug: "u2-differentiation",
    exportName: "differentiationTopics",
    sourceParts: ["content", "calc-ab", "u2-differentiation", "topics.ts"],
  },
  {
    slug: "u3-comp-implicit",
    exportName: "compositeImplicitTopics",
    sourceParts: ["content", "calc-ab", "u3-comp-implicit", "topics.ts"],
  },
  {
    slug: "u4-contextual-app",
    exportName: "contextualApplicationTopics",
    sourceParts: ["content", "calc-ab", "u4-contextual-app", "topics.ts"],
  },
  {
    slug: "u5-analytical-app",
    exportName: "analyticalApplicationTopics",
    sourceParts: ["content", "calc-ab", "u5-analytical-app", "topics.ts"],
  },
  {
    slug: "u6-integration",
    exportName: "integrationTopics",
    sourceParts: ["content", "calc-ab", "u6-integration", "topics.ts"],
  },
  {
    slug: "u7-diff-eqs",
    exportName: "differentialEquationTopics",
    sourceParts: ["content", "calc-ab", "u7-diff-eqs", "topics.ts"],
  },
  {
    slug: "u8-app-integration",
    exportName: "applicationIntegrationTopics",
    sourceParts: ["content", "calc-ab", "u8-app-integration", "topics.ts"],
  },
  {
    slug: "u1-relations-functions",
    exportName: "relationsFunctionsTopics",
    sourceParts: [
      "content",
      "cbse-math-12",
      "u1-relations-functions",
      "topics.ts",
    ],
  },
  {
    slug: "u2-algebra",
    exportName: "algebraTopics",
    sourceParts: ["content", "cbse-math-12", "u2-algebra", "topics.ts"],
  },
  {
    slug: "u3-calculus",
    exportName: "calculusTopics",
    sourceParts: ["content", "cbse-math-12", "u3-calculus", "topics.ts"],
  },
  {
    slug: "u4-vectors-3d",
    exportName: "vectors3dTopics",
    sourceParts: ["content", "cbse-math-12", "u4-vectors-3d", "topics.ts"],
  },
  {
    slug: "u5-linear-programming",
    exportName: "linearProgrammingTopics",
    sourceParts: [
      "content",
      "cbse-math-12",
      "u5-linear-programming",
      "topics.ts",
    ],
  },
  {
    slug: "u6-probability",
    exportName: "probabilityTopics",
    sourceParts: ["content", "cbse-math-12", "u6-probability", "topics.ts"],
  },
  {
    slug: "u1-sets-functions",
    exportName: "setsFunctionsTopics",
    sourceParts: ["content", "cbse-math-11", "u1-sets-functions", "topics.ts"],
  },
  {
    slug: "u2-algebra-xi",
    exportName: "algebraXiTopics",
    sourceParts: ["content", "cbse-math-11", "u2-algebra-xi", "topics.ts"],
  },
  {
    slug: "u3-coordinate-geometry",
    exportName: "coordinateGeometryTopics",
    sourceParts: [
      "content",
      "cbse-math-11",
      "u3-coordinate-geometry",
      "topics.ts",
    ],
  },
  {
    slug: "u4-calculus-xi",
    exportName: "calculusXiTopics",
    sourceParts: ["content", "cbse-math-11", "u4-calculus-xi", "topics.ts"],
  },
  {
    slug: "u5-statistics-probability",
    exportName: "statisticsProbabilityTopics",
    sourceParts: [
      "content",
      "cbse-math-11",
      "u5-statistics-probability",
      "topics.ts",
    ],
  },
  {
    slug: "u1-number-systems",
    exportName: "numberSystemsXTopics",
    sourceParts: ["content", "cbse-math-10", "u1-number-systems", "topics.ts"],
  },
  {
    slug: "u2-algebra-x",
    exportName: "algebraXTopics",
    sourceParts: ["content", "cbse-math-10", "u2-algebra-x", "topics.ts"],
  },
  {
    slug: "cbse-math-10/u3-coordinate-geometry",
    exportName: "coordinateGeometryXTopics",
    sourceParts: [
      "content",
      "cbse-math-10",
      "u3-coordinate-geometry",
      "topics.ts",
    ],
  },
  {
    slug: "cbse-math-10/u4-geometry",
    exportName: "geometryXTopics",
    sourceParts: ["content", "cbse-math-10", "u4-geometry", "topics.ts"],
  },
  {
    slug: "cbse-math-10/u5-trigonometry",
    exportName: "trigonometryXTopics",
    sourceParts: ["content", "cbse-math-10", "u5-trigonometry", "topics.ts"],
  },
  {
    slug: "cbse-math-10/u6-mensuration",
    exportName: "mensurationXTopics",
    sourceParts: ["content", "cbse-math-10", "u6-mensuration", "topics.ts"],
  },
  {
    slug: "u1-number-system",
    exportName: "numberSystemTopics",
    sourceParts: ["content", "cbse-math-9", "u1-number-system", "topics.ts"],
  },
  {
    slug: "u2-algebra-ix",
    exportName: "algebraTopics",
    sourceParts: ["content", "cbse-math-9", "u2-algebra", "topics.ts"],
  },
  {
    slug: "u3-coordinate-geometry-ix",
    exportName: "coordinateGeometryIxTopics",
    sourceParts: [
      "content",
      "cbse-math-9",
      "u3-coordinate-geometry",
      "topics.ts",
    ],
  },
  {
    slug: "u4-geometry",
    exportName: "geometryIxTopics",
    sourceParts: ["content", "cbse-math-9", "u4-geometry", "topics.ts"],
  },
  {
    slug: "u5-mensuration",
    exportName: "mensurationIxTopics",
    sourceParts: ["content", "cbse-math-9", "u5-mensuration", "topics.ts"],
  },
  {
    slug: "u6-statistics-probability",
    exportName: "statisticsProbabilityIxTopics",
    sourceParts: [
      "content",
      "cbse-math-9",
      "u6-statistics-probability",
      "topics.ts",
    ],
  },
  {
    slug: "u1-world-of-living",
    exportName: "worldOfLivingTopics",
    sourceParts: [
      "content",
      "cbse-science-9",
      "u1-world-of-living",
      "topics.ts",
    ],
  },
  {
    slug: "u2-matter-nature-behaviour",
    exportName: "matterNatureBehaviourTopics",
    sourceParts: [
      "content",
      "cbse-science-9",
      "u2-matter-nature-behaviour",
      "topics.ts",
    ],
  },
  {
    slug: "u3-motion-force-work-sound",
    exportName: "motionForceWorkSoundTopics",
    sourceParts: [
      "content",
      "cbse-science-9",
      "u3-motion-force-work-sound",
      "topics.ts",
    ],
  },
  {
    slug: "u4-earth-as-a-system",
    exportName: "earthAsSystemTopics",
    sourceParts: [
      "content",
      "cbse-science-9",
      "u4-earth-as-a-system",
      "topics.ts",
    ],
  },
  {
    slug: "internal-assessment-practicals",
    exportName: "scienceIaTopics",
    sourceParts: [
      "content",
      "cbse-science-9",
      "internal-assessment-practicals",
      "topics.ts",
    ],
  },
  {
    slug: "u1-chemical-substances-nature-behaviour",
    exportName: "chemicalSubstancesNatureBehaviourTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "u1-chemical-substances-nature-behaviour",
      "topics.ts",
    ],
  },
  {
    slug: "u2-world-of-living",
    exportName: "worldOfLivingXTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "u2-world-of-living",
      "topics.ts",
    ],
  },
  {
    slug: "u3-natural-phenomena",
    exportName: "naturalPhenomenaXTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "u3-natural-phenomena",
      "topics.ts",
    ],
  },
  {
    slug: "u4-effects-of-current",
    exportName: "effectsOfCurrentXTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "u4-effects-of-current",
      "topics.ts",
    ],
  },
  {
    slug: "u5-natural-resources",
    exportName: "naturalResourcesXTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "u5-natural-resources",
      "topics.ts",
    ],
  },
  {
    slug: "cbse-science-10/formative-reinforcement",
    exportName: "science10FormativeReinforcementTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "formative-reinforcement",
      "topics.ts",
    ],
  },
  {
    slug: "cbse-science-10/internal-assessment-practicals",
    exportName: "science10PracticalsTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "internal-assessment-practicals",
      "topics.ts",
    ],
  },
  {
    slug: "u1-physical-world-measurement",
    exportName: "physicalWorldMeasurementTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u1-physical-world-measurement",
      "topics.ts",
    ],
  },
  {
    slug: "u2-kinematics",
    exportName: "kinematicsTopics",
    sourceParts: ["content", "cbse-physics-11", "u2-kinematics", "topics.ts"],
  },
  {
    slug: "u3-laws-of-motion",
    exportName: "lawsOfMotionTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u3-laws-of-motion",
      "topics.ts",
    ],
  },
  {
    slug: "u4-work-energy-power",
    exportName: "workEnergyPowerTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u4-work-energy-power",
      "topics.ts",
    ],
  },
  {
    slug: "u5-system-particles-rigid-body",
    exportName: "systemParticlesRigidBodyTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u5-system-particles-rigid-body",
      "topics.ts",
    ],
  },
  {
    slug: "u6-gravitation",
    exportName: "gravitationTopics",
    sourceParts: ["content", "cbse-physics-11", "u6-gravitation", "topics.ts"],
  },
  {
    slug: "u7-properties-bulk-matter",
    exportName: "propertiesBulkMatterTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u7-properties-bulk-matter",
      "topics.ts",
    ],
  },
  {
    slug: "u8-thermodynamics",
    exportName: "thermodynamicsTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u8-thermodynamics",
      "topics.ts",
    ],
  },
  {
    slug: "u9-kinetic-theory",
    exportName: "kineticTheoryTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u9-kinetic-theory",
      "topics.ts",
    ],
  },
  {
    slug: "u10-oscillations-waves",
    exportName: "oscillationsWavesTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u10-oscillations-waves",
      "topics.ts",
    ],
  },
  {
    slug: "practicals-activities",
    exportName: "practicalsActivitiesTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "practicals-activities",
      "topics.ts",
    ],
  },
  {
    slug: "u1-electrostatics",
    exportName: "electrostaticsTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u1-electrostatics",
      "topics.ts",
    ],
  },
  {
    slug: "u2-current-electricity",
    exportName: "currentElectricityTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u2-current-electricity",
      "topics.ts",
    ],
  },
  {
    slug: "u3-magnetic-effects-current-magnetism",
    exportName: "magneticEffectsCurrentMagnetismTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u3-magnetic-effects-current-magnetism",
      "topics.ts",
    ],
  },
  {
    slug: "u4-electromagnetic-induction-alternating-currents",
    exportName: "electromagneticInductionAlternatingCurrentsTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u4-electromagnetic-induction-alternating-currents",
      "topics.ts",
    ],
  },
  {
    slug: "u5-electromagnetic-waves",
    exportName: "electromagneticWavesTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u5-electromagnetic-waves",
      "topics.ts",
    ],
  },
  {
    slug: "u6-optics",
    exportName: "opticsTopics",
    sourceParts: ["content", "cbse-physics-12", "u6-optics", "topics.ts"],
  },
  {
    slug: "u7-dual-nature-radiation-matter",
    exportName: "dualNatureRadiationMatterTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u7-dual-nature-radiation-matter",
      "topics.ts",
    ],
  },
  {
    slug: "u1-some-basic-concepts",
    exportName: "someBasicConceptsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u1-some-basic-concepts",
      "topics.ts",
    ],
  },
  {
    slug: "u2-structure-of-atom",
    exportName: "structureOfAtomTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u2-structure-of-atom",
      "topics.ts",
    ],
  },
  {
    slug: "u3-classification-periodicity",
    exportName: "classificationPeriodicityTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u3-classification-periodicity",
      "topics.ts",
    ],
  },
  {
    slug: "u4-chemical-bonding-molecular-structure",
    exportName: "chemicalBondingTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u4-chemical-bonding-molecular-structure",
      "topics.ts",
    ],
  },
  {
    slug: "u5-chemical-thermodynamics",
    exportName: "chemicalThermodynamicsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u5-chemical-thermodynamics",
      "topics.ts",
    ],
  },
  {
    slug: "u6-equilibrium",
    exportName: "equilibriumTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u6-equilibrium",
      "topics.ts",
    ],
  },
  {
    slug: "u7-redox-reactions",
    exportName: "redoxReactionsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u7-redox-reactions",
      "topics.ts",
    ],
  },
  {
    slug: "u8-organic-chemistry-basic-principles-techniques",
    exportName: "organicChemistryBasicsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u8-organic-chemistry-basic-principles-techniques",
      "topics.ts",
    ],
  },
  {
    slug: "u9-hydrocarbons",
    exportName: "hydrocarbonsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u9-hydrocarbons",
      "topics.ts",
    ],
  },
  {
    slug: "cbse-chemistry-11/formative-reinforcement",
    exportName: "chemistry11FormativeReinforcementTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "formative-reinforcement",
      "topics.ts",
    ],
  },
  {
    slug: "u1-solutions",
    exportName: "solutionsTopics",
    sourceParts: ["content", "cbse-chemistry-12", "u1-solutions", "topics.ts"],
  },
  {
    slug: "u2-electrochemistry",
    exportName: "electrochemistryTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u2-electrochemistry",
      "topics.ts",
    ],
  },
  {
    slug: "u3-chemical-kinetics",
    exportName: "chemicalKineticsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u3-chemical-kinetics",
      "topics.ts",
    ],
  },
  {
    slug: "u4-d-and-f-block-elements",
    exportName: "dAndFBlockElementsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u4-d-and-f-block-elements",
      "topics.ts",
    ],
  },
  {
    slug: "u5-coordination-compounds",
    exportName: "coordinationCompoundsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u5-coordination-compounds",
      "topics.ts",
    ],
  },
  {
    slug: "u6-haloalkanes-haloarenes",
    exportName: "haloalkanesHaloarenesTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u6-haloalkanes-haloarenes",
      "topics.ts",
    ],
  },
  {
    slug: "u7-alcohols-phenols-ethers",
    exportName: "alcoholsPhenolsEthersTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u7-alcohols-phenols-ethers",
      "topics.ts",
    ],
  },
  {
    slug: "u8-aldehydes-ketones-carboxylic-acids",
    exportName: "aldehydesKetonesCarboxylicAcidsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u8-aldehydes-ketones-carboxylic-acids",
      "topics.ts",
    ],
  },
  {
    slug: "u9-amines",
    exportName: "aminesTopics",
    sourceParts: ["content", "cbse-chemistry-12", "u9-amines", "topics.ts"],
  },
  {
    slug: "u10-biomolecules",
    exportName: "biomoleculesTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u10-biomolecules",
      "topics.ts",
    ],
  },
  {
    slug: "cbse-chemistry-12/formative-reinforcement",
    exportName: "chemistry12FormativeReinforcementTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "formative-reinforcement",
      "topics.ts",
    ],
  },
  {
    slug: "cbse-chemistry-12/practicals-projects",
    exportName: "chemistry12PracticalsProjectsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "practicals-projects",
      "topics.ts",
    ],
  },
  {
    slug: "cbse-math-11/challenge-practice",
    exportName: "math11ChallengePracticeTopics",
    sourceParts: [
      "content",
      "cbse-math-11",
      "challenge-practice",
      "topics.ts",
    ],
  },
  {
    slug: "cbse-math-12/challenge-practice",
    exportName: "math12ChallengePracticeTopics",
    sourceParts: [
      "content",
      "cbse-math-12",
      "challenge-practice",
      "topics.ts",
    ],
  },
  {
    slug: "u8-atoms-nuclei",
    exportName: "atomsNucleiTopics",
    sourceParts: ["content", "cbse-physics-12", "u8-atoms-nuclei", "topics.ts"],
  },
  {
    slug: "u9-electronic-devices",
    exportName: "electronicDevicesTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u9-electronic-devices",
      "topics.ts",
    ],
  },
  {
    slug: "practicals-projects",
    exportName: "physics12PracticalsProjectsTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "practicals-projects",
      "topics.ts",
    ],
  },
];

const stopPhrases = new Set([
  "which of the following",
  "what is true about",
  "the graph of",
  "let x be",
  "let f be",
  "let a be",
]);

function readStagedSource(filePath) {
  const stageDir = mkdtempSync(join(tmpdir(), "studyloop-source-"));
  const stagedPath = join(stageDir, basename(filePath));

  try {
    copyFileSync(filePath, stagedPath);
    const expectedBytes = statSync(filePath).size;
    const stagedBytes = statSync(stagedPath).size;
    if (stagedBytes !== expectedBytes) {
      throw new Error(
        `Staged source size mismatch for ${filePath}: expected ${expectedBytes} bytes, got ${stagedBytes}`,
      );
    }
    return readFileSync(stagedPath, "utf8");
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }
}

function calibrateCbseChemistryDifficulty({
  difficulty,
  kind,
  questionLatex,
  responseType,
}) {
  const prose = questionLatex
    .replace(/\$[^$]*\$/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}_^]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const numericCount = (questionLatex.match(/\d+(?:\.\d+)?/g) ?? []).length;
  const quantitative =
    numericCount >= 3 ||
    /\b(calculate|estimate|find|mass|molarity|molality|osmotic|nernst|emf|conductance|enthalpy|entropy|gibbs|equilibrium constant|solubility product|limiting|empirical formula|combustion|buffer|ph|activation energy|rate constant|half-life|balanced|balance)\b/i.test(
      questionLatex,
    );
  const organicSynthesis =
    /\b(plan|identify|distinguish|account for|explain why|justify|multi[- ]?clue|isomeric|route|sequence|suitable reactants)\b/i.test(
      questionLatex,
    ) &&
    /\b(alcohol|phenol|ether|anisole|haloalkane|haloarene|aldehyde|ketone|carboxylic|amine|grignard|williamson|lucas|iodoform|dichromate|oxidation|cumene|diazonium|reimer|kolbe)\b/i.test(
      questionLatex,
    );
  const highEnd = quantitative || organicSynthesis;

  if (difficulty <= 3) return difficulty;
  let calibrated = difficulty === 5 ? (highEnd ? 4 : 3) : difficulty;
  if (responseType === "vsaq") return Math.min(calibrated, 2);
  if (
    kind === "mc_single" &&
    calibrated === 4 &&
    (/\b(which statement|which species|which reaction|which compound|which element|primarily|mainly|because|belongs to|identify|arrange|correct iupac name|molecularity|oxidation number|number of sigma|gives mainly|is respectively)\b/i.test(
      prose,
    ) ||
      !highEnd)
  ) {
    return 3;
  }
  if (
    ["saq", "case", "laq"].includes(responseType ?? "") &&
    calibrated === 4 &&
    !highEnd
  ) {
    return 3;
  }
  return calibrated;
}

const moduleCache = new Map();

function loadSourceModule(sourcePath) {
  if (moduleCache.has(sourcePath)) return moduleCache.get(sourcePath);

  const source = readStagedSource(sourcePath);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const mod = { exports: {} };
  moduleCache.set(sourcePath, mod.exports);

  const requireShim = (id) => {
    if (id === "@/lib/content/types") return {};
    if (id.includes("difficulty-calibration")) {
      return {
        calibrateCbseChemistryDifficulty,
        calibrateCbsePhysicsDifficulty,
      };
    }
    if (id.startsWith(".")) {
      return loadSourceModule(join(dirname(sourcePath), `${id}.ts`));
    }
    throw new Error(`Unexpected import while auditing originality: ${id}`);
  };

  const runner = new Function("require", "exports", "module", output);
  runner(requireShim, mod.exports, mod);
  return mod.exports;
}

function loadTopics(config) {
  const sourcePath = join(root, ...config.sourceParts);
  return loadSourceModule(sourcePath)[config.exportName];
}

function itemSlug(contentId) {
  return contentId.split(".").slice(-3).join("-");
}

function stripLatex(text) {
  return String(text ?? "")
    .replace(/\\text\{([^{}]*)\}/g, " $1 ")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, " $1 over $2 ")
    .replace(/\\sqrt\{([^{}]+)\}/g, " square root of $1 ")
    .replace(/\\begin\{[^{}]+\}|\\end\{[^{}]+\}/g, " ")
    .replace(/\\left|\\right|\\qquad|\\quad|\\,|\\;|\\:/g, " ")
    .replace(/\\le/g, " less than or equal ")
    .replace(/\\ge/g, " greater than or equal ")
    .replace(/\\to/g, " approaches ")
    .replace(/\\infty/g, " infinity ")
    .replace(/\\pi/g, " pi ")
    .replace(
      /\\sin|\\cos|\\tan|\\sec|\\csc|\\cot|\\ln|\\lim|\\int|\\frac|\\sqrt|\\cdot|\\pm|\\approx/g,
      " ",
    )
    .replace(/[$^_{}()[\],.;:?=+\-*/<>|]/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(text) {
  return stripLatex(text)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text) {
  return normalize(text).split(" ").filter(Boolean);
}

function shingles(text, size = 7) {
  const tokens = words(text);
  const out = new Set();
  for (let i = 0; i <= tokens.length - size; i += 1) {
    out.add(tokens.slice(i, i + size).join(" "));
  }
  return out;
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) intersection += 1;
  }
  return intersection / (a.size + b.size - intersection);
}

function itemText(item) {
  const parts =
    item.kind === "frq"
      ? item.parts.map((part) => part.promptMarkdown).join(" ")
      : "";
  const choices =
    item.kind === "mc_single"
      ? item.choices.map((choice) => choice.text).join(" ")
      : "";
  return [item.questionLatex, parts, choices].join(" ");
}

function webPhrase(text) {
  const tokenList = words(text).filter((token) => token.length > 1);
  const windows = [];
  for (let i = 0; i <= tokenList.length - 10; i += 1) {
    const phrase = tokenList.slice(i, i + 10).join(" ");
    if (![...stopPhrases].some((stop) => phrase.includes(stop))) {
      windows.push(phrase);
    }
  }
  return (
    windows.sort((a, b) => b.length - a.length)[0] ??
    tokenList.slice(0, 10).join(" ")
  );
}

function riskScore(record) {
  const text = normalize(record.text);
  let score = 0;
  const patterns = [
    "particle moves",
    "water",
    "tank",
    "temperature",
    "population",
    "rate at which",
    "time t",
    "graph shows",
    "table",
    "calculator",
    "justify your answer",
    "nearest",
    "slope field",
    "differential equation",
  ];
  for (const pattern of patterns) {
    if (text.includes(pattern)) score += 1;
  }
  if (record.kind === "frq") score += 2;
  if (record.difficulty >= 4) score += 1;
  if (record.figure) score += 1;
  return score;
}

const records = [];
for (const config of unitConfigs) {
  const topics = loadTopics(config);
  for (const topic of topics) {
    for (const item of topic.items) {
      records.push({
        unit: config.slug,
        topic: topic.topicCode,
        contentId: item.contentId,
        slug: itemSlug(item.contentId),
        kind: item.kind,
        difficulty: item.difficulty,
        figure: Boolean(item.figure),
        sourceType: item.sourceType,
        reviewStatus: item.reviewStatus,
        stem: item.questionLatex,
        text: itemText(item),
      });
    }
  }
}

const exactGroups = new Map();
for (const record of records) {
  const key = normalize(record.text);
  if (!exactGroups.has(key)) exactGroups.set(key, []);
  exactGroups.get(key).push(record);
}
const exactDuplicates = [...exactGroups.values()].filter(
  (group) => group.length > 1,
);

const shingleCache = new Map(
  records.map((record) => [record.contentId, shingles(record.text)]),
);
const nearDuplicates = [];
for (let i = 0; i < records.length; i += 1) {
  for (let j = i + 1; j < records.length; j += 1) {
    const a = records[i];
    const b = records[j];
    const score = jaccard(
      shingleCache.get(a.contentId),
      shingleCache.get(b.contentId),
    );
    if (score >= 0.72) {
      nearDuplicates.push({ a, b, score });
    }
  }
}

const ngramCounts = new Map();
for (const record of records) {
  for (const ngram of shingles(record.text, 8)) {
    if (!ngramCounts.has(ngram)) ngramCounts.set(ngram, new Set());
    ngramCounts.get(ngram).add(record.contentId);
  }
}
const repeatedNgrams = [...ngramCounts.entries()]
  .map(([ngram, ids]) => ({ ngram, count: ids.size }))
  .filter((entry) => entry.count >= 3)
  .sort((a, b) => b.count - a.count)
  .slice(0, 30);

const highRisk = records
  .map((record) => ({
    ...record,
    riskScore: riskScore(record),
    webPhrase: webPhrase(record.text),
  }))
  .sort((a, b) => b.riskScore - a.riskScore || b.text.length - a.text.length);

const summary = {
  totalItems: records.length,
  byUnit: Object.fromEntries(
    unitConfigs.map((config) => [
      config.slug,
      records.filter((record) => record.unit === config.slug).length,
    ]),
  ),
  byKind: records.reduce((acc, record) => {
    acc[record.kind] = (acc[record.kind] ?? 0) + 1;
    return acc;
  }, {}),
  bySourceType: records.reduce((acc, record) => {
    acc[record.sourceType] = (acc[record.sourceType] ?? 0) + 1;
    return acc;
  }, {}),
  exactDuplicateGroups: exactDuplicates.length,
  nearDuplicatePairs: nearDuplicates.length,
};

const reportDir = join(root, "review-packages", "originality-audit");
mkdirSync(reportDir, { recursive: true });

const lines = [];
lines.push("# StudyLoop Originality Local Audit");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Total items audited: ${summary.totalItems}`);
lines.push(`- MC items: ${summary.byKind.mc_single ?? 0}`);
lines.push(`- Numerical items: ${summary.byKind.numeric ?? 0}`);
lines.push(`- FRQ items: ${summary.byKind.frq ?? 0}`);
lines.push(
  `- Source-type counts: ${Object.entries(summary.bySourceType)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ")}`,
);
lines.push(
  `- Exact duplicate item-text groups: ${summary.exactDuplicateGroups}`,
);
lines.push(
  `- Near-duplicate item-text pairs at Jaccard >= 0.72: ${summary.nearDuplicatePairs}`,
);
lines.push("");
lines.push("## Unit Counts");
lines.push("");
for (const [unit, count] of Object.entries(summary.byUnit)) {
  lines.push(`- ${unit}: ${count}`);
}
lines.push("");
lines.push("## Near-Duplicate Pairs");
lines.push("");
if (nearDuplicates.length === 0) {
  lines.push("None above the threshold.");
} else {
  for (const pair of nearDuplicates.slice(0, 50)) {
    lines.push(
      `- ${pair.score.toFixed(3)}: ${pair.a.slug} (${pair.a.unit}) vs ${pair.b.slug} (${pair.b.unit})`,
    );
  }
}
lines.push("");
lines.push("## Repeated 8-Word Phrases");
lines.push("");
if (repeatedNgrams.length === 0) {
  lines.push("No repeated 8-word phrase appeared in 3 or more items.");
} else {
  for (const entry of repeatedNgrams) {
    lines.push(`- ${entry.count}x: "${entry.ngram}"`);
  }
}
lines.push("");
lines.push("## Highest-Risk Public-Web Search Candidates");
lines.push("");
lines.push(
  "Use these exact phrases for public-web searches. They are selected by context risk, FRQ status, figures, and AP-like wording.",
);
lines.push("");
for (const record of highRisk.slice(0, 80)) {
  lines.push(
    `- ${record.slug} (${record.unit}, topic ${record.topic}, ${record.kind}, d${record.difficulty}, risk ${record.riskScore}): "${record.webPhrase}"`,
  );
}

writeFileSync(
  join(reportDir, "LOCAL_ORIGINALITY_AUDIT.md"),
  `${lines.join("\n")}\n`,
);
writeFileSync(
  join(reportDir, "web-search-candidates.json"),
  JSON.stringify(highRisk.slice(0, 120), null, 2),
);

console.log(JSON.stringify(summary, null, 2));
console.log(
  `Report written to ${join(reportDir, "LOCAL_ORIGINALITY_AUDIT.md")}`,
);
