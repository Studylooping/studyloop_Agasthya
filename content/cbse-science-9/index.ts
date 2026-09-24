import type { Course, Unit } from "@/lib/content/types";
import { mergeSupplementalTopics } from "../merge-supplemental";
import { worldOfLivingTopics } from "./u1-world-of-living/topics";
import { matterNatureBehaviourTopics } from "./u2-matter-nature-behaviour/topics";
import { motionForceWorkSoundTopics } from "./u3-motion-force-work-sound/topics";
import { earthAsSystemTopics } from "./u4-earth-as-a-system/topics";
import { scienceIaTopics } from "./internal-assessment-practicals/topics";
import {
  matterNatureBehaviourSupplementalTopics,
  motionForceWorkSoundSupplementalTopics,
  worldOfLivingSupplementalTopics,
} from "./supplemental-practice";

const units: Unit[] = [
  {
    slug: "u1-world-of-living",
    unitCode: "U1",
    title: "World of Living",
    description:
      "Syllabus-listed 27-mark theory unit covering Cells, Tissues, Reproduction, and Diversity in the Living World. The syllabus expects observation, classification, diagram work, plant and animal cell structure, cell organelles, permeability, cell division, plant and animal tissues, reproduction in plants and animals, and biodiversity/classification ideas.",
    status: "live",
    topics: mergeSupplementalTopics(
      worldOfLivingTopics,
      worldOfLivingSupplementalTopics,
    ),
  },
  {
    slug: "u2-matter-nature-behaviour",
    unitCode: "U2",
    title: "Matter - Its Nature and Behaviour",
    description:
      "Syllabus-listed 25-mark theory unit covering homogeneous and heterogeneous mixtures, solutions, suspensions, colloids, concentration, separation techniques, solubility graphs, atomic models, shell distribution, symbols, valency, atomic number, mass number, isotopes, isobars, laws of chemical combination, formulae, molecular mass, and formula unit mass.",
    status: "live",
    topics: mergeSupplementalTopics(
      matterNatureBehaviourTopics,
      matterNatureBehaviourSupplementalTopics,
    ),
  },
  {
    slug: "u3-motion-force-work-sound",
    unitCode: "U3",
    title: "Motion, Force, Work and Sound",
    description:
      "Syllabus-listed 23-mark theory unit covering motion in one dimension, displacement, velocity, acceleration, distance-time and velocity-time graphs, equations of motion by graphical method, uniform circular motion, Newton's laws, friction, work, energy, power, simple machines, and sound waves.",
    status: "live",
    topics: mergeSupplementalTopics(
      motionForceWorkSoundTopics,
      motionForceWorkSoundSupplementalTopics,
    ),
  },
  {
    slug: "u4-earth-as-a-system",
    unitCode: "U4",
    title: "Earth as a System",
    description:
      "Syllabus-listed 5-mark theory unit covering Earth as an interconnected system, solar radiation, the electromagnetic spectrum, interaction of radiation with Earth's surface, differential heating, winds, biogeochemical cycles, and human impact on natural cycles.",
    status: "live",
    topics: earthAsSystemTopics,
  },
  {
    slug: "internal-assessment-practicals",
    unitCode: "IA",
    title: "Internal Assessment and Practical Work",
    description:
      "Syllabus-listed 20-mark internal-assessment component: periodic assessment, multiple assessment, portfolio, and subject-enrichment practical work. Practical work includes mixture separation, conservation of mass, cell slides, tissue slides, specimen identification, energy conservation with a pendulum, pulse speed, simple machines, Newton's second law, and motion graph activities.",
    status: "live",
    topics: scienceIaTopics,
  },
];

export const cbseScience9: Course = {
  slug: "cbse-science-9",
  track: "cbse",
  shortTitle: "CBSE 9 Science",
  title: "CBSE Class 9 Science",
  examFamily: "CBSE",
  audience: "Class 9",
  frameworkLabel: "CBSE Class IX Science Standard 086 syllabus 2026-27",
  status: "live",
  description:
    "Original practice mapped to the 2026-27 CBSE Class 9 Science Standard 086 syllabus. Some supplemental questions are temporarily withheld for revision. Each question displays its teacher-review status.",
  units,
};
