import type { Course } from "@/lib/content/types";
import { u1Limits } from "./u1-limits";
import { u2Differentiation } from "./u2-differentiation";
import { u3CompositeImplicit } from "./u3-comp-implicit";
import { u4ContextualApplications } from "./u4-contextual-app";
import { u5AnalyticalApplications } from "./u5-analytical-app";
import { u6Integration } from "./u6-integration";
import { u7DifferentialEquations } from "./u7-diff-eqs";
import { u8ApplicationsOfIntegration } from "./u8-app-integration";

/**
 * AP Calculus AB — 8 units per the official College Board framework.
 * Units 1-8 have draft content and render as live cards on the course hub.
 */
export const calcAb: Course = {
  slug: "calc-ab",
  track: "ap",
  shortTitle: "Calc AB",
  title: "AP Calculus AB",
  examFamily: "AP",
  audience: "Classes 11-12 and AP self-study",
  frameworkLabel: "College Board AP framework",
  status: "live",
  description:
    "Limits, derivatives, integrals, and the Fundamental Theorem — built around the official College Board Units 1–8.",
  units: [
    u1Limits,
    u2Differentiation,
    u3CompositeImplicit,
    u4ContextualApplications,
    u5AnalyticalApplications,
    u6Integration,
    u7DifferentialEquations,
    u8ApplicationsOfIntegration,
  ],
};
