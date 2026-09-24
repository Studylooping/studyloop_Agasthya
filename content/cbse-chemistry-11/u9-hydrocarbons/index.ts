import type { Unit } from "@/lib/content/types";
import { hydrocarbonsTopics } from "./topics";

export const u9Hydrocarbons: Unit = {
  slug: "u9-hydrocarbons",
  unitCode: "U9",
  title: "Hydrocarbons",
  description:
    "Classification, alkanes, alkenes, alkynes, aromatic hydrocarbons, carcinogenicity and toxicity. Theory weightage: 10 marks.",
  status: "live",
  topics: hydrocarbonsTopics,
};
