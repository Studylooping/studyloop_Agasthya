import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
const args = ["dev", ...process.argv.slice(2)];

const child = spawn(process.execPath, [nextBin, ...args], {
  cwd: root,
  env: {
    ...process.env,
    STUDYLOOP_NEXT_DIST_DIR:
      process.env.STUDYLOOP_NEXT_DIST_DIR ?? ".next-dev",
    NODE_OPTIONS: [process.env.NODE_OPTIONS, "--use-system-ca"]
      .filter(Boolean)
      .join(" "),
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
