import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const unitConfigs = [
  {
    slug: "u1-limits",
    exportName: "limitTopics",
    sourceParts: ["content", "calc-ab", "u1-limits", "topics.ts"],
  },
  {
    slug: "u2-differentiation",
    exportName: "differentiationTopics",
    sourceParts: ["content", "calc-ab", "u2-differentiation", "topics.ts"],
  },
  {
    slug: "u3-comp-implicit",
    exportName: "compositeImplicitTopics",
    sourceParts: ["content", "calc-ab", "u3-comp-implicit", "topics.ts"],
  },
  {
    slug: "u4-contextual-app",
    exportName: "contextualApplicationTopics",
    sourceParts: ["content", "calc-ab", "u4-contextual-app", "topics.ts"],
  },
  {
    slug: "u5-analytical-app",
    exportName: "analyticalApplicationTopics",
    sourceParts: ["content", "calc-ab", "u5-analytical-app", "topics.ts"],
  },
  {
    slug: "u6-integration",
    exportName: "integrationTopics",
    sourceParts: ["content", "calc-ab", "u6-integration", "topics.ts"],
  },
  {
    slug: "u7-diff-eqs",
    exportName: "differentialEquationTopics",
    sourceParts: ["content", "calc-ab", "u7-diff-eqs", "topics.ts"],
  },
  {
    slug: "u8-app-integration",
    exportName: "applicationIntegrationTopics",
    sourceParts: ["content", "calc-ab", "u8-app-integration", "topics.ts"],
  },
  {
    slug: "u1-relations-functions",
    exportName: "relationsFunctionsTopics",
    sourceParts: ["content", "cbse-math-12", "u1-relations-functions", "topics.ts"],
  },
  {
    slug: "u2-algebra",
    exportName: "algebraTopics",
    sourceParts: ["content", "cbse-math-12", "u2-algebra", "topics.ts"],
  },
  {
    slug: "u3-calculus",
    exportName: "calculusTopics",
    sourceParts: ["content", "cbse-math-12", "u3-calculus", "topics.ts"],
  },
  {
    slug: "u4-vectors-3d",
    exportName: "vectors3dTopics",
    sourceParts: ["content", "cbse-math-12", "u4-vectors-3d", "topics.ts"],
  },
  {
    slug: "u5-linear-programming",
    exportName: "linearProgrammingTopics",
    sourceParts: ["content", "cbse-math-12", "u5-linear-programming", "topics.ts"],
  },
  {
    slug: "u6-probability",
    exportName: "probabilityTopics",
    sourceParts: ["content", "cbse-math-12", "u6-probability", "topics.ts"],
  },
  {
    slug: "u1-sets-functions",
    exportName: "setsFunctionsTopics",
    sourceParts: ["content", "cbse-math-11", "u1-sets-functions", "topics.ts"],
  },
  {
    slug: "u2-algebra-xi",
    exportName: "algebraXiTopics",
    sourceParts: ["content", "cbse-math-11", "u2-algebra-xi", "topics.ts"],
  },
  {
    slug: "u3-coordinate-geometry",
    exportName: "coordinateGeometryTopics",
    sourceParts: ["content", "cbse-math-11", "u3-coordinate-geometry", "topics.ts"],
  },
  {
    slug: "u4-calculus-xi",
    exportName: "calculusXiTopics",
    sourceParts: ["content", "cbse-math-11", "u4-calculus-xi", "topics.ts"],
  },
  {
    slug: "u5-statistics-probability",
    exportName: "statisticsProbabilityTopics",
    sourceParts: ["content", "cbse-math-11", "u5-statistics-probability", "topics.ts"],
  },
  {
    slug: "u1-sets-relations-functions",
    exportName: "jeeSetsRelationsFunctionsTopics",
    sourceParts: ["content", "jee-main-math", "u1-sets-relations-functions", "topics.ts"],
  },
  {
    slug: "u2-complex-numbers-quadratic-equations",
    exportName: "jeeComplexQuadraticTopics",
    sourceParts: ["content", "jee-main-math", "u2-complex-numbers-quadratic-equations", "topics.ts"],
  },
  {
    slug: "u3-matrices-determinants",
    exportName: "jeeMatricesDeterminantsTopics",
    sourceParts: ["content", "jee-main-math", "u3-matrices-determinants", "topics.ts"],
  },
];

const stopPhrases = new Set([
  "which of the following",
  "what is true about",
  "the graph of",
  "let x be",
  "let f be",
  "let a be",
]);

