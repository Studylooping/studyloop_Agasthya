import type { Unit } from "@/lib/content/types";
import { gravitationTopics } from "./topics";
import { gravitationExpansion } from "./expansion";

export const u6Gravitation: Unit = {
  slug: "u6-gravitation",
  unitCode: "U6",
  title: "Gravitation",
  description:
    "CBSE Class 11 Physics Unit VI: Kepler's laws, universal gravitation, acceleration due to gravity and its variation, gravitational potential and potential energy, escape speed, orbital velocity, and satellite energy.",
  status: "live",
  topics: gravitationTopics.map(topic => ({
    ...topic,
    items: [...topic.items, ...gravitationExpansion.filter(item => item.topic === topic.topicCode)],
  })),
};
