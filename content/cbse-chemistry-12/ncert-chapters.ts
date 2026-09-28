import type { Course } from "@/lib/content/types";

// Rationalised NCERT XII Chemistry: five chapters in each of Parts I and II.
// The formative supplement and practical activities are not theory chapters.
export const chemistry12Chapters = [
  ["Solutions", "u1-solutions", "lech101"],
  ["Electrochemistry", "u2-electrochemistry", "lech102"],
  ["Chemical Kinetics", "u3-chemical-kinetics", "lech103"],
  ["The d- and f-Block Elements", "u4-d-and-f-block-elements", "lech104"],
  ["Coordination Compounds", "u5-coordination-compounds", "lech105"],
  ["Haloalkanes and Haloarenes", "u6-haloalkanes-haloarenes", "lech201"],
  ["Alcohols, Phenols and Ethers", "u7-alcohols-phenols-ethers", "lech202"],
  [
    "Aldehydes, Ketones and Carboxylic Acids",
    "u8-aldehydes-ketones-carboxylic-acids",
    "lech203",
  ],
  ["Amines", "u9-amines", "lech204"],
  ["Biomolecules", "u10-biomolecules", "lech205"],
].map(([title, unit, pdf], index) => ({
  number: index + 1,
  title,
  unit,
  source: `https://www.ncert.nic.in/textbook/pdf/${pdf}.pdf`,
}));

export function chemistry12ChapterCounts(course: Course) {
  return chemistry12Chapters.map((chapter) => {
    const count =
      course.units
        .find((unit) => unit.slug === chapter.unit)
        ?.topics.reduce((sum, topic) => sum + topic.items.length, 0) ?? 0;
    return { ...chapter, count, meetsMinimum: count >= 90 };
  });
}
