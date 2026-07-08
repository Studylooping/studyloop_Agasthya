import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const tempRoot = join(root, ".static-build-disabled");
const moves = [
  [join(root, "app", "api"), join(tempRoot, "app-api")],
  [join(root, "middleware.ts"), join(tempRoot, "middleware.ts")],
];

function restoreMovedFiles() {
  for (const [source, destination] of moves.slice().reverse()) {
    if (!existsSync(source) && existsSync(destination)) {
      renameSync(destination, source);
    }
  }
  if (existsSync(tempRoot)) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function moveRuntimeFilesAway() {
  restoreMovedFiles();
  mkdirSync(tempRoot, { recursive: true });
  for (const [source, destination] of moves) {
    if (existsSync(source)) {
      renameSync(source, destination);
    }
  }
}

try {
  rmSync(join(root, "out"), { recursive: true, force: true });
  moveRuntimeFilesAway();

  const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
  const result = spawnSync(process.execPath, [nextBin, "build"], {
    cwd: root,
    env: {
      ...process.env,
      STUDYLOOP_STATIC_EXPORT: "1",
    },
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  restoreMovedFiles();
}
