import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const unitConfigs = {
  "u1-limits": {
    exportName: "limitTopics",
    packageName: "ap-calc-ab-u1-limits",
    sourceParts: ["content", "calc-ab", "u1-limits", "topics.ts"],
    title: "Unit 1 - Limits and Continuity",
    alignment: "AP Calculus AB Unit 1",
  },
  "u2-differentiation": {
    exportName: "differentiationTopics",
    packageName: "ap-calc-ab-u2-differentiation",
    sourceParts: ["content", "calc-ab", "u2-differentiation", "topics.ts"],
    title: "Unit 2 - Differentiation: Definition and Properties",
    alignment: "AP Calculus AB Unit 2",
  },
  "u3-comp-implicit": {
    exportName: "compositeImplicitTopics",
    packageName: "ap-calc-ab-u3-composite-implicit-inverse",
    sourceParts: ["content", "calc-ab", "u3-comp-implicit", "topics.ts"],
    title: "Unit 3 - Differentiation: Composite, Implicit, and Inverse Functions",
    alignment: "AP Calculus AB Unit 3",
  },
  "u4-contextual-app": {
    exportName: "contextualApplicationTopics",
    packageName: "ap-calc-ab-u4-contextual-applications",
    sourceParts: ["content", "calc-ab", "u4-contextual-app", "topics.ts"],
    title: "Unit 4 - Contextual Applications of Differentiation",
    alignment: "AP Calculus AB Unit 4",
  },
  "u5-analytical-app": {
    exportName: "analyticalApplicationTopics",
    packageName: "ap-calc-ab-u5-analytical-applications",
    sourceParts: ["content", "calc-ab", "u5-analytical-app", "topics.ts"],
    title: "Unit 5 - Analytical Applications of Differentiation",
    alignment: "AP Calculus AB Unit 5",
  },
  "u6-integration": {
    exportName: "integrationTopics",
    packageName: "ap-calc-ab-u6-integration-accumulation",
    sourceParts: ["content", "calc-ab", "u6-integration", "topics.ts"],
    title: "Unit 6 - Integration and Accumulation of Change",
    alignment: "AP Calculus AB Unit 6",
  },
  "u7-diff-eqs": {
    exportName: "differentialEquationTopics",
    packageName: "ap-calc-ab-u7-differential-equations",
    sourceParts: ["content", "calc-ab", "u7-diff-eqs", "topics.ts"],
    title: "Unit 7 - Differential Equations",
    alignment: "AP Calculus AB Unit 7",
  },
  "u8-app-integration": {
    courseSlug: "calc-ab",
    courseTitle: "AP Calculus AB",
    exportName: "applicationIntegrationTopics",
    packageName: "ap-calc-ab-u8-applications-of-integration",
    sourceParts: ["content", "calc-ab", "u8-app-integration", "topics.ts"],
    title: "Unit 8 - Applications of Integration",
    alignment: "AP Calculus AB Unit 8",
  },
  "u1-relations-functions": {
    courseSlug: "cbse-math-12",
    courseTitle: "CBSE Class 12 Mathematics",
    exportName: "relationsFunctionsTopics",
    packageName: "cbse-class-12-math-u1-relations-functions",
    sourceParts: ["content", "cbse-math-12", "u1-relations-functions", "topics.ts"],
    title: "Unit I - Relations and Functions",
    alignment: "CBSE Class XII Mathematics Unit I",
  },
  "u2-algebra": {
    courseSlug: "cbse-math-12",
    courseTitle: "CBSE Class 12 Mathematics",
    exportName: "algebraTopics",
    packageName: "cbse-class-12-math-u2-algebra",
    sourceParts: ["content", "cbse-math-12", "u2-algebra", "topics.ts"],
    title: "Unit II - Algebra",
    alignment: "CBSE Class XII Mathematics Unit II",
  },
  "u3-calculus": {
    courseSlug: "cbse-math-12",
    courseTitle: "CBSE Class 12 Mathematics",
    exportName: "calculusTopics",
    packageName: "cbse-class-12-math-u3-calculus",
    sourceParts: ["content", "cbse-math-12", "u3-calculus", "topics.ts"],
    title: "Unit III - Calculus",
    alignment: "CBSE Class XII Mathematics Unit III",
  },
  "u4-vectors-3d": {
    courseSlug: "cbse-math-12",
    courseTitle: "CBSE Class 12 Mathematics",
    exportName: "vectors3dTopics",
    packageName: "cbse-class-12-math-u4-vectors-3d",
    sourceParts: ["content", "cbse-math-12", "u4-vectors-3d", "topics.ts"],
    title: "Unit IV - Vectors and Three-Dimensional Geometry",
    alignment: "CBSE Class XII Mathematics Unit IV",
  },
  "u5-linear-programming": {
    courseSlug: "cbse-math-12",
    courseTitle: "CBSE Class 12 Mathematics",
    exportName: "linearProgrammingTopics",
    packageName: "cbse-class-12-math-u5-linear-programming",
    sourceParts: ["content", "cbse-math-12", "u5-linear-programming", "topics.ts"],
    title: "Unit V - Linear Programming",
    alignment: "CBSE Class XII Mathematics Unit V",
  },
  "u6-probability": {
    courseSlug: "cbse-math-12",
    courseTitle: "CBSE Class 12 Mathematics",
    exportName: "probabilityTopics",
    packageName: "cbse-class-12-math-u6-probability",
    sourceParts: ["content", "cbse-math-12", "u6-probability", "topics.ts"],
    title: "Unit VI - Probability",
    alignment: "CBSE Class XII Mathematics Unit VI",
  },
  "u1-sets-functions": {
    courseSlug: "cbse-math-11",
    courseTitle: "CBSE Class 11 Mathematics",
    exportName: "setsFunctionsTopics",
    packageName: "cbse-class-11-math-u1-sets-functions",
    sourceParts: ["content", "cbse-math-11", "u1-sets-functions", "topics.ts"],
    title: "Unit I - Sets and Functions",
    alignment: "CBSE Class XI Mathematics Unit I",
  },
  "u2-algebra-xi": {
    courseSlug: "cbse-math-11",
    courseTitle: "CBSE Class 11 Mathematics",
    exportName: "algebraXiTopics",
    packageName: "cbse-class-11-math-u2-algebra",
    sourceParts: ["content", "cbse-math-11", "u2-algebra-xi", "topics.ts"],
    title: "Unit II - Algebra",
    alignment: "CBSE Class XI Mathematics Unit II",
  },
  "u3-coordinate-geometry": {
    courseSlug: "cbse-math-11",
    courseTitle: "CBSE Class 11 Mathematics",
    exportName: "coordinateGeometryTopics",
    packageName: "cbse-class-11-math-u3-coordinate-geometry",
    sourceParts: ["content", "cbse-math-11", "u3-coordinate-geometry", "topics.ts"],
    title: "Unit III - Coordinate Geometry",
    alignment: "CBSE Class XI Mathematics Unit III",
  },
  "u4-calculus-xi": {
    courseSlug: "cbse-math-11",
    courseTitle: "CBSE Class 11 Mathematics",
    exportName: "calculusXiTopics",
    packageName: "cbse-class-11-math-u4-calculus",
    sourceParts: ["content", "cbse-math-11", "u4-calculus-xi", "topics.ts"],
    title: "Unit IV - Calculus",
    alignment: "CBSE Class XI Mathematics Unit IV",
  },
  "u5-statistics-probability": {
    courseSlug: "cbse-math-11",
    courseTitle: "CBSE Class 11 Mathematics",
    exportName: "statisticsProbabilityTopics",
    packageName: "cbse-class-11-math-u5-statistics-probability",
    sourceParts: ["content", "cbse-math-11", "u5-statistics-probability", "topics.ts"],
    title: "Unit V - Statistics and Probability",
    alignment: "CBSE Class XI Mathematics Unit V",
  },
  "u1-sets-relations-functions": {
    courseSlug: "jee-main-math",
    courseTitle: "JEE Main Mathematics",
    exportName: "jeeSetsRelationsFunctionsTopics",
    packageName: "jee-main-math-u1-sets-relations-functions",
    sourceParts: ["content", "jee-main-math", "u1-sets-relations-functions", "topics.ts"],
    title: "Unit 1 - Sets, Relations and Functions",
    alignment: "NTA JEE Main Paper 1 Mathematics Unit 1",
  },
  "u2-complex-numbers-quadratic-equations": {
    courseSlug: "jee-main-math",
    courseTitle: "JEE Main Mathematics",
    exportName: "jeeComplexQuadraticTopics",
    packageName: "jee-main-math-u2-complex-numbers-quadratic-equations",
    sourceParts: ["content", "jee-main-math", "u2-complex-numbers-quadratic-equations", "topics.ts"],
    title: "Unit 2 - Complex Numbers and Quadratic Equations",
    alignment: "NTA JEE Main Paper 1 Mathematics Unit 2",
  },
  "u3-matrices-determinants": {
    courseSlug: "jee-main-math",
    courseTitle: "JEE Main Mathematics",
    exportName: "jeeMatricesDeterminantsTopics",
    packageName: "jee-main-math-u3-matrices-determinants",
    sourceParts: ["content", "jee-main-math", "u3-matrices-determinants", "topics.ts"],
    title: "Unit 3 - Matrices and Determinants",
    alignment: "NTA JEE Main Paper 1 Mathematics Unit 3",
  },
};

