import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { flattenContent, repoRoot } from "./lib/content-loader.mjs";

const strict = process.env.STUDYLOOP_FIGURE_AUDIT === "strict";
const failures = [];
const warnings = [];
const records = [];
const svgGroups = new Map();

const diagramCuePattern =
  /\b(figure|diagram|graph|table|chart|plot|sketch|shown|below|given|line|circle|venn|tree|axis|axes|region|field|histogram|dot plot|number line|mapping|matrix|triangle|parabola|ellipse|hyperbola|slope)\b/i;

function fail(location, message) {
  failures.push(`${location}: ${message}`);
}

function warn(location, message) {
  warnings.push(`${location}: ${message}`);
}

function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\\[a-z]+|[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function itemText(item) {
  const chunks = [
    item.questionLatex,
    ...(item.hintLadder ?? []).map((hint) => hint.body),
    ...(item.skillTags ?? []),
    ...(item.commonMisconceptions ?? []),
  ];

  if (Array.isArray(item.workedSolution)) {
    for (const step of item.workedSolution) {
      chunks.push(step.explanation, step.math);
    }
  }
  if (item.kind === "mc_single" || item.kind === "mc_multi") {
    for (const choice of item.choices ?? []) {
      chunks.push(choice.text, choice.rationaleIfWrong, choice.misconceptionTag);
    }
  }
  if (item.kind === "frq") {
    for (const part of item.parts ?? []) chunks.push(part.promptMarkdown);
    for (const criterion of item.rubric?.criteria ?? []) chunks.push(criterion.description);
    for (const error of item.commonErrors ?? []) chunks.push(error);
  }

  return chunks.filter(Boolean).join(" ");
}

function significantTokens(text) {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "this",
    "that",
    "which",
    "what",
    "using",
    "shown",
    "figure",
    "diagram",
  ]);
  return normalize(text)
    .split(" ")
    .filter((token) => token.length >= 4 && !stop.has(token));
}

function auditSvg(location, svg) {
  const trimmed = String(svg ?? "").trim();
  if (!trimmed.startsWith("<svg") || !trimmed.endsWith("</svg>")) {
    fail(location, "SVG must start with <svg and end with </svg>");
  }
  if (/<script\b|<\/script>|<foreignObject\b|<iframe\b|<object\b|<embed\b/i.test(trimmed)) {
    fail(location, "SVG contains executable or embedded content");
  }
  if (/\son[a-z]+\s*=/i.test(trimmed)) {
    fail(location, "SVG contains inline event handler");
  }
  if (/javascript:/i.test(trimmed)) {
    fail(location, "SVG contains javascript: URL");
  }
}

const { items } = await flattenContent();

for (const { unit, topic, item, route } of items) {
  if (!item.figure) continue;

  const location = `${item.contentId}`;
  const figure = item.figure;
  const combinedText = itemText(item);
  const combinedNormalized = normalize(combinedText);
  const figureText = `${figure.title ?? ""} ${figure.description ?? ""}`;
  const tokens = significantTokens(figureText);
  const overlap = tokens.filter((token) => combinedNormalized.includes(token));
  const svgHash = createHash("sha256")
    .update(String(figure.svg ?? ""))
    .digest("hex")
    .slice(0, 16);

  auditSvg(`${location}.figure.svg`, figure.svg);

  if (!figure.title?.trim()) fail(location, "figure missing title");
  if (!figure.description?.trim()) fail(location, "figure missing description");
  const hasDiagramCue = diagramCuePattern.test(combinedText);
  if (tokens.length > 0 && overlap.length === 0) {
    const message =
      "figure title/description has no significant token overlap with item text";
    if (strict) fail(location, message);
    else warn(location, message);
  }
  if (!hasDiagramCue && overlap.length === 0) {
    const message =
      "figure-backed item text has neither diagram cue words nor title/description token overlap";
    if (strict) fail(location, message);
    else warn(location, message);
  }

  if (!svgGroups.has(svgHash)) svgGroups.set(svgHash, []);
  svgGroups.get(svgHash).push(location);

  records.push({
    contentId: item.contentId,
    course: unit.courseSlug,
    unit: unit.unitSlug,
    topic: topic.topicCode,
    route,
    figureTitle: figure.title,
    figureDescription: figure.description,
    svgHash,
    tokenOverlap: overlap,
  });
}

const reusedFigures = [...svgGroups.entries()]
  .map(([svgHash, ids]) => ({ svgHash, ids }))
  .filter((group) => group.ids.length > 1);

const generatedDir = join(repoRoot, "Docs", "generated");
mkdirSync(generatedDir, { recursive: true });
writeFileSync(
  join(generatedDir, "figure-integrity.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      strict,
      figureItems: records.length,
      reusedFigures,
      records,
      warnings,
      failures,
    },
    null,
    2,
  )}\n`,
);

const lines = [
  "# StudyLoop Figure Integrity Report",
  "",
  `Generated: ${new Date().toISOString()}`,
  `Mode: ${strict ? "strict" : "standard"}`,
  "",
  `Figure-backed items: ${records.length}`,
  `Reused SVG groups: ${reusedFigures.length}`,
  `Warnings: ${warnings.length}`,
  `Failures: ${failures.length}`,
  "",
  "## Figure Items",
  "",
  "| Content ID | Route | Figure | SVG hash | Token overlap |",
  "|---|---|---|---|---|",
];

for (const record of records) {
  lines.push(
    `| ${record.contentId} | ${record.route} | ${record.figureTitle} | ${record.svgHash} | ${record.tokenOverlap.join(", ") || "-"} |`,
  );
}

if (reusedFigures.length > 0) {
  lines.push("");
  lines.push("## Reused SVG Groups");
  lines.push("");
  for (const group of reusedFigures) {
    lines.push(`- ${group.svgHash}: ${group.ids.join(", ")}`);
  }
}

if (warnings.length > 0) {
  lines.push("");
  lines.push("## Warnings");
  lines.push("");
  for (const warning of warnings) lines.push(`- ${warning}`);
}

if (failures.length > 0) {
  lines.push("");
  lines.push("## Failures");
  lines.push("");
  for (const failure of failures) lines.push(`- ${failure}`);
}

writeFileSync(join(generatedDir, "figure-integrity.md"), `${lines.join("\n")}\n`);

console.log(
  JSON.stringify(
    {
      strict,
      figureItems: records.length,
      reusedFigures: reusedFigures.length,
      warnings: warnings.length,
      failures: failures.length,
    },
    null,
    2,
  ),
);

if (warnings.length > 0) {
  console.warn("Figure integrity warnings:");
  for (const warning of warnings.slice(0, 50)) console.warn(`- ${warning}`);
  if (warnings.length > 50) console.warn(`...and ${warnings.length - 50} more warnings.`);
}

if (failures.length > 0) {
  console.error("Figure integrity audit failed:");
  for (const failure of failures.slice(0, 100)) console.error(`- ${failure}`);
  if (failures.length > 100) console.error(`...and ${failures.length - 100} more failures.`);
  process.exit(1);
}
