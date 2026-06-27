import type { LearningTrackId } from "@/lib/content/types";

export interface LearningPath {
  id: LearningTrackId;
  title: string;
  shortTitle: string;
  description: string;
  href: string;
  status: "live" | "soon";
  comingDate?: string;
  focus: string;
}

/**
 * StudyLoop's top-level roadmap. Courses can stay small and practical while
 * the product identity remains broad: CBSE, AP, SAT, and IIT-JEE STEM.
 */
export const LEARNING_PATHS: LearningPath[] = [
  {
    id: "ap",
    title: "AP Calculus AB",
    shortTitle: "AP first",
    description:
      "The first live StudyLoop track: limits, derivatives, integrals, and exam-style practice with hints and self-review.",
    href: "/calc-ab",
    status: "live",
    focus: "Live now",
  },
  {
    id: "cbse",
    title: "CBSE Class 11 Mathematics",
    shortTitle: "CBSE 11",
    description:
      "Official-syllabus aligned Class 11 Mathematics practice, starting with Sets and Functions.",
    href: "/cbse-math-11",
    status: "live",
    focus: "Live now",
  },
  {
    id: "cbse",
    title: "CBSE Class 12 Mathematics",
    shortTitle: "CBSE 12",
    description:
      "Official-syllabus aligned Class 12 Mathematics practice across all current CBSE units.",
    href: "/cbse-math-12",
    status: "live",
    focus: "Live now",
  },
  {
    id: "jee",
    title: "JEE Main Mathematics",
    shortTitle: "JEE Main Math",
    description:
      "Original JEE Main Mathematics practice, starting with Sets, Relations and Functions at competitive-exam depth.",
    href: "/jee-main-math",
    status: "live",
    focus: "Live now",
  },
  {
    id: "sat",
    title: "SAT Math",
    shortTitle: "SAT",
    description:
      "Digital SAT math practice for algebra, advanced math, problem solving, data analysis, and geometry skills.",
    href: "/sat",
    status: "soon",
    comingDate: "after the core STEM loop",
    focus: "Global admissions",
  },
];
