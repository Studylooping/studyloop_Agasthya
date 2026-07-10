import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContentUnits } from "./lib/content-loader.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const write = args.includes("--write");
const reviewerArg = args.find((arg) => arg.startsWith("--reviewer="));
const reviewer = reviewerArg?.slice("--reviewer=".length).trim();

if (!reviewer) {
  console.error(
    "Usage: node scripts/mark-reviewed-content.mjs --reviewer=\"Reviewer display name\" [--write]",
  );
  process.exit(1);
}

function patchSource(source) {
  let output = source;

  output = output.replace(
    /const REVIEW_STATUS = "(?:human_review_required|ai_reviewed|verified)" as const;/,
    'const REVIEW_STATUS = "verified" as const;',
  );

  if (!/const VERIFIED_BY = /.test(output)) {
    output = output.replace(
      /(const SOURCE_TYPE = "[^"]+" as const;\r?\n)/,
      `$1const VERIFIED_BY = ${JSON.stringify(reviewer)} as const;\n`,
    );
  } else {
    output = output.replace(
      /const VERIFIED_BY = "[^"]*" as const;/,
      `const VERIFIED_BY = ${JSON.stringify(reviewer)} as const;`,
    );
  }

  output = output.replace(
    /(\s+reviewStatus: REVIEW_STATUS,\r?\n)(?!\s+\.\.\(VERIFIED_BY)/g,
    `$1    ...(VERIFIED_BY ? { verifiedBy: VERIFIED_BY } : {}),\n`,
  );

  return output;
}

const units = await loadContentUnits();
const changed = [];

for (const unit of units) {
  const sourcePath = join(repoRoot, unit.sourceRelativePath);
  const source = readFileSync(sourcePath, "utf8");
  const patched = patchSource(source);
  if (patched !== source) {
    changed.push(unit.sourceRelativePath);
    if (write) writeFileSync(sourcePath, patched);
  }
}

console.log(
  JSON.stringify(
    {
      reviewer,
      write,
      changedFiles: changed.length,
      files: changed,
    },
    null,
    2,
  ),
);

if (!write) {
  console.log("Dry run only. Add --write to update content files.");
}
