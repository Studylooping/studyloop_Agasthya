import type { Course, Unit } from "@/lib/content/types";
import { balanceMcAnswerLettersInUnits } from "@/lib/content/mc-key-balancing";
import { u1Electrostatics } from "./u1-electrostatics";
import { u2CurrentElectricity } from "./u2-current-electricity";
import { u3MagneticEffectsCurrentMagnetism } from "./u3-magnetic-effects-current-magnetism";
import { u4ElectromagneticInductionAlternatingCurrents } from "./u4-electromagnetic-induction-alternating-currents";
import { u5ElectromagneticWaves } from "./u5-electromagnetic-waves";
import { u6Optics } from "./u6-optics";
import { u7DualNatureRadiationMatter } from "./u7-dual-nature-radiation-matter";
import { u8AtomsNuclei } from "./u8-atoms-nuclei";
import { u9ElectronicDevices } from "./u9-electronic-devices";
import { physics12PracticalsProjects } from "./practicals-projects";

const units: Unit[] = balanceMcAnswerLettersInUnits([
  u1Electrostatics,
  u2CurrentElectricity,
  u3MagneticEffectsCurrentMagnetism,
  u4ElectromagneticInductionAlternatingCurrents,
  u5ElectromagneticWaves,
  u6Optics,
  u7DualNatureRadiationMatter,
  u8AtomsNuclei,
  u9ElectronicDevices,
  physics12PracticalsProjects,
]);

export const cbsePhysics12: Course = {
  slug: "cbse-physics-12",
  track: "cbse",
  shortTitle: "CBSE 12 Physics",
  title: "CBSE Class 12 Physics",
  examFamily: "CBSE",
  audience: "Class 12",
  frameworkLabel:
    "CBSE Class XII Physics 042 theory and practical syllabus 2026-27",
  status: "live",
  description:
    "CBSE Class 12 Physics practice aligned to the Physics 042 theory and practical syllabus. Units are published only after local authoring and vetting checks pass.",
  units,
};
