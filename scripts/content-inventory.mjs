import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { flattenContent, repoRoot } from "./lib/content-loader.mjs";

function bump(map, key, amount = 1) {
  map[key] = (map[key] ?? 0) + amount;
}

function sortObject(value) {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}

const { units, items } = await flattenContent();

const summary = {
  generatedAt: new Date().toISOString(),
  courses: {},
  totals: {
    units: units.length,
    topics: 0,
    items: items.length,
    figures: 0,
  },
  byKind: {},
  byReviewStatus: {},
  bySourceType: {},
  byDifficulty: {},
};

for (const unit of units) {
  if (!summary.courses[unit.courseSlug]) {
    summary.courses[unit.courseSlug] = {
      units: 0,
      topics: 0,
      items: 0,
      figures: 0,
      byKind: {},
      byReviewStatus: {},
    };
  }
  const course = summary.courses[unit.courseSlug];
  course.units += 1;
  course.topics += unit.topics.length;
  summary.totals.topics += unit.topics.length;
}

for (const { unit, item } of items) {
  const course = summary.courses[unit.courseSlug];
  const figureCount = item.figure ? 1 : 0;
  course.items += 1;
  course.figures += figureCount;
  summary.totals.figures += figureCount;

  bump(summary.byKind, item.kind ?? "missing");
  bump(summary.byReviewStatus, item.reviewStatus ?? "missing");
  bump(summary.bySourceType, item.sourceType ?? "missing");
  bump(summary.byDifficulty, String(item.difficulty ?? "missing"));
  bump(course.byKind, item.kind ?? "missing");
  bump(course.byReviewStatus, item.reviewStatus ?? "missing");
}

summary.courses = Object.fromEntries(
  Object.entries(summary.courses)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([courseSlug, course]) => [
      courseSlug,
      {
        ...course,
        byKind: sortObject(course.byKind),
        byReviewStatus: sortObject(course.byReviewStatus),
      },
    ]),
);
summary.byKind = sortObject(summary.byKind);
summary.byReviewStatus = sortObject(summary.byReviewStatus);
summary.bySourceType = sortObject(summary.bySourceType);
summary.byDifficulty = sortObject(summary.byDifficulty);

const generatedDir = join(repoRoot, "Docs", "generated");
mkdirSync(generatedDir, { recursive: true });
writeFileSync(
  join(generatedDir, "content-inventory.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
);

const lines = [
  "# StudyLoop Content Inventory",
  "",
  `Generated: ${summary.generatedAt}`,
  "",
  "## Totals",
  "",
  `- Courses: ${Object.keys(summary.courses).length}`,
  `- Units: ${summary.totals.units}`,
  `- Topics: ${summary.totals.topics}`,
  `- Items: ${summary.totals.items}`,
  `- Figure-backed items: ${summary.totals.figures}`,
  "",
  "## Course Breakdown",
  "",
  "| Course | Units | Topics | Items | Figures | Review Status | Item Kinds |",
  "|---|---:|---:|---:|---:|---|---|",
];

for (const [courseSlug, course] of Object.entries(summary.courses)) {
  const reviewStatus = Object.entries(course.byReviewStatus)
    .map(([key, value]) => `${key}: ${value}`)
    .join("<br>");
  const kinds = Object.entries(course.byKind)
    .map(([key, value]) => `${key}: ${value}`)
    .join("<br>");
  lines.push(
    `| ${courseSlug} | ${course.units} | ${course.topics} | ${course.items} | ${course.figures} | ${reviewStatus} | ${kinds} |`,
  );
}

lines.push("");
lines.push("## Global Review Status");
lines.push("");
for (const [status, count] of Object.entries(summary.byReviewStatus)) {
  lines.push(`- ${status}: ${count}`);
}
lines.push("");
lines.push("## Global Item Kinds");
lines.push("");
for (const [kind, count] of Object.entries(summary.byKind)) {
  lines.push(`- ${kind}: ${count}`);
}
lines.push("");

writeFileSync(join(generatedDir, "content-inventory.md"), `${lines.join("\n")}\n`);

console.log(JSON.stringify(summary.totals, null, 2));
console.log(`Inventory written to ${join(generatedDir, "content-inventory.md")}`);
