import type { Course, Unit } from "@/lib/content/types";
import { u1NumberSystemsX } from "./u1-number-systems";
import { u2AlgebraX } from "./u2-algebra-x";
import { u3CoordinateGeometryX } from "./u3-coordinate-geometry";
import { u4GeometryX } from "./u4-geometry";
import { u5TrigonometryX } from "./u5-trigonometry";
import { u6MensurationX } from "./u6-mensuration";
import { u7StatisticsProbabilityX } from "./u7-statistics-probability";

const units: Unit[] = [
  u1NumberSystemsX,
  u2AlgebraX,
  u3CoordinateGeometryX,
  u4GeometryX,
  u5TrigonometryX,
  u6MensurationX,
  u7StatisticsProbabilityX,
];

export const cbseMath10: Course = {
  slug: "cbse-math-10",
  track: "cbse",
  shortTitle: "CBSE 10 Math",
  title: "CBSE Class 10 Mathematics",
  examFamily: "CBSE",
  audience: "Class 10",
  frameworkLabel: "CBSE Class X Mathematics 041/241 syllabus 2026-27",
  status: "live",
  description:
    "Syllabus-aligned 2026-27 CBSE Class 10 Mathematics practice for Mathematics Standard 041 and Mathematics Basic 241. Units 1-7 are live after authoring and vetting.",
  units,
};
