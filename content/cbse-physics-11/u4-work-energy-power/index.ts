import type { Unit } from "@/lib/content/types";
import { workEnergyPowerTopics } from "./topics";
import { energyExpansion } from "./expansion";

export const u4WorkEnergyPower: Unit = {
  slug: "u4-work-energy-power",
  unitCode: "U4",
  title: "Work, Energy and Power",
  description:
    "CBSE Class 11 Physics Unit IV: work by constant and variable forces, kinetic energy, work-energy theorem, power, potential energy, springs, conservative and non-conservative forces, vertical circular motion, and collisions.",
  status: "live",
  topics: workEnergyPowerTopics.map(topic => ({
    ...topic,
    items: [...topic.items, ...energyExpansion.filter(item => item.topic === topic.topicCode)],
  })),
};
