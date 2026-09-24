import type { Course, Unit } from "@/lib/content/types";
import { u1NumberSystem } from "./u1-number-system";
import { u2Algebra } from "./u2-algebra";
import { u3CoordinateGeometryIx } from "./u3-coordinate-geometry";
import { u4Geometry } from "./u4-geometry";
import { u5Mensuration } from "./u5-mensuration";
import { u6StatisticsProbability } from "./u6-statistics-probability";

const units: Unit[] = [
  u1NumberSystem,
  u2Algebra,
  u3CoordinateGeometryIx,
  u4Geometry,
  u5Mensuration,
  u6StatisticsProbability,
];

export const cbseMath9: Course = {
  slug: "cbse-math-9",
  track: "cbse",
  shortTitle: "CBSE 9 Math",
  title: "CBSE Class 9 Mathematics",
  examFamily: "CBSE",
  audience: "Class 9",
  frameworkLabel: "CBSE Class IX Mathematics syllabus 2026-27",
  status: "live",
  description:
    "Syllabus-aligned 2026-27 CBSE Class 9 Mathematics practice with original question banks for all six syllabus units.",
  units,
};
