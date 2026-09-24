import {
  copyFileSync,
  existsSync,
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
const unitConfigs = {
  "u1-limits": {
    exportName: "limitTopics",
    packageName: "ap-calc-ab-u1-limits",
    sourceParts: ["content", "calc-ab", "u1-limits", "topics.ts"],
    title: "Unit 1 - Limits and Continuity",
    alignment: "AP Calculus AB Unit 1",
  },
  "u2-differentiation": {
    exportName: "differentiationTopics",
    packageName: "ap-calc-ab-u2-differentiation",
    sourceParts: ["content", "calc-ab", "u2-differentiation", "topics.ts"],
    title: "Unit 2 - Differentiation: Definition and Properties",
    alignment: "AP Calculus AB Unit 2",
  },
  "u3-comp-implicit": {
    exportName: "compositeImplicitTopics",
    packageName: "ap-calc-ab-u3-composite-implicit-inverse",
    sourceParts: ["content", "calc-ab", "u3-comp-implicit", "topics.ts"],
    title:
      "Unit 3 - Differentiation: Composite, Implicit, and Inverse Functions",
    alignment: "AP Calculus AB Unit 3",
  },
  "u4-contextual-app": {
    exportName: "contextualApplicationTopics",
    packageName: "ap-calc-ab-u4-contextual-applications",
    sourceParts: ["content", "calc-ab", "u4-contextual-app", "topics.ts"],
    title: "Unit 4 - Contextual Applications of Differentiation",
    alignment: "AP Calculus AB Unit 4",
  },
  "u5-analytical-app": {
    exportName: "analyticalApplicationTopics",
    packageName: "ap-calc-ab-u5-analytical-applications",
    sourceParts: ["content", "calc-ab", "u5-analytical-app", "topics.ts"],
    title: "Unit 5 - Analytical Applications of Differentiation",
    alignment: "AP Calculus AB Unit 5",
  },
  "u6-integration": {
    exportName: "integrationTopics",
    packageName: "ap-calc-ab-u6-integration-accumulation",
    sourceParts: ["content", "calc-ab", "u6-integration", "topics.ts"],
    title: "Unit 6 - Integration and Accumulation of Change",
    alignment: "AP Calculus AB Unit 6",
  },
  "u7-diff-eqs": {
    exportName: "differentialEquationTopics",
    packageName: "ap-calc-ab-u7-differential-equations",
    sourceParts: ["content", "calc-ab", "u7-diff-eqs", "topics.ts"],
    title: "Unit 7 - Differential Equations",
    alignment: "AP Calculus AB Unit 7",
  },
  "u8-app-integration": {
    courseSlug: "calc-ab",
    courseTitle: "AP Calculus AB",
    exportName: "applicationIntegrationTopics",
    packageName: "ap-calc-ab-u8-applications-of-integration",
    sourceParts: ["content", "calc-ab", "u8-app-integration", "topics.ts"],
    title: "Unit 8 - Applications of Integration",
    alignment: "AP Calculus AB Unit 8",
  },
  "u1-relations-functions": {
    courseSlug: "cbse-math-12",
    courseTitle: "CBSE Class 12 Mathematics",
    exportName: "relationsFunctionsTopics",
    packageName: "cbse-class-12-math-u1-relations-functions",
    sourceParts: [
      "content",
      "cbse-math-12",
      "u1-relations-functions",
      "topics.ts",
    ],
    title: "Unit I - Relations and Functions",
    alignment: "CBSE Class XII Mathematics Unit I",
  },
  "u2-algebra": {
    courseSlug: "cbse-math-12",
    courseTitle: "CBSE Class 12 Mathematics",
    exportName: "algebraTopics",
    packageName: "cbse-class-12-math-u2-algebra",
    sourceParts: ["content", "cbse-math-12", "u2-algebra", "topics.ts"],
    title: "Unit II - Algebra",
    alignment: "CBSE Class XII Mathematics Unit II",
  },
  "u3-calculus": {
    courseSlug: "cbse-math-12",
    courseTitle: "CBSE Class 12 Mathematics",
    exportName: "calculusTopics",
    packageName: "cbse-class-12-math-u3-calculus",
    sourceParts: ["content", "cbse-math-12", "u3-calculus", "topics.ts"],
    title: "Unit III - Calculus",
    alignment: "CBSE Class XII Mathematics Unit III",
  },
  "u4-vectors-3d": {
    courseSlug: "cbse-math-12",
    courseTitle: "CBSE Class 12 Mathematics",
    exportName: "vectors3dTopics",
    packageName: "cbse-class-12-math-u4-vectors-3d",
    sourceParts: ["content", "cbse-math-12", "u4-vectors-3d", "topics.ts"],
    title: "Unit IV - Vectors and Three-Dimensional Geometry",
    alignment: "CBSE Class XII Mathematics Unit IV",
  },
  "u5-linear-programming": {
    courseSlug: "cbse-math-12",
    courseTitle: "CBSE Class 12 Mathematics",
    exportName: "linearProgrammingTopics",
    packageName: "cbse-class-12-math-u5-linear-programming",
    sourceParts: [
      "content",
      "cbse-math-12",
      "u5-linear-programming",
      "topics.ts",
    ],
    title: "Unit V - Linear Programming",
    alignment: "CBSE Class XII Mathematics Unit V",
  },
  "u6-probability": {
    courseSlug: "cbse-math-12",
    courseTitle: "CBSE Class 12 Mathematics",
    exportName: "probabilityTopics",
    packageName: "cbse-class-12-math-u6-probability",
    sourceParts: ["content", "cbse-math-12", "u6-probability", "topics.ts"],
    title: "Unit VI - Probability",
    alignment: "CBSE Class XII Mathematics Unit VI",
  },
  "u1-sets-functions": {
    courseSlug: "cbse-math-11",
    courseTitle: "CBSE Class 11 Mathematics",
    exportName: "setsFunctionsTopics",
    packageName: "cbse-class-11-math-u1-sets-functions",
    sourceParts: ["content", "cbse-math-11", "u1-sets-functions", "topics.ts"],
    title: "Unit I - Sets and Functions",
    alignment: "CBSE Class XI Mathematics Unit I",
  },
  "u2-algebra-xi": {
    courseSlug: "cbse-math-11",
    courseTitle: "CBSE Class 11 Mathematics",
    exportName: "algebraXiTopics",
    packageName: "cbse-class-11-math-u2-algebra",
    sourceParts: ["content", "cbse-math-11", "u2-algebra-xi", "topics.ts"],
    title: "Unit II - Algebra",
    alignment: "CBSE Class XI Mathematics Unit II",
  },
  "u3-coordinate-geometry": {
    courseSlug: "cbse-math-11",
    courseTitle: "CBSE Class 11 Mathematics",
    exportName: "coordinateGeometryTopics",
    packageName: "cbse-class-11-math-u3-coordinate-geometry",
    sourceParts: [
      "content",
      "cbse-math-11",
      "u3-coordinate-geometry",
      "topics.ts",
    ],
    title: "Unit III - Coordinate Geometry",
    alignment: "CBSE Class XI Mathematics Unit III",
  },
  "u4-calculus-xi": {
    courseSlug: "cbse-math-11",
    courseTitle: "CBSE Class 11 Mathematics",
    exportName: "calculusXiTopics",
    packageName: "cbse-class-11-math-u4-calculus",
    sourceParts: ["content", "cbse-math-11", "u4-calculus-xi", "topics.ts"],
    title: "Unit IV - Calculus",
    alignment: "CBSE Class XI Mathematics Unit IV",
  },
  "u5-statistics-probability": {
    courseSlug: "cbse-math-11",
    courseTitle: "CBSE Class 11 Mathematics",
    exportName: "statisticsProbabilityTopics",
    packageName: "cbse-class-11-math-u5-statistics-probability",
    sourceParts: [
      "content",
      "cbse-math-11",
      "u5-statistics-probability",
      "topics.ts",
    ],
    title: "Unit V - Statistics and Probability",
    alignment: "CBSE Class XI Mathematics Unit V",
  },
  "u1-number-systems": {
    courseSlug: "cbse-math-10",
    courseTitle: "CBSE Class 10 Mathematics",
    exportName: "numberSystemsXTopics",
    packageName: "cbse-class-10-math-u1-number-systems",
    sourceParts: ["content", "cbse-math-10", "u1-number-systems", "topics.ts"],
    title: "Unit I - Number Systems",
    alignment: "CBSE Class X Mathematics Unit I",
  },
  "u2-algebra-x": {
    courseSlug: "cbse-math-10",
    courseTitle: "CBSE Class 10 Mathematics",
    exportName: "algebraXTopics",
    packageName: "cbse-class-10-math-u2-algebra",
    sourceParts: ["content", "cbse-math-10", "u2-algebra-x", "topics.ts"],
    title: "Unit II - Algebra",
    alignment: "CBSE Class X Mathematics Unit II",
  },
  "u6-mensuration-x": {
    courseSlug: "cbse-math-10",
    courseTitle: "CBSE Class 10 Mathematics",
    exportName: "mensurationXTopics",
    packageName: "cbse-class-10-math-u6-mensuration",
    sourceParts: ["content", "cbse-math-10", "u6-mensuration", "topics.ts"],
    title: "Unit VI - Mensuration",
    alignment: "CBSE Class X Mathematics Unit VI",
  },
  "u1-number-system": {
    courseSlug: "cbse-math-9",
    courseTitle: "CBSE Class 9 Mathematics",
    exportName: "numberSystemTopics",
    packageName: "cbse-class-9-math-u1-number-system",
    sourceParts: ["content", "cbse-math-9", "u1-number-system", "topics.ts"],
    title: "Unit I - Number System",
    alignment: "CBSE Class IX Mathematics Unit I",
  },
  "u2-algebra-ix": {
    courseSlug: "cbse-math-9",
    courseTitle: "CBSE Class 9 Mathematics",
    exportName: "algebraTopics",
    packageName: "cbse-class-9-math-u2-algebra",
    sourceParts: ["content", "cbse-math-9", "u2-algebra", "topics.ts"],
    title: "Unit II - Algebra",
    alignment: "CBSE Class IX Mathematics Unit II",
  },
  "u3-coordinate-geometry-ix": {
    courseSlug: "cbse-math-9",
    courseTitle: "CBSE Class 9 Mathematics",
    exportName: "coordinateGeometryIxTopics",
    packageName: "cbse-class-9-math-u3-coordinate-geometry",
    sourceParts: [
      "content",
      "cbse-math-9",
      "u3-coordinate-geometry",
      "topics.ts",
    ],
    title: "Unit III - Coordinate Geometry",
    alignment: "CBSE Class IX Mathematics Unit III",
  },
  "u4-geometry": {
    courseSlug: "cbse-math-9",
    courseTitle: "CBSE Class 9 Mathematics",
    exportName: "geometryIxTopics",
    packageName: "cbse-class-9-math-u4-geometry",
    sourceParts: ["content", "cbse-math-9", "u4-geometry", "topics.ts"],
    title: "Unit IV - Geometry",
    alignment: "CBSE Class IX Mathematics Unit IV",
  },
  "u5-mensuration": {
    courseSlug: "cbse-math-9",
    courseTitle: "CBSE Class 9 Mathematics",
    exportName: "mensurationIxTopics",
    packageName: "cbse-class-9-math-u5-mensuration",
    sourceParts: ["content", "cbse-math-9", "u5-mensuration", "topics.ts"],
    title: "Unit V - Mensuration",
    alignment: "CBSE Class IX Mathematics Unit V",
  },
  "u6-statistics-probability": {
    courseSlug: "cbse-math-9",
    courseTitle: "CBSE Class 9 Mathematics",
    exportName: "statisticsProbabilityIxTopics",
    packageName: "cbse-class-9-math-u6-statistics-probability",
    sourceParts: [
      "content",
      "cbse-math-9",
      "u6-statistics-probability",
      "topics.ts",
    ],
    title: "Unit VI - Statistics and Probability",
    alignment: "CBSE Class IX Mathematics Unit VI",
  },
  "u1-world-of-living": {
    courseSlug: "cbse-science-9",
    courseTitle: "CBSE Class 9 Science",
    exportName: "worldOfLivingTopics",
    packageName: "cbse-class-9-science-u1-world-of-living",
    sourceParts: ["content", "cbse-science-9", "u1-world-of-living", "topics.ts"],
    title: "Unit I - World of Living",
    alignment: "CBSE Class IX Science Unit I",
  },
  "u2-matter-nature-behaviour": {
    courseSlug: "cbse-science-9",
    courseTitle: "CBSE Class 9 Science",
    exportName: "matterNatureBehaviourTopics",
    packageName: "cbse-class-9-science-u2-matter-nature-behaviour",
    sourceParts: [
      "content",
      "cbse-science-9",
      "u2-matter-nature-behaviour",
      "topics.ts",
    ],
    title: "Unit II - Matter - Its Nature and Behaviour",
    alignment: "CBSE Class IX Science Unit II",
  },
  "u3-motion-force-work-sound": {
    courseSlug: "cbse-science-9",
    courseTitle: "CBSE Class 9 Science",
    exportName: "motionForceWorkSoundTopics",
    packageName: "cbse-class-9-science-u3-motion-force-work-sound",
    sourceParts: [
      "content",
      "cbse-science-9",
      "u3-motion-force-work-sound",
      "topics.ts",
    ],
    title: "Unit III - Motion, Force, Work and Sound",
    alignment: "CBSE Class IX Science Unit III",
  },
  "u4-earth-as-a-system": {
    courseSlug: "cbse-science-9",
    courseTitle: "CBSE Class 9 Science",
    exportName: "earthAsSystemTopics",
    packageName: "cbse-class-9-science-u4-earth-as-a-system",
    sourceParts: [
      "content",
      "cbse-science-9",
      "u4-earth-as-a-system",
      "topics.ts",
    ],
    title: "Unit IV - Earth as a System",
    alignment: "CBSE Class IX Science Unit IV",
  },
  "internal-assessment-practicals": {
    courseSlug: "cbse-science-9",
    courseTitle: "CBSE Class 9 Science",
    exportName: "scienceIaTopics",
    packageName: "cbse-class-9-science-internal-assessment-practicals",
    sourceParts: [
      "content",
      "cbse-science-9",
      "internal-assessment-practicals",
      "topics.ts",
    ],
    title: "Internal Assessment - Practical Work",
    alignment: "CBSE Class IX Science Internal Assessment and Practical Work",
  },
  "cbse-science-10/u2-world-of-living": {
    courseSlug: "cbse-science-10",
    courseTitle: "CBSE Class 10 Science",
    exportName: "worldOfLivingXTopics",
    packageName: "cbse-class-10-science-u2-world-of-living",
    sourceParts: [
      "content",
      "cbse-science-10",
      "u2-world-of-living",
      "topics.ts",
    ],
    title: "Unit II - World of Living",
    alignment: "CBSE Class X Science Unit II",
  },
  "cbse-science-10/u3-natural-phenomena": {
    courseSlug: "cbse-science-10",
    courseTitle: "CBSE Class 10 Science",
    exportName: "naturalPhenomenaXTopics",
    packageName: "cbse-class-10-science-u3-natural-phenomena",
    sourceParts: [
      "content",
      "cbse-science-10",
      "u3-natural-phenomena",
      "topics.ts",
    ],
    title: "Unit III - Natural Phenomena",
    alignment: "CBSE Class X Science Unit III",
  },
  "cbse-science-10/u4-effects-of-current": {
    courseSlug: "cbse-science-10",
    courseTitle: "CBSE Class 10 Science",
    exportName: "effectsOfCurrentXTopics",
    packageName: "cbse-class-10-science-u4-effects-of-current",
    sourceParts: [
      "content",
      "cbse-science-10",
      "u4-effects-of-current",
      "topics.ts",
    ],
    title: "Unit IV - Effects of Current",
    alignment: "CBSE Class X Science Unit IV",
  },
  "cbse-science-10/u5-natural-resources": {
    courseSlug: "cbse-science-10",
    courseTitle: "CBSE Class 10 Science",
    exportName: "naturalResourcesXTopics",
    packageName: "cbse-class-10-science-u5-natural-resources",
    sourceParts: [
      "content",
      "cbse-science-10",
      "u5-natural-resources",
      "topics.ts",
    ],
    title: "Unit V - Natural Resources",
    alignment: "CBSE Class X Science Unit V",
  },
  "cbse-science-10/formative-reinforcement": {
    courseSlug: "cbse-science-10",
    courseTitle: "CBSE Class 10 Science",
    exportName: "science10FormativeReinforcementTopics",
    packageName: "cbse-class-10-science-formative-reinforcement",
    sourceParts: [
      "content",
      "cbse-science-10",
      "formative-reinforcement",
      "topics.ts",
    ],
    title: "Formative Reinforcement Topics",
    alignment:
      "CBSE Class X Science formative reinforcement topics; non-summative, internal-assessment/enrichment use",
  },
  "cbse-science-10/internal-assessment-practicals": {
    courseSlug: "cbse-science-10",
    courseTitle: "CBSE Class 10 Science",
    exportName: "science10PracticalsTopics",
    packageName: "cbse-class-10-science-internal-assessment-practicals",
    sourceParts: [
      "content",
      "cbse-science-10",
      "internal-assessment-practicals",
      "topics.ts",
    ],
    title: "Internal Assessment - Practical Work",
    alignment: "CBSE Class X Science Internal Assessment and Practical Work",
  },
  "u1-physical-world-measurement": {
    courseSlug: "cbse-physics-11",
    courseTitle: "CBSE Class 11 Physics",
    exportName: "physicalWorldMeasurementTopics",
    packageName: "cbse-class-11-physics-u1-physical-world-measurement",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u1-physical-world-measurement",
      "topics.ts",
    ],
    title: "Unit I - Physical World and Measurements",
    alignment: "CBSE Class XI Physics Unit I",
  },
  "u2-kinematics": {
    courseSlug: "cbse-physics-11",
    courseTitle: "CBSE Class 11 Physics",
    exportName: "kinematicsTopics",
    packageName: "cbse-class-11-physics-u2-kinematics",
    sourceParts: ["content", "cbse-physics-11", "u2-kinematics", "topics.ts"],
    title: "Unit II - Kinematics",
    alignment: "CBSE Class XI Physics Unit II",
  },
  "u3-laws-of-motion": {
    courseSlug: "cbse-physics-11",
    courseTitle: "CBSE Class 11 Physics",
    exportName: "lawsOfMotionTopics",
    packageName: "cbse-class-11-physics-u3-laws-of-motion",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u3-laws-of-motion",
      "topics.ts",
    ],
    title: "Unit III - Laws of Motion",
    alignment: "CBSE Class XI Physics Unit III",
  },
  "u4-work-energy-power": {
    courseSlug: "cbse-physics-11",
    courseTitle: "CBSE Class 11 Physics",
    exportName: "workEnergyPowerTopics",
    packageName: "cbse-class-11-physics-u4-work-energy-power",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u4-work-energy-power",
      "topics.ts",
    ],
    title: "Unit IV - Work, Energy and Power",
    alignment: "CBSE Class XI Physics Unit IV",
  },
  "u5-system-particles-rigid-body": {
    courseSlug: "cbse-physics-11",
    courseTitle: "CBSE Class 11 Physics",
    exportName: "systemParticlesRigidBodyTopics",
    packageName: "cbse-class-11-physics-u5-system-particles-rigid-body",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u5-system-particles-rigid-body",
      "topics.ts",
    ],
    title: "Unit V - System of Particles and Rotational Motion",
    alignment: "CBSE Class XI Physics Unit V",
  },
  "u6-gravitation": {
    courseSlug: "cbse-physics-11",
    courseTitle: "CBSE Class 11 Physics",
    exportName: "gravitationTopics",
    packageName: "cbse-class-11-physics-u6-gravitation",
    sourceParts: ["content", "cbse-physics-11", "u6-gravitation", "topics.ts"],
    title: "Unit VI - Gravitation",
    alignment: "CBSE Class XI Physics Unit VI",
  },
  "u7-properties-bulk-matter": {
    courseSlug: "cbse-physics-11",
    courseTitle: "CBSE Class 11 Physics",
    exportName: "propertiesBulkMatterTopics",
    packageName: "cbse-class-11-physics-u7-properties-bulk-matter",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u7-properties-bulk-matter",
      "topics.ts",
    ],
    title: "Unit VII - Properties of Bulk Matter",
    alignment: "CBSE Class XI Physics Unit VII",
  },
  "u8-thermodynamics": {
    courseSlug: "cbse-physics-11",
    courseTitle: "CBSE Class 11 Physics",
    exportName: "thermodynamicsTopics",
    packageName: "cbse-class-11-physics-u8-thermodynamics",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u8-thermodynamics",
      "topics.ts",
    ],
    title: "Unit VIII - Thermodynamics",
    alignment: "CBSE Class XI Physics Unit VIII",
  },
  "u9-kinetic-theory": {
    courseSlug: "cbse-physics-11",
    courseTitle: "CBSE Class 11 Physics",
    exportName: "kineticTheoryTopics",
    packageName: "cbse-class-11-physics-u9-kinetic-theory",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u9-kinetic-theory",
      "topics.ts",
    ],
    title: "Unit IX - Behaviour of Perfect Gases and Kinetic Theory of Gases",
    alignment: "CBSE Class XI Physics Unit IX",
  },
  "u10-oscillations-waves": {
    courseSlug: "cbse-physics-11",
    courseTitle: "CBSE Class 11 Physics",
    exportName: "oscillationsWavesTopics",
    packageName: "cbse-class-11-physics-u10-oscillations-waves",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "u10-oscillations-waves",
      "topics.ts",
    ],
    title: "Unit X - Oscillations and Waves",
    alignment: "CBSE Class XI Physics Unit X",
  },
  "practicals-activities": {
    courseSlug: "cbse-physics-11",
    courseTitle: "CBSE Class 11 Physics",
    exportName: "practicalsActivitiesTopics",
    packageName: "cbse-class-11-physics-practicals-activities",
    sourceParts: [
      "content",
      "cbse-physics-11",
      "practicals-activities",
      "topics.ts",
    ],
    title: "Lab - Practicals and Activities",
    alignment: "CBSE Class XI Physics practical syllabus 2026-27",
  },
  "u1-electrostatics": {
    courseSlug: "cbse-physics-12",
    courseTitle: "CBSE Class 12 Physics",
    exportName: "electrostaticsTopics",
    packageName: "cbse-class-12-physics-u1-electrostatics",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u1-electrostatics",
      "topics.ts",
    ],
    title: "Unit I - Electrostatics",
    alignment: "CBSE Class XII Physics Unit I",
  },
  "u2-current-electricity": {
    courseSlug: "cbse-physics-12",
    courseTitle: "CBSE Class 12 Physics",
    exportName: "currentElectricityTopics",
    packageName: "cbse-class-12-physics-u2-current-electricity",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u2-current-electricity",
      "topics.ts",
    ],
    title: "Unit II - Current Electricity",
    alignment: "CBSE Class XII Physics Unit II",
  },
  "u3-magnetic-effects-current-magnetism": {
    courseSlug: "cbse-physics-12",
    courseTitle: "CBSE Class 12 Physics",
    exportName: "magneticEffectsCurrentMagnetismTopics",
    packageName: "cbse-class-12-physics-u3-magnetic-effects-current-magnetism",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u3-magnetic-effects-current-magnetism",
      "topics.ts",
    ],
    title: "Unit III - Magnetic Effects of Current and Magnetism",
    alignment: "CBSE Class XII Physics Unit III",
  },
  "u4-electromagnetic-induction-alternating-currents": {
    courseSlug: "cbse-physics-12",
    courseTitle: "CBSE Class 12 Physics",
    exportName: "electromagneticInductionAlternatingCurrentsTopics",
    packageName:
      "cbse-class-12-physics-u4-electromagnetic-induction-alternating-currents",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u4-electromagnetic-induction-alternating-currents",
      "topics.ts",
    ],
    title: "Unit IV - Electromagnetic Induction and Alternating Currents",
    alignment: "CBSE Class XII Physics Unit IV",
  },
  "u5-electromagnetic-waves": {
    courseSlug: "cbse-physics-12",
    courseTitle: "CBSE Class 12 Physics",
    exportName: "electromagneticWavesTopics",
    packageName: "cbse-class-12-physics-u5-electromagnetic-waves",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u5-electromagnetic-waves",
      "topics.ts",
    ],
    title: "Unit V - Electromagnetic Waves",
    alignment: "CBSE Class XII Physics Unit V",
  },
  "u6-optics": {
    courseSlug: "cbse-physics-12",
    courseTitle: "CBSE Class 12 Physics",
    exportName: "opticsTopics",
    packageName: "cbse-class-12-physics-u6-optics",
    sourceParts: ["content", "cbse-physics-12", "u6-optics", "topics.ts"],
    title: "Unit VI - Optics",
    alignment: "CBSE Class XII Physics Unit VI",
  },
  "u7-dual-nature-radiation-matter": {
    courseSlug: "cbse-physics-12",
    courseTitle: "CBSE Class 12 Physics",
    exportName: "dualNatureRadiationMatterTopics",
    packageName: "cbse-class-12-physics-u7-dual-nature-radiation-matter",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u7-dual-nature-radiation-matter",
      "topics.ts",
    ],
    title: "Unit VII - Dual Nature of Radiation and Matter",
    alignment: "CBSE Class XII Physics Unit VII",
  },
  "u8-atoms-nuclei": {
    courseSlug: "cbse-physics-12",
    courseTitle: "CBSE Class 12 Physics",
    exportName: "atomsNucleiTopics",
    packageName: "cbse-class-12-physics-u8-atoms-nuclei",
    sourceParts: ["content", "cbse-physics-12", "u8-atoms-nuclei", "topics.ts"],
    title: "Unit VIII - Atoms and Nuclei",
    alignment: "CBSE Class XII Physics Unit VIII",
  },
  "u9-electronic-devices": {
    courseSlug: "cbse-physics-12",
    courseTitle: "CBSE Class 12 Physics",
    exportName: "electronicDevicesTopics",
    packageName: "cbse-class-12-physics-u9-electronic-devices",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "u9-electronic-devices",
      "topics.ts",
    ],
    title: "Unit IX - Electronic Devices",
    alignment: "CBSE Class XII Physics Unit IX",
  },
  "practicals-projects": {
    courseSlug: "cbse-physics-12",
    courseTitle: "CBSE Class 12 Physics",
    exportName: "physics12PracticalsProjectsTopics",
    packageName: "cbse-class-12-physics-practicals-projects",
    sourceParts: [
      "content",
      "cbse-physics-12",
      "practicals-projects",
      "topics.ts",
    ],
    title: "Practicals, Activities and Project Work",
    alignment: "CBSE Class XII Physics Practical Component",
  },
  "u1-some-basic-concepts": {
    courseSlug: "cbse-chemistry-11",
    courseTitle: "CBSE Class 11 Chemistry",
    exportName: "someBasicConceptsTopics",
    packageName: "cbse-class-11-chemistry-u1-some-basic-concepts",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u1-some-basic-concepts",
      "topics.ts",
    ],
    title: "Unit I - Some Basic Concepts of Chemistry",
    alignment: "CBSE Class XI Chemistry Unit I",
  },
  "u2-structure-of-atom": {
    courseSlug: "cbse-chemistry-11",
    courseTitle: "CBSE Class 11 Chemistry",
    exportName: "structureOfAtomTopics",
    packageName: "cbse-class-11-chemistry-u2-structure-of-atom",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u2-structure-of-atom",
      "topics.ts",
    ],
    title: "Unit II - Structure of Atom",
    alignment: "CBSE Class XI Chemistry Unit II",
  },
  "u3-classification-periodicity": {
    courseSlug: "cbse-chemistry-11",
    courseTitle: "CBSE Class 11 Chemistry",
    exportName: "classificationPeriodicityTopics",
    packageName: "cbse-class-11-chemistry-u3-classification-periodicity",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u3-classification-periodicity",
      "topics.ts",
    ],
    title:
      "Unit III - Classification of Elements and Periodicity in Properties",
    alignment: "CBSE Class XI Chemistry Unit III",
  },
  "u4-chemical-bonding-molecular-structure": {
    courseSlug: "cbse-chemistry-11",
    courseTitle: "CBSE Class 11 Chemistry",
    exportName: "chemicalBondingTopics",
    packageName:
      "cbse-class-11-chemistry-u4-chemical-bonding-molecular-structure",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u4-chemical-bonding-molecular-structure",
      "topics.ts",
    ],
    title: "Unit IV - Chemical Bonding and Molecular Structure",
    alignment: "CBSE Class XI Chemistry Unit IV",
  },
  "u5-chemical-thermodynamics": {
    courseSlug: "cbse-chemistry-11",
    courseTitle: "CBSE Class 11 Chemistry",
    exportName: "chemicalThermodynamicsTopics",
    packageName: "cbse-class-11-chemistry-u5-chemical-thermodynamics",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u5-chemical-thermodynamics",
      "topics.ts",
    ],
    title: "Unit V - Chemical Thermodynamics",
    alignment: "CBSE Class XI Chemistry Unit V",
  },
  "u6-equilibrium": {
    courseSlug: "cbse-chemistry-11",
    courseTitle: "CBSE Class 11 Chemistry",
    exportName: "equilibriumTopics",
    packageName: "cbse-class-11-chemistry-u6-equilibrium",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u6-equilibrium",
      "topics.ts",
    ],
    title: "Unit VI - Equilibrium",
    alignment: "CBSE Class XI Chemistry Unit VI",
  },
  "u7-redox-reactions": {
    courseSlug: "cbse-chemistry-11",
    courseTitle: "CBSE Class 11 Chemistry",
    exportName: "redoxReactionsTopics",
    packageName: "cbse-class-11-chemistry-u7-redox-reactions",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u7-redox-reactions",
      "topics.ts",
    ],
    title: "Unit VII - Redox Reactions",
    alignment: "CBSE Class XI Chemistry Unit VII",
  },
  "u8-organic-chemistry-basic-principles-techniques": {
    courseSlug: "cbse-chemistry-11",
    courseTitle: "CBSE Class 11 Chemistry",
    exportName: "organicChemistryBasicsTopics",
    packageName:
      "cbse-class-11-chemistry-u8-organic-chemistry-basic-principles-techniques",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u8-organic-chemistry-basic-principles-techniques",
      "topics.ts",
    ],
    title:
      "Unit VIII - Organic Chemistry: Some Basic Principles and Techniques",
    alignment: "CBSE Class XI Chemistry Unit VIII",
  },
  "u9-hydrocarbons": {
    courseSlug: "cbse-chemistry-11",
    courseTitle: "CBSE Class 11 Chemistry",
    exportName: "hydrocarbonsTopics",
    packageName: "cbse-class-11-chemistry-u9-hydrocarbons",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "u9-hydrocarbons",
      "topics.ts",
    ],
    title: "Unit IX - Hydrocarbons",
    alignment: "CBSE Class XI Chemistry Unit IX",
  },
  "u1-solutions": {
    courseSlug: "cbse-chemistry-12",
    courseTitle: "CBSE Class 12 Chemistry",
    exportName: "solutionsTopics",
    packageName: "cbse-class-12-chemistry-u1-solutions",
    sourceParts: ["content", "cbse-chemistry-12", "u1-solutions", "topics.ts"],
    title: "Unit I - Solutions",
    alignment: "CBSE Class XII Chemistry Unit I",
  },
  "u2-electrochemistry": {
    courseSlug: "cbse-chemistry-12",
    courseTitle: "CBSE Class 12 Chemistry",
    exportName: "electrochemistryTopics",
    packageName: "cbse-class-12-chemistry-u2-electrochemistry",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u2-electrochemistry",
      "topics.ts",
    ],
    title: "Unit II - Electrochemistry",
    alignment: "CBSE Class XII Chemistry Unit II",
  },
  "u3-chemical-kinetics": {
    courseSlug: "cbse-chemistry-12",
    courseTitle: "CBSE Class 12 Chemistry",
    exportName: "chemicalKineticsTopics",
    packageName: "cbse-class-12-chemistry-u3-chemical-kinetics",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u3-chemical-kinetics",
      "topics.ts",
    ],
    title: "Unit III - Chemical Kinetics",
    alignment: "CBSE Class XII Chemistry Unit III",
  },
  "u4-d-and-f-block-elements": {
    courseSlug: "cbse-chemistry-12",
    courseTitle: "CBSE Class 12 Chemistry",
    exportName: "dAndFBlockElementsTopics",
    packageName: "cbse-class-12-chemistry-u4-d-and-f-block-elements",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u4-d-and-f-block-elements",
      "topics.ts",
    ],
    title: "Unit IV - d- and f-Block Elements",
    alignment: "CBSE Class XII Chemistry Unit IV",
  },
  "u5-coordination-compounds": {
    courseSlug: "cbse-chemistry-12",
    courseTitle: "CBSE Class 12 Chemistry",
    exportName: "coordinationCompoundsTopics",
    packageName: "cbse-class-12-chemistry-u5-coordination-compounds",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u5-coordination-compounds",
      "topics.ts",
    ],
    title: "Unit V - Coordination Compounds",
    alignment: "CBSE Class XII Chemistry Unit V",
  },
  "u6-haloalkanes-haloarenes": {
    courseSlug: "cbse-chemistry-12",
    courseTitle: "CBSE Class 12 Chemistry",
    exportName: "haloalkanesHaloarenesTopics",
    packageName: "cbse-class-12-chemistry-u6-haloalkanes-haloarenes",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u6-haloalkanes-haloarenes",
      "topics.ts",
    ],
    title: "Unit VI - Haloalkanes and Haloarenes",
    alignment: "CBSE Class XII Chemistry Unit VI",
  },
  "u7-alcohols-phenols-ethers": {
    courseSlug: "cbse-chemistry-12",
    courseTitle: "CBSE Class 12 Chemistry",
    exportName: "alcoholsPhenolsEthersTopics",
    packageName: "cbse-class-12-chemistry-u7-alcohols-phenols-ethers",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u7-alcohols-phenols-ethers",
      "topics.ts",
    ],
    title: "Unit VII - Alcohols, Phenols and Ethers",
    alignment: "CBSE Class XII Chemistry Unit VII",
  },
  "u8-aldehydes-ketones-carboxylic-acids": {
    courseSlug: "cbse-chemistry-12",
    courseTitle: "CBSE Class 12 Chemistry",
    exportName: "aldehydesKetonesCarboxylicAcidsTopics",
    packageName:
      "cbse-class-12-chemistry-u8-aldehydes-ketones-carboxylic-acids",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u8-aldehydes-ketones-carboxylic-acids",
      "topics.ts",
    ],
    title: "Unit VIII - Aldehydes, Ketones and Carboxylic Acids",
    alignment: "CBSE Class XII Chemistry Unit VIII",
  },
  "u9-amines": {
    courseSlug: "cbse-chemistry-12",
    courseTitle: "CBSE Class 12 Chemistry",
    exportName: "aminesTopics",
    packageName: "cbse-class-12-chemistry-u9-amines",
    sourceParts: ["content", "cbse-chemistry-12", "u9-amines", "topics.ts"],
    title: "Unit IX - Amines",
    alignment: "CBSE Class XII Chemistry Unit IX",
  },
  "u10-biomolecules": {
    courseSlug: "cbse-chemistry-12",
    courseTitle: "CBSE Class 12 Chemistry",
    exportName: "biomoleculesTopics",
    packageName: "cbse-class-12-chemistry-u10-biomolecules",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "u10-biomolecules",
      "topics.ts",
    ],
    title: "Unit X - Biomolecules",
    alignment: "CBSE Class XII Chemistry Unit X",
  },
  "cbse-chemistry-12-formative-reinforcement": {
    courseSlug: "cbse-chemistry-12",
    courseTitle: "CBSE Class 12 Chemistry",
    exportName: "chemistry12FormativeReinforcementTopics",
    packageName: "cbse-class-12-chemistry-formative-reinforcement",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "formative-reinforcement",
      "topics.ts",
    ],
    title: "Formative Reinforcement Topics",
    alignment:
      "CBSE Class XII Chemistry formative-only topics: Surface Chemistry, General Principles and Processes of Isolation of Elements, Polymers, and Chemistry in Everyday Life",
  },
  "cbse-chemistry-11-formative-reinforcement": {
    courseSlug: "cbse-chemistry-11",
    courseTitle: "CBSE Class 11 Chemistry",
    exportName: "chemistry11FormativeReinforcementTopics",
    packageName: "cbse-class-11-chemistry-formative-reinforcement",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "formative-reinforcement",
      "topics.ts",
    ],
    title: "Formative Reinforcement Topics",
    alignment:
      "CBSE Class XI Chemistry formative-only topics: s & p Block Elements and The Gaseous State",
  },
  "cbse-chemistry-11-practicals-projects": {
    courseSlug: "cbse-chemistry-11",
    courseTitle: "CBSE Class 11 Chemistry",
    exportName: "chemistry11PracticalsProjectsTopics",
    packageName: "cbse-class-11-chemistry-practicals-projects",
    sourceParts: [
      "content",
      "cbse-chemistry-11",
      "practicals-projects",
      "topics.ts",
    ],
    title: "Practicals and Projects",
    alignment:
      "CBSE Class XI Chemistry 30-mark practical syllabus: laboratory techniques, purification and characterization, pH and equilibrium experiments, quantitative estimation, salt analysis, organic element detection, project work, record and viva",
  },
  "cbse-chemistry-12-practicals-projects": {
    courseSlug: "cbse-chemistry-12",
    courseTitle: "CBSE Class 12 Chemistry",
    exportName: "chemistry12PracticalsProjectsTopics",
    packageName: "cbse-class-12-chemistry-practicals-projects",
    sourceParts: [
      "content",
      "cbse-chemistry-12",
      "practicals-projects",
      "topics.ts",
    ],
    title: "Practicals and Projects",
    alignment:
      "CBSE Class XII Chemistry 30-mark practical syllabus: volumetric analysis, salt analysis, content-based experiments, project work, record and viva",
  },
  "cbse-math-11-challenge-practice": {
    courseSlug: "cbse-math-11",
    courseTitle: "CBSE Class 11 Mathematics",
    exportName: "math11ChallengePracticeTopics",
    packageName: "cbse-class-11-math-challenge-practice",
    sourceParts: [
      "content",
      "cbse-math-11",
      "challenge-practice",
      "topics.ts",
    ],
    title: "Challenge Practice",
    alignment:
      "CBSE Class XI Mathematics optional JEE-style challenge practice: Sets, Relations and Functions; Complex Numbers and Quadratic Equations",
  },
  "cbse-math-12-challenge-practice": {
    courseSlug: "cbse-math-12",
    courseTitle: "CBSE Class 12 Mathematics",
    exportName: "math12ChallengePracticeTopics",
    packageName: "cbse-class-12-math-challenge-practice",
    sourceParts: [
      "content",
      "cbse-math-12",
      "challenge-practice",
      "topics.ts",
    ],
    title: "Challenge Practice",
    alignment:
      "CBSE Class XII Mathematics optional JEE-style challenge practice: Matrices and Determinants",
  },
};

