import type { Course, Unit } from "@/lib/content/types";
import { mergeSupplementalTopics } from "../merge-supplemental";
import { chemicalSubstancesNatureBehaviourTopics } from "./u1-chemical-substances-nature-behaviour/topics";
import { worldOfLivingXTopics } from "./u2-world-of-living/topics";
import { naturalPhenomenaXTopics } from "./u3-natural-phenomena/topics";
import { effectsOfCurrentXTopics } from "./u4-effects-of-current/topics";
import { naturalResourcesXTopics } from "./u5-natural-resources/topics";
import { science10FormativeReinforcementTopics } from "./formative-reinforcement/topics";
import { science10PracticalsTopics } from "./internal-assessment-practicals/topics";
import {
  chemicalSubstancesNatureBehaviourSupplementalTopics,
  effectsOfCurrentXSupplementalTopics,
  naturalPhenomenaXSupplementalTopics,
  worldOfLivingXSupplementalTopics,
} from "./supplemental-practice";

const units: Unit[] = [
  {
    slug: "u1-chemical-substances-nature-behaviour",
    unitCode: "U1",
    title: "Chemical Substances - Nature and Behaviour",
    description:
      "Syllabus-listed 25-mark theory unit covering chemical reactions and equations; acids, bases and salts; metals and non-metals; and carbon and its compounds. Periodic Classification of Elements is included only for formative reinforcement and should not be authored as normal year-end exam practice unless CBSE clarifies otherwise.",
    status: "live",
    topics: mergeSupplementalTopics(
      chemicalSubstancesNatureBehaviourTopics,
      chemicalSubstancesNatureBehaviourSupplementalTopics,
    ),
  },
  {
    slug: "u2-world-of-living",
    unitCode: "U2",
    title: "World of Living",
    description:
      "Syllabus-listed 25-mark theory unit covering life processes, control and coordination in animals and plants, reproduction, reproductive health, and heredity. Evolution is treated as formative reinforcement rather than ordinary year-end exam practice.",
    status: "live",
    topics: mergeSupplementalTopics(
      worldOfLivingXTopics,
      worldOfLivingXSupplementalTopics,
    ),
  },
  {
    slug: "u3-natural-phenomena",
    unitCode: "U3",
    title: "Natural Phenomena",
    description:
      "Syllabus-listed 12-mark theory unit covering reflection by curved surfaces, spherical mirrors, mirror formula, magnification, refraction, refractive index, spherical lenses, lens formula, power of a lens, human eye and defects of vision, prism refraction, dispersion, scattering, and daily-life applications. The colour of the sun at sunrise and sunset is explicitly excluded.",
    status: "live",
    topics: mergeSupplementalTopics(
      naturalPhenomenaXTopics,
      naturalPhenomenaXSupplementalTopics,
    ),
  },
  {
    slug: "u4-effects-of-current",
    unitCode: "U4",
    title: "Effects of Current",
    description:
      "Syllabus-listed 13-mark theory unit covering electric current, potential difference, Ohm's law, resistance, resistivity, resistor combinations, heating effect, electric power, magnetic field and field lines, magnetic field due to a current-carrying conductor, coil and solenoid, force on a current-carrying conductor, Fleming's left-hand rule, AC/DC, frequency of AC, and domestic electric circuits. Motor, electromagnetic induction and electric generator are formative-reinforcement topics.",
    status: "live",
    topics: mergeSupplementalTopics(
      effectsOfCurrentXTopics,
      effectsOfCurrentXSupplementalTopics,
    ),
  },
  {
    slug: "u5-natural-resources",
    unitCode: "U5",
    title: "Natural Resources",
    description:
      "Syllabus-listed 5-mark theory unit covering ecosystems, environmental problems, ozone depletion, waste production and solutions, and biodegradable versus non-biodegradable substances.",
    status: "live",
    topics: naturalResourcesXTopics,
  },
  {
    slug: "formative-reinforcement",
    unitCode: "Note",
    title: "Formative Reinforcement Topics",
    description:
      "CBSE syllabus note: Periodic Classification of Elements, Evolution, Motor, Electromagnetic Induction and Electric Generator are included for formative reinforcement/internal assessment rather than normal year-end summative testing. These should be handled as enrichment or portfolio-style practice, not as ordinary board-exam items.",
    status: "live",
    topics: science10FormativeReinforcementTopics,
  },
  {
    slug: "internal-assessment-practicals",
    unitCode: "Lab",
    title: "Internal Assessment and Practical Work",
    description:
      "Syllabus-listed 20-mark internal-assessment component: periodic assessment, multiple assessment, portfolio and subject enrichment. Practical work includes pH testing, acid/base properties, reaction classification, metal reactivity, Ohm's law and V-I graph, equivalent resistance, stomata mount, respiration CO2 test, acetic acid properties, soap in hard/soft water, focal length experiments, glass slab refraction, binary fission/budding slides, prism ray tracing, and dicot seed embryo identification.",
    status: "live",
    topics: science10PracticalsTopics,
  },
];

export const cbseScience10: Course = {
  slug: "cbse-science-10",
  track: "cbse",
  shortTitle: "CBSE 10 Science",
  title: "CBSE Class 10 Science",
  examFamily: "CBSE",
  audience: "Class 10",
  frameworkLabel:
    "CBSE Class X Science 086 theory and practical syllabus 2026-27",
  status: "live",
  description:
    "Original practice mapped to the 2026-27 CBSE Class 10 Science 086 syllabus. Supplemental template questions are temporarily withheld for revision. Each question displays its teacher-review status.",
  units,
};
