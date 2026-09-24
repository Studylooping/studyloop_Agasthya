import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import ts from "typescript";
import { calibrateCbsePhysicsDifficulty } from "../lib/content/difficulty-calibration.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const unitConfigs = {
  "u1-limits": {
    exportName: "limitTopics",
    sourceParts: ["content", "calc-ab", "u1-limits", "topics.ts"],
  },
  "u2-differentiation": {
    exportName: "differentiationTopics",
    sourceParts: ["content", "calc-ab", "u2-differentiation", "topics.ts"],
  },
  "u3-comp-implicit": {
    exportName: "compositeImplicitTopics",
    sourceParts: ["content", "calc-ab", "u3-comp-implicit", "topics.ts"],
  },
  "u4-contextual-app": {
    exportName: "contextualApplicationTopics",
    sourceParts: ["content", "calc-ab", "u4-contextual-app", "topics.ts"],
  },
  "u5-analytical-app": {
    exportName: "analyticalApplicationTopics",
    sourceParts: ["content", "calc-ab", "u5-analytical-app", "topics.ts"],
  },
  "u6-integration": {
    exportName: "integrationTopics",
    sourceParts: ["content", "calc-ab", "u6-integration", "topics.ts"],
  },
  "u7-diff-eqs": {
    exportName: "differentialEquationTopics",
    sourceParts: ["content", "calc-ab", "u7-diff-eqs", "topics.ts"],
  },
  "u8-app-integration": {
    exportName: "applicationIntegrationTopics",
    sourceParts: ["content", "calc-ab", "u8-app-integration", "topics.ts"],
  },
  "u1-relations-functions": {
    exportName: "relationsFunctionsTopics",
    sourceParts: [
      "content",
      "cbse-math-12",
      "u1-relations-functions",
      "topics.ts",
    ],
  },
  "u2-algebra": {
    exportName: "algebraTopics",
    sourceParts: ["content", "cbse-math-12", "u2-algebra", "topics.ts"],
  },
  "u3-calculus": {
    exportName: "calculusTopics",
    sourceParts: ["content", "cbse-math-12", "u3-calculus", "topics.ts"],
  },
  "u4-vectors-3d": {
    exportName: "vectors3dTopics",
    sourceParts: ["content", "cbse-math-12", "u4-vectors-3d", "topics.ts"],
  },
  "u5-linear-programming": {
    exportName: "linearProgrammingTopics",
    sourceParts: [
      "content",
      "cbse-math-12",
      "u5-linear-programming",
      "topics.ts",
    ],
  },
  "u6-probability": {
    exportName: "probabilityTopics",
    sourceParts: ["content", "cbse-math-12", "u6-probability", "topics.ts"],
  },
  "u1-sets-functions": {
    exportName: "setsFunctionsTopics",
    sourceParts: ["content", "cbse-math-11", "u1-sets-functions", "topics.ts"],
  },
  "u2-algebra-xi": {
    exportName: "algebraXiTopics",
    sourceParts: ["content", "cbse-math-11", "u2-algebra-xi", "topics.ts"],
  },
  "u3-coordinate-geometry": {
    exportName: "coordinateGeometryTopics",
    sourceParts: [
      "content",
      "cbse-math-11",
      "u3-coordinate-geometry",
      "topics.ts",
    ],
  },
  "u4-calculus-xi": {
    exportName: "calculusXiTopics",
    sourceParts: ["content", "cbse-math-11", "u4-calculus-xi", "topics.ts"],
  },
  "u5-statistics-probability": {
    exportName: "statisticsProbabilityTopics",
    sourceParts: [
      "content",
      "cbse-math-11",
      "u5-statistics-probability",
      "topics.ts",
    ],
  },
  "cbse-math-10/u6-mensuration": {
    exportName: "mensurationXTopics",
    sourceParts: ["content", "cbse-math-10", "u6-mensuration", "topics.ts"],
  },
  "u1-number-system": {
    exportName: "numberSystemTopics",
    sourceParts: ["content", "cbse-math-9", "u1-number-system", "topics.ts"],
  },
  "u2-algebra-ix": {
    exportName: "algebraTopics",
    sourceParts: ["content", "cbse-math-9", "u2-algebra", "topics.ts"],
  },
  "u3-coordinate-geometry-ix": {
    exportName: "coordinateGeometryIxTopics",
    sourceParts: [
      "content",
      "cbse-math-9",
      "u3-coordinate-geometry",
      "topics.ts",
    ],
  },
  "u4-geometry": {
    exportName: "geometryIxTopics",
    sourceParts: ["content", "cbse-math-9", "u4-geometry", "topics.ts"],
  },
  "u5-mensuration": {
    exportName: "mensurationIxTopics",
    sourceParts: ["content", "cbse-math-9", "u5-mensuration", "topics.ts"],
  },
  "u6-statistics-probability": {
    exportName: "statisticsProbabilityIxTopics",
    sourceParts: [
      "content",
      "cbse-math-9",
      "u6-statistics-probability",
      "topics.ts",
    ],
  },
  "u1-world-of-living": {
    exportName: "worldOfLivingTopics",
    sourceParts: [
      "content",
      "cbse-science-9",
      "u1-world-of-living",
      "topics.ts",
    ],
  },
  "u2-matter-nature-behaviour": {
    exportName: "matterNatureBehaviourTopics",
    sourceParts: [
      "content",
      "cbse-science-9",
      "u2-matter-nature-behaviour",
      "topics.ts",
    ],
  },
  "u3-motion-force-work-sound": {
    exportName: "motionForceWorkSoundTopics",
    sourceParts: [
      "content",
      "cbse-science-9",
      "u3-motion-force-work-sound",
      "topics.ts",
    ],
  },
  "u4-earth-as-a-system": {
    exportName: "earthAsSystemTopics",
    sourceParts: [
      "content",
      "cbse-science-9",
      "u4-earth-as-a-system",
      "topics.ts",
    ],
  },
  "internal-assessment-practicals": {
    exportName: "scienceIaTopics",
    sourceParts: [
      "content",
      "cbse-science-9",
      "internal-assessment-practicals",
      "topics.ts",
    ],
  },
  "cbse-science-10/u2-world-of-living": {
    exportName: "worldOfLivingXTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "u2-world-of-living",
      "topics.ts",
    ],
  },
  "cbse-science-10/u3-natural-phenomena": {
    exportName: "naturalPhenomenaXTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "u3-natural-phenomena",
      "topics.ts",
    ],
  },
  "cbse-science-10/u4-effects-of-current": {
    exportName: "effectsOfCurrentXTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "u4-effects-of-current",
      "topics.ts",
    ],
  },
  "cbse-science-10/u5-natural-resources": {
    exportName: "naturalResourcesXTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "u5-natural-resources",
      "topics.ts",
    ],
  },
  "cbse-science-10/u1-chemical-substances-nature-behaviour": {
    exportName: "chemicalSubstancesNatureBehaviourTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "u1-chemical-substances-nature-behaviour",
      "topics.ts",
    ],
  },
  "cbse-science-10/formative-reinforcement": {
    exportName: "science10FormativeReinforcementTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "formative-reinforcement",
      "topics.ts",
    ],
  },
  "cbse-science-10/internal-assessment-practicals": {
    exportName: "science10PracticalsTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "internal-assessment-practicals",
      "topics.ts",
    ],
  },
  "u1-physical-world-measurement": {
    exportName: "physicalWorldMeasurementTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u1-physical-world-measurement",
      "topics.ts",
    ],
  },
  "u2-kinematics": {
    exportName: "kinematicsTopics",
    sourceParts: ["content", "cbse-physics-11", "u2-kinematics", "topics.ts"],
  },
  "u3-laws-of-motion": {
    exportName: "lawsOfMotionTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u3-laws-of-motion",
      "topics.ts",
    ],
  },
  "u4-work-energy-power": {
    exportName: "workEnergyPowerTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u4-work-energy-power",
      "topics.ts",
    ],
  },
  "u5-system-particles-rigid-body": {
    exportName: "systemParticlesRigidBodyTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u5-system-particles-rigid-body",
      "topics.ts",
    ],
  },
  "u6-gravitation": {
    exportName: "gravitationTopics",
    sourceParts: ["content", "cbse-physics-11", "u6-gravitation", "topics.ts"],
  },
  "u7-properties-bulk-matter": {
    exportName: "propertiesBulkMatterTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u7-properties-bulk-matter",
      "topics.ts",
    ],
  },
  "u8-thermodynamics": {
    exportName: "thermodynamicsTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u8-thermodynamics",
      "topics.ts",
    ],
  },
  "u9-kinetic-theory": {
    exportName: "kineticTheoryTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u9-kinetic-theory",
      "topics.ts",
    ],
  },
  "u10-oscillations-waves": {
    exportName: "oscillationsWavesTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u10-oscillations-waves",
      "topics.ts",
    ],
  },
  "practicals-activities": {
    exportName: "practicalsActivitiesTopics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "practicals-activities",
      "topics.ts",
    ],
  },
  "u1-electrostatics": {
    exportName: "electrostaticsTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u1-electrostatics",
      "topics.ts",
    ],
  },
  "u2-current-electricity": {
    exportName: "currentElectricityTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u2-current-electricity",
      "topics.ts",
    ],
  },
  "u3-magnetic-effects-current-magnetism": {
    exportName: "magneticEffectsCurrentMagnetismTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u3-magnetic-effects-current-magnetism",
      "topics.ts",
    ],
  },
  "u4-electromagnetic-induction-alternating-currents": {
    exportName: "electromagneticInductionAlternatingCurrentsTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u4-electromagnetic-induction-alternating-currents",
      "topics.ts",
    ],
  },
  "u5-electromagnetic-waves": {
    exportName: "electromagneticWavesTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u5-electromagnetic-waves",
      "topics.ts",
    ],
  },
  "u6-optics": {
    exportName: "opticsTopics",
    sourceParts: ["content", "cbse-physics-12", "u6-optics", "topics.ts"],
  },
  "u7-dual-nature-radiation-matter": {
    exportName: "dualNatureRadiationMatterTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u7-dual-nature-radiation-matter",
      "topics.ts",
    ],
  },
  "u8-atoms-nuclei": {
    exportName: "atomsNucleiTopics",
    sourceParts: ["content", "cbse-physics-12", "u8-atoms-nuclei", "topics.ts"],
  },
  "u9-electronic-devices": {
    exportName: "electronicDevicesTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u9-electronic-devices",
      "topics.ts",
    ],
  },
  "practicals-projects": {
    exportName: "physics12PracticalsProjectsTopics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "practicals-projects",
      "topics.ts",
    ],
  },
  "u1-some-basic-concepts": {
    exportName: "someBasicConceptsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u1-some-basic-concepts",
      "topics.ts",
    ],
  },
  "u2-structure-of-atom": {
    exportName: "structureOfAtomTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u2-structure-of-atom",
      "topics.ts",
    ],
  },
  "u3-classification-periodicity": {
    exportName: "classificationPeriodicityTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u3-classification-periodicity",
      "topics.ts",
    ],
  },
  "u4-chemical-bonding-molecular-structure": {
    exportName: "chemicalBondingTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u4-chemical-bonding-molecular-structure",
      "topics.ts",
    ],
  },
  "u5-chemical-thermodynamics": {
    exportName: "chemicalThermodynamicsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u5-chemical-thermodynamics",
      "topics.ts",
    ],
  },
  "u6-equilibrium": {
    exportName: "equilibriumTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u6-equilibrium",
      "topics.ts",
    ],
  },
  "u7-redox-reactions": {
    exportName: "redoxReactionsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u7-redox-reactions",
      "topics.ts",
    ],
  },
  "u8-organic-chemistry-basic-principles-techniques": {
    exportName: "organicChemistryBasicsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u8-organic-chemistry-basic-principles-techniques",
      "topics.ts",
    ],
  },
  "u9-hydrocarbons": {
    exportName: "hydrocarbonsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u9-hydrocarbons",
      "topics.ts",
    ],
  },
  "cbse-chemistry-11/formative-reinforcement": {
    exportName: "chemistry11FormativeReinforcementTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "formative-reinforcement",
      "topics.ts",
    ],
  },
  "u1-solutions": {
    exportName: "solutionsTopics",
    sourceParts: ["content", "cbse-chemistry-12", "u1-solutions", "topics.ts"],
  },
  "u2-electrochemistry": {
    exportName: "electrochemistryTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u2-electrochemistry",
      "topics.ts",
    ],
  },
  "u3-chemical-kinetics": {
    exportName: "chemicalKineticsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u3-chemical-kinetics",
      "topics.ts",
    ],
  },
  "u4-d-and-f-block-elements": {
    exportName: "dAndFBlockElementsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u4-d-and-f-block-elements",
      "topics.ts",
    ],
  },
  "u5-coordination-compounds": {
    exportName: "coordinationCompoundsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u5-coordination-compounds",
      "topics.ts",
    ],
  },
  "u6-haloalkanes-haloarenes": {
    exportName: "haloalkanesHaloarenesTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u6-haloalkanes-haloarenes",
      "topics.ts",
    ],
  },
  "u7-alcohols-phenols-ethers": {
    exportName: "alcoholsPhenolsEthersTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u7-alcohols-phenols-ethers",
      "topics.ts",
    ],
  },
  "u8-aldehydes-ketones-carboxylic-acids": {
    exportName: "aldehydesKetonesCarboxylicAcidsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u8-aldehydes-ketones-carboxylic-acids",
      "topics.ts",
    ],
  },
  "u9-amines": {
    exportName: "aminesTopics",
    sourceParts: ["content", "cbse-chemistry-12", "u9-amines", "topics.ts"],
  },
  "u10-biomolecules": {
    exportName: "biomoleculesTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u10-biomolecules",
      "topics.ts",
    ],
  },
  "cbse-chemistry-12/formative-reinforcement": {
    exportName: "chemistry12FormativeReinforcementTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "formative-reinforcement",
      "topics.ts",
    ],
  },
  "cbse-chemistry-12/practicals-projects": {
    exportName: "chemistry12PracticalsProjectsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "practicals-projects",
      "topics.ts",
    ],
  },
  "cbse-math-11/challenge-practice": {
    exportName: "math11ChallengePracticeTopics",
    sourceParts: [
      "content",
      "cbse-math-11",
      "challenge-practice",
      "topics.ts",
    ],
  },
  "cbse-math-12/challenge-practice": {
    exportName: "math12ChallengePracticeTopics",
    sourceParts: [
      "content",
      "cbse-math-12",
      "challenge-practice",
      "topics.ts",
    ],
  },
};

