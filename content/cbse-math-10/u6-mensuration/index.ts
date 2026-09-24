import type { Unit } from "@/lib/content/types";
import { mergeSupplementalTopics } from "../../merge-supplemental";
import { mensurationXSupplementalTopics } from "../supplemental-practice";
import { mensurationXTopics } from "./topics";

export const u6MensurationX: Unit = {
  slug: "u6-mensuration",
  unitCode: "U6",
  title: "Mensuration",
  description:
    "CBSE Class 10 Mathematics Unit VI: areas related to circles, sectors and segments restricted to central angles 60, 90 and 120 degrees, and surface areas and volumes of combinations of two standard solids.",
  status: "live",
  topics: mergeSupplementalTopics(
    mensurationXTopics,
    mensurationXSupplementalTopics,
  ),
};
