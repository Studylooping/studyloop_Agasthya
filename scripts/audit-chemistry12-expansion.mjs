import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import katex from "katex";
import ts from "typescript";
import { loadSource } from "./lib/source-loader.mjs";

const { cbseChemistry12: course } = loadSource("content/cbse-chemistry-12");
const { solutionsTopics: originals } = loadSource(
  "content/cbse-chemistry-12/u1-solutions/topics",
);
const { chemistry12ChapterCounts } = loadSource(
  "content/cbse-chemistry-12/ncert-chapters",
);
const { QuestionStem, MixedMath, Tex } = loadSource("components/math/math");
const { getDisplayMcChoices, getDisplayLetterForOriginal } = loadSource(
  "lib/grading/choice-display",
);
const { gradeMcSingle } = loadSource("lib/grading/mc");
const unit = course.units.find((unit) => unit.slug === "u1-solutions");
const items = unit.topics.flatMap((topic) => topic.items);
const additions = items.filter((item) =>
  item.skillTags.includes("ncert_chapter_expansion"),
);
assert.equal(items.length, 250);
assert.equal(additions.length, 200);
assert.equal(originals.flatMap((topic) => topic.items).length, 50);
const all = course.units.flatMap((unit) =>
  unit.topics.flatMap((topic) => topic.items),
);
assert.equal(
  new Set(all.map((item) => item.contentId)).size,
  all.length,
  "Unique course IDs",
);
for (const original of originals.flatMap((topic) => topic.items)) {
  assert.deepEqual(
    items.find((item) => item.contentId === original.contentId),
    original,
    "Preserve original items",
  );
}
for (const file of readdirSync("content/cbse-chemistry-12/u1-solutions").filter(
  (file) => file.endsWith(".ts"),
)) {
  const path = `content/cbse-chemistry-12/u1-solutions/${file}`;
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  assert.equal(source.parseDiagnostics.length, 0, `Syntax: ${file}`);
}
let renderedFields = 0,
  mathExpressions = 0;
