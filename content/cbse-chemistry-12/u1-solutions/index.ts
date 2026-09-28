import type { Unit } from "@/lib/content/types";
import { solutionsTopics } from "./topics";
import { appendChapterPractice } from "../chapter-practice";
import { solutionsExpansion } from "./expansion";
import { concentrationExpansion } from "./concentration-expansion";
import { solubilityExpansion } from "./solubility-expansion";
import { thermalExpansion } from "./thermal-expansion";
import { osmosisExpansion } from "./osmosis-expansion";
import { particleExpansion } from "./particle-expansion";

export const u1Solutions: Unit = {
  slug: "u1-solutions",
  unitCode: "U1",
  title: "Solutions",
  description:
    "Types of solutions, concentration expressions, solubility, vapour pressure of liquid solutions, ideal and non-ideal solutions, colligative properties, molar-mass determination, and abnormal molecular masses. Theory weightage: 7 marks.",
  status: "live",
  topics: appendChapterPractice(solutionsTopics, [
    ...solutionsExpansion,
    ...concentrationExpansion,
    ...solubilityExpansion,
    ...thermalExpansion,
    ...osmosisExpansion,
    ...particleExpansion,
  ]),
};
