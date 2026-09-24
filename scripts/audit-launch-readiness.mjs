import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";
import ts from "typescript";
import { calibrateCbsePhysicsDifficulty } from "../lib/content/difficulty-calibration.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const LETTERS = ["A", "B", "C", "D", "E"];

const unitConfigs = [
  {
    courseSlug: "calc-ab",
    slug: "u1-limits",
    exportName: "limitTopics",
    sourceParts: ["content", "calc-ab", "u1-limits", "topics.ts"],
  },
  {
    courseSlug: "calc-ab",
    slug: "u2-differentiation",
    exportName: "differentiationTopics",
    sourceParts: ["content", "calc-ab", "u2-differentiation", "topics.ts"],
  },
  {
    courseSlug: "calc-ab",
    slug: "u3-comp-implicit",
    exportName: "compositeImplicitTopics",
    sourceParts: ["content", "calc-ab", "u3-comp-implicit", "topics.ts"],
  },
  {
    courseSlug: "calc-ab",
    slug: "u4-contextual-app",
    exportName: "contextualApplicationTopics",
    sourceParts: ["content", "calc-ab", "u4-contextual-app", "topics.ts"],
  },
  {
    courseSlug: "calc-ab",
    slug: "u5-analytical-app",
    exportName: "analyticalApplicationTopics",
    sourceParts: ["content", "calc-ab", "u5-analytical-app", "topics.ts"],
  },
  {
    courseSlug: "calc-ab",
    slug: "u6-integration",
    exportName: "integrationTopics",
    sourceParts: ["content", "calc-ab", "u6-integration", "topics.ts"],
  },
  {
    courseSlug: "calc-ab",
    slug: "u7-diff-eqs",
    exportName: "differentialEquationTopics",
    sourceParts: ["content", "calc-ab", "u7-diff-eqs", "topics.ts"],
  },
  {
    courseSlug: "calc-ab",
    slug: "u8-app-integration",
    exportName: "applicationIntegrationTopics",
    sourceParts: ["content", "calc-ab", "u8-app-integration", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-12",
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
    courseSlug: "cbse-math-12",
    slug: "u2-algebra",
    exportName: "algebraTopics",
    sourceParts: ["content", "cbse-math-12", "u2-algebra", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-12",
    slug: "u3-calculus",
    exportName: "calculusTopics",
    sourceParts: ["content", "cbse-math-12", "u3-calculus", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-12",
    slug: "u4-vectors-3d",
    exportName: "vectors3dTopics",
    sourceParts: ["content", "cbse-math-12", "u4-vectors-3d", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-12",
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
    courseSlug: "cbse-math-12",
    slug: "u6-probability",
    exportName: "probabilityTopics",
    sourceParts: ["content", "cbse-math-12", "u6-probability", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-11",
    slug: "u1-sets-functions",
    exportName: "setsFunctionsTopics",
    sourceParts: ["content", "cbse-math-11", "u1-sets-functions", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-11",
    slug: "u2-algebra-xi",
    exportName: "algebraXiTopics",
    sourceParts: ["content", "cbse-math-11", "u2-algebra-xi", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-11",
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
    courseSlug: "cbse-math-11",
    slug: "u4-calculus-xi",
    exportName: "calculusXiTopics",
    sourceParts: ["content", "cbse-math-11", "u4-calculus-xi", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-11",
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
    courseSlug: "cbse-math-10",
    slug: "u1-number-systems",
    exportName: "numberSystemsXTopics",
    sourceParts: ["content", "cbse-math-10", "u1-number-systems", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-10",
    slug: "u2-algebra-x",
    exportName: "algebraXTopics",
    sourceParts: ["content", "cbse-math-10", "u2-algebra-x", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-10",
    slug: "u3-coordinate-geometry",
    exportName: "coordinateGeometryXTopics",
    sourceParts: [
      "content",
      "cbse-math-10",
      "u3-coordinate-geometry",
      "topics.ts",
    ],
  },
  {
    courseSlug: "cbse-math-10",
    slug: "u4-geometry",
    exportName: "geometryXTopics",
    sourceParts: ["content", "cbse-math-10", "u4-geometry", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-10",
    slug: "u5-trigonometry",
    exportName: "trigonometryXTopics",
    sourceParts: ["content", "cbse-math-10", "u5-trigonometry", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-10",
    slug: "u6-mensuration",
    exportName: "mensurationXTopics",
    sourceParts: ["content", "cbse-math-10", "u6-mensuration", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-9",
    slug: "u1-number-system",
    exportName: "numberSystemTopics",
    sourceParts: ["content", "cbse-math-9", "u1-number-system", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-9",
    slug: "u2-algebra-ix",
    exportName: "algebraTopics",
    sourceParts: ["content", "cbse-math-9", "u2-algebra", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-9",
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
    courseSlug: "cbse-math-9",
    slug: "u4-geometry",
    exportName: "geometryIxTopics",
    sourceParts: ["content", "cbse-math-9", "u4-geometry", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-9",
    slug: "u5-mensuration",
    exportName: "mensurationIxTopics",
    sourceParts: ["content", "cbse-math-9", "u5-mensuration", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-9",
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
    courseSlug: "cbse-science-9",
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
    courseSlug: "cbse-science-9",
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
    courseSlug: "cbse-science-9",
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
    courseSlug: "cbse-science-9",
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
    courseSlug: "cbse-science-9",
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
    courseSlug: "cbse-science-10",
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
    courseSlug: "cbse-science-10",
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
    courseSlug: "cbse-science-10",
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
    courseSlug: "cbse-science-10",
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
    courseSlug: "cbse-science-10",
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
    courseSlug: "cbse-science-10",
    slug: "formative-reinforcement",
    exportName: "science10FormativeReinforcementTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "formative-reinforcement",
      "topics.ts",
    ],
  },
  {
    courseSlug: "cbse-science-10",
    slug: "internal-assessment-practicals",
    exportName: "science10PracticalsTopics",
    sourceParts: [
      "content",
      "cbse-science-10",
      "internal-assessment-practicals",
      "topics.ts",
    ],
  },
  {
    courseSlug: "cbse-physics-11",
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
    courseSlug: "cbse-physics-11",
    slug: "u2-kinematics",
    exportName: "kinematicsTopics",
    sourceParts: ["content", "cbse-physics-11", "u2-kinematics", "topics.ts"],
  },
  {
    courseSlug: "cbse-physics-11",
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
    courseSlug: "cbse-physics-11",
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
    courseSlug: "cbse-physics-11",
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
    courseSlug: "cbse-physics-11",
    slug: "u6-gravitation",
    exportName: "gravitationTopics",
    sourceParts: ["content", "cbse-physics-11", "u6-gravitation", "topics.ts"],
  },
  {
    courseSlug: "cbse-physics-11",
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
    courseSlug: "cbse-physics-11",
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
    courseSlug: "cbse-physics-11",
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
    courseSlug: "cbse-physics-11",
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
    courseSlug: "cbse-physics-11",
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
    courseSlug: "cbse-physics-12",
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
    courseSlug: "cbse-physics-12",
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
    courseSlug: "cbse-physics-12",
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
    courseSlug: "cbse-physics-12",
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
    courseSlug: "cbse-physics-12",
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
    courseSlug: "cbse-physics-12",
    slug: "u6-optics",
    exportName: "opticsTopics",
    sourceParts: ["content", "cbse-physics-12", "u6-optics", "topics.ts"],
  },
  {
    courseSlug: "cbse-physics-12",
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
    courseSlug: "cbse-chemistry-11",
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
    courseSlug: "cbse-chemistry-11",
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
    courseSlug: "cbse-chemistry-11",
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
    courseSlug: "cbse-chemistry-11",
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
    courseSlug: "cbse-chemistry-11",
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
    courseSlug: "cbse-chemistry-11",
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
    courseSlug: "cbse-chemistry-11",
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
    courseSlug: "cbse-chemistry-11",
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
    courseSlug: "cbse-chemistry-11",
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
    courseSlug: "cbse-chemistry-11",
    slug: "formative-reinforcement",
    exportName: "chemistry11FormativeReinforcementTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "formative-reinforcement",
      "topics.ts",
    ],
  },
  {
    courseSlug: "cbse-chemistry-12",
    slug: "u1-solutions",
    exportName: "solutionsTopics",
    sourceParts: ["content", "cbse-chemistry-12", "u1-solutions", "topics.ts"],
  },
  {
    courseSlug: "cbse-chemistry-12",
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
    courseSlug: "cbse-chemistry-12",
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
    courseSlug: "cbse-chemistry-12",
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
    courseSlug: "cbse-chemistry-12",
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
    courseSlug: "cbse-chemistry-12",
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
    courseSlug: "cbse-chemistry-12",
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
    courseSlug: "cbse-chemistry-12",
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
    courseSlug: "cbse-chemistry-12",
    slug: "u9-amines",
    exportName: "aminesTopics",
    sourceParts: ["content", "cbse-chemistry-12", "u9-amines", "topics.ts"],
  },
  {
    courseSlug: "cbse-chemistry-12",
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
    courseSlug: "cbse-chemistry-12",
    slug: "formative-reinforcement",
    exportName: "chemistry12FormativeReinforcementTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "formative-reinforcement",
      "topics.ts",
    ],
  },
  {
    courseSlug: "cbse-chemistry-12",
    slug: "practicals-projects",
    exportName: "chemistry12PracticalsProjectsTopics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "practicals-projects",
      "topics.ts",
    ],
  },
  {
    courseSlug: "cbse-math-11",
    slug: "challenge-practice",
    exportName: "math11ChallengePracticeTopics",
    sourceParts: [
      "content",
      "cbse-math-11",
      "challenge-practice",
      "topics.ts",
    ],
  },
  {
    courseSlug: "cbse-math-12",
    slug: "challenge-practice",
    exportName: "math12ChallengePracticeTopics",
    sourceParts: [
      "content",
      "cbse-math-12",
      "challenge-practice",
      "topics.ts",
    ],
  },
  {
    courseSlug: "cbse-physics-12",
    slug: "u8-atoms-nuclei",
    exportName: "atomsNucleiTopics",
    sourceParts: ["content", "cbse-physics-12", "u8-atoms-nuclei", "topics.ts"],
  },
  {
    courseSlug: "cbse-physics-12",
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
    courseSlug: "cbse-physics-12",
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

const failures = [];
const seenContentIds = new Set();
const seenRoutes = new Set();
const seenFigures = new Set();
let itemCount = 0;
let figureCount = 0;

function readStagedSource(filePath) {
  const stageDir = mkdtempSync(join(tmpdir(), "studyloop-launch-audit-"));
  const stagedPath = join(stageDir, basename(filePath));

  try {
    copyFileSync(filePath, stagedPath);
    const expectedBytes = statSync(filePath).size;
    const stagedBytes = statSync(stagedPath).size;
    if (stagedBytes !== expectedBytes) {
      fail(
        filePath,
        `staged source size mismatch: expected ${expectedBytes}, got ${stagedBytes}`,
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
  if (source.includes("\0")) fail(sourcePath, "contains NUL bytes");

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
    throw new Error(`Unexpected import while auditing launch readiness: ${id}`);
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

function fail(location, message) {
  failures.push(`${location}: ${message}`);
}

function assertNonEmpty(location, value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(location, "missing text");
  }
}

function auditText(location, value, { mathOnly = false } = {}) {
  if (typeof value !== "string") {
    fail(location, "expected string");
    return;
  }
  if (!value.trim()) {
    fail(location, "empty string");
    return;
  }

  if (value.includes("\0")) fail(location, "contains NUL byte");
  if (hasUnbalancedDollars(value)) fail(location, "unbalanced $ delimiters");
  if (/\$\s*\$/.test(value)) fail(location, "empty inline math delimiter $$");

  if (!mathOnly && hasRawLatexProseRisk(value)) {
    fail(location, "raw LaTeX mixed with prose without $...$ or \\text{}");
  }

  for (const segment of mathSegments(value, mathOnly)) {
    renderLatex(location, segment);
  }
}

function hasUnbalancedDollars(value) {
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "$" && value[index - 1] !== "\\") count += 1;
  }
  return count % 2 !== 0;
}

function hasRawLatexProseRisk(value) {
  if (value.includes("$") || value.includes("\\text{")) return false;
  if (hasLatexEnvironment(value)) return false;
  if (!looksLikeProseStem(value)) return false;
  return /\\[A-Za-z]+|\\[{}]|[A-Za-z]\s*\\(?:to|circ|cap|cup|subset|subseteq|setminus)|\|[^|]+\|/.test(
    value,
  );
}

function mathSegments(value, mathOnly) {
  if (mathOnly) return [value];

  if (value.includes("$")) {
    const segments = [];
    let current = "";
    let inMath = false;

    for (let index = 0; index < value.length; index += 1) {
      const character = value[index];
      if (character === "$" && value[index - 1] !== "\\") {
        if (inMath) segments.push(current);
        current = "";
        inMath = !inMath;
      } else {
        current += character;
      }
    }
    return segments;
  }

  if (hasLatexEnvironment(value)) return [value];
  if (value.includes("\\text{")) return splitLatexTextCommandMath(value);
  if (looksLikeLatex(value)) return [value];
  return [];
}

function hasLatexEnvironment(value) {
  return /\\begin\{(?:array|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\}/.test(
    value,
  );
}

function looksLikeProseStem(value) {
  return (
    /\s/.test(value) &&
    /\b(?:How|If|In|Let|On|For|Find|The|Then|Which|Suppose|Restricted|defined|define|number|sets?|functions?|relations?)\b/i.test(
      value,
    )
  );
}

function splitLatexTextCommandMath(value) {
  const segments = [];
  let mathBuffer = "";
  let index = 0;

  const pushMath = () => {
    const normalized = normalizeMathCommand(mathBuffer);
    mathBuffer = "";
    if (normalized) segments.push(normalized);
  };

  while (index < value.length) {
    if (value.startsWith("\\text{", index)) {
      pushMath();
      const body = readBalancedTextCommand(value, index + "\\text".length);
      if (!body) {
        mathBuffer += value[index];
        index += 1;
        continue;
      }
      index = body.endIndex;
      continue;
    }

    mathBuffer += value[index];
    index += 1;
  }

  pushMath();
  return segments;
}

function readBalancedTextCommand(value, braceIndex) {
  if (value[braceIndex] !== "{") return null;

  let depth = 0;
  for (let index = braceIndex; index < value.length; index += 1) {
    const character = value[index];
    const escaped = value[index - 1] === "\\";

    if (character === "{" && !escaped) {
      depth += 1;
      continue;
    }

    if (character === "}" && !escaped) {
      depth -= 1;
      if (depth === 0) return { endIndex: index + 1 };
    }
  }

  return null;
}

function normalizeMathCommand(value) {
  return value
    .replace(/^(?:\s*\\(?:\s|,|;|:|quad|qquad))+/, "")
    .replace(/(?:\\(?:\s|,|;|:|quad|qquad)\s*)+$/, "")
    .trim();
}

function looksLikeLatex(value) {
  return /\\(?:text|frac|dfrac|lim|begin|left|right|sqrt|infty|pi|to|sin|cos|tan|sec|csc|cot|ln|log|arcsin|arccos|arctan|cdot|quad|le|ge|ne|pm|int|sum|hline|array|displaystyle|Delta|delta|Rightarrow|mathbb|operatorname)/.test(
    value,
  );
}

function renderLatex(location, value) {
  if (!value.trim()) {
    fail(location, "empty math segment");
    return;
  }

  try {
    katex.renderToString(value, {
      displayMode: false,
      throwOnError: true,
      strict: "ignore",
      trust: false,
    });
  } catch (error) {
    fail(location, `KaTeX parse error for "${value}": ${error.message}`);
  }
}

function auditFigure(location, figure) {
  if (!figure) return;
  figureCount += 1;

  if (figure.type !== "svg")
    fail(location, `unsupported figure type ${figure.type}`);
  assertNonEmpty(`${location}.title`, figure.title);
  assertNonEmpty(`${location}.description`, figure.description);
  assertNonEmpty(`${location}.svg`, figure.svg);

  const key = `${figure.title}|${figure.svg}`;
  seenFigures.add(key);

  const svg = figure.svg ?? "";
  if (!/<svg[\s>]/.test(svg) || !/<\/svg>\s*$/.test(svg.trim())) {
    fail(location, "SVG must start with <svg> and end with </svg>");
  }
  if (/<text\b[^>]*>[^<]*<=[^<]*<\/text>/.test(svg)) {
    fail(location, "raw <= inside SVG text; use ≤ or &#8804;");
  }
  if (/&(?!#\d+;|#x[0-9a-fA-F]+;|amp;|lt;|gt;|quot;|apos;)/.test(svg)) {
    fail(location, "raw or unsupported ampersand entity in SVG");
  }

  const namedEntities = [...svg.matchAll(/&([A-Za-z][A-Za-z0-9]+);/g)].map(
    (match) => match[1],
  );
  const invalidNamedEntities = namedEntities.filter(
    (entity) => !["amp", "lt", "gt", "quot", "apos"].includes(entity),
  );
  if (invalidNamedEntities.length > 0) {
    fail(
      location,
      `invalid XML named entities: ${invalidNamedEntities.join(", ")}`,
    );
  }
}

function auditHints(location, hints) {
  if (!Array.isArray(hints) || hints.length !== 3) {
    fail(location, "hint ladder must contain exactly 3 hints");
    return;
  }

  hints.forEach((hint, index) => {
    if (hint.level !== index + 1)
      fail(`${location}[${index}]`, "hint level mismatch");
    auditText(`${location}[${index}].body`, hint.body);
  });
}

function auditWorkedSolution(location, item) {
  if (item.kind === "frq") {
    if (
      !Array.isArray(item.workedSolution) ||
      item.workedSolution.length === 0
    ) {
      fail(location, "FRQ missing workedSolution");
      return;
    }
    item.workedSolution.forEach((part, index) => {
      assertNonEmpty(`${location}.workedSolution[${index}].part`, part.part);
      auditText(
        `${location}.workedSolution[${index}].explanation`,
        part.explanation,
      );
    });
    return;
  }

  if (!Array.isArray(item.workedSolution) || item.workedSolution.length === 0) {
    fail(location, "missing workedSolution");
    return;
  }

  item.workedSolution.forEach((step, index) => {
    if (step.step !== index + 1)
      fail(`${location}.workedSolution[${index}]`, "step number mismatch");
    auditText(
      `${location}.workedSolution[${index}].explanation`,
      step.explanation,
    );
    if (step.math)
      auditText(`${location}.workedSolution[${index}].math`, step.math, {
        mathOnly: true,
      });
  });
}

function auditItem(config, topic, item) {
  itemCount += 1;
  const location = `${config.courseSlug}/${config.slug}/${item.contentId}`;

  if (seenContentIds.has(item.contentId)) fail(location, "duplicate contentId");
  seenContentIds.add(item.contentId);

  const routeKey = `${config.courseSlug}/${config.slug}/${itemSlug(item.contentId)}`;
  if (seenRoutes.has(routeKey))
    fail(location, `duplicate item route ${routeKey}`);
  seenRoutes.add(routeKey);

  if (item.course !== config.courseSlug)
    fail(location, `course mismatch ${item.course}`);
  if (item.unit !== config.slug) fail(location, `unit mismatch ${item.unit}`);
  if (item.topic !== topic.topicCode)
    fail(location, `topic mismatch ${item.topic}`);
  if (
    !Number.isInteger(item.difficulty) ||
    item.difficulty < 1 ||
    item.difficulty > 5
  ) {
    fail(location, `invalid difficulty ${item.difficulty}`);
  }
  if (typeof item.calculatorAllowed !== "boolean") {
    fail(location, "calculatorAllowed must be boolean");
  }
  if (!/^\d+\.\d+\.\d+$/.test(item.version))
    fail(location, `invalid version ${item.version}`);
  if (
    !["human_review_required", "ai_reviewed", "verified"].includes(
      item.reviewStatus,
    )
  ) {
    fail(location, `invalid reviewStatus ${item.reviewStatus}`);
  }
  if (
    !["original_ai_assisted_question", "tutor_authored", "verified"].includes(
      item.sourceType,
    )
  ) {
    fail(location, `invalid sourceType ${item.sourceType}`);
  }
  if (!Array.isArray(item.skillTags) || item.skillTags.length === 0) {
    fail(location, "missing skillTags");
  }
  if (!Array.isArray(item.commonMisconceptions)) {
    fail(location, "commonMisconceptions must be an array");
  }

  auditText(`${location}.questionLatex`, item.questionLatex);
  auditHints(`${location}.hintLadder`, item.hintLadder);
  auditWorkedSolution(location, item);
  auditFigure(`${location}.figure`, item.figure);

  if (item.kind === "mc_single") auditMc(location, item);
  else if (item.kind === "numeric") auditNumeric(location, item);
  else if (item.kind === "frq") auditFrq(location, item);
  else fail(location, `unsupported item kind ${item.kind}`);
}

function auditMc(location, item) {
  if (!Array.isArray(item.choices) || item.choices.length !== 4) {
    fail(location, "MC item must have exactly 4 choices");
    return;
  }

  const expectedLetters = LETTERS.slice(0, item.choices.length);
  const actualLetters = item.choices.map((choice) => choice.letter);
  if (actualLetters.join("") !== expectedLetters.join("")) {
    fail(location, `choice letters must be ${expectedLetters.join(",")}`);
  }

  const correctChoices = item.choices.filter((choice) => choice.isCorrect);
  if (correctChoices.length !== 1)
    fail(
      location,
      `expected exactly one correct choice, got ${correctChoices.length}`,
    );
  if (correctChoices[0]?.letter !== item.correctLetter) {
    fail(
      location,
      `correctLetter ${item.correctLetter} does not match isCorrect choice ${correctChoices[0]?.letter}`,
    );
  }

  item.choices.forEach((choice) => {
    auditText(`${location}.choice.${choice.letter}.text`, choice.text);
    if (choice.isCorrect) {
      if (choice.rationaleIfWrong !== null) {
        fail(
          `${location}.choice.${choice.letter}`,
          "correct choice should not have rationaleIfWrong",
        );
      }
      if (choice.misconceptionTag !== null) {
        fail(
          `${location}.choice.${choice.letter}`,
          "correct choice should not have misconceptionTag",
        );
      }
    } else {
      auditText(
        `${location}.choice.${choice.letter}.rationaleIfWrong`,
        choice.rationaleIfWrong,
      );
      assertNonEmpty(
        `${location}.choice.${choice.letter}.misconceptionTag`,
        choice.misconceptionTag,
      );
    }
  });
}

function auditNumeric(location, item) {
  if (!item.answer || !Number.isFinite(item.answer.value)) {
    fail(location, "numeric item must have a finite answer.value");
  }
  if (
    item.answer?.toleranceAbs !== undefined &&
    (!Number.isFinite(item.answer.toleranceAbs) || item.answer.toleranceAbs < 0)
  ) {
    fail(location, "numeric item has invalid toleranceAbs");
  }
  if (
    item.answer?.toleranceRel !== undefined &&
    (!Number.isFinite(item.answer.toleranceRel) || item.answer.toleranceRel < 0)
  ) {
    fail(location, "numeric item has invalid toleranceRel");
  }
}

function auditFrq(location, item) {
  if (!Array.isArray(item.parts) || item.parts.length === 0) {
    fail(location, "FRQ must have parts");
    return;
  }
  if (!item.rubric || !Array.isArray(item.rubric.criteria)) {
    fail(location, "FRQ missing rubric criteria");
    return;
  }

  let totalPartPoints = 0;
  item.parts.forEach((part, index) => {
    assertNonEmpty(`${location}.parts[${index}].letter`, part.letter);
    auditText(
      `${location}.parts[${index}].promptMarkdown`,
      part.promptMarkdown,
    );
    if (!Number.isFinite(part.points) || part.points <= 0) {
      fail(`${location}.parts[${index}]`, "invalid points");
    }
    totalPartPoints += part.points;
  });

  const totalCriteriaPoints = item.rubric.criteria.reduce(
    (sum, criterion) => sum + criterion.points,
    0,
  );
  if (item.rubric.maxPoints !== totalPartPoints) {
    fail(
      location,
      `rubric maxPoints ${item.rubric.maxPoints} does not equal part total ${totalPartPoints}`,
    );
  }
  if (item.rubric.maxPoints !== totalCriteriaPoints) {
    fail(
      location,
      `rubric maxPoints ${item.rubric.maxPoints} does not equal criteria total ${totalCriteriaPoints}`,
    );
  }

  item.rubric.criteria.forEach((criterion, index) => {
    assertNonEmpty(
      `${location}.rubric.criteria[${index}].part`,
      criterion.part,
    );
    auditText(
      `${location}.rubric.criteria[${index}].description`,
      criterion.description,
    );
    if (!Number.isFinite(criterion.points) || criterion.points <= 0) {
      fail(`${location}.rubric.criteria[${index}]`, "invalid points");
    }
  });

  if (!Array.isArray(item.commonErrors))
    fail(location, "FRQ commonErrors must be an array");
  item.commonErrors?.forEach((error, index) =>
    auditText(`${location}.commonErrors[${index}]`, error),
  );
}

for (const config of unitConfigs) {
  const topics = loadTopics(config);
  if (!Array.isArray(topics) || topics.length === 0) {
    fail(`${config.courseSlug}/${config.slug}`, "unit has no topics");
    continue;
  }

  for (const topic of topics) {
    assertNonEmpty(
      `${config.courseSlug}/${config.slug}.topicCode`,
      topic.topicCode,
    );
    assertNonEmpty(
      `${config.courseSlug}/${config.slug}.${topic.topicCode}.title`,
      topic.title,
    );
    if (!Array.isArray(topic.items) || topic.items.length === 0) {
      fail(
        `${config.courseSlug}/${config.slug}.${topic.topicCode}`,
        "topic has no items",
      );
      continue;
    }
    topic.items.forEach((item) => auditItem(config, topic, item));
  }
}

if (failures.length > 0) {
  console.error("Launch readiness audit failed:");
  failures.slice(0, 200).forEach((failure) => console.error(`- ${failure}`));
  if (failures.length > 200) {
    console.error(`...and ${failures.length - 200} more failures.`);
  }
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      units: unitConfigs.length,
      items: itemCount,
      uniqueRoutes: seenRoutes.size,
      figures: figureCount,
      uniqueFigures: seenFigures.size,
    },
    null,
    2,
  ),
);
