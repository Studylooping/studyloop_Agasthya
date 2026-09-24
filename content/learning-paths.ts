import type { LearningTrackId } from "@/lib/content/types";

export interface LearningPath {
  id: LearningTrackId;
  title: string;
  shortTitle: string;
  description: string;
  href: string;
  status: "live" | "soon";
  comingDate?: string;
}

/**
 * StudyLoop's top-level subject list. Only public, ready-to-practice subjects
 * belong here.
 */
export const LEARNING_PATHS: LearningPath[] = [
  {
    id: "ap",
    title: "AP Calculus AB",
    shortTitle: "AP",
    description:
      "Limits, derivatives, integrals, applications, hints, worked solutions, and self-review for AP Calculus AB.",
    href: "/calc-ab",
    status: "live",
  },
  {
    id: "cbse",
    title: "CBSE Class 9 Mathematics",
    shortTitle: "CBSE 9",
    description:
      "Syllabus-aligned 2026-27 Class 9 Mathematics practice with original question banks for all six syllabus units.",
    href: "/cbse-math-9",
    status: "live",
  },
  {
    id: "cbse",
    title: "CBSE Class 9 Science",
    shortTitle: "CBSE 9 Science",
    description:
      "Syllabus-aligned 2026-27 CBSE Class 9 Science practice, with the four theory units and internal-assessment practical work live.",
    href: "/cbse-science-9",
    status: "live",
  },
  {
    id: "cbse",
    title: "CBSE Class 10 Mathematics",
    shortTitle: "CBSE 10",
    description:
      "Syllabus-aligned 2026-27 Class 10 Mathematics practice for Mathematics Standard 041 and Mathematics Basic 241, with all seven units live.",
    href: "/cbse-math-10",
    status: "live",
  },
  {
    id: "cbse",
    title: "CBSE Class 10 Science",
    shortTitle: "CBSE 10 Science",
    description:
      "Syllabus-aligned 2026-27 CBSE Class 10 Science practice, including theory, formative reinforcement, and practical/internal-assessment work.",
    href: "/cbse-science-10",
    status: "live",
  },
  {
    id: "cbse",
    title: "CBSE Class 11 Mathematics",
    shortTitle: "CBSE 11",
    description:
      "Syllabus-aligned Class 11 Mathematics practice across the core units, with optional advanced challenge practice kept separate.",
    href: "/cbse-math-11",
    status: "live",
  },
  {
    id: "cbse",
    title: "CBSE Class 11 Physics",
    shortTitle: "CBSE 11 Physics",
    description:
      "Syllabus-aligned 2026-27 Class 11 Physics practice aligned to the Physics 042 theory and practical syllabus.",
    href: "/cbse-physics-11",
    status: "live",
  },
  {
    id: "cbse",
    title: "CBSE Class 11 Chemistry",
    shortTitle: "CBSE 11 Chemistry",
    description:
      "Syllabus-aligned 2026-27 Class 11 Chemistry practice aligned to the Chemistry 043 theory and practical syllabus.",
    href: "/cbse-chemistry-11",
    status: "live",
  },
  {
    id: "cbse",
    title: "CBSE Class 12 Mathematics",
    shortTitle: "CBSE 12",
    description:
      "Syllabus-aligned Class 12 Mathematics practice across the current CBSE units, with optional advanced challenge practice kept separate.",
    href: "/cbse-math-12",
    status: "live",
  },
  {
    id: "cbse",
    title: "CBSE Class 12 Physics",
    shortTitle: "CBSE 12 Physics",
    description:
      "Syllabus-aligned 2026-27 Class 12 Physics practice aligned to the Physics 042 theory and practical syllabus.",
    href: "/cbse-physics-12",
    status: "live",
  },
  {
    id: "cbse",
    title: "CBSE Class 12 Chemistry",
    shortTitle: "CBSE 12 Chemistry",
    description:
      "Syllabus-aligned 2026-27 Class 12 Chemistry practice aligned to the Chemistry 043 theory and practical syllabus.",
    href: "/cbse-chemistry-12",
    status: "live",
  },
];
