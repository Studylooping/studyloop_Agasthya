import type { Unit } from "@/lib/content/types";
import { mergeSupplementalTopics } from "../../merge-supplemental";
import { coordinateGeometryXSupplementalTopics } from "../supplemental-practice";
import { coordinateGeometryXTopics } from "./topics";

export const u3CoordinateGeometryX: Unit = {
  slug: "u3-coordinate-geometry",
  unitCode: "U3",
  title: "Coordinate Geometry",
  description:
    "CBSE Class 10 Mathematics Unit III: coordinate-plane review, distance formula, internal section formula, midpoint reasoning, and coordinate-shape applications.",
  status: "live",
  topics: mergeSupplementalTopics(
    coordinateGeometryXTopics,
    coordinateGeometryXSupplementalTopics,
  ),
};
