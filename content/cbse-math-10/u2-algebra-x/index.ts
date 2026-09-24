import type { Unit } from "@/lib/content/types";
import { mergeSupplementalTopics } from "../../merge-supplemental";
import { algebraXSupplementalTopics } from "../supplemental-practice";
import { algebraXTopics } from "./topics";

export const u2AlgebraX: Unit = {
  slug: "u2-algebra-x",
  unitCode: "U2",
  title: "Algebra",
  description:
    "CBSE Class 10 Mathematics Unit II: polynomials, pairs of linear equations in two variables, quadratic equations with real roots, and arithmetic progressions with applications.",
  status: "live",
  topics: mergeSupplementalTopics(algebraXTopics, algebraXSupplementalTopics),
};
