import type { Unit } from "@/lib/content/types";
import { mergeSupplementalTopics } from "../../merge-supplemental";
import { geometryIxSupplementalTopics } from "../supplemental-practice";
import { geometryIxTopics } from "./topics";

export const u4Geometry: Unit = {
  slug: "u4-geometry",
  unitCode: "U4",
  title: "Geometry",
  description:
    "CBSE Class 9 Mathematics Unit IV: Euclid's geometry, axioms and postulates, lines and angles, triangle congruence, quadrilaterals, midpoint theorem, circle theorems, and construction-based reasoning.",
  status: "live",
  topics: mergeSupplementalTopics(geometryIxTopics, geometryIxSupplementalTopics),
};
