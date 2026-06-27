import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import ts from "typescript";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const unitConfigs = {
  "u1-limits": {
    exportName: "limitTopics",
    sourceParts: ["content", "calc-ab", "u1-limits", "topics.ts"],
  },
  "u2-differentiation": {
    exportName: "differentiationTopics",
    sourceParts: ["content", "calc-ab", "u2-differentiation", "topics.ts"],
  },
  "u3-comp-implicit": {
    exportName: "compositeImplicitTopics",
    sourceParts: ["content", "calc-ab", "u3-comp-implicit", "topics.ts"],
  },
  "u4-contextual-app": {
    exportName: "contextualApplicationTopics",
    sourceParts: ["content", "calc-ab", "u4-contextual-app", "topics.ts"],
  },
  "u5-analytical-app": {
    exportName: "analyticalApplicationTopics",
    sourceParts: ["content", "calc-ab", "u5-analytical-app", "topics.ts"],
  },
  "u6-integration": {
    exportName: "integrationTopics",
    sourceParts: ["content", "calc-ab", "u6-integration", "topics.ts"],
  },
  "u7-diff-eqs": {
    exportName: "differentialEquationTopics",
    sourceParts: ["content", "calc-ab", "u7-diff-eqs", "topics.ts"],
  },
  "u8-app-integration": {
    exportName: "applicationIntegrationTopics",
    sourceParts: ["content", "calc-ab", "u8-app-integration", "topics.ts"],
  },
  "u1-relations-functions": {
    exportName: "relationsFunctionsTopics",
    sourceParts: ["content", "cbse-math-12", "u1-relations-functions", "topics.ts"],
  },
  "u2-algebra": {
    exportName: "algebraTopics",
    sourceParts: ["content", "cbse-math-12", "u2-algebra", "topics.ts"],
  },
  "u3-calculus": {
    exportName: "calculusTopics",
    sourceParts: ["content", "cbse-math-12", "u3-calculus", "topics.ts"],
  },
  "u4-vectors-3d": {
    exportName: "vectors3dTopics",
    sourceParts: ["content", "cbse-math-12", "u4-vectors-3d", "topics.ts"],
  },
  "u5-linear-programming": {
    exportName: "linearProgrammingTopics",
    sourceParts: ["content", "cbse-math-12", "u5-linear-programming", "topics.ts"],
  },
  "u6-probability": {
    exportName: "probabilityTopics",
    sourceParts: ["content", "cbse-math-12", "u6-probability", "topics.ts"],
  },
  "u1-sets-functions": {
    exportName: "setsFunctionsTopics",
    sourceParts: ["content", "cbse-math-11", "u1-sets-functions", "topics.ts"],
  },
  "u2-algebra-xi": {
    exportName: "algebraXiTopics",
    sourceParts: ["content", "cbse-math-11", "u2-algebra-xi", "topics.ts"],
  },
  "u3-coordinate-geometry": {
    exportName: "coordinateGeometryTopics",
    sourceParts: ["content", "cbse-math-11", "u3-coordinate-geometry", "topics.ts"],
  },
  "u4-calculus-xi": {
    exportName: "calculusXiTopics",
    sourceParts: ["content", "cbse-math-11", "u4-calculus-xi", "topics.ts"],
  },
  "u5-statistics-probability": {
    exportName: "statisticsProbabilityTopics",
    sourceParts: ["content", "cbse-math-11", "u5-statistics-probability", "topics.ts"],
  },
  "u1-sets-relations-functions": {
    exportName: "jeeSetsRelationsFunctionsTopics",
    sourceParts: ["content", "jee-main-math", "u1-sets-relations-functions", "topics.ts"],
  },
  "u2-complex-numbers-quadratic-equations": {
    exportName: "jeeComplexQuadraticTopics",
    sourceParts: ["content", "jee-main-math", "u2-complex-numbers-quadratic-equations", "topics.ts"],
  },
  "u3-matrices-determinants": {
    exportName: "jeeMatricesDeterminantsTopics",
    sourceParts: ["content", "jee-main-math", "u3-matrices-determinants", "topics.ts"],
  },
};

const weakRationales = [
  "This answer does not follow from the limit definition or the required algebraic step.",
  "This answer uses the wrong contextual rate, sign, unit, or derivative relationship.",
  "This answer uses the wrong derivative sign, candidate value, theorem condition, or optimization relationship.",
];

function readStagedSource(filePath) {
  const stageDir = mkdtempSync(join(tmpdir(), "studyloop-source-"));
  const stagedPath = join(stageDir, basename(filePath));

  try {
    copyFileSync(filePath, stagedPath);
    const expectedBytes = statSync(filePath).size;
    const stagedBytes = statSync(stagedPath).size;
    if (stagedBytes !== expectedBytes) {
      throw new Error(`Staged source size mismatch for ${filePath}: expected ${expectedBytes} bytes, got ${stagedBytes}`);
    }
    return readFileSync(stagedPath, "utf8");
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }
}

function loadTopics(config) {
  const source = readStagedSource(join(root, ...config.sourceParts));
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
    throw new Error(`Unexpected import while auditing MC feedback: ${id}`);
  };

  const runner = new Function("require", "exports", "module", output);
  runner(requireShim, mod.exports, mod);
  return mod.exports[config.exportName];
}

const failures = [];
let checkedWrongChoices = 0;

for (const [unitSlug, config] of Object.entries(unitConfigs)) {
  const topics = loadTopics(config);
  for (const topic of topics) {
    for (const item of topic.items) {
      if (item.kind !== "mc_single") continue;

      for (const choice of item.choices) {
        if (choice.isCorrect) continue;
        checkedWrongChoices += 1;

        const rationale = choice.rationaleIfWrong?.trim();
        if (!rationale) {
          failures.push(`${unitSlug} ${item.contentId}.${choice.letter}: missing rationale`);
          continue;
        }

        if (weakRationales.includes(rationale)) {
          failures.push(`${unitSlug} ${item.contentId}.${choice.letter}: weak generic rationale`);
        }
      }
    }
  }
}

if (failures.length > 0) {
  console.error("MC feedback audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`MC feedback audit passed: ${checkedWrongChoices} wrong choices checked.`);
