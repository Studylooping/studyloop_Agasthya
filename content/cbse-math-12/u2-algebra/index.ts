import type { Unit } from "@/lib/content/types";
import { algebraTopics } from "./topics";

export const u2Algebra: Unit = {
  slug: "u2-algebra",
  unitCode: "U2",
  title: "Algebra",
  description:
    "Matrices and determinants, including matrix operations, inverse matrices, adjoints, area using determinants, and systems of linear equations.",
  status: "live",
  topics: algebraTopics,
};
