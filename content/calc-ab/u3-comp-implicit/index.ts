import type { Unit } from "@/lib/content/types";
import { compositeImplicitTopics } from "./topics";

/**
 * Calc AB Unit 3 - Differentiation: Composite, Implicit, and Inverse Functions.
 *
 * Original AP-style draft content. Each topic has 5 MCQs and 1 FRQ.
 * Items are marked verified after StudyLoop review.
 */
export const u3CompositeImplicit: Unit = {
  slug: "u3-comp-implicit",
  unitCode: "U3",
  title: "Differentiation: Composite, Implicit, Inverse",
  description:
    "Extend derivative rules to composite, implicit, inverse, inverse trigonometric, mixed-procedure, and higher-order derivative problems.",
  status: "live",
  topics: compositeImplicitTopics,
};
