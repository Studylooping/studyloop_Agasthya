import type { Course } from "@/lib/content/types";

// NCERT Chemistry XI, rationalised 2026-27 reprint: Part I, six chapters;
// Part II, three chapters. Formative supplements and laboratory work are separate.
export const chemistry11Chapters = [
  {
    number: 1,
    title: "Some Basic Concepts of Chemistry",
    unit: "u1-some-basic-concepts",
    pdf: "kech101",
    sections: "1.1-1.10",
  },
  {
    number: 2,
    title: "Structure of Atom",
    unit: "u2-structure-of-atom",
    pdf: "kech102",
    sections: "2.1-2.6",
  },
  {
    number: 3,
    title: "Classification of Elements and Periodicity in Properties",
    unit: "u3-classification-periodicity",
    pdf: "kech103",
    sections: "3.1-3.7",
  },
  {
    number: 4,
    title: "Chemical Bonding and Molecular Structure",
    unit: "u4-chemical-bonding-molecular-structure",
    pdf: "kech104",
    sections: "4.1-4.9",
  },
  {
    number: 5,
    title: "Thermodynamics",
    unit: "u5-chemical-thermodynamics",
    pdf: "kech105",
    sections: "5.1-5.7",
  },
  {
    number: 6,
    title: "Equilibrium",
    unit: "u6-equilibrium",
    pdf: "kech106",
    sections: "6.1-6.13",
  },
  {
    number: 7,
    title: "Redox Reactions",
    unit: "u7-redox-reactions",
    pdf: "kech201",
    sections: "7.1-7.4",
  },
  {
    number: 8,
    title: "Organic Chemistry - Some Basic Principles and Techniques",
    unit: "u8-organic-chemistry-basic-principles-techniques",
    pdf: "kech202",
    sections: "8.1-8.10",
  },
  {
    number: 9,
    title: "Hydrocarbons",
    unit: "u9-hydrocarbons",
    pdf: "kech203",
    sections: "9.1-9.6",
  },
] as const;

export function chemistry11ChapterCounts(course: Course) {
  return chemistry11Chapters.map((chapter) => ({
    ...chapter,
    source: `https://ncert.nic.in/textbook/pdf/${chapter.pdf}.pdf`,
    count:
      course.units
        .find((unit) => unit.slug === chapter.unit)
        ?.topics.reduce((sum, topic) => sum + topic.items.length, 0) ?? 0,
  }));
}