const difficultyLabels = {
  1: "Foundational",
  2: "Routine exam skill",
  3: "Standard multi-step",
  4: "Hard exam skill",
  5: "Challenge",
};

const unitSlug = process.argv.slice(2).find((arg) => arg !== "--") ?? "u1-limits";
const unitConfig = unitConfigs[unitSlug];

if (!unitConfig) {
  const valid = Object.keys(unitConfigs).join(", ");
  throw new Error(`Unknown unit "${unitSlug}". Expected one of: ${valid}`);
}

const packageDir = join(root, "review-packages", unitConfig.packageName);
const topicsDir = join(packageDir, "topics");
const sourcePath = join(root, ...unitConfig.sourceParts);

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

function loadTopics() {
  const source = readStagedSource(sourcePath);
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
    throw new Error(`Unexpected import while exporting review package: ${id}`);
  };

  const runner = new Function("require", "exports", "module", output);
  runner(requireShim, mod.exports, mod);
  return mod.exports[unitConfig.exportName];
}

function itemSlug(contentId) {
  return contentId.split(".").slice(-3).join("-");
}

function topicFileName(topicCode) {
  return `topic-${topicCode.replace(".", "-")}.md`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function mdList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function mdNumbered(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function difficultyLabel(value) {
  return `${value}/5 (${difficultyLabels[value] ?? "Unlabeled"})`;
}

function itemUrl(item) {
  return `/${unitConfig.courseSlug ?? "calc-ab"}/${unitSlug}/${itemSlug(item.contentId)}`;
}

function mathBlock(latex) {
  return ["```latex", latex, "```"].join("\n");
}

function figureMarkdown(item) {
  if (!item.figure) return "";

  return [
    "**Figure**",
    "",
    `- Title: ${item.figure.title}`,
    `- Description: ${item.figure.description}`,
    "",
    "```html",
    item.figure.svg,
    "```",
    "",
  ].join("\n");
}

function solutionSteps(steps) {
  return steps
    .map((step) => {
      const lines = [`${step.step}. ${step.explanation}`];
      if (step.math) lines.push(`   Math: ${step.math}`);
      return lines.join("\n");
    })
    .join("\n");
}

function mcMarkdown(item) {
  const wrongChoices = item.choices.filter((choice) => !choice.isCorrect);
  return [
    `### ${itemSlug(item.contentId)} - MCQ`,
    "",
    `- Item ID: \`${item.contentId}\``,
    `- Website path: \`${itemUrl(item)}\``,
    `- Difficulty: ${difficultyLabel(item.difficulty)}`,
    `- Calculator allowed: ${item.calculatorAllowed ? "Yes" : "No"}`,
    `- Skill tags: ${item.skillTags.join(", ")}`,
    `- Common misconceptions: ${item.commonMisconceptions.join(", ")}`,
    "",
    "**Question**",
    "",
    mathBlock(item.questionLatex),
    "",
    figureMarkdown(item),
    "**Choices**",
    "",
    ...item.choices.map((choice) => `- ${choice.letter}. ${choice.text}`),
    "",
    `**Correct answer:** ${item.correctLetter}`,
    "",
    "**Hints**",
    "",
    mdNumbered(item.hintLadder.map((hint) => hint.body)),
    "",
    "**Wrong-answer rationales**",
    "",
    ...wrongChoices.map(
      (choice) =>
        `- ${choice.letter}. ${choice.rationaleIfWrong ?? "No rationale supplied."}`,
    ),
    "",
    "**Worked solution**",
    "",
    solutionSteps(item.workedSolution),
    "",
    "**Reviewer checks**",
    "",
    "- [ ] Mathematical answer is correct",
    "- [ ] Wording is clear and age-appropriate",
    "- [ ] No ambiguity in answer choices",
    "- [ ] Difficulty rating is reasonable",
    "- [ ] Hints guide without giving away too much",
    "- [ ] Worked solution is complete",
    "",
    "Reviewer notes:",
    "",
    "---",
    "",
  ].join("\n");
}

function constructedTypeLabel(item) {
  if (item.responseType === "vsaq") return "VSAQ";
  if (item.responseType === "saq") return "SAQ";
  if (item.responseType === "laq") return "LAQ";
  if (item.responseType === "case") return "Case Study";
  return "FRQ";
}

function usesMarks(item) {
  return Boolean(item.responseType && item.responseType !== "frq");
}

function scoreUnit(item, count) {
  const base = usesMarks(item) ? "mark" : "point";
  return `${count} ${count === 1 ? base : `${base}s`}`;
}

function frqMarkdown(item) {
  const typeLabel = constructedTypeLabel(item);
  return [
    `### ${itemSlug(item.contentId)} - ${typeLabel}`,
    "",
    `- Item ID: \`${item.contentId}\``,
    `- Website path: \`${itemUrl(item)}\``,
    `- Difficulty: ${difficultyLabel(item.difficulty)}`,
    `- Calculator allowed: ${item.calculatorAllowed ? "Yes" : "No"}`,
    `- Total: ${scoreUnit(item, item.rubric.maxPoints)}`,
    `- Skill tags: ${item.skillTags.join(", ")}`,
    `- Common misconceptions: ${item.commonMisconceptions.join(", ")}`,
    "",
    "**Prompt stem**",
    "",
    mathBlock(item.questionLatex),
    "",
    figureMarkdown(item),
    "**Parts**",
    "",
    ...item.parts.map(
      (part) =>
        `- (${part.letter}) ${part.promptMarkdown} (${scoreUnit(item, part.points)})`,
    ),
    "",
    "**Hints**",
    "",
    mdNumbered(item.hintLadder.map((hint) => hint.body)),
    "",
    `**Rubric (${scoreUnit(item, item.rubric.maxPoints)})**`,
    "",
    ...item.rubric.criteria.map(
      (criterion, index) =>
        `${index + 1}. Part (${criterion.part}), ${scoreUnit(item, criterion.points)}: ${criterion.description}`,
    ),
    "",
    "**Common errors**",
    "",
    mdList(item.commonErrors),
    "",
    "**Model solution**",
    "",
    ...item.workedSolution.map(
      (part) => `- Part (${part.part}): ${part.explanation}`,
    ),
    "",
    "**Reviewer checks**",
    "",
    "- [ ] Mathematical answer is correct",
    `- [ ] Rubric awards ${usesMarks(item) ? "marks" : "points"} fairly`,
    `- [ ] Prompt is clear and aligned with ${unitConfig.alignment}`,
    "- [ ] Difficulty rating is reasonable",
    "- [ ] Model solution is complete",
    "- [ ] Common errors are useful",
    "",
    "Reviewer notes:",
    "",
    "---",
    "",
  ].join("\n");
}

function numericMarkdown(item) {
  return [
    `### ${itemSlug(item.contentId)} - Numerical Value`,
    "",
    `- Item ID: \`${item.contentId}\``,
    `- Website path: \`${itemUrl(item)}\``,
    `- Difficulty: ${difficultyLabel(item.difficulty)}`,
    `- Calculator allowed: ${item.calculatorAllowed ? "Yes" : "No"}`,
    `- Skill tags: ${item.skillTags.join(", ")}`,
    `- Common misconceptions: ${item.commonMisconceptions.join(", ")}`,
    "",
    "**Question**",
    "",
    mathBlock(item.questionLatex),
    "",
    figureMarkdown(item),
    `**Correct numerical value:** ${item.answer.value}${item.answer.unit ? ` ${item.answer.unit}` : ""}`,
    "",
    "**Hints**",
    "",
    mdNumbered(item.hintLadder.map((hint) => hint.body)),
    "",
    "**Worked solution**",
    "",
    solutionSteps(item.workedSolution),
    "",
    "**Reviewer checks**",
    "",
    "- [ ] Mathematical answer is correct",
    `- [ ] Prompt is clear and aligned with ${unitConfig.alignment}`,
    "- [ ] Difficulty rating is reasonable",
    "- [ ] Hints guide without giving away too much",
    "- [ ] Worked solution is complete",
    "",
    "Reviewer notes:",
    "",
    "---",
    "",
  ].join("\n");
}

function itemTypeLabel(item) {
  if (item.kind === "mc_single") return "MCQ";
  if (item.kind === "numeric") return "Numerical Value";
  return constructedTypeLabel(item);
}

function itemAnswerLabel(item) {
  if (item.kind === "mc_single") return item.correctLetter;
  if (item.kind === "numeric") return item.answer.value;
  return scoreUnit(item, item.rubric.maxPoints);
}

function packageReadme(topics, totalMc, totalFrq, totalNumeric) {
  const allItems = topics.flatMap((topic) => topic.items);
  const vsaqCount = allItems.filter((item) => item.responseType === "vsaq").length;
  const saqCount = allItems.filter((item) => item.responseType === "saq").length;
  const laqCount = allItems.filter((item) => item.responseType === "laq").length;
  const caseCount = allItems.filter((item) => item.responseType === "case").length;
  const openAnswerBreakdown =
    vsaqCount + saqCount + laqCount + caseCount > 0
      ? [
          `- VSAQs: ${vsaqCount}`,
          `- SAQs: ${saqCount}`,
          `- LAQs: ${laqCount}`,
          ...(caseCount > 0 ? [`- Case-study items: ${caseCount}`] : []),
        ]
      : [`- Free-response questions: ${totalFrq}`];

  return [
    "# StudyLoop Reviewer Package",
    "",
    `Course: ${unitConfig.courseTitle ?? "AP Calculus AB"}`,
    `Unit: ${unitConfig.title}`,
    `Generated from: \`${sourcePath.replace(root + "\\", "")}\``,
    "",
    "## Contents",
    "",
    `- Topics: ${topics.length}`,
    `- Multiple-choice questions: ${totalMc}`,
    `- Numerical-value questions: ${totalNumeric}`,
    `- Open-answer items: ${totalFrq}`,
    ...openAnswerBreakdown,
    `- Total items: ${totalMc + totalNumeric + totalFrq}`,
    "",
    "## Files",
    "",
    "- `TOPIC_INDEX.md` - topic-by-topic checklist and file links",
    "- `REVIEW_CHECKLIST.csv` - spreadsheet-friendly review tracker",
    "- `topics/topic-*.md` - full questions, answers, hints, rationales, rubrics, and solutions",
    "",
    "## Reviewer Instructions",
    "",
    "Please check each item for:",
    "",
    "- Mathematical correctness",
    `- Alignment with ${unitConfig.alignment}`,
    "- Clear wording and no answer ambiguity",
    "- Reasonable difficulty rating",
    "- Correct calculator flag",
    "- Helpful hints that do not reveal the answer too early",
    "- Complete worked solution or open-answer rubric",
    "",
    "Difficulty scale used in this package:",
    "",
    "- `1/5` - foundational recall or early setup",
    "- `2/5` - routine exam skill",
    "- `3/5` - standard multi-step or trap-aware item",
    "- `4/5` - hard exam skill or multi-step synthesis",
    "- `5/5` - challenge item beyond normal exam pressure",
    "",
    "For each item, use `REVIEW_CHECKLIST.csv` to mark one of:",
    "",
    "- `verified` - ready to publish",
    "- `minor_edit` - usable after a small wording/math edit",
    "- `major_edit` - needs rewriting",
    "- `reject` - remove from the bank",
    "",
    "If reviewing against the local website, run StudyLoop and prefix each website path with:",
    "",
    "```text",
    "http://localhost:3000",
    "```",
    "",
    "Example:",
    "",
    "```text",
    `http://localhost:3000${itemUrl(topics[0].items[0])}`,
    "```",
    "",
    "Do not enter student data in this package. It is only for content review.",
    "",
  ].join("\n");
}

function topicIndex(topics) {
  const lines = [
    "# Topic Index",
    "",
    "| Topic | Title | MCQs | Numerical | Open Answer | File |",
    "|---|---|---:|---:|---:|---|",
  ];

  for (const topic of topics) {
    const mc = topic.items.filter((item) => item.kind === "mc_single").length;
    const numeric = topic.items.filter((item) => item.kind === "numeric").length;
    const frq = topic.items.filter((item) => item.kind === "frq").length;
    lines.push(
      `| ${topic.topicCode} | ${topic.title} | ${mc} | ${numeric} | ${frq} | topics/${topicFileName(topic.topicCode)} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

function topicMarkdown(topic) {
  const sections = [
    `# Topic ${topic.topicCode}: ${topic.title}`,
    "",
    topic.subtopic,
    "",
    "## Items",
    "",
  ];

  for (const item of topic.items) {
    sections.push(
      item.kind === "mc_single"
        ? mcMarkdown(item)
        : item.kind === "numeric"
          ? numericMarkdown(item)
          : frqMarkdown(item),
    );
  }

  return sections.join("\n");
}

function checklistRows(topics) {
  const rows = [
    [
      "topic_code",
      "topic_title",
      "item_id",
      "item_type",
      "website_path",
      "difficulty",
      "calculator_allowed",
      "answer_or_marks_or_points",
      "review_decision",
      "math_correct",
      "wording_clear",
      "difficulty_ok",
      "calculator_ok",
      "reviewer_notes",
    ],
  ];

  for (const topic of topics) {
    for (const item of topic.items) {
      rows.push([
        topic.topicCode,
        topic.title,
        item.contentId,
        itemTypeLabel(item),
        itemUrl(item),
        item.difficulty,
        item.calculatorAllowed ? "yes" : "no",
        itemAnswerLabel(item),
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    }
  }

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

function allQuestionsMarkdown(topics) {
  return [
    "# All Questions",
    "",
    "This file is a single combined copy of every topic file.",
    "",
    ...topics.map(topicMarkdown),
  ].join("\n");
}

const topics = loadTopics();
const totalMc = topics.flatMap((topic) => topic.items).filter((item) => item.kind === "mc_single").length;
const totalNumeric = topics.flatMap((topic) => topic.items).filter((item) => item.kind === "numeric").length;
const totalFrq = topics.flatMap((topic) => topic.items).filter((item) => item.kind === "frq").length;

if (existsSync(packageDir)) rmSync(packageDir, { recursive: true, force: true });
mkdirSync(topicsDir, { recursive: true });

writeFileSync(join(packageDir, "README.md"), packageReadme(topics, totalMc, totalFrq, totalNumeric));
writeFileSync(join(packageDir, "TOPIC_INDEX.md"), topicIndex(topics));
writeFileSync(join(packageDir, "REVIEW_CHECKLIST.csv"), checklistRows(topics));
writeFileSync(join(packageDir, "ALL_QUESTIONS.md"), allQuestionsMarkdown(topics));

for (const topic of topics) {
  writeFileSync(join(topicsDir, topicFileName(topic.topicCode)), topicMarkdown(topic));
}

console.log(`Reviewer package written to ${packageDir}`);
const vsaqCount = topics.flatMap((topic) => topic.items).filter((item) => item.responseType === "vsaq").length;
const saqCount = topics.flatMap((topic) => topic.items).filter((item) => item.responseType === "saq").length;
const laqCount = topics.flatMap((topic) => topic.items).filter((item) => item.responseType === "laq").length;
const caseCount = topics.flatMap((topic) => topic.items).filter((item) => item.responseType === "case").length;
if (vsaqCount + saqCount + laqCount + caseCount > 0) {
  console.log(`${topics.length} topics, ${totalMc} MCQs, ${totalNumeric} numerical-value questions, ${vsaqCount} VSAQs, ${saqCount} SAQs, ${laqCount} LAQs, ${caseCount} case-study items`);
} else {
  console.log(`${topics.length} topics, ${totalMc} MCQs, ${totalNumeric} numerical-value questions, ${totalFrq} FRQs`);
}
