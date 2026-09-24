import type { Unit } from "@/lib/content/types";
import { limitTopics } from "./topics";

/**
 * Calc AB Unit 1 — Limits and Continuity.
 *
 * All Unit 1 topic batches are original StudyLoop content. Each topic has
 * 5 MCQs and 1 FRQ. Items are marked verified after StudyLoop review.
 */
export const u1Limits: Unit = {
  slug: "u1-limits",
  unitCode: "U1",
  title: "Limits and Continuity",
  description:
    "Build intuition for limits, learn to evaluate them algebraically, and understand what makes a function continuous.",
  status: "live",
  topics: limitTopics,
};
