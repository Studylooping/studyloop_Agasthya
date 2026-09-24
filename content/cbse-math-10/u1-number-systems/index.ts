import type { Unit } from "@/lib/content/types";
import { mergeSupplementalTopics } from "../../merge-supplemental";
import { numberSystemsXSupplementalTopics } from "../supplemental-practice";
import { numberSystemsXTopics } from "./topics";

export const u1NumberSystemsX: Unit = {
  slug: "u1-number-systems",
  unitCode: "U1",
  title: "Number Systems",
  description:
    "CBSE Class 10 Mathematics Unit I: Fundamental Theorem of Arithmetic, HCF-LCM applications, prime-power reasoning, and algebraic proofs of irrationality.",
  status: "live",
  topics: mergeSupplementalTopics(
    numberSystemsXTopics,
    numberSystemsXSupplementalTopics,
  ),
};
