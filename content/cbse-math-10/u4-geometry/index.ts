import type { Unit } from "@/lib/content/types";
import { mergeSupplementalTopics } from "../../merge-supplemental";
import { geometryXSupplementalTopics } from "../supplemental-practice";
import { geometryXTopics } from "./topics";

export const u4GeometryX: Unit = {
  slug: "u4-geometry",
  unitCode: "U4",
  title: "Geometry",
  description:
    "CBSE Class 10 Mathematics Unit IV: similar triangles, Basic Proportionality Theorem and converse, areas of similar triangles, Pythagoras theorem and converse, and circle tangent theorems.",
  status: "live",
  topics: mergeSupplementalTopics(geometryXTopics, geometryXSupplementalTopics),
};
