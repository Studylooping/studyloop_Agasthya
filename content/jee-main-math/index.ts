import type { Course, Unit } from "@/lib/content/types";
import { u1SetsRelationsFunctions } from "./u1-sets-relations-functions";
import { u2ComplexNumbersQuadraticEquations } from "./u2-complex-numbers-quadratic-equations";
import { u3MatricesDeterminants } from "./u3-matrices-determinants";

const comingSoonUnits: Unit[] = [
  {
    slug: "u4-permutations-combinations",
    unitCode: "U4",
    title: "Permutations and Combinations",
    description:
      "Counting arrangements and selections under JEE-style restrictions.",
    status: "soon",
    topics: [],
  },
  {
    slug: "u5-binomial-theorem",
    unitCode: "U5",
    title: "Binomial Theorem and Simple Applications",
    description:
      "Binomial expansion, general term, middle term, and coefficient problems.",
    status: "soon",
    topics: [],
  },
  {
    slug: "u6-sequence-series",
    unitCode: "U6",
    title: "Sequence and Series",
    description:
      "Arithmetic and geometric progressions, special series, and progression-based reasoning.",
    status: "soon",
    topics: [],
  },
  {
    slug: "u7-limit-continuity-differentiability",
    unitCode: "U7",
    title: "Limit, Continuity and Differentiability",
    description:
      "Limits, continuity, differentiability, derivatives, and applications of derivatives.",
    status: "soon",
    topics: [],
  },
  {
    slug: "u8-integral-calculus",
    unitCode: "U8",
    title: "Integral Calculus",
    description:
      "Indefinite and definite integrals, standard methods, and area applications.",
    status: "soon",
    topics: [],
  },
  {
    slug: "u9-differential-equations",
    unitCode: "U9",
    title: "Differential Equations",
    description:
      "Formation and solution of first-order differential equations within JEE Main scope.",
    status: "soon",
    topics: [],
  },
  {
    slug: "u10-coordinate-geometry",
    unitCode: "U10",
    title: "Coordinate Geometry",
    description:
      "Straight lines, circles, conic sections, and coordinate-based problem solving.",
    status: "soon",
    topics: [],
  },
  {
    slug: "u11-three-dimensional-geometry",
    unitCode: "U11",
    title: "Three Dimensional Geometry",
    description:
      "Coordinates in space, direction cosines, lines, planes, and distance problems.",
    status: "soon",
    topics: [],
  },
  {
    slug: "u12-vector-algebra",
    unitCode: "U12",
    title: "Vector Algebra",
    description:
      "Vector operations, products, projections, and geometry with vectors.",
    status: "soon",
    topics: [],
  },
  {
    slug: "u13-statistics-probability",
    unitCode: "U13",
    title: "Statistics and Probability",
    description:
      "Measures of dispersion, probability rules, Bayes theorem, and random variables.",
    status: "soon",
    topics: [],
  },
  {
    slug: "u14-trigonometry",
    unitCode: "U14",
    title: "Trigonometry",
    description:
      "Trigonometric identities, equations, inverse trigonometric ideas, and applications.",
    status: "soon",
    topics: [],
  },
];

export const jeeMainMath: Course = {
  slug: "jee-main-math",
  track: "jee",
  shortTitle: "JEE Main Math",
  title: "JEE Main Mathematics",
  examFamily: "JEE",
  audience: "Paper 1 B.E./B.Tech.",
  frameworkLabel: "NTA JEE Main Paper 1 Mathematics syllabus",
  status: "live",
  description:
    "Original JEE Main Mathematics practice aligned to the official Paper 1 syllabus, with tough MCQs, numerical-value questions, hints, and trap-aware feedback.",
  units: [
    u1SetsRelationsFunctions,
    u2ComplexNumbersQuadraticEquations,
    u3MatricesDeterminants,
    ...comingSoonUnits,
  ],
};
