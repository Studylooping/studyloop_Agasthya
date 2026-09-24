import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const root = process.cwd();
const serverDir = join(root, ".next", "server");
const serverPagesDir = join(root, ".next", "server", "pages");
const manifestPath = join(root, ".next", "server", "pages-manifest.json");

if (existsSync(manifestPath)) {
  process.exit(0);
}

const manifest = existsSync(serverPagesDir)
  ? Object.fromEntries(
      readdirSync(serverPagesDir)
        .filter((fileName) => fileName.endsWith(".js"))
        .sort()
        .map((fileName) => {
          const route = `/${basename(fileName, ".js")}`;
          return [route, `pages/${fileName}`];
        }),
    )
  : {};

mkdirSync(serverDir, { recursive: true });
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Created ${manifestPath}`);
