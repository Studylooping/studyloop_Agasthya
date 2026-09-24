import type { Unit } from "@/lib/content/types";
import { electrochemistryTopics } from "./topics";

export const u2Electrochemistry: Unit = {
  slug: "u2-electrochemistry",
  unitCode: "U2",
  title: "Electrochemistry",
  description:
    "Electrochemical cells, galvanic cells, Nernst equation, conductance of electrolytic solutions, electrolytic cells, electrolysis, batteries, fuel cells, and corrosion. Theory weightage: 9 marks.",
  status: "live",
  topics: electrochemistryTopics,
};