const weakRationales = [
  "This answer does not follow from the limit definition or the required algebraic step.",
  "This answer uses the wrong contextual rate, sign, unit, or derivative relationship.",
  "This answer uses the wrong derivative sign, candidate value, theorem condition, or optimization relationship.",
];

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
    throw new Error(`Unexpected import while auditing MC feedback: ${id}`);
  };

  const runner = new Function("require", "exports", "module", output);
  runner(requireShim, mod.exports, mod);
  return mod.exports;
}

function loadTopics(config) {
  return loadSourceModule(join(root, ...config.sourceParts))[config.exportName];
}

const failures = [];
let checkedWrongChoices = 0;

for (const [unitSlug, config] of Object.entries(unitConfigs)) {
  const topics = loadTopics(config);
  for (const topic of topics) {
    for (const item of topic.items) {
      if (item.kind !== "mc_single") continue;

      for (const choice of item.choices) {
        if (choice.isCorrect) continue;
        checkedWrongChoices += 1;

        const rationale = choice.rationaleIfWrong?.trim();
        if (!rationale) {
          failures.push(
            `${unitSlug} ${item.contentId}.${choice.letter}: missing rationale`,
          );
          continue;
        }

        if (weakRationales.includes(rationale)) {
          failures.push(
            `${unitSlug} ${item.contentId}.${choice.letter}: weak generic rationale`,
          );
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error("MC feedback audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `MC feedback audit passed: ${checkedWrongChoices} wrong choices checked.`,
);
