import type { Unit } from "@/lib/content/types";
import { chemicalKineticsTopics } from "./topics";

export const u3ChemicalKinetics: Unit = {
  slug: "u3-chemical-kinetics",
  unitCode: "U3",
  title: "Chemical Kinetics",
  description:
    "Rate of a chemical reaction, factors influencing rate, integrated rate equations, temperature dependence of reaction rate, and collision theory. Theory weightage: 7 marks.",
  status: "live",
  topics: chemicalKineticsTopics,
};
