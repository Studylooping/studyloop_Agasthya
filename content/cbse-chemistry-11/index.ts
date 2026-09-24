import type { Course, Unit } from "@/lib/content/types";
import { u1SomeBasicConcepts } from "./u1-some-basic-concepts";
import { u2StructureOfAtom } from "./u2-structure-of-atom";
import { u3ClassificationPeriodicity } from "./u3-classification-periodicity";
import { u4ChemicalBondingMolecularStructure } from "./u4-chemical-bonding-molecular-structure";
import { u5ChemicalThermodynamics } from "./u5-chemical-thermodynamics";
import { u6Equilibrium } from "./u6-equilibrium";
import { u7RedoxReactions } from "./u7-redox-reactions";
import { u8OrganicChemistryBasicPrinciplesTechniques } from "./u8-organic-chemistry-basic-principles-techniques";
import { u9Hydrocarbons } from "./u9-hydrocarbons";
import { chemistry11FormativeReinforcement } from "./formative-reinforcement";
import { chemistry11PracticalsProjects } from "./practicals-projects";

const units: Unit[] = [
  u1SomeBasicConcepts,
  u2StructureOfAtom,
  u3ClassificationPeriodicity,
  u4ChemicalBondingMolecularStructure,
  u5ChemicalThermodynamics,
  u6Equilibrium,
  u7RedoxReactions,
  u8OrganicChemistryBasicPrinciplesTechniques,
  u9Hydrocarbons,
  chemistry11FormativeReinforcement,
  chemistry11PracticalsProjects,
];

export const cbseChemistry11: Course = {
  slug: "cbse-chemistry-11",
  track: "cbse",
  shortTitle: "CBSE 11 Chemistry",
  title: "CBSE Class 11 Chemistry",
  examFamily: "CBSE",
  audience: "Class 11",
  frameworkLabel:
    "CBSE Class XI Chemistry 043 theory and practical syllabus 2026-27",
  status: "live",
  description:
    "CBSE Class 11 Chemistry practice aligned to the Chemistry 043 theory and practical syllabus. Units are published only after local authoring and vetting checks pass.",
  units,
};
