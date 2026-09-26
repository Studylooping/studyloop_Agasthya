import type { Course, Unit } from "@/lib/content/types";
import { balanceMcAnswerLettersInUnits } from "@/lib/content/mc-key-balancing";
import { u1PhysicalWorldMeasurement } from "./u1-physical-world-measurement";
import { u2Kinematics } from "./u2-kinematics";
import { u3LawsOfMotion } from "./u3-laws-of-motion";
import { u4WorkEnergyPower } from "./u4-work-energy-power";
import { u5SystemParticlesRigidBody } from "./u5-system-particles-rigid-body";
import { u6Gravitation } from "./u6-gravitation";
import { u7PropertiesBulkMatter } from "./u7-properties-bulk-matter";
import { u8Thermodynamics } from "./u8-thermodynamics";
import { u9KineticTheory } from "./u9-kinetic-theory";
import { u10OscillationsWaves } from "./u10-oscillations-waves";
import { practicalsActivities } from "./practicals-activities";

const units: Unit[] = balanceMcAnswerLettersInUnits([
  u1PhysicalWorldMeasurement,
  u2Kinematics,
  u3LawsOfMotion,
  u4WorkEnergyPower,
  u5SystemParticlesRigidBody,
  u6Gravitation,
  u7PropertiesBulkMatter,
  u8Thermodynamics,
  u9KineticTheory,
  u10OscillationsWaves,
  practicalsActivities,
]);

export const cbsePhysics11: Course = {
  slug: "cbse-physics-11",
  track: "cbse",
  shortTitle: "CBSE 11 Physics",
  title: "CBSE Class 11 Physics",
  examFamily: "CBSE",
  audience: "Class 11",
  frameworkLabel:
    "CBSE Class XI Physics 042 theory and practical syllabus 2026-27",
  status: "live",
  description:
    "CBSE Class 11 Physics practice aligned to the Physics 042 theory and practical syllabus, with original questions, hints, worked solutions, and practical activities.",
  units,
};
