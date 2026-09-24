import { flattenContent } from "./lib/content-loader.mjs";

const VALID_REVIEW_STATUSES = new Set([
  "human_review_required",
  "ai_reviewed",
  "verified",
]);
const VALID_SOURCE_TYPES = new Set([
  "original_ai_assisted_question",
  "tutor_authored",
  "verified",
]);
const policy = process.env.STUDYLOOP_PUBLIC_REVIEW_POLICY ?? "labelled";
const strictVerifiedOnly = policy === "verified-only";
const failures = [];
const warnings = [];

function fail(location, message) {
  failures.push(`${location}: ${message}`);
}

function warn(location, message) {
  warnings.push(`${location}: ${message}`);
}

function itemLocation(unit, item) {
  return `${unit.sourceRelativePath} :: ${item.contentId}`;
}

function checkUnsafeText(location, value) {
  const text = String(value ?? "");
  const lower = text.toLowerCase();
  const unsafePatterns = [
    "<script",
    "</script",
    "javascript:",
    "<iframe",
    "<object",
    "<embed",
    "<foreignobject",
  ];

  for (const pattern of unsafePatterns) {
    if (lower.includes(pattern)) fail(location, `unsafe content pattern ${pattern}`);
  }
  if (/\son[a-z]+\s*=/i.test(text)) {
    fail(location, "inline event handler attribute detected");
  }
}

function auditFigure(location, figure) {
  if (!figure) return;
  if (figure.type !== "svg") fail(location, "figure type must be svg");
  if (!figure.title?.trim()) fail(location, "figure missing title");
  if (!figure.description?.trim()) fail(location, "figure missing description");
  if (!figure.svg?.trim()) fail(location, "figure missing svg");

  const svg = String(figure.svg ?? "").trim();
  if (svg && (!svg.startsWith("<svg") || !svg.endsWith("</svg>"))) {
    fail(location, "figure SVG must start with <svg and end with </svg>");
  }
  checkUnsafeText(`${location}.title`, figure.title);
  checkUnsafeText(`${location}.description`, figure.description);
  checkUnsafeText(`${location}.svg`, svg);
}

function auditItem(unit, topic, item) {
  const location = itemLocation(unit, item);

  if (!item.contentId?.trim()) fail(location, "missing contentId");
  if (!VALID_REVIEW_STATUSES.has(item.reviewStatus)) {
    fail(location, `invalid reviewStatus ${item.reviewStatus}`);
  }
  if (!VALID_SOURCE_TYPES.has(item.sourceType)) {
    fail(location, `invalid sourceType ${item.sourceType}`);
  }
  if (strictVerifiedOnly && item.reviewStatus !== "verified") {
    fail(location, "strict verified-only policy requires reviewStatus=verified");
  }
  if (item.reviewStatus === "verified" && !item.verifiedBy?.trim()) {
    fail(location, "verified item must include verifiedBy");
  }
  if (item.reviewStatus !== "verified") {
    warn(location, `public alpha item remains ${item.reviewStatus}`);
  }

  checkUnsafeText(`${location}.questionLatex`, item.questionLatex);
  for (const hint of item.hintLadder ?? []) {
    checkUnsafeText(`${location}.hint.${hint.level}`, hint.body);
  }
  for (const step of item.workedSolution ?? []) {
    checkUnsafeText(`${location}.solution`, step.explanation ?? "");
    checkUnsafeText(`${location}.solutionMath`, step.math ?? "");
  }
  if (item.kind === "mc_single" || item.kind === "mc_multi") {
    for (const choice of item.choices ?? []) {
      checkUnsafeText(`${location}.choice.${choice.letter}`, choice.text);
      checkUnsafeText(
        `${location}.choice.${choice.letter}.rationale`,
        choice.rationaleIfWrong ?? "",
      );
    }
  }
  if (item.kind === "frq") {
    for (const part of item.parts ?? []) {
      checkUnsafeText(`${location}.part.${part.letter}`, part.promptMarkdown);
    }
    for (const criterion of item.rubric?.criteria ?? []) {
      checkUnsafeText(`${location}.rubric.${criterion.part}`, criterion.description);
    }
    for (const error of item.commonErrors ?? []) {
      checkUnsafeText(`${location}.commonError`, error);
    }
  }

  auditFigure(`${location}.figure`, item.figure);

  if (item.course !== unit.courseSlug) {
    fail(location, `course mismatch: expected ${unit.courseSlug}, got ${item.course}`);
  }
  if (item.unit !== unit.unitSlug) {
    fail(location, `unit mismatch: expected ${unit.unitSlug}, got ${item.unit}`);
  }
  if (item.topic !== topic.topicCode) {
    fail(location, `topic mismatch: expected ${topic.topicCode}, got ${item.topic}`);
  }
}

const { units, items } = await flattenContent();
const seenIds = new Set();
const seenRoutes = new Set();

for (const { unit, topic, item, route } of items) {
  if (seenIds.has(item.contentId)) fail(item.contentId, "duplicate contentId");
  seenIds.add(item.contentId);
  if (seenRoutes.has(route)) fail(route, "duplicate public route");
  seenRoutes.add(route);
  auditItem(unit, topic, item);
}

console.log(
  JSON.stringify(
    {
      policy,
      units: units.length,
      items: items.length,
      warnings: warnings.length,
      failures: failures.length,
    },
    null,
    2,
  ),
);

if (warnings.length > 0) {
  console.warn("Public content gate warnings:");
  for (const warning of warnings.slice(0, 50)) console.warn(`- ${warning}`);
  if (warnings.length > 50) {
    console.warn(`...and ${warnings.length - 50} more warnings.`);
  }
}

if (failures.length > 0) {
  console.error("Public content gate failed:");
  for (const failure of failures.slice(0, 100)) console.error(`- ${failure}`);
  if (failures.length > 100) {
    console.error(`...and ${failures.length - 100} more failures.`);
  }
  process.exit(1);
}
