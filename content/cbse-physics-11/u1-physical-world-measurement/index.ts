import type { Unit } from "@/lib/content/types";
import { physicalWorldMeasurementTopics } from "./topics";
import { measurementExpansion } from "./expansion";

export const u1PhysicalWorldMeasurement: Unit = {
  slug: "u1-physical-world-measurement",
  unitCode: "U1",
  title: "Physical World and Measurements",
  description:
    "CBSE Class 11 Physics Unit I: SI units, derived units, uncertainty, significant figures, dimensions, and dimensional analysis.",
  status: "live",
  topics: physicalWorldMeasurementTopics.map(topic => ({
    ...topic,
    items: [...topic.items, ...measurementExpansion.filter(item => item.topic === topic.topicCode)],
  })),
};
