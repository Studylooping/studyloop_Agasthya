import type { Course } from "@/lib/content/types";

export const math11Chapters = [
  {
    number: 1,
    title: "Sets",
    unit: "u1-sets-functions",
    topics: ["1.1", "1.2"],
    source: "kemh101",
  },
  {
    number: 2,
    title: "Relations and Functions",
    unit: "u1-sets-functions",
    topics: ["1.3", "1.4", "1.5"],
    source: "kemh102",
  },
  {
    number: 3,
    title: "Trigonometric Functions",
    unit: "u1-sets-functions",
    topics: ["1.6", "1.7", "1.8", "1.9"],
    source: "kemh103",
  },
  {
    number: 4,
    title: "Complex Numbers and Quadratic Equations",
    unit: "u2-algebra-xi",
    topics: ["2.1"],
    source: "kemh104",
  },
  {
    number: 5,
    title: "Linear Inequalities",
    unit: "u2-algebra-xi",
    topics: ["2.2"],
    source: "kemh105",
  },
  {
    number: 6,
    title: "Permutations and Combinations",
    unit: "u2-algebra-xi",
    topics: ["2.3"],
    source: "kemh106",
  },
  {
    number: 7,
    title: "Binomial Theorem",
    unit: "u2-algebra-xi",
    topics: ["2.4"],
    source: "kemh107",
  },
  {
    number: 8,
    title: "Sequences and Series",
    unit: "u2-algebra-xi",
    topics: ["2.5"],
    source: "kemh108",
  },
  {
    number: 9,
    title: "Straight Lines",
    unit: "u3-coordinate-geometry",
    topics: ["3.1", "3.2"],
    source: "kemh109",
  },
  {
    number: 10,
    title: "Conic Sections",
    unit: "u3-coordinate-geometry",
    topics: ["3.3", "3.4"],
    source: "kemh110",
  },
  {
    number: 11,
    title: "Introduction to Three-dimensional Geometry",
    unit: "u3-coordinate-geometry",
    topics: ["3.5"],
    source: "kemh111",
  },
  {
    number: 12,
    title: "Limits and Derivatives",
    unit: "u4-calculus-xi",
    topics: ["4.1", "4.2", "4.3", "4.4", "4.5"],
    source: "kemh112",
  },
  {
    number: 13,
    title: "Statistics",
    unit: "u5-statistics-probability",
    topics: ["5.1", "5.2", "5.3"],
    source: "kemh113",
  },
  {
    number: 14,
    title: "Probability",
    unit: "u5-statistics-probability",
    topics: ["5.4", "5.5"],
    source: "kemh114",
  },
] as const;

export function math11ChapterCounts(course: Course) {
  return math11Chapters.map((chapter) => {
    const topics =
      course.units
        .find((unit) => unit.slug === chapter.unit)
        ?.topics.filter((topic) =>
          (chapter.topics as readonly string[]).includes(topic.topicCode),
        ) ?? [];
    return {
      ...chapter,
      count: topics.reduce((sum, topic) => sum + topic.items.length, 0),
    };
  });
}
