import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const targets = process.argv.slice(2);
const dirs = targets.length > 0 ? targets : [".next", ".next-dev"];

for (const dir of dirs) {
  rmSync(join(root, dir), { recursive: true, force: true });
  console.log(`Removed ${dir}`);
}
