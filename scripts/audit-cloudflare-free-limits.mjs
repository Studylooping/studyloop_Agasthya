import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { flattenContent, repoRoot } from "./lib/content-loader.mjs";

const FREE_FILE_LIMIT = 20_000;
const WARNING_FILE_LIMIT = 18_000;
const outDir = join(repoRoot, "out");
const requireOut = process.argv.includes("--out");
const failures = [];
const warnings = [];

function walkFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(fullPath, files);
    else files.push(fullPath);
  }
  return files;
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

const packageJson = JSON.parse(
  await import("node:fs").then(({ readFileSync }) =>
    readFileSync(join(repoRoot, "package.json"), "utf8"),
  ),
);

if (!packageJson.scripts?.["build:pages"]?.includes("build-pages.mjs")) {
  fail("build:pages must use scripts/build-pages.mjs for static export");
}
if (!packageJson.scripts?.["deploy:pages"]?.includes("out")) {
  fail("deploy:pages must deploy the static out/ directory");
}

const { units, items } = await flattenContent();
const estimatedRoutes =
  5 + // public pages and 404 cushion
  new Set(units.map((unit) => unit.courseSlug)).size +
  units.length +
  items.length;

let actual = null;
if (existsSync(outDir)) {
  const files = walkFiles(outDir);
  const bytes = files.reduce((sum, filePath) => sum + statSync(filePath).size, 0);
  actual = {
    files: files.length,
    bytes,
    mib: Number((bytes / 1024 / 1024).toFixed(2)),
  };
  if (files.length > FREE_FILE_LIMIT) {
    fail(`out/ has ${files.length} files, above Cloudflare Pages Free limit ${FREE_FILE_LIMIT}`);
  } else if (files.length >= WARNING_FILE_LIMIT) {
    warn(`out/ has ${files.length} files, close to Cloudflare Pages Free limit ${FREE_FILE_LIMIT}`);
  }
} else if (requireOut) {
  fail("out/ does not exist; run npm run build:pages before --out audit");
} else {
  warn("out/ does not exist; reporting estimated route count only");
}

if (estimatedRoutes >= WARNING_FILE_LIMIT) {
  warn(`estimated static routes ${estimatedRoutes} are close to ${FREE_FILE_LIMIT}`);
}

const result = {
  cloudflarePagesFreeFileLimit: FREE_FILE_LIMIT,
  warningFileLimit: WARNING_FILE_LIMIT,
  units: units.length,
  contentItems: items.length,
  estimatedRoutes,
  actualOut: actual,
  warnings: warnings.length,
  failures: failures.length,
};

console.log(JSON.stringify(result, null, 2));

if (warnings.length > 0) {
  console.warn("Cloudflare Free limit warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (failures.length > 0) {
  console.error("Cloudflare Free limit audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