function readStagedSource(filePath) {
  const stageDir = mkdtempSync(join(tmpdir(), "studyloop-source-"));
  const stagedPath = join(stageDir, basename(filePath));

  try {
    copyFileSync(filePath, stagedPath);
    const expectedBytes = statSync(filePath).size;
    const stagedBytes = statSync(stagedPath).size;
    if (stagedBytes !== expectedBytes) {
      throw new Error(`Staged source size mismatch for ${filePath}: expected ${expectedBytes} bytes, got ${stagedBytes}`);
    }
    return readFileSync(stagedPath, "utf8");
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }
}

function loadTopics(config) {
  const sourcePath = join(root, ...config.sourceParts);
  const source = readStagedSource(sourcePath);
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const mod = { exports: {} };
  const requireShim = (id) => {
    if (id === "@/lib/content/types") return {};
    throw new Error(`Unexpected import while auditing originality: ${id}`);
  };

  const runner = new Function("require", "exports", "module", output);
  runner(requireShim, mod.exports, mod);
  return mod.exports[config.exportName];
}

function itemSlug(contentId) {
  return contentId.split(".").slice(-3).join("-");
}

function stripLatex(text) {
  return String(text ?? "")
    .replace(/\\text\{([^{}]*)\}/g, " $1 ")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, " $1 over $2 ")
    .replace(/\\sqrt\{([^{}]+)\}/g, " square root of $1 ")
    .replace(/\\begin\{[^{}]+\}|\\end\{[^{}]+\}/g, " ")
    .replace(/\\left|\\right|\\qquad|\\quad|\\,|\\;|\\:/g, " ")
    .replace(/\\le/g, " less than or equal ")
    .replace(/\\ge/g, " greater than or equal ")
    .replace(/\\to/g, " approaches ")
    .replace(/\\infty/g, " infinity ")
    .replace(/\\pi/g, " pi ")
    .replace(/\\sin|\\cos|\\tan|\\sec|\\csc|\\cot|\\ln|\\lim|\\int|\\frac|\\sqrt|\\cdot|\\pm|\\approx/g, " ")
    .replace(/[$^_{}()[\],.;:?=+\-*/<>|]/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(text) {
  return stripLatex(text)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text) {
  return normalize(text).split(" ").filter(Boolean);
}

function shingles(text, size = 7) {
  const tokens = words(text);
  const out = new Set();
  for (let i = 0; i <= tokens.length - size; i += 1) {
    out.add(tokens.slice(i, i + size).join(" "));
  }
  return out;
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) intersection += 1;
  }
  return intersection / (a.size + b.size - intersection);
}

function itemText(item) {
  const parts =
    item.kind === "frq" ? item.parts.map((part) => part.promptMarkdown).join(" ") : "";
  const choices =
    item.kind === "mc_single" ? item.choices.map((choice) => choice.text).join(" ") : "";
  return [item.questionLatex, parts, choices].join(" ");
}

function webPhrase(text) {
  const tokenList = words(text).filter((token) => token.length > 1);
  const windows = [];
  for (let i = 0; i <= tokenList.length - 10; i += 1) {
    const phrase = tokenList.slice(i, i + 10).join(" ");
    if (![...stopPhrases].some((stop) => phrase.includes(stop))) {
      windows.push(phrase);
    }
  }
  return windows.sort((a, b) => b.length - a.length)[0] ?? tokenList.slice(0, 10).join(" ");
}

function riskScore(record) {
  const text = normalize(record.text);
  let score = 0;
  const patterns = [
    "particle moves",
    "water",
    "tank",
    "temperature",
    "population",
    "rate at which",
    "time t",
    "graph shows",
    "table",
    "calculator",
    "justify your answer",
    "nearest",
    "slope field",
    "differential equation",
  ];
  for (const pattern of patterns) {
    if (text.includes(pattern)) score += 1;
  }
  if (record.kind === "frq") score += 2;
  if (record.difficulty >= 4) score += 1;
  if (record.figure) score += 1;
  return score;
}

const records = [];
for (const config of unitConfigs) {
  const topics = loadTopics(config);
  for (const topic of topics) {
    for (const item of topic.items) {
      records.push({
        unit: config.slug,
        topic: topic.topicCode,
        contentId: item.contentId,
        slug: itemSlug(item.contentId),
        kind: item.kind,
        difficulty: item.difficulty,
        figure: Boolean(item.figure),
        sourceType: item.sourceType,
        reviewStatus: item.reviewStatus,
        stem: item.questionLatex,
        text: itemText(item),
      });
    }
  }
}

const exactGroups = new Map();
for (const record of records) {
  const key = normalize(record.text);
  if (!exactGroups.has(key)) exactGroups.set(key, []);
  exactGroups.get(key).push(record);
}
const exactDuplicates = [...exactGroups.values()].filter((group) => group.length > 1);

