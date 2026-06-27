import type { Unit } from "@/lib/content/types";
import { contextualApplicationTopics } from "./topics";

/**
 * Calc AB Unit 4 - Contextual Applications of Differentiation.
 *
 * Original AP-style draft content. Each topic has 5 MCQs and 1 FRQ.
 * Items stay marked `human_review_required` until a subject mentor verifies them.
 */
export const u4ContextualApplications: Unit = {
  slug: "u4-contextual-app",
  unitCode: "U4",
  title: "Contextual Applications of Differentiation",
  description:
    "Use derivatives to interpret real situations, solve motion and related-rates problems, approximate values, and evaluate indeterminate limits with L'Hospital's Rule.",
  status: "live",
  topics: contextualApplicationTopics,
};
