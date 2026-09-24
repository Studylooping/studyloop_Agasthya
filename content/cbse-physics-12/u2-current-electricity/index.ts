import type { Unit } from "@/lib/content/types";
import { currentElectricityTopics } from "./topics";

export const u2CurrentElectricity: Unit = {
  slug: "u2-current-electricity",
  unitCode: "U2",
  title: "Current Electricity",
  description:
    "CBSE Class 12 Physics Unit II: electric current, drift velocity, mobility, Ohm's law, V-I characteristics, resistance, resistivity, temperature dependence, electrical power, cells, Kirchhoff's rules, and Wheatstone bridge.",
  status: "live",
  topics: currentElectricityTopics,
};
