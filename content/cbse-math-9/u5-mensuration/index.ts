import type { Unit } from "@/lib/content/types";
import { mergeSupplementalTopics } from "../../merge-supplemental";
import { mensurationIxSupplementalTopics } from "../supplemental-practice";
import { mensurationIxTopics } from "./topics";

export const u5Mensuration: Unit = {
  slug: "u5-mensuration",
  unitCode: "U5",
  title: "Mensuration",
  description:
    "CBSE Class 9 Mathematics Unit V: perimeter and area of plane figures, circles, arc length, sector area, Heron's formula, Brahmagupta's formula, and surface area and volume of common solids.",
  status: "live",
  topics: mergeSupplementalTopics(
    mensurationIxTopics,
    mensurationIxSupplementalTopics,
  ),
};
