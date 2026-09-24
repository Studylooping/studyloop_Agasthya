import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const contentRoot = join(root, "content");

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile() && fullPath.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

function describeNulIssue(filePath, data) {
  const firstNul = data.indexOf(0);
  if (firstNul === -1) return null;

  let coreEnd = data.length;
  while (coreEnd > 0 && data[coreEnd - 1] === 0) coreEnd -= 1;

  return {
    file: relative(root, filePath),
    bytes: data.length,
    firstNul,
    trailingNuls: data.length - coreEnd,
    embeddedNul: data.subarray(0, coreEnd).includes(0),
  };
}

function checkCourseIndexWiring(filePath, source) {
  const normalized = filePath.replace(/\\/g, "/");
  if (!/\/content\/[^/]+\/index\.ts$/.test(normalized)) return [];

  const unitsMatch = source.match(
    /const units:\s*Unit\[\]\s*=\s*\[([\s\S]*?)\];/,
  );
  if (!unitsMatch) return [];

  const unitsBlock = unitsMatch[1];
  const importMatches = [
    ...source.matchAll(
      /import\s+\{\s*([^}]+?)\s*\}\s+from\s+["']\.\/[^"']+["'];/g,
    ),
  ];

  const missing = [];
  for (const match of importMatches) {
    const importedNames = match[1]
      .split(",")
      .map((part) =>
        part
          .trim()
          .split(/\s+as\s+/)
          .pop(),
      )
      .filter(Boolean);
    for (const name of importedNames) {
      if (name === "Course" || name === "Unit") continue;
      const unitReference = new RegExp(`\\b${name}\\b`).test(unitsBlock);
      if (!unitReference) {
        missing.push(
          `${relative(root, filePath)}: imported ${name} is not listed in units`,
        );
      }
    }
  }

  return missing;
}

const nulIssues = [];
const wiringIssues = [];

for (const filePath of walk(contentRoot)) {
  const data = readFileSync(filePath);
  const nulIssue = describeNulIssue(filePath, data);
  if (nulIssue) nulIssues.push(nulIssue);

  if (filePath.endsWith("index.ts")) {
    wiringIssues.push(
      ...checkCourseIndexWiring(filePath, data.toString("utf8")),
    );
  }
}

if (nulIssues.length || wiringIssues.length) {
  if (nulIssues.length) {
    console.error("Content hygiene audit failed: NUL bytes found.");
    for (const issue of nulIssues) {
      const kind = issue.embeddedNul ? "embedded" : "trailing";
      console.error(
        `- ${issue.file}: ${kind} NUL; first offset ${issue.firstNul}; trailing NULs ${issue.trailingNuls}; bytes ${issue.bytes}`,
      );
    }
  }

  if (wiringIssues.length) {
    console.error("Content hygiene audit failed: course index wiring issue.");
    for (const issue of wiringIssues) console.error(`- ${issue}`);
  }

  process.exit(1);
}

console.log(
  "Content hygiene audit passed: no NUL bytes and course indexes are wired.",
);
