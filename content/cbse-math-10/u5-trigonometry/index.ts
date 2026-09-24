import type { Unit } from "@/lib/content/types";
import { mergeSupplementalTopics } from "../../merge-supplemental";
import { trigonometryXSupplementalTopics } from "../supplemental-practice";
import { trigonometryXTopics } from "./topics";

export const u5TrigonometryX: Unit = {
  slug: "u5-trigonometry",
  unitCode: "U5",
  title: "Trigonometry",
  description:
    "CBSE Class 10 Mathematics Unit V: trigonometric ratios in right triangles, standard values for 0, 30, 45, 60 and 90 degrees where defined, simple identities based on sin^2 A + cos^2 A = 1, and height-distance applications with at most two right triangles.",
  status: "live",
  topics: mergeSupplementalTopics(
    trigonometryXTopics,
    trigonometryXSupplementalTopics,
  ),
};
