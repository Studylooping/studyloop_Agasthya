import { findUnit } from "./courses";

export const CELL_COLLECTION = {
  title: "Cells: structure, function and osmosis",
  course: "cbse-science-9",
  unit: "u1-world-of-living",
  topic: "1.1",
  version: "1.0.0",
  preparedAt: "2026-09-17",
  curriculumYear: "2026-27",
  syllabusUrl: "https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/ScienceSt_SecP1_2026-27.pdf",
  humanReview: { status: "pending", date: null, reviewerRole: null },
  // A fixed list prevents unrelated future additions from entering the pack.
  slugs: [
    "t1-1-mc-001", "t1-1-mc-002", "t1-1-mc-003", "t1-1-mc-004", "t1-1-mc-005",
    "t1-1-vsaq-001", "t1-1-saq-002", "t1-1-saq-003", "t1-1-laq-004", "t1-1-saq-005",
    "t1-1-mc-201", "t1-1-mc-202", "t1-1-case-205", "t1-1-case-212", "t1-1-laq-206",
  ],
  objectives: [
    "Use structural features to distinguish plant, animal and prokaryotic cells (C-3.1).",
    "Relate selected organelles to their functions and explain membrane permeability (C-3.1).",
    "Predict and explain water movement in osmosis, separating it from solute diffusion (C-3.2).",
    "Distinguish the roles of mitosis and meiosis in human repair and reproduction (C-3.3).",
  ],
};

export function schoolCollectionItems() {
  const topic = findUnit(CELL_COLLECTION.course, CELL_COLLECTION.unit)?.topics.find((entry) => entry.topicCode === CELL_COLLECTION.topic);
  return CELL_COLLECTION.slugs.map((slug) => {
    const item = topic?.items.find((entry) => entry.contentId.split(".").slice(-3).join("-") === slug);
    if (!item) throw new Error(`School collection item is missing: ${slug}`);
    return item;
  });
}
