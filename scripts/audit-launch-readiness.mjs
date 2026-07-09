import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import katex from "katex";
import ts from "typescript";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const LETTERS = ["A", "B", "C", "D", "E"];

const unitConfigs = [
  {
    courseSlug: "calc-ab",
    slug: "u1-limits",
    exportName: "limitTopics",
    sourceParts: ["content", "calc-ab", "u1-limits", "topics.ts"],
  },
  {
    courseSlug: "calc-ab",
    slug: "u2-differentiation",
    exportName: "differentiationTopics",
    sourceParts: ["content", "calc-ab", "u2-differentiation", "topics.ts"],
  },
  {
    courseSlug: "calc-ab",
    slug: "u3-comp-implicit",
    exportName: "compositeImplicitTopics",
    sourceParts: ["content", "calc-ab", "u3-comp-implicit", "topics.ts"],
  },
  {
    courseSlug: "calc-ab",
    slug: "u4-contextual-app",
    exportName: "contextualApplicationTopics",
    sourceParts: ["content", "calc-ab", "u4-contextual-app", "topics.ts"],
  },
  {
    courseSlug: "calc-ab",
    slug: "u5-analytical-app",
    exportName: "analyticalApplicationTopics",
    sourceParts: ["content", "calc-ab", "u5-analytical-app", "topics.ts"],
  },
  {
    courseSlug: "calc-ab",
    slug: "u6-integration",
    exportName: "integrationTopics",
    sourceParts: ["content", "calc-ab", "u6-integration", "topics.ts"],
  },
  {
    courseSlug: "calc-ab",
    slug: "u7-diff-eqs",
    exportName: "differentialEquationTopics",
    sourceParts: ["content", "calc-ab", "u7-diff-eqs", "topics.ts"],
  },
  {
    courseSlug: "calc-ab",
    slug: "u8-app-integration",
    exportName: "applicationIntegrationTopics",
    sourceParts: ["content", "calc-ab", "u8-app-integration", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-12",
    slug: "u1-relations-functions",
    exportName: "relationsFunctionsTopics",
    sourceParts: [
      "content",
      "cbse-math-12",
      "u1-relations-functions",
      "topics.ts",
    ],
  },
  {
    courseSlug: "cbse-math-12",
    slug: "u2-algebra",
    exportName: "algebraTopics",
    sourceParts: ["content", "cbse-math-12", "u2-algebra", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-12",
    slug: "u3-calculus",
    exportName: "calculusTopics",
    sourceParts: ["content", "cbse-math-12", "u3-calculus", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-12",
    slug: "u4-vectors-3d",
    exportName: "vectors3dTopics",
    sourceParts: ["content", "cbse-math-12", "u4-vectors-3d", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-12",
    slug: "u5-linear-programming",
    exportName: "linearProgrammingTopics",
    sourceParts: [
      "content",
      "cbse-math-12",
      "u5-linear-programming",
      "topics.ts",
    ],
  },
  {
    courseSlug: "cbse-math-12",
    slug: "u6-probability",
    exportName: "probabilityTopics",
    sourceParts: ["content", "cbse-math-12", "u6-probability", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-11",
    slug: "u1-sets-functions",
    exportName: "setsFunctionsTopics",
    sourceParts: ["content", "cbse-math-11", "u1-sets-functions", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-11",
    slug: "u2-algebra-xi",
    exportName: "algebraXiTopics",
    sourceParts: ["content", "cbse-math-11", "u2-algebra-xi", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-11",
    slug: "u3-coordinate-geometry",
    exportName: "coordinateGeometryTopics",
    sourceParts: [
      "content",
      "cbse-math-11",
      "u3-coordinate-geometry",
      "topics.ts",
    ],
  },
  {
    courseSlug: "cbse-math-11",
    slug: "u4-calculus-xi",
    exportName: "calculusXiTopics",
    sourceParts: ["content", "cbse-math-11", "u4-calculus-xi", "topics.ts"],
  },
  {
    courseSlug: "cbse-math-11",
    slug: "u5-statistics-probability",
    exportName: "statisticsProbabilityTopics",
    sourceParts: [
      "content",
      "cbse-math-11",
      "u5-statistics-probability",
      "topics.ts",
    ],
  },
  {
    courseSlug: "jee-main-math",
    slug: "u1-sets-relations-functions",
    exportName: "jeeSetsRelationsFunctionsTopics",
    sourceParts: [
      "content",
      "jee-main-math",
      "u1-sets-relations-functions",
      "topics.ts",
    ],
  },
  {
    courseSlug: "jee-main-math",
    slug: "u2-complex-numbers-quadratic-equations",
    exportName: "jeeComplexQuadraticTopics",
    sourceParts: [
      "content",
      "jee-main-math",
      "u2-complex-numbers-quadratic-equations",
      "topics.ts",
    ],
  },
  {
    courseSlug: "jee-main-math",
    slug: "u3-matrices-determinants",
    exportName: "jeeMatricesDeterminantsTopics",
    sourceParts: [
      "content",
      "jee-main-math",
      "u3-matrices-determinants",
      "topics.ts",
    ],
  },
];

const failures = [];
const seenContentIds = new Set();
const seenRoutes = new Set();
const seenFigures = new Set();
let itemCount = 0;
let figureCount = 0;

function readStagedSource(filePath) {
  const stageDir = mkdtempSync(join(tmpdir(), "studyloop-launch-audit-"));
  const stagedPath = join(stageDir, basename(filePath));

  try {
    copyFileSync(filePath, stagedPath);
    const expectedBytes = statSync(filePath).size;
    const stagedBytes = statSync(stagedPath).size;
    if (stagedBytes !== expectedBytes) {
      fail(
        filePath,
        `staged source size mismatch: expected ${expectedBytes}, got ${stagedBytes}`,
      );
    }
    return readFileSync(stagedPath, "utf8");
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }
}

function loadTopics(config) {
  const sourcePath = join(root, ...config.sourceParts);
  const source = readStagedSource(sourcePath);
  if (source.includes("\0")) fail(sourcePath, "contains NUL bytes");

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
    throw new Error(`Unexpected import while auditing launch readiness: ${id}`);
  };

  const runner = new Function("require", "exports", "module", output);
  runner(requireShim, mod.exports, mod);
  return mod.exports[config.exportName];
}

function itemSlug(contentId) {
  return contentId.split(".").slice(-3).join("-");
}

function fail(location, message) {
  failures.push(`${location}: ${message}`);
}

function assertNonEmpty(location, value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(location, "missing text");
  }
}

function auditText(location, value, { mathOnly = false } = {}) {
  if (typeof value !== "string") {
    fail(location, "expected string");
    return;
  }
  if (!value.trim()) {
    fail(location, "empty string");
    return;
  }

  if (value.includes("\0")) fail(location, "contains NUL byte");
  if (hasUnbalancedDollars(value)) fail(location, "unbalanced $ delimiters");
  if (/\$\s*\$/.test(value)) fail(location, "empty inline math delimiter $$");

  if (!mathOnly && hasRawLatexProseRisk(value)) {
    fail(location, "raw LaTeX mixed with prose without $...$ or \\text{}");
  }

  for (const segment of mathSegments(value, mathOnly)) {
    renderLatex(location, segment);
  }
}

function hasUnbalancedDollars(value) {
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "$" && value[index - 1] !== "\\") count += 1;
  }
  return count % 2 !== 0;
}

function hasRawLatexProseRisk(value) {
  if (value.includes("$") || value.includes("\\text{")) return false;
  if (hasLatexEnvironment(value)) return false;
  if (!looksLikeProseStem(value)) return false;
  return /\\[A-Za-z]+|\\[{}]|[A-Za-z]\s*\\(?:to|circ|cap|cup|subset|subseteq|setminus)|\|[^|]+\|/.test(
    value,
  );
}

function mathSegments(value, mathOnly) {
  if (mathOnly) return [value];

  if (value.includes("$")) {
    const segments = [];
    let current = "";
    let inMath = false;

    for (let index = 0; index < value.length; index += 1) {
      const character = value[index];
      if (character === "$" && value[index - 1] !== "\\") {
        if (inMath) segments.push(current);
        current = "";
        inMath = !inMath;
      } else {
        current += character;
      }
    }
    return segments;
  }

  if (hasLatexEnvironment(value)) return [value];
  if (value.includes("\\text{")) return splitLatexTextCommandMath(value);
  if (looksLikeLatex(value)) return [value];
  return [];
}

function hasLatexEnvironment(value) {
  return /\\begin\{(?:array|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\}/.test(
    value,
  );
}

function looksLikeProseStem(value) {
  return (
    /\s/.test(value) &&
    /\b(?:How|If|In|Let|On|For|Find|The|Then|Which|Suppose|Restricted|defined|define|number|sets?|functions?|relations?)\b/i.test(
      value,
    )
  );
}

function splitLatexTextCommandMath(value) {
  const segments = [];
  let mathBuffer = "";
  let index = 0;

  const pushMath = () => {
    const normalized = normalizeMathCommand(mathBuffer);
    mathBuffer = "";
    if (normalized) segments.push(normalized);
  };

  while (index < value.length) {
    if (value.startsWith("\\text{", index)) {
      pushMath();
      const body = readBalancedTextCommand(value, index + "\\text".length);
      if (!body) {
        mathBuffer += value[index];
        index += 1;
        continue;
      }
      index = body.endIndex;
      continue;
    }

    mathBuffer += value[index];
    index += 1;
  }

  pushMath();
  return segments;
}

function readBalancedTextCommand(value, braceIndex) {
  if (value[braceIndex] !== "{") return null;

  let depth = 0;
  for (let index = braceIndex; index < value.length; index += 1) {
    const character = value[index];
    const escaped = value[index - 1] === "\\";

    if (character === "{" && !escaped) {
      depth += 1;
      continue;
    }

    if (character === "}" && !escaped) {
      depth -= 1;
      if (depth === 0) return { endIndex: index + 1 };
    }
  }

  return null;
}

function normalizeMathCommand(value) {
  return value
    .replace(/^(?:\s*\\(?:\s|,|;|:|quad|qquad))+/, "")
    .replace(/(?:\\(?:\s|,|;|:|quad|qquad)\s*)+$/, "")
    .trim();
}

function looksLikeLatex(value) {
  return /\\(?:text|frac|dfrac|lim|begin|left|right|sqrt|infty|pi|to|sin|cos|tan|sec|csc|cot|ln|log|arcsin|arccos|arctan|cdot|quad|le|ge|ne|pm|int|sum|hline|array|displaystyle|Delta|delta|Rightarrow|mathbb|operatorname)/.test(
    value,
  );
}

function renderLatex(location, value) {
  if (!value.trim()) {
    fail(location, "empty math segment");
    return;
  }

  try {
    katex.renderToString(value, {
      displayMode: false,
      throwOnError: true,
      strict: "ignore",
      trust: false,
    });
  } catch (error) {
    fail(location, `KaTeX parse error for "${value}": ${error.message}`);
  }
}

function auditFigure(location, figure) {
  if (!figure) return;
  figureCount += 1;

  if (figure.type !== "svg")
    fail(location, `unsupported figure type ${figure.type}`);
  assertNonEmpty(`${location}.title`, figure.title);
  assertNonEmpty(`${location}.description`, figure.description);
  assertNonEmpty(`${location}.svg`, figure.svg);

  const key = `${figure.title}|${figure.svg}`;
  seenFigures.add(key);

  const svg = figure.svg ?? "";
  if (!/<svg[\s>]/.test(svg) || !/<\/svg>\s*$/.test(svg.trim())) {
    fail(location, "SVG must start with <svg> and end with </svg>");
  }
  if (/<text\b[^>]*>[^<]*<=[^<]*<\/text>/.test(svg)) {
    fail(location, "raw <= inside SVG text; use ≤ or &#8804;");
  }
  if (/&(?!#\d+;|#x[0-9a-fA-F]+;|amp;|lt;|gt;|quot;|apos;)/.test(svg)) {
    fail(location, "raw or unsupported ampersand entity in SVG");
  }

  const namedEntities = [...svg.matchAll(/&([A-Za-z][A-Za-z0-9]+);/g)].map(
    (match) => match[1],
  );
  const invalidNamedEntities = namedEntities.filter(
    (entity) => !["amp", "lt", "gt", "quot", "apos"].includes(entity),
  );
  if (invalidNamedEntities.length > 0) {
    fail(
      location,
      `invalid XML named entities: ${invalidNamedEntities.join(", ")}`,
    );
  }
}

function auditHints(location, hints) {
  if (!Array.isArray(hints) || hints.length !== 3) {
    fail(location, "hint ladder must contain exactly 3 hints");
    return;
  }

  hints.forEach((hint, index) => {
    if (hint.level !== index + 1)
      fail(`${location}[${index}]`, "hint level mismatch");
    auditText(`${location}[${index}].body`, hint.body);
  });
}

function auditWorkedSolution(location, item) {
  if (item.kind === "frq") {
    if (
      !Array.isArray(item.workedSolution) ||
      item.workedSolution.length === 0
    ) {
      fail(location, "FRQ missing workedSolution");
      return;
    }
    item.workedSolution.forEach((part, index) => {
      assertNonEmpty(`${location}.workedSolution[${index}].part`, part.part);
      auditText(
        `${location}.workedSolution[${index}].explanation`,
        part.explanation,
      );
    });
    return;
  }

  if (!Array.isArray(item.workedSolution) || item.workedSolution.length === 0) {
    fail(location, "missing workedSolution");
    return;
  }

  item.workedSolution.forEach((step, index) => {
    if (step.step !== index + 1)
      fail(`${location}.workedSolution[${index}]`, "step number mismatch");
    auditText(
      `${location}.workedSolution[${index}].explanation`,
      step.explanation,
    );
    if (step.math)
      auditText(`${location}.workedSolution[${index}].math`, step.math, {
        mathOnly: true,
      });
  });
}

function auditItem(config, topic, item) {
  itemCount += 1;
  const location = `${config.courseSlug}/${config.slug}/${item.contentId}`;

  if (seenContentIds.has(item.contentId)) fail(location, "duplicate contentId");
  seenContentIds.add(item.contentId);

  const routeKey = `${config.courseSlug}/${config.slug}/${itemSlug(item.contentId)}`;
  if (seenRoutes.has(routeKey))
    fail(location, `duplicate item route ${routeKey}`);
  seenRoutes.add(routeKey);

  if (item.course !== config.courseSlug)
    fail(location, `course mismatch ${item.course}`);
  if (item.unit !== config.slug) fail(location, `unit mismatch ${item.unit}`);
  if (item.topic !== topic.topicCode)
    fail(location, `topic mismatch ${item.topic}`);
  if (
    !Number.isInteger(item.difficulty) ||
    item.difficulty < 1 ||
    item.difficulty > 5
  ) {
    fail(location, `invalid difficulty ${item.difficulty}`);
  }
  if (typeof item.calculatorAllowed !== "boolean") {
    fail(location, "calculatorAllowed must be boolean");
  }
  if (!/^\d+\.\d+\.\d+$/.test(item.version))
    fail(location, `invalid version ${item.version}`);
  if (
    !["human_review_required", "ai_reviewed", "verified"].includes(
      item.reviewStatus,
    )
  ) {
    fail(location, `invalid reviewStatus ${item.reviewStatus}`);
  }
  if (
    !["original_ai_assisted_question", "tutor_authored", "verified"].includes(
      item.sourceType,
    )
  ) {
    fail(location, `invalid sourceType ${item.sourceType}`);
  }
  if (!Array.isArray(item.skillTags) || item.skillTags.length === 0) {
    fail(location, "missing skillTags");
  }
  if (!Array.isArray(item.commonMisconceptions)) {
    fail(location, "commonMisconceptions must be an array");
  }

  auditText(`${location}.questionLatex`, item.questionLatex);
  auditHints(`${location}.hintLadder`, item.hintLadder);
  auditWorkedSolution(location, item);
  auditFigure(`${location}.figure`, item.figure);

  if (item.kind === "mc_single") auditMc(location, item);
  else if (item.kind === "numeric") auditNumeric(location, item);
  else if (item.kind === "frq") auditFrq(location, item);
  else fail(location, `unsupported item kind ${item.kind}`);
}

function auditMc(location, item) {
  if (!Array.isArray(item.choices) || item.choices.length !== 4) {
    fail(location, "MC item must have exactly 4 choices");
    return;
  }

  const expectedLetters = LETTERS.slice(0, item.choices.length);
  const actualLetters = item.choices.map((choice) => choice.letter);
  if (actualLetters.join("") !== expectedLetters.join("")) {
    fail(location, `choice letters must be ${expectedLetters.join(",")}`);
  }

  const correctChoices = item.choices.filter((choice) => choice.isCorrect);
  if (correctChoices.length !== 1)
    fail(
      location,
      `expected exactly one correct choice, got ${correctChoices.length}`,
    );
  if (correctChoices[0]?.letter !== item.correctLetter) {
    fail(
      location,
      `correctLetter ${item.correctLetter} does not match isCorrect choice ${correctChoices[0]?.letter}`,
    );
  }

  item.choices.forEach((choice) => {
    auditText(`${location}.choice.${choice.letter}.text`, choice.text);
    if (choice.isCorrect) {
      if (choice.rationaleIfWrong !== null) {
        fail(
          `${location}.choice.${choice.letter}`,
          "correct choice should not have rationaleIfWrong",
        );
      }
      if (choice.misconceptionTag !== null) {
        fail(
          `${location}.choice.${choice.letter}`,
          "correct choice should not have misconceptionTag",
        );
      }
    } else {
      auditText(
        `${location}.choice.${choice.letter}.rationaleIfWrong`,
        choice.rationaleIfWrong,
      );
      assertNonEmpty(
        `${location}.choice.${choice.letter}.misconceptionTag`,
        choice.misconceptionTag,
      );
    }
  });
}

function auditNumeric(location, item) {
  if (!item.answer || !Number.isFinite(item.answer.value)) {
    fail(location, "numeric item must have a finite answer.value");
  }
  if (
    item.answer?.toleranceAbs !== undefined &&
    (!Number.isFinite(item.answer.toleranceAbs) || item.answer.toleranceAbs < 0)
  ) {
    fail(location, "numeric item has invalid toleranceAbs");
  }
  if (
    item.answer?.toleranceRel !== undefined &&
    (!Number.isFinite(item.answer.toleranceRel) || item.answer.toleranceRel < 0)
  ) {
    fail(location, "numeric item has invalid toleranceRel");
  }
}

function auditFrq(location, item) {
  if (!Array.isArray(item.parts) || item.parts.length === 0) {
    fail(location, "FRQ must have parts");
    return;
  }
  if (!item.rubric || !Array.isArray(item.rubric.criteria)) {
    fail(location, "FRQ missing rubric criteria");
    return;
  }

  let totalPartPoints = 0;
  item.parts.forEach((part, index) => {
    assertNonEmpty(`${location}.parts[${index}].letter`, part.letter);
    auditText(
      `${location}.parts[${index}].promptMarkdown`,
      part.promptMarkdown,
    );
    if (!Number.isFinite(part.points) || part.points <= 0) {
      fail(`${location}.parts[${index}]`, "invalid points");
    }
    totalPartPoints += part.points;
  });

  const totalCriteriaPoints = item.rubric.criteria.reduce(
    (sum, criterion) => sum + criterion.points,
    0,
  );
  if (item.rubric.maxPoints !== totalPartPoints) {
    fail(
      location,
      `rubric maxPoints ${item.rubric.maxPoints} does not equal part total ${totalPartPoints}`,
    );
  }
  if (item.rubric.maxPoints !== totalCriteriaPoints) {
    fail(
      location,
      `rubric maxPoints ${item.rubric.maxPoints} does not equal criteria total ${totalCriteriaPoints}`,
    );
  }

  item.rubric.criteria.forEach((criterion, index) => {
    assertNonEmpty(
      `${location}.rubric.criteria[${index}].part`,
      criterion.part,
    );
    auditText(
      `${location}.rubric.criteria[${index}].description`,
      criterion.description,
    );
    if (!Number.isFinite(criterion.points) || criterion.points <= 0) {
      fail(`${location}.rubric.criteria[${index}]`, "invalid points");
    }
  });

  if (!Array.isArray(item.commonErrors))
    fail(location, "FRQ commonErrors must be an array");
  item.commonErrors?.forEach((error, index) =>
    auditText(`${location}.commonErrors[${index}]`, error),
  );
}

for (const config of unitConfigs) {
  const topics = loadTopics(config);
  if (!Array.isArray(topics) || topics.length === 0) {
    fail(`${config.courseSlug}/${config.slug}`, "unit has no topics");
    continue;
  }

  for (const topic of topics) {
    assertNonEmpty(
      `${config.courseSlug}/${config.slug}.topicCode`,
      topic.topicCode,
    );
    assertNonEmpty(
      `${config.courseSlug}/${config.slug}.${topic.topicCode}.title`,
      topic.title,
    );
    if (!Array.isArray(topic.items) || topic.items.length === 0) {
      fail(
        `${config.courseSlug}/${config.slug}.${topic.topicCode}`,
        "topic has no items",
      );
      continue;
    }
    topic.items.forEach((item) => auditItem(config, topic, item));
  }
}

if (failures.length > 0) {
  console.error("Launch readiness audit failed:");
  failures.slice(0, 200).forEach((failure) => console.error(`- ${failure}`));
  if (failures.length > 200) {
    console.error(`...and ${failures.length - 200} more failures.`);
  }
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "passed",
      units: unitConfigs.length,
      items: itemCount,
      uniqueRoutes: seenRoutes.size,
      figures: figureCount,
      uniqueFigures: seenFigures.size,
    },
    null,
    2,
  ),
);
