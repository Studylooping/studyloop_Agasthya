import type { Course, Unit } from "@/lib/content/types";
import { u1Solutions } from "./u1-solutions";
import { u2Electrochemistry } from "./u2-electrochemistry";
import { u3ChemicalKinetics } from "./u3-chemical-kinetics";
import { u4DAndFBlockElements } from "./u4-d-and-f-block-elements";
import { u5CoordinationCompounds } from "./u5-coordination-compounds";
import { u6HaloalkanesHaloarenes } from "./u6-haloalkanes-haloarenes";
import { u7AlcoholsPhenolsEthers } from "./u7-alcohols-phenols-ethers";
import { u8AldehydesKetonesCarboxylicAcids } from "./u8-aldehydes-ketones-carboxylic-acids";
import { u9Amines } from "./u9-amines";
import { u10Biomolecules } from "./u10-biomolecules";
import { chemistry12FormativeReinforcement } from "./formative-reinforcement";
import { chemistry12PracticalsProjects } from "./practicals-projects";

const units: Unit[] = [
  u1Solutions,
  u2Electrochemistry,
  u3ChemicalKinetics,
  u4DAndFBlockElements,
  u5CoordinationCompounds,
  u6HaloalkanesHaloarenes,
  u7AlcoholsPhenolsEthers,
  u8AldehydesKetonesCarboxylicAcids,
  u9Amines,
  u10Biomolecules,
  chemistry12FormativeReinforcement,
  chemistry12PracticalsProjects,
];

export const cbseChemistry12: Course = {
  slug: "cbse-chemistry-12",
  track: "cbse",
  shortTitle: "CBSE 12 Chemistry",
  title: "CBSE Class 12 Chemistry",
  examFamily: "CBSE",
  audience: "Class 12",
  frameworkLabel:
    "CBSE Class XII Chemistry 043 theory and practical syllabus 2026-27",
  status: "live",
  description:
    "CBSE Class 12 Chemistry practice aligned to the Chemistry 043 theory and practical syllabus, with original questions, hints, worked solutions, and practical work.",
  units,
};
