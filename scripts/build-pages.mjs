import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { exportSeo } from "./export-seo.mjs";

const root = process.cwd();
const tempRoot = mkdtempSync(join(tmpdir(), "studyloop-static-export-"));
const outDir = join(root, "out");
const runtimeOnlyPaths = new Set(["app/api", "middleware.ts"]);
const projectFiles = [
  "app",
  "components",
  "content",
  "lib",
  "pages",
  "public",
  "scripts",
  "components.json",
  "next-env.d.ts",
  "next.config.mjs",
  "package.json",
  "pnpm-lock.yaml",
  "postcss.config.mjs",
  "tailwind.config.ts",
  "tsconfig.json",
  "tsconfig.source.json",
];

function toPortablePath(path) {
  return path.split(sep).join("/");
}

function shouldCopy(sourcePath) {
  const relativePath = toPortablePath(relative(root, sourcePath));
  for (const runtimePath of runtimeOnlyPaths) {
    if (relativePath === runtimePath || relativePath.startsWith(`${runtimePath}/`)) {
      return false;
    }
  }
  return true;
}

function copyStaticWorkspace() {
  rmSync(tempRoot, { recursive: true, force: true });
  mkdirSync(tempRoot, { recursive: true });

  for (const entry of projectFiles) {
    const source = join(root, entry);
    if (!existsSync(source) || !shouldCopy(source)) continue;
    cpSync(source, join(tempRoot, entry), {
      recursive: true,
      filter: shouldCopy,
    });
  }

  const modulesSource = join(root, "node_modules");
  const modulesTarget = join(tempRoot, "node_modules");
  if (existsSync(modulesSource)) {
    symlinkSync(modulesSource, modulesTarget, "junction");
  }
}

try {
  rmSync(outDir, { recursive: true, force: true });
  copyStaticWorkspace();

  const nextBin = join(tempRoot, "node_modules", "next", "dist", "bin", "next");
  const result = spawnSync(
    process.execPath,
    ["--max-old-space-size=8192", nextBin, "build"],
    {
      cwd: tempRoot,
      env: {
        ...process.env,
        STUDYLOOP_DISABLE_WEBPACK_BUILD_WORKER: "1",
        STUDYLOOP_STATIC_EXPORT: "1",
        STUDYLOOP_STATIC_GENERATION_MAX_CONCURRENCY:
          process.env.STUDYLOOP_STATIC_GENERATION_MAX_CONCURRENCY ?? "1",
        STUDYLOOP_STATIC_GENERATION_MIN_PAGES_PER_WORKER:
          process.env.STUDYLOOP_STATIC_GENERATION_MIN_PAGES_PER_WORKER ??
          "100000",
      },
      stdio: "inherit",
    },
  );

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
  if (result.status === 0) {
    cpSync(join(tempRoot, "out"), outDir, { recursive: true });
    exportSeo(outDir, join(tempRoot, ".next", "prerender-manifest.json"));
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
