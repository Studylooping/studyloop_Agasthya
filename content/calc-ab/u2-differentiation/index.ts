import type { Unit } from "@/lib/content/types";
import { differentiationTopics } from "./topics";

/**
 * Calc AB Unit 2 - Differentiation: Definition and Fundamental Properties.
 *
 * Draft AP-style and above-AP-rigor practice. Each topic has 5 MCQs and
 * 1 FRQ. Items stay marked `human_review_required` until a subject mentor
 * verifies them.
 */
export const u2Differentiation: Unit = {
  slug: "u2-differentiation",
  unitCode: "U2",
  title: "Differentiation: Definition and Properties",
  description:
    "Define derivatives from limits, estimate slopes from data, and build the first major derivative-rule toolkit.",
  status: "live",
  topics: differentiationTopics,
};
