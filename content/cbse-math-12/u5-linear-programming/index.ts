import type { Unit } from "@/lib/content/types";
import { linearProgrammingTopics } from "./topics";

export const u5LinearProgramming: Unit = {
  slug: "u5-linear-programming",
  unitCode: "U5",
  title: "Linear Programming",
  description:
    "Linear constraints, objective functions, feasible regions, graphical solution, corner-point optimization, and applied LPP problems.",
  status: "live",
  topics: linearProgrammingTopics,
};
