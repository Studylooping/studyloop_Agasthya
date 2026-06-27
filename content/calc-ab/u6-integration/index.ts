import type { Unit } from "@/lib/content/types";
import { integrationTopics } from "./topics";

export const u6Integration: Unit = {
  slug: "u6-integration",
  unitCode: "U6",
  title: "Integration and Accumulation of Change",
  description:
    "Accumulation, Riemann sums, definite integrals, the Fundamental Theorem of Calculus, antiderivatives, substitution, algebraic integration, and technique selection.",
  status: "live",
  topics: integrationTopics,
};
