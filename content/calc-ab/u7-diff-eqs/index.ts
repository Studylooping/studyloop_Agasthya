import type { Unit } from "@/lib/content/types";
import { differentialEquationTopics } from "./topics";

export const u7DifferentialEquations: Unit = {
  slug: "u7-diff-eqs",
  unitCode: "U7",
  title: "Differential Equations",
  description:
    "Differential-equation modeling, solution verification, slope fields, separation of variables, particular solutions, and exponential models.",
  status: "live",
  topics: differentialEquationTopics,
};