const difficultyLabels = {
  1: "Foundational",
  2: "Routine exam skill",
  3: "Standard multi-step",
  4: "Hard exam skill",
  5: "Challenge",
};

const unitSlug =
  process.argv.slice(2).find((arg) => arg !== "--") ?? "u1-limits";
const unitConfig = unitConfigs[unitSlug];

if (!unitConfig) {
  const valid = Object.keys(unitConfigs).join(", ");
  throw new Error(`Unknown unit "${unitSlug}". Expected one of: ${valid}`);
}

const packageDir = join(root, "review-packages", unitConfig.packageName);
const topicsDir = join(packageDir, "topics");
const sourcePath = join(root, ...unitConfig.sourceParts);

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

function loadSourceModule(modulePath) {
  if (moduleCache.has(modulePath)) return moduleCache.get(modulePath);

  const source = readStagedSource(modulePath);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const mod = { exports: {} };
  moduleCache.set(modulePath, mod.exports);

  const requireShim = (id) => {
    if (id === "@/lib/content/types") return {};
    if (id.includes("difficulty-calibration")) {
      return {
        calibrateCbseChemistryDifficulty,
        calibrateCbsePhysicsDifficulty,
      };
    }
    if (id.startsWith(".")) {
      return loadSourceModule(join(dirname(modulePath), `${id}.ts`));
    }
    throw new Error(`Unexpected import while exporting review package: ${id}`);
  };

  const runner = new Function("require", "exports", "module", output);
  runner(requireShim, mod.exports, mod);
  return mod.exports;
}