const textKeys = new Set([
  "questionLatex",
  "text",
  "body",
  "explanation",
  "math",
  "rationaleIfWrong",
  "promptMarkdown",
  "description",
  "commonErrors",
  "markingPoints",
]);
function walk(value, key, item) {
  if (typeof value === "string" && textKeys.has(key)) {
    assert.ok(
      !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value),
      `${item.contentId}: control byte`,
    );
    assert.equal(
      (value.match(/(?<!\\)\$/g) || []).length % 2,
      0,
      `${item.contentId}: delimiter`,
    );
    assert.ok(!/\$\s*\$/.test(value), `${item.contentId}: adjacent math spans`);
    const expressions =
      key === "math"
        ? [value]
        : [...value.matchAll(/(?<!\\)\$([^$]+)(?<!\\)\$/g)].map(
            (match) => match[1],
          );
    for (const expression of expressions) {
      katex.renderToString(expression, { throwOnError: true, strict: "error" });
      mathExpressions++;
    }
    const Component =
      key === "math" ? Tex : key === "questionLatex" ? QuestionStem : MixedMath;
    const html = renderToStaticMarkup(
      React.createElement(
        Component,
        key === "math" ? { tex: value } : { text: value },
      ),
    );
    assert.ok(
      !/katex-error|\[math error\]/.test(html),
      `${item.contentId}: rendered error`,
    );
    renderedFields++;
  } else if (Array.isArray(value))
    value.forEach((value) => walk(value, key, item));
  else if (value && typeof value === "object")
    Object.entries(value).forEach(([key, value]) => walk(value, key, item));
}
const stems = new Set();
for (const item of items) {
  const stem = item.questionLatex.toLowerCase().replace(/\s+/g, " ").trim();
  assert.ok(!stems.has(stem), `Repeated stem: ${item.contentId}`);
  stems.add(stem);
  walk(item, "", item);
  if (item.kind === "mc_single") {
    assert.equal(item.choices.length, 4);
    assert.equal(new Set(item.choices.map((choice) => choice.text)).size, 4);
    assert.equal(item.choices.filter((choice) => choice.isCorrect).length, 1);
    assert.equal(
      item.correctLetter,
      item.choices.find((choice) => choice.isCorrect).letter,
    );
    for (const { choice, displayLetter } of getDisplayMcChoices(item)) {
      assert.equal(
        gradeMcSingle(item, choice.letter).isCorrect,
        choice.isCorrect,
      );
      assert.equal(
        getDisplayLetterForOriginal(item, choice.letter),
        displayLetter,
      );
      if (!choice.isCorrect) assert.ok(choice.rationaleIfWrong?.trim());
    }
  } else {
    assert.equal(
      item.rubric.maxPoints,
      item.parts.reduce((sum, part) => sum + part.points, 0),
    );
    assert.equal(
      item.rubric.maxPoints,
      item.rubric.criteria.reduce((sum, c) => sum + c.points, 0),
    );
    for (const part of item.parts) {
      assert.equal(
        part.points,
        item.rubric.criteria
          .filter((c) => c.part === part.letter)
          .reduce((sum, c) => sum + c.points, 0),
      );
      assert.ok(item.workedSolution.find((s) => s.part === part.letter));
    }
  }
}
for (const topic of unit.topics) {
  assert.equal(topic.items.length, 50);
  const added = topic.items.filter((item) =>
    item.skillTags.includes("ncert_chapter_expansion"),
  );
  assert.equal(added.length, 40);
  const distribution = { mc: 0, vsaq: 0, saq: 0, laq: 0, case: 0 },
    keys = { A: 0, B: 0, C: 0, D: 0 };
  for (const item of added) {
    assert.equal(item.reviewStatus, "ai_reviewed");
    assert.ok(!item.verifiedBy);
    assert.equal(item.version, "0.2.0");
    assert.equal(item.topic, topic.topicCode);
    assert.equal(item.unit, unit.slug);
    assert.equal(item.calculatorAllowed, false);
    assert.equal(item.hintLadder.length, 3);
    assert.ok(item.hintLadder.every((h) => h.body.trim()));
    const kind = item.responseType ?? "mc";
    distribution[kind]++;
    if (kind === "mc") keys[item.correctLetter]++;
    else {
      assert.equal(
        item.rubric.maxPoints,
        { vsaq: 2, saq: 3, laq: 5, case: 4 }[kind],
      );
      for (const part of item.parts)
        assert.equal(
          item.workedSolution.find((s) => s.part === part.letter).markingPoints
            .length,
          part.points,
        );
    }
  }
  assert.deepEqual(distribution, { mc: 20, vsaq: 4, saq: 8, laq: 4, case: 4 });
  assert.deepEqual(keys, { A: 5, B: 5, C: 5, D: 5 });
}

