import type { Unit } from "@/lib/content/types";
import { someBasicConceptsTopics } from "./topics";
import { measurementExpansion } from "./measurement-expansion";
import { moleExpansion } from "./mole-expansion";
import { formulaExpansion } from "./formula-expansion";
import { stoichiometryExpansion } from "./stoichiometry-expansion";
import { concentrationExpansion } from "./concentration-expansion";

const additions = [
  ...measurementExpansion,
  ...moleExpansion,
  ...formulaExpansion,
  ...stoichiometryExpansion,
  ...concentrationExpansion,
];

export const u1SomeBasicConcepts: Unit = {
  slug: "u1-some-basic-concepts",
  unitCode: "U1",
  title: "Some Basic Concepts of Chemistry",
  description:
    "NCERT Class 11 Chemistry Chapter 1: measurement, significant figures, chemical laws, mole concept, formulae, stoichiometry, limiting reagents, yield, and concentration. Includes 300 questions across five practice topics.",
  status: "live",
  topics: someBasicConceptsTopics.map((topic) => ({
    ...topic,
    items: [
      ...topic.items,
      ...additions.filter((item) => item.topic === topic.topicCode),
    ],
  })),
};
