import type { Unit } from "@/lib/content/types";
import { mergeSupplementalTopics } from "../../merge-supplemental";
import { algebraIxSupplementalTopics } from "../supplemental-practice";
import { algebraTopics } from "./topics";

export const u2Algebra: Unit = {
  slug: "u2-algebra-ix",
  unitCode: "U2",
  title: "Algebra",
  description:
    "CBSE Class 9 Mathematics Unit II: polynomials, sequences and progressions, algebraic identities, factorisation, rational expressions, linear equations in two variables, and pairs of linear equations.",
  status: "live",
  topics: mergeSupplementalTopics(algebraTopics, algebraIxSupplementalTopics),
};