function loadTopics() {
  return loadSourceModule(sourcePath)[unitConfig.exportName];
}

function itemSlug(contentId) {
  return contentId.split(".").slice(-3).join("-");
}

function topicFileName(topicCode) {
  return `topic-${topicCode.replace(".", "-")}.md`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function mdList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function mdNumbered(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function difficultyLabel(value) {
  return `${value}/5 (${difficultyLabels[value] ?? "Unlabeled"})`;
}

function itemUrl(item) {
  return `/${unitConfig.courseSlug ?? "calc-ab"}/${item.unit}/${itemSlug(item.contentId)}`;
}

function mathBlock(latex) {
  return ["```latex", latex, "```"].join("\n");
}

function figureMarkdown(item) {
  if (!item.figure) return "";

  return [
    "**Figure**",
    "",
    `- Title: ${item.figure.title}`,
    `- Description: ${item.figure.description}`,
    "",
    "```html",
    item.figure.svg,
    "```",
    "",
  ].join("\n");
}

function solutionSteps(steps) {
  return steps
    .map((step) => {
      const lines = [`${step.step}. ${step.explanation}`];
      if (step.math) lines.push(`   Math: ${step.math}`);
      return lines.join("\n");
    })
    .join("\n");
}

function mcMarkdown(item) {
  const wrongChoices = item.choices.filter((choice) => !choice.isCorrect);
  return [
    `### ${itemSlug(item.contentId)} - MCQ`,
    "",
    `- Item ID: \`${item.contentId}\``,
    `- Website path: \`${itemUrl(item)}\``,
    `- Difficulty: ${difficultyLabel(item.difficulty)}`,
    `- Calculator allowed: ${item.calculatorAllowed ? "Yes" : "No"}`,
    `- Skill tags: ${item.skillTags.join(", ")}`,
    `- Common misconceptions: ${item.commonMisconceptions.join(", ")}`,
    "",
    "**Question**",
    "",
    mathBlock(item.questionLatex),
    "",
    figureMarkdown(item),
    "**Choices**",
    "",
    ...item.choices.map((choice) => `- ${choice.letter}. ${choice.text}`),
    "",
    `**Correct answer:** ${item.correctLetter}`,
    "",
    "**Hints**",
    "",
    mdNumbered(item.hintLadder.map((hint) => hint.body)),
    "",
    "**Wrong-answer rationales**",
    "",
    ...wrongChoices.map(
      (choice) =>
        `- ${choice.letter}. ${choice.rationaleIfWrong ?? "No rationale supplied."}`,
    ),
    "",
    "**Worked solution**",
    "",
    solutionSteps(item.workedSolution),
    "",
    "**Reviewer checks**",
    "",
    "- [ ] Mathematical answer is correct",
    "- [ ] Wording is clear and age-appropriate",
    "- [ ] No ambiguity in answer choices",
    "- [ ] Difficulty rating is reasonable",
    "- [ ] Hints guide without giving away too much",
    "- [ ] Worked solution is complete",
    "",
    "Reviewer notes:",
    "",
    "---",
    "",
  ].join("\n");
}

function constructedTypeLabel(item) {
  if (item.responseType === "vsaq") return "VSAQ";
  if (item.responseType === "saq") return "SAQ";
  if (item.responseType === "laq") return "LAQ";
  if (item.responseType === "case") return "Case Study";
  return "FRQ";
}

function usesMarks(item) {
  return Boolean(item.responseType && item.responseType !== "frq");
}

function scoreUnit(item, count) {
  const base = usesMarks(item) ? "mark" : "point";
  return `${count} ${count === 1 ? base : `${base}s`}`;
}

function frqMarkdown(item) {
  const typeLabel = constructedTypeLabel(item);
  return [
    `### ${itemSlug(item.contentId)} - ${typeLabel}`,
    "",
    `- Item ID: \`${item.contentId}\``,
    `- Website path: \`${itemUrl(item)}\``,
    `- Difficulty: ${difficultyLabel(item.difficulty)}`,
    `- Calculator allowed: ${item.calculatorAllowed ? "Yes" : "No"}`,
    `- Total: ${scoreUnit(item, item.rubric.maxPoints)}`,
    `- Skill tags: ${item.skillTags.join(", ")}`,
    `- Common misconceptions: ${item.commonMisconceptions.join(", ")}`,
    "",
    "**Prompt stem**",
    "",
    mathBlock(item.questionLatex),
    "",
    figureMarkdown(item),
    "**Parts**",
    "",
    ...item.parts.map(
      (part) =>
        `- (${part.letter}) ${part.promptMarkdown} (${scoreUnit(item, part.points)})`,
    ),
    "",
    "**Hints**",
    "",
    mdNumbered(item.hintLadder.map((hint) => hint.body)),
    "",
    `**Rubric (${scoreUnit(item, item.rubric.maxPoints)})**`,
    "",
    ...item.rubric.criteria.map(
      (criterion, index) =>
        `${index + 1}. Part (${criterion.part}), ${scoreUnit(item, criterion.points)}: ${criterion.description}`,
    ),
    "",
    "**Common errors**",
    "",
    mdList(item.commonErrors),
    "",
    "**Model solution**",
    "",
    ...item.workedSolution.map(
      (part) => `- Part (${part.part}): ${part.explanation}`,
    ),
    "",
    "**Reviewer checks**",
    "",
    "- [ ] Mathematical answer is correct",
    `- [ ] Rubric awards ${usesMarks(item) ? "marks" : "points"} fairly`,
    `- [ ] Prompt is clear and aligned with ${unitConfig.alignment}`,
    "- [ ] Difficulty rating is reasonable",
    "- [ ] Model solution is complete",
    "- [ ] Common errors are useful",
    "",
    "Reviewer notes:",
    "",
    "---",
    "",
  ].join("\n");
}

function numericMarkdown(item) {
  return [
    `### ${itemSlug(item.contentId)} - Numerical Value`,
    "",
    `- Item ID: \`${item.contentId}\``,
    `- Website path: \`${itemUrl(item)}\``,
    `- Difficulty: ${difficultyLabel(item.difficulty)}`,
    `- Calculator allowed: ${item.calculatorAllowed ? "Yes" : "No"}`,
    `- Skill tags: ${item.skillTags.join(", ")}`,
    `- Common misconceptions: ${item.commonMisconceptions.join(", ")}`,
    "",
    "**Question**",
    "",
    mathBlock(item.questionLatex),
    "",
    figureMarkdown(item),
    `**Correct numerical value:** ${item.answer.value}${item.answer.unit ? ` ${item.answer.unit}` : ""}`,
    "",
    "**Hints**",
    "",
    mdNumbered(item.hintLadder.map((hint) => hint.body)),
    "",
    "**Worked solution**",
    "",
    solutionSteps(item.workedSolution),
    "",
    "**Reviewer checks**",
    "",
    "- [ ] Mathematical answer is correct",
    `- [ ] Prompt is clear and aligned with ${unitConfig.alignment}`,
    "- [ ] Difficulty rating is reasonable",
    "- [ ] Hints guide without giving away too much",
    "- [ ] Worked solution is complete",
    "",
    "Reviewer notes:",
    "",
    "---",
    "",
  ].join("\n");
}

function itemTypeLabel(item) {
  if (item.kind === "mc_single") return "MCQ";
  if (item.kind === "numeric") return "Numerical Value";
  return constructedTypeLabel(item);
}

function itemAnswerLabel(item) {
  if (item.kind === "mc_single") return item.correctLetter;
  if (item.kind === "numeric") return item.answer.value;
  return scoreUnit(item, item.rubric.maxPoints);
}

function packageReadme(topics, totalMc, totalFrq, totalNumeric) {
  const allItems = topics.flatMap((topic) => topic.items);
  const vsaqCount = allItems.filter(
    (item) => item.responseType === "vsaq",
  ).length;
  const saqCount = allItems.filter(
    (item) => item.responseType === "saq",
  ).length;
  const laqCount = allItems.filter(
    (item) => item.responseType === "laq",
  ).length;
  const caseCount = allItems.filter(
    (item) => item.responseType === "case",
  ).length;
  const openAnswerBreakdown =
    vsaqCount + saqCount + laqCount + caseCount > 0
      ? [
          `- VSAQs: ${vsaqCount}`,
          `- SAQs: ${saqCount}`,
          `- LAQs: ${laqCount}`,
          ...(caseCount > 0 ? [`- Case-study items: ${caseCount}`] : []),
        ]
      : [`- Free-response questions: ${totalFrq}`];

  return [
    "# StudyLoop Reviewer Package",
    "",
    `Course: ${unitConfig.courseTitle ?? "AP Calculus AB"}`,
    `Unit: ${unitConfig.title}`,
    `Generated from: \`${sourcePath.replace(root + "\\", "")}\``,
    "",
    "## Contents",
    "",
    `- Topics: ${topics.length}`,
    `- Multiple-choice questions: ${totalMc}`,
    `- Numerical-value questions: ${totalNumeric}`,
    `- Open-answer items: ${totalFrq}`,
    ...openAnswerBreakdown,
    `- Total items: ${totalMc + totalNumeric + totalFrq}`,
    "",
    "## Files",
    "",
    "- `TOPIC_INDEX.md` - topic-by-topic checklist and file links",
    "- `REVIEW_CHECKLIST.csv` - spreadsheet-friendly review tracker",
    "- `topics/topic-*.md` - full questions, answers, hints, rationales, rubrics, and solutions",
    "",
    "## Reviewer Instructions",
    "",
    "Please check each item for:",
    "",
    "- Mathematical correctness",
    `- Alignment with ${unitConfig.alignment}`,
    "- Clear wording and no answer ambiguity",
    "- Reasonable difficulty rating",
    "- Correct calculator flag",
    "- Helpful hints that do not reveal the answer too early",
    "- Complete worked solution or open-answer rubric",
    "",
    "Difficulty scale used in this package:",
    "",
    "- `1/5` - foundational recall or early setup",
    "- `2/5` - routine exam skill",
    "- `3/5` - standard multi-step or trap-aware item",
    "- `4/5` - hard exam skill or multi-step synthesis",
    "- `5/5` - challenge item beyond normal exam pressure",
    "",
    "For each item, use `REVIEW_CHECKLIST.csv` to mark one of:",
    "",
    "- `verified` - ready to publish",
    "- `minor_edit` - usable after a small wording/math edit",
    "- `major_edit` - needs rewriting",
    "- `reject` - remove from the bank",
    "",
    "If reviewing against the local website, run StudyLoop and prefix each website path with:",
    "",
    "```text",
    "http://localhost:3000",
    "```",
    "",
    "Example:",
    "",
    "```text",
    `http://localhost:3000${itemUrl(topics[0].items[0])}`,
    "```",
    "",
    "Do not enter student data in this package. It is only for content review.",
    "",
  ].join("\n");
}

function topicIndex(topics) {
  const lines = [
    "# Topic Index",
    "",
    "| Topic | Title | MCQs | Numerical | Open Answer | File |",
    "|---|---|---:|---:|---:|---|",
  ];

  for (const topic of topics) {
    const mc = topic.items.filter((item) => item.kind === "mc_single").length;
    const numeric = topic.items.filter(
      (item) => item.kind === "numeric",
    ).length;
    const frq = topic.items.filter((item) => item.kind === "frq").length;
    lines.push(
      `| ${topic.topicCode} | ${topic.title} | ${mc} | ${numeric} | ${frq} | topics/${topicFileName(topic.topicCode)} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

function topicMarkdown(topic) {
  const sections = [
    `# Topic ${topic.topicCode}: ${topic.title}`,
    "",
    topic.subtopic,
    "",
    "## Items",
    "",
  ];

  for (const item of topic.items) {
    sections.push(
      item.kind === "mc_single"
        ? mcMarkdown(item)
        : item.kind === "numeric"
          ? numericMarkdown(item)
          : frqMarkdown(item),
    );
  }

  return sections.join("\n");
}

function checklistRows(topics) {
  const rows = [
    [
      "topic_code",
      "topic_title",
      "item_id",
      "item_type",
      "website_path",
      "difficulty",
      "calculator_allowed",
      "answer_or_marks_or_points",
      "review_decision",
      "math_correct",
      "wording_clear",
      "difficulty_ok",
      "calculator_ok",
      "reviewer_notes",
    ],
  ];

  for (const topic of topics) {
    for (const item of topic.items) {
      rows.push([
        topic.topicCode,
        topic.title,
        item.contentId,
        itemTypeLabel(item),
        itemUrl(item),
        item.difficulty,
        item.calculatorAllowed ? "yes" : "no",
        itemAnswerLabel(item),
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    }
  }

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

function allQuestionsMarkdown(topics) {
  return [
    "# All Questions",
    "",
    "This file is a single combined copy of every topic file.",
    "",
    ...topics.map(topicMarkdown),
  ].join("\n");
}

const topics = loadTopics();
const totalMc = topics
  .flatMap((topic) => topic.items)
  .filter((item) => item.kind === "mc_single").length;
const totalNumeric = topics
  .flatMap((topic) => topic.items)
  .filter((item) => item.kind === "numeric").length;
const totalFrq = topics
  .flatMap((topic) => topic.items)
  .filter((item) => item.kind === "frq").length;

if (existsSync(packageDir))
  rmSync(packageDir, { recursive: true, force: true });
mkdirSync(topicsDir, { recursive: true });

writeFileSync(
  join(packageDir, "README.md"),
  packageReadme(topics, totalMc, totalFrq, totalNumeric),
);
writeFileSync(join(packageDir, "TOPIC_INDEX.md"), topicIndex(topics));
writeFileSync(join(packageDir, "REVIEW_CHECKLIST.csv"), checklistRows(topics));
writeFileSync(
  join(packageDir, "ALL_QUESTIONS.md"),
  allQuestionsMarkdown(topics),
);

for (const topic of topics) {
  writeFileSync(
    join(topicsDir, topicFileName(topic.topicCode)),
    topicMarkdown(topic),
  );
}

console.log(`Reviewer package written to ${packageDir}`);
const vsaqCount = topics
  .flatMap((topic) => topic.items)
  .filter((item) => item.responseType === "vsaq").length;
const saqCount = topics
  .flatMap((topic) => topic.items)
  .filter((item) => item.responseType === "saq").length;
const laqCount = topics
  .flatMap((topic) => topic.items)
  .filter((item) => item.responseType === "laq").length;
const caseCount = topics
  .flatMap((topic) => topic.items)
  .filter((item) => item.responseType === "case").length;
if (vsaqCount + saqCount + laqCount + caseCount > 0) {
  console.log(
    `${topics.length} topics, ${totalMc} MCQs, ${totalNumeric} numerical-value questions, ${vsaqCount} VSAQs, ${saqCount} SAQs, ${laqCount} LAQs, ${caseCount} case-study items`,
  );
} else {
  console.log(
    `${topics.length} topics, ${totalMc} MCQs, ${totalNumeric} numerical-value questions, ${totalFrq} FRQs`,
  );
}
