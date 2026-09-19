import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";
import * as difficulty from "../../lib/content/difficulty-calibration.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const nativeRequire = createRequire(import.meta.url);
const cache = new Map();

/** Load the actual course registry and client renderers in local regression checks. */
export function loadSource(name) {
  const target = name.startsWith("@/") ? join(root, name.slice(2)) : resolve(root, name);
  const path = [target, `${target}.ts`, `${target}.tsx`, join(target, "index.ts")]
    .find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  if (!path) throw new Error(`Source module not found: ${name}`);
  if (cache.has(path)) return cache.get(path).exports;
  const source = readFileSync(path, "utf8");
  if (source.includes("\0")) throw new Error(`NUL byte in ${path}`);
  const output = ts.transpileModule(source, { compilerOptions: {
    esModuleInterop: true, module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  }}).outputText;
  const mod = { exports: {} };
  cache.set(path, mod);
  const requireSource = (id) => {
    if (id.includes("difficulty-calibration")) return difficulty;
    if (id.startsWith("@/")) return loadSource(id);
    if (id.startsWith(".")) return loadSource(resolve(dirname(path), id));
    return nativeRequire(id);
  };
  new Function("require", "module", "exports", output)(requireSource, mod, mod.exports);
  return mod.exports;
}