// Recompute selected numeric keys independently of the authored solutions.
function numericAnswer(topic, number) {
  const item = items.find(
    (i) => i.contentId === `cbse-chemistry-12.u1.t1-${topic}.mc.${number}`,
  );
  assert.ok(item);
  const text = item.choices.find((c) => c.isCorrect).text;
  const match = text.match(/^\$([\d.]+)(?:\/([\d.]+))?/);
  assert.ok(match, `Not a simple numeric choice: ${item.contentId}`);
  return Number(match[1]) / (match[2] ? Number(match[2]) : 1);
}
const references = [
  [1, 101, (1200 * 0.2) / 180],
  [1, 102, (0.52 * 200) / 208],
  [1, 103, 2 / (2 + 1000 / 18)],
  [1, 104, (0.2 + 0.6) / 2],
  [1, 106, 24 / 0.05 - 300],
  [1, 107, 6 / 2],
  [1, 108, 0.1 / (0.9 * 0.018)],
  [1, 109, (((0.8 * 25) / 100) * 20) / 200],
  [1, 110, (0.05 + 0.025) / 0.15],
  [1, 112, 0.12 * 250],
  [1, 113, (100 * 100) / 1100],
  [1, 114, 1.1 / 1],
  [1, 117, 1 / 40 / (1 / 40 + 1 / 80)],
  [1, 118, 0.04 * 75],
  [1, 119, (1.2 * 100) / 0.1 / 1000],
  [1, 120, (0.4 * 0.4) / 0.5],
  [2, 101, (54 - 30) / (90 - 30)],
  [2, 102, 1 / 2],
  [2, 104, (0.5 * 120) / (0.5 * 120 + 0.5 * 40)],
  [2, 106, 30 * 2.5],
  [2, 107, 50 - 20],
  [2, 112, 100 / (60 + 100)],
  [2, 113, 40 + 30 * 0.2],
  [2, 117, 0.6 / 0.4 / (0.4 / 0.6)],
  [2, 118, 0.94 * 50],
  [2, 120, 160 / 4 + (80 * 3) / 4],
  [3, 101, 180 / 60],
  [3, 102, (0.13 / 0.52) * 1.86],
  [3, 103, (0.1 * 9) / 0.9],
  [3, 106, 80 + 2 * 0.15],
  [3, 107, 5.5 - 1.2],
  [3, 108, 2 / (0.25 * 0.08)],
  [3, 109, 0.5 / 0.2],
  [3, 110, 0.6 * 2],
  [3, 112, 1.25 / (0.1 / 0.4)],
  [3, 115, 1 / (0.8 / 80)],
  [3, 117, (0.03 / (0.279 / 1.86)) * 1000],
  [3, 119, (1 - 0.98) * 75],
  [3, 120, (0.2 * 2) / 3],
  [4, 101, 330 / 300],
  [4, 104, 0.02 / 0.01],
  [4, 107, (0.03 * 300) / 360],
  [4, 108, (0.8 * 100) / 400],
  [4, 113, (0.005 / 0.5) * 0.082 * 300],
  [4, 115, 3 - 1.2],
  [4, 117, 0.03 / 3],
  [4, 119, 5 / 2],
  [4, 120, (0.6 * 350) / 300 / 2],
  [5, 101, 1 - 0.6 / 2],
  [5, 102, (2.5 - 1) / 3],
  [5, 103, 150 / 1.5],
  [5, 105, 2 + 3],
  [5, 106, 1.8 / 1.4 / 2],
  [5, 110, 1 / 3],
  [5, 112, 0.02 - 0.012 + 3 * 0.012],
  [5, 113, 1.86 * (0.1 + 2 * 0.05)],
  [5, 115, 1 + (2 - 1) / 0.5],
  [5, 116, 1 / 1.2],
  [5, 117, 2 / 3],
  [5, 118, 0.12 / 3],
  [5, 120, 1 - 2 * 0.2 + 0.2],
];
for (const [topic, number, value] of references)
  assert.ok(
    Math.abs(numericAnswer(topic, number) - value) < 1e-9,
    `Numeric key: ${topic}/${number}`,
  );
function solution(topic, kind, number) {
  return items
    .find(
      (i) =>
        i.contentId === `cbse-chemistry-12.u1.t1-${topic}.${kind}.${number}`,
    )
    .workedSolution.map((s) => s.explanation)
    .join(" ");
}
assert.ok(solution(5, "laq", 115).includes("2.0"));
assert.equal((3 * 2) / 100 + 4 / 50, 0.14);
assert.ok(Math.abs((0.248 / 1.86) * 0.5 - 1 / 15) < 1e-12);
assert.ok(solution(5, "laq", 117).includes("2/3"));
assert.ok(solution(3, "laq", 115).includes("1.0"));
assert.ok(Math.abs(((1 / 60 + 3 / 180) / 0.1) * 1.86 - 0.62) < 1e-12);
const chapters = chemistry12ChapterCounts(course);
assert.equal(chapters.length, 10);
assert.equal(chapters[0].count, 250);
console.table(
  chapters.map(({ number, title, count, meetsMinimum }) => ({
    number,
    title,
    count,
    meetsMinimum,
  })),
);
if (process.argv.includes("--require-all-chapters"))
  assert.ok(
    chapters.every((c) => c.meetsMinimum),
    "Other chapters remain below the 90-question target; Solutions-first scope only.",
  );
console.log(
  JSON.stringify(
    {
      status: "passed",
      chapterQuestions: items.length,
      newQuestions: additions.length,
      renderedFields,
      mathExpressions,
      numericKeyChecks: references.length,
      difficulty: additions.reduce(
        (a, i) => ((a[i.difficulty] = (a[i.difficulty] ?? 0) + 1), a),
        {},
      ),
    },
    null,
    2,
  ),
);
