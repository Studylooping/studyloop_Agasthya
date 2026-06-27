import type { Unit } from "@/lib/content/types";
import { analyticalApplicationTopics } from "./topics";

export const u5AnalyticalApplications: Unit = {
  slug: "u5-analytical-app",
  unitCode: "U5",
  title: "Analytical Applications of Differentiation",
  description:
    "Mean Value Theorem, extrema, monotonicity, concavity, derivative graphs, optimization, and implicit-relation behavior.",
  status: "live",
  topics: analyticalApplicationTopics,
};
