import type { Unit } from "@/lib/content/types";
import { math12ChallengePracticeTopics } from "./topics";

export const math12ChallengePractice: Unit = {
  slug: "challenge-practice",
  unitCode: "Challenge",
  title: "Challenge Practice",
  description:
    "Advanced challenge questions for Class 12 Mathematics topics. These are enrichment problems after CBSE practice, not the core board-preparation sequence.",
  status: "live",
  topics: math12ChallengePracticeTopics,
};