const shingleCache = new Map(records.map((record) => [record.contentId, shingles(record.text)]));
const nearDuplicates = [];
for (let i = 0; i < records.length; i += 1) {
  for (let j = i + 1; j < records.length; j += 1) {
    const a = records[i];
    const b = records[j];
    const score = jaccard(shingleCache.get(a.contentId), shingleCache.get(b.contentId));
    if (score >= 0.72) {
      nearDuplicates.push({ a, b, score });
    }
  }
}

const ngramCounts = new Map();
for (const record of records) {
  for (const ngram of shingles(record.text, 8)) {
    if (!ngramCounts.has(ngram)) ngramCounts.set(ngram, new Set());
    ngramCounts.get(ngram).add(record.contentId);
  }
}
const repeatedNgrams = [...ngramCounts.entries()]
  .map(([ngram, ids]) => ({ ngram, count: ids.size }))
  .filter((entry) => entry.count >= 3)
  .sort((a, b) => b.count - a.count)
  .slice(0, 30);

const highRisk = records
  .map((record) => ({
    ...record,
    riskScore: riskScore(record),
    webPhrase: webPhrase(record.text),
  }))
  .sort((a, b) => b.riskScore - a.riskScore || b.text.length - a.text.length);

const summary = {
  totalItems: records.length,
  byUnit: Object.fromEntries(
    unitConfigs.map((config) => [
      config.slug,
      records.filter((record) => record.unit === config.slug).length,
    ]),
  ),
  byKind: records.reduce((acc, record) => {
    acc[record.kind] = (acc[record.kind] ?? 0) + 1;
    return acc;
  }, {}),
  bySourceType: records.reduce((acc, record) => {
    acc[record.sourceType] = (acc[record.sourceType] ?? 0) + 1;
    return acc;
  }, {}),
  exactDuplicateGroups: exactDuplicates.length,
  nearDuplicatePairs: nearDuplicates.length,
};

const reportDir = join(root, "review-packages", "originality-audit");
mkdirSync(reportDir, { recursive: true });

const lines = [];
lines.push("# StudyLoop Originality Local Audit");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Total items audited: ${summary.totalItems}`);
lines.push(`- MC items: ${summary.byKind.mc_single ?? 0}`);
lines.push(`- Numerical items: ${summary.byKind.numeric ?? 0}`);
lines.push(`- FRQ items: ${summary.byKind.frq ?? 0}`);
lines.push(`- Source-type counts: ${Object.entries(summary.bySourceType).map(([key, value]) => `${key}: ${value}`).join(", ")}`);
lines.push(`- Exact duplicate item-text groups: ${summary.exactDuplicateGroups}`);
lines.push(`- Near-duplicate item-text pairs at Jaccard >= 0.72: ${summary.nearDuplicatePairs}`);
lines.push("");
lines.push("## Unit Counts");
lines.push("");
for (const [unit, count] of Object.entries(summary.byUnit)) {
  lines.push(`- ${unit}: ${count}`);
}
lines.push("");
lines.push("## Near-Duplicate Pairs");
lines.push("");
if (nearDuplicates.length === 0) {
  lines.push("None above the threshold.");
} else {
  for (const pair of nearDuplicates.slice(0, 50)) {
    lines.push(`- ${pair.score.toFixed(3)}: ${pair.a.slug} (${pair.a.unit}) vs ${pair.b.slug} (${pair.b.unit})`);
  }
}
lines.push("");
lines.push("## Repeated 8-Word Phrases");
lines.push("");
if (repeatedNgrams.length === 0) {
  lines.push("No repeated 8-word phrase appeared in 3 or more items.");
} else {
  for (const entry of repeatedNgrams) {
    lines.push(`- ${entry.count}x: "${entry.ngram}"`);
  }
}
lines.push("");
lines.push("## Highest-Risk Public-Web Search Candidates");
lines.push("");
lines.push("Use these exact phrases for public-web searches. They are selected by context risk, FRQ status, figures, and AP-like wording.");
lines.push("");
for (const record of highRisk.slice(0, 80)) {
  lines.push(`- ${record.slug} (${record.unit}, topic ${record.topic}, ${record.kind}, d${record.difficulty}, risk ${record.riskScore}): "${record.webPhrase}"`);
}

writeFileSync(join(reportDir, "LOCAL_ORIGINALITY_AUDIT.md"), `${lines.join("\n")}\n`);
writeFileSync(
  join(reportDir, "web-search-candidates.json"),
  JSON.stringify(highRisk.slice(0, 120), null, 2),
);

console.log(JSON.stringify(summary, null, 2));
console.log(`Report written to ${join(reportDir, "LOCAL_ORIGINALITY_AUDIT.md")}`);
