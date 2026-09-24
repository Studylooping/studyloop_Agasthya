import type { Unit } from "@/lib/content/types";
import { mergeSupplementalTopics } from "../../merge-supplemental";
import { statisticsProbabilityXSupplementalTopics } from "../supplemental-practice";
import { statisticsProbabilityXTopics } from "./topics";

export const u7StatisticsProbabilityX: Unit = {
  slug: "u7-statistics-probability",
  unitCode: "U7",
  title: "Statistics and Probability",
  description:
    "CBSE Class 10 Mathematics Unit VII: mean, median and mode of grouped data, interpretation of grouped distributions, and classical probability of simple events.",
  status: "live",
  topics: mergeSupplementalTopics(
    statisticsProbabilityXTopics,
    statisticsProbabilityXSupplementalTopics,
  ),
};
