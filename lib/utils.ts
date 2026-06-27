import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names safely.
 *
 * `clsx` handles conditionals (truthy strings, arrays, objects).
 * `twMerge` resolves Tailwind conflicts (e.g., `p-2 p-4` → `p-4`).
 *
 * @example
 * cn("rounded-md", isActive && "bg-primary", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format an ISO date for display in the user's locale.
 * Used in the changelog and audit log.
 */
export function formatDate(iso: string, locale: string = "en-IN"): string {
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Site metadata helper. Single source of truth so titles + OG tags + JSON-LD
 * never drift apart.
 */
export const SITE = {
  name: "StudyLoop",
  domain: "studyloop.in",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://studyloop.in",
  feedbackEmail: "hello@studyloop.in",
  tagline: "Free STEM practice for school, exams, and deep understanding.",
  description:
    "Free guided STEM practice for CBSE Classes 9-12, AP, SAT, and IIT-JEE preparation. Original questions, hint ladders, deterministic grading, and a privacy-first learning loop.",
} as const;
