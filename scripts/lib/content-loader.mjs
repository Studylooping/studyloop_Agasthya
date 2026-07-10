import {
  copyFileSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

function readStagedSource(filePath) {
  const stageDir = mkdtempSync(join(tmpdir(), "studyloop-content-"));
  const stagedPath = join(stageDir, basename(filePath));

  try {
    copyFileSync(filePath, stagedPath);
    const expectedBytes = statSync(filePath).size;
    const stagedBytes = statSync(stagedPath).size;
    if (stagedBytes !== expectedBytes) {
      throw new Error(
        `Staged source size mismatch for ${filePath}: expected ${expectedBytes}, got ${stagedBytes}`,
      );
    }
    return readFileSync(stagedPath, "utf8");
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }
}

function walk(dir, predicate, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, predicate, files);
    else if (predicate(fullPath)) files.push(fullPath);
  }
  return files;
}

function exportNameFromSource(source, filePath) {
  const match = source.match(/export\s+const\s+([A-Za-z0-9_]+Topics)\s*:/);
  if (!match) {
    throw new Error(`Could not find exported topics array in ${filePath}`);
  }
  return match[1];
}

async function transpileTopics(source, filePath) {
  let ts;
  try {
    ts = await import("typescript");
  } catch (error) {
    throw new Error(
      `The TypeScript package is required to load content modules. Run npm install or pnpm install first. Original error: ${error.message}`,
    );
  }

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
    throw new Error(`Unexpected import while loading ${filePath}: ${id}`);
  };

  const runner = new Function("require", "exports", "module", output);
  runner(requireShim, mod.exports, mod);
  return mod.exports;
}

export function itemSlug(contentId) {
  return String(contentId).split(".").slice(-3).join("-");
}

export async function loadContentUnits() {
  const contentRoot = join(repoRoot, "content");
  const topicFiles = walk(
    contentRoot,
    (filePath) => basename(filePath) === "topics.ts",
  ).sort();

  const units = [];
  for (const filePath of topicFiles) {
    const source = readStagedSource(filePath);
    if (source.includes("\0")) {
      throw new Error(`${filePath} contains NUL bytes`);
    }

    const exportName = exportNameFromSource(source, filePath);
    const mod = await transpileTopics(source, filePath);
    const topics = mod[exportName];
    if (!Array.isArray(topics)) {
      throw new Error(`${filePath} did not export ${exportName} as an array`);
    }

    const parts = relative(contentRoot, filePath).split(/[\\/]/);
    const courseSlug = parts[0];
    const unitSlug = parts[1];
    units.push({
      courseSlug,
      unitSlug,
      exportName,
      sourcePath: filePath,
      sourceRelativePath: relative(repoRoot, filePath),
      topics,
    });
  }

  return units;
}

export async function flattenContent() {
  const units = await loadContentUnits();
  const items = [];

  for (const unit of units) {
    for (const topic of unit.topics) {
      for (const item of topic.items ?? []) {
        items.push({
          unit,
          topic,
          item,
          route: `/${item.course ?? unit.courseSlug}/${item.unit ?? unit.unitSlug}/${itemSlug(item.contentId)}`,
        });
      }
    }
  }

  return { units, items };
}
