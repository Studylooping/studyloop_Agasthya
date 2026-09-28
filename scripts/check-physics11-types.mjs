import ts from "typescript";
import { resolve } from "node:path";
const path = ts.findConfigFile(process.cwd(), ts.sys.fileExists, "tsconfig.source.json");
if (!path) throw new Error("Source TypeScript config not found");
const config = ts.readConfigFile(path, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const root = resolve("content/cbse-physics-11").replaceAll("\\", "/") + "/";
const files = parsed.fileNames.filter(file => file.replaceAll("\\", "/").startsWith(root));
if (!files.length) throw new Error("Physics source files not found");
const program = ts.createProgram(files, { ...parsed.options, incremental: false, noEmit: true });
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => "\n",
  }));
  process.exitCode = 1;
} else console.log(`Physics source typecheck passed (${files.length} root files and their dependencies).`);
