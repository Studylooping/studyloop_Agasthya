import type { Unit } from "@/lib/content/types";
import { mergeSupplementalTopics } from "../../merge-supplemental";
import { statisticsProbabilityIxSupplementalTopics } from "../supplemental-practice";
import { statisticsProbabilityIxTopics } from "./topics";

export const u6StatisticsProbability: Unit = {
  slug: "u6-statistics-probability",
  unitCode: "U6",
  title: "Statistics and Probability",
  description:
    "CBSE Class 9 Mathematics Unit VI: graphical representation of data, measures of central tendency including weighted average, stacked and 100% stacked bar graphs, empirical probability, theoretical probability, tables, and tree diagrams.",
  status: "live",
  topics: mergeSupplementalTopics(
    statisticsProbabilityIxTopics,
    statisticsProbabilityIxSupplementalTopics,
  ),
};
