import type { Course, Unit } from "@/lib/content/types";
import { u1RelationsFunctions } from "./u1-relations-functions";
import { u2Algebra } from "./u2-algebra";
import { u3Calculus } from "./u3-calculus";
import { u4Vectors3d } from "./u4-vectors-3d";
import { u5LinearProgramming } from "./u5-linear-programming";
import { u6Probability } from "./u6-probability";

export const cbseMath12: Course = {
  slug: "cbse-math-12",
  track: "cbse",
  shortTitle: "CBSE 12 Math",
  title: "CBSE Class 12 Mathematics",
  examFamily: "CBSE",
  audience: "Class 12",
  frameworkLabel: "CBSE Class XII Mathematics syllabus",
  status: "live",
  description:
    "Board-syllabus aligned Class 12 Mathematics practice with worked solutions, hints, and local progress memory.",
  units: [u1RelationsFunctions, u2Algebra, u3Calculus, u4Vectors3d, u5LinearProgramming, u6Probability],
};
