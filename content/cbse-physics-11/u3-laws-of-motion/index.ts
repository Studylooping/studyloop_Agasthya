import type { Unit } from "@/lib/content/types";
import { lawsOfMotionTopics } from "./topics";
import { lawsExpansion } from "./expansion";

export const u3LawsOfMotion: Unit = {
  slug: "u3-laws-of-motion",
  unitCode: "U3",
  title: "Laws of Motion",
  description:
    "CBSE Class 11 Physics Unit III: force, inertia, Newton's laws, momentum, impulse, conservation of linear momentum, equilibrium, friction, and circular-motion dynamics.",
  status: "live",
  topics: lawsOfMotionTopics.map(topic => ({
    ...topic,
    items: [...topic.items, ...lawsExpansion.filter(item => item.topic === topic.topicCode)],
  })),
};
