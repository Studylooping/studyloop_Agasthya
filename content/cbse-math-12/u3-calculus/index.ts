import type { Unit } from "@/lib/content/types";
import { calculusTopics } from "./topics";

export const u3Calculus: Unit = {
  slug: "u3-calculus",
  unitCode: "U3",
  title: "Calculus",
  description:
    "Continuity and differentiability, applications of derivatives, integrals, applications of integrals, and differential equations.",
  status: "live",
  topics: calculusTopics,
};
