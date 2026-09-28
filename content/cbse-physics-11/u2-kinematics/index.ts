import type { Unit } from "@/lib/content/types";
import { kinematicsTopics } from "./topics";
import { straightLineExpansion } from "./straight-line-expansion";
import { planeExpansion } from "./plane-expansion";

export const u2Kinematics: Unit = {
  slug: "u2-kinematics",
  unitCode: "U2",
  title: "Kinematics",
  description:
    "CBSE Class 11 Physics Unit II: motion in a straight line, motion in a plane, vectors, projectile motion, relative velocity, and uniform circular motion.",
  status: "live",
  topics: kinematicsTopics.map(topic => ({
    ...topic,
    items: [...topic.items, ...straightLineExpansion.filter(item => item.topic === topic.topicCode), ...planeExpansion.filter(item => item.topic === topic.topicCode)],
  })),
};
