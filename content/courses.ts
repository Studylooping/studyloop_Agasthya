import type { Course } from "@/lib/content/types";
import { calcAb } from "./calc-ab";
import { cbseChemistry11 } from "./cbse-chemistry-11";
import { cbseChemistry12 } from "./cbse-chemistry-12";
import { cbseMath10 } from "./cbse-math-10";
import { cbseMath9 } from "./cbse-math-9";
import { cbseMath11 } from "./cbse-math-11";
import { cbseMath12 } from "./cbse-math-12";
import { cbsePhysics11 } from "./cbse-physics-11";
import { cbsePhysics12 } from "./cbse-physics-12";
import { cbseScience10 } from "./cbse-science-10";
import { cbseScience9 } from "./cbse-science-9";

/**
 * Single source of truth for all courses on StudyLoop. The landing page,
 * navigation, and route resolution all read from here. To add a new course,
 * create a new file in `content/<slug>/` and export it from here.
 */
export const COURSES: Course[] = [
  calcAb,
  cbseMath9,
  cbseScience9,
  cbseMath10,
  cbseScience10,
  cbseMath11,
  cbsePhysics11,
  cbseChemistry11,
  cbseMath12,
  cbsePhysics12,
  cbseChemistry12,
];

export function findCourse(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug);
}

export function findUnit(courseSlug: string, unitSlug: string) {
  return findCourse(courseSlug)?.units.find((u) => u.slug === unitSlug);
}

/**
 * Derive a URL-safe, collision-free slug for an item from its contentId.
 * Uses the topic, item kind, and number so topics do not collide:
 *   "calc-ab.u1.t1-6.mc.001"  -> "t1-6-mc-001"
 *   "calc-ab.u1.t1-6.frq.001" -> "t1-6-frq-001"
 */
export function itemSlug(contentId: string): string {
  return contentId.split(".").slice(-3).join("-");
}

export function findItem(courseSlug: string, unitSlug: string, slug: string) {
  const unit = findUnit(courseSlug, unitSlug);
  if (!unit) return undefined;
  for (const topic of unit.topics) {
    const item = topic.items.find((i) => itemSlug(i.contentId) === slug);
    if (item) return { item, topic, unit };
  }
  return undefined;
}
