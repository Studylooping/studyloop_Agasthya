import type { Unit } from "@/lib/content/types";
import { probabilityTopics } from "./topics";

export const u6Probability: Unit = {
  slug: "u6-probability",
  unitCode: "U6",
  title: "Probability",
  description:
    "Conditional probability, multiplication theorem, independent events, total probability, and Bayes' theorem in CBSE board style.",
  status: "live",
  topics: probabilityTopics,
};
