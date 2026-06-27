import type { Course } from "@/lib/content/types";
import { u1SetsFunctions } from "./u1-sets-functions";
import { u2AlgebraXi } from "./u2-algebra-xi";
import { u3CoordinateGeometry } from "./u3-coordinate-geometry";
import { u4CalculusXi } from "./u4-calculus-xi";
import { u5StatisticsProbability } from "./u5-statistics-probability";

export const cbseMath11: Course = {
  slug: "cbse-math-11",
  track: "cbse",
  shortTitle: "CBSE 11 Math",
  title: "CBSE Class 11 Mathematics",
  examFamily: "CBSE",
  audience: "Class 11",
  frameworkLabel: "CBSE Class XI Mathematics syllabus",
  status: "live",
  description:
    "CBSE Class 11 Mathematics practice aligned to the official Mathematics 041 syllabus, with worked solutions, hints, and local progress memory.",
  units: [
    u1SetsFunctions,
    u2AlgebraXi,
    u3CoordinateGeometry,
    u4CalculusXi,
    u5StatisticsProbability,
  ],
};
