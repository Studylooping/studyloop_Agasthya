import type { Course } from "@/lib/content/types";

export const physics11Chapters = [
  { number: 1, title: "Units and Measurement", unit: "u1-physical-world-measurement", topics: ["1.1", "1.2", "1.3", "1.4", "1.5"], source: "keph101" },
  { number: 2, title: "Motion in a Straight Line", unit: "u2-kinematics", topics: ["2.1", "2.2"], source: "keph102" },
  { number: 3, title: "Motion in a Plane", unit: "u2-kinematics", topics: ["2.3", "2.4", "2.5"], source: "keph103" },
  { number: 4, title: "Laws of Motion", unit: "u3-laws-of-motion", topics: ["3.1", "3.2", "3.3", "3.4", "3.5"], source: "keph104" },
  { number: 5, title: "Work, Energy and Power", unit: "u4-work-energy-power", topics: ["4.1", "4.2", "4.3", "4.4", "4.5"], source: "keph105" },
  { number: 6, title: "System of Particles and Rotational Motion", unit: "u5-system-particles-rigid-body", topics: ["5.1", "5.2", "5.3", "5.4", "5.5"], source: "keph106" },
  { number: 7, title: "Gravitation", unit: "u6-gravitation", topics: ["6.1", "6.2", "6.3", "6.4", "6.5"], source: "keph107" },
  { number: 8, title: "Mechanical Properties of Solids", unit: "u7-properties-bulk-matter", topics: ["7.1"], source: "keph201" },
  { number: 9, title: "Mechanical Properties of Fluids", unit: "u7-properties-bulk-matter", topics: ["7.2", "7.3", "7.4"], source: "keph202" },
  { number: 10, title: "Thermal Properties of Matter", unit: "u7-properties-bulk-matter", topics: ["7.5"], source: "keph203" },
  { number: 11, title: "Thermodynamics", unit: "u8-thermodynamics", topics: ["8.1", "8.2", "8.3", "8.4", "8.5"], source: "keph204" },
  { number: 12, title: "Kinetic Theory", unit: "u9-kinetic-theory", topics: ["9.1", "9.2", "9.3", "9.4", "9.5"], source: "keph205" },
  { number: 13, title: "Oscillations", unit: "u10-oscillations-waves", topics: ["10.1", "10.2"], source: "keph206" },
  { number: 14, title: "Waves", unit: "u10-oscillations-waves", topics: ["10.3", "10.4", "10.5"], source: "keph207" },
] as const;

export function physics11ChapterCounts(course: Course) {
  return physics11Chapters.map(chapter => {
    const unit = course.units.find(unit => unit.slug === chapter.unit);
    const topics = unit?.topics.filter(topic => (chapter.topics as readonly string[]).includes(topic.topicCode)) ?? [];
    return { ...chapter, count: topics.reduce((sum, topic) => sum + topic.items.length, 0) };
  });
}
