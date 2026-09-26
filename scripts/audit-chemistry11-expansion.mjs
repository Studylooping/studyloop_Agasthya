import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import katex from "katex";
import ts from "typescript";
import { loadSource } from "./lib/source-loader.mjs";

const { cbseChemistry11: course } = loadSource("content/cbse-chemistry-11");
const { chemistry11ChapterCounts, chemistry11Chapters } = loadSource(
  "content/cbse-chemistry-11/ncert-chapters",
);
const { someBasicConceptsTopics: originals } = loadSource(
  "content/cbse-chemistry-11/u1-some-basic-concepts/topics",
);
const { QuestionStem, MixedMath, Tex } = loadSource("components/math/math");
const { getDisplayMcChoices, getDisplayLetterForOriginal } = loadSource(
  "lib/grading/choice-display",
);
const { gradeMcSingle } = loadSource("lib/grading/mc");
const folder = "content/cbse-chemistry-11/u1-some-basic-concepts";
for (const file of readdirSync(folder).filter((file) => file.endsWith(".ts"))) {
  const path = `${folder}/${file}`;
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  assert.equal(source.parseDiagnostics.length, 0, `Source syntax: ${file}`);
}

const chapters = chemistry11ChapterCounts(course);
assert.equal(chapters.length, 9);
assert.equal(
  new Set(chemistry11Chapters.map((chapter) => chapter.unit)).size,
  9,
);
for (const chapter of chapters) {
  assert.ok(
    course.units.some((unit) => unit.slug === chapter.unit),
    chapter.title,
  );
  assert.ok(chapter.count >= 90, `Below the chapter floor: ${chapter.title}`);
}
const unit = course.units.find(
  (unit) => unit.slug === "u1-some-basic-concepts",
);
assert.equal(unit.topics.length, 5);
const items = unit.topics.flatMap((topic) => topic.items);
const additions = items.filter((item) =>
  item.skillTags.includes("ncert_chapter_expansion"),
);
assert.equal(items.length, 300);
assert.equal(additions.length, 200);
assert.equal(originals.flatMap((topic) => topic.items).length, 100);
const allIds = new Set();
for (const item of course.units.flatMap((unit) =>
  unit.topics.flatMap((topic) => topic.items),
)) {
  assert.ok(
    !allIds.has(item.contentId),
    `Duplicate course ID: ${item.contentId}`,
  );
  allIds.add(item.contentId);
}
for (const item of originals.flatMap((topic) => topic.items)) {
  assert.ok(
    items.some((candidate) => candidate.contentId === item.contentId),
    `Lost original: ${item.contentId}`,
  );
}

let mathExpressions = 0;
let renderedFields = 0;
const renderCache = new Map();
function inspectText(value, location, item) {
  assert.ok(
    !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value),
    `Control character: ${item.contentId}`,
  );
  assert.equal(
    (value.match(/(?<!\\)\$/g) ?? []).length % 2,
    0,
    `Math delimiters: ${item.contentId}`,
  );
  const mathOnly = location === "math";
  const expressions = mathOnly
    ? [value]
    : [...value.matchAll(/(?<!\\)\$([^$]+)(?<!\\)\$/g)].map(
        (match) => match[1],
      );
  for (const expression of expressions) {
    katex.renderToString(expression, { throwOnError: true, strict: "error" });
    mathExpressions++;
  }
  const component = mathOnly
    ? Tex
    : location === "questionLatex"
      ? QuestionStem
      : MixedMath;
  const props = mathOnly ? { tex: value } : { text: value };
  const key = `${mathOnly}:${location === "questionLatex"}:${value}`;
  if (!renderCache.has(key))
    renderCache.set(
      key,
      renderToStaticMarkup(React.createElement(component, props)),
    );
  const html = renderCache.get(key);
  assert.ok(
    !html.includes("katex-error") && !html.includes("[math error]"),
    `Rendered math: ${item.contentId}`,
  );
  renderedFields++;
}
const textKeys = new Set([
  "questionLatex",
  "text",
  "body",
  "explanation",
  "math",
  "rationaleIfWrong",
  "promptMarkdown",
  "description",
]);
function walk(value, key, item) {
  if (typeof value === "string" && textKeys.has(key))
    inspectText(value, key, item);
  else if (Array.isArray(value))
    value.forEach((value) => walk(value, key, item));
  else if (value && typeof value === "object")
    Object.entries(value).forEach(([key, value]) => walk(value, key, item));
}
const seenStems = new Map();
for (const item of items) {
  walk(item, "", item);
  const stem = item.questionLatex.toLowerCase().replace(/\s+/g, " ").trim();
  assert.ok(
    !seenStems.has(stem),
    `Repeated stem: ${item.contentId}, ${seenStems.get(stem)}`,
  );
  seenStems.set(stem, item.contentId);
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
        item.contentId,
      );
      assert.equal(
        getDisplayLetterForOriginal(item, choice.letter),
        displayLetter,
      );
      if (!choice.isCorrect)
        assert.ok(choice.rationaleIfWrong?.trim(), item.contentId);
    }
  } else {
    assert.equal(
      item.rubric.maxPoints,
      item.parts.reduce((sum, part) => sum + part.points, 0),
    );
    assert.equal(
      item.rubric.maxPoints,
      item.rubric.criteria.reduce(
        (sum, criterion) => sum + criterion.points,
        0,
      ),
    );
    for (const part of item.parts) {
      assert.equal(
        part.points,
        item.rubric.criteria
          .filter((criterion) => criterion.part === part.letter)
          .reduce((sum, criterion) => sum + criterion.points, 0),
      );
      assert.ok(
        item.workedSolution.some((solution) => solution.part === part.letter),
      );
    }
  }
}
for (const topic of unit.topics) {
  const added = topic.items.filter((item) =>
    item.skillTags.includes("ncert_chapter_expansion"),
  );
  assert.equal(topic.items.length, 60);
  assert.equal(added.length, 40);
  const distribution = {};
  const keys = { A: 0, B: 0, C: 0, D: 0 };
  for (const item of added) {
    assert.equal(item.topic, topic.topicCode);
    assert.equal(item.unit, unit.slug);
    assert.equal(item.reviewStatus, "ai_reviewed");
    assert.ok(!item.verifiedBy);
    assert.equal(item.hintLadder.length, 3);
    assert.ok(item.hintLadder.every((hint) => hint.body.trim()));
    assert.equal(item.calculatorAllowed, false);
    assert.ok(item.workedSolution.length);
    const kind = item.responseType ?? "mc";
    distribution[kind] = (distribution[kind] ?? 0) + 1;
    if (item.kind === "mc_single") keys[item.correctLetter]++;
    else {
      assert.equal(
        item.rubric.maxPoints,
        { vsaq: 2, saq: 3, laq: 5, case: 4 }[kind],
        item.contentId,
      );
      for (const part of item.parts)
        assert.equal(
          item.workedSolution.find((solution) => solution.part === part.letter)
            .markingPoints.length,
          part.points,
        );
    }
  }
  assert.deepEqual(distribution, { mc: 20, vsaq: 4, saq: 8, laq: 4, case: 4 });
  assert.deepEqual(keys, { A: 5, B: 5, C: 5, D: 5 });
}

// Independent calculations protect the changed keys and the multi-stage examples.
const canonical = (text) =>
  text
    .replace(/\\(?:mathrm|text)/g, "")
    .replace(/[${}\s_]/g, "")
    .replace(/\\,/g, "");
function answer(topic, number) {
  const item = items.find(
    (item) =>
      item.contentId === `cbse-chemistry-11.u1.t1-${topic}.mc.${number}`,
  );
  assert.ok(item);
  return canonical(item.choices.find((choice) => choice.isCorrect).text);
}
function number(topic, id, calculated, tolerance = 1e-8) {
  const actual = Number(answer(topic, id).match(/^-?\d+(?:\.\d+)?/)?.[0]);
  assert.ok(
    Math.abs(actual - calculated) <= tolerance,
    `Reference calculation 1.${topic} MC${id}: ${actual} vs ${calculated}`,
  );
}
number(1, 102, Math.round((15.68 + 0.4) * 10) / 10);
number(1, 103, 3.1);
number(1, 111, Math.round((2.035 - 1.2) * 10) / 10);
number(1, 114, Math.round((56.287 - 52.14) * 100) / 100);
number(1, 115, 3 * 1.25);
number(1, 118, 4.62 / 1.4);
number(1, 120, 5.6 + 3.2);
number(2, 101, 2 * 0.2);
number(2, 102, 2 * 0.15);
number(2, 103, 0.05 * 60);
assert.equal(answer(2, 104), "11:14");
number(2, 105, 0.2 * 10 + 0.8 * 11);
number(2, 106, ((65 - 63.6) / (65 - 63)) * 100);
number(2, 107, 2 * 27 + 3 * (32 + 4 * 16));
number(2, 108, 0.1 * 10 * 2);
number(2, 110, 0.2 + 2 * 0.1);
number(2, 112, 11.7 / 58.5);
number(2, 113, (0.3 / 3) * 48);
number(2, 115, 0.12 * (2 + 4 + 3));
number(2, 116, 7 / 28 + (2 * 11) / 44);
number(2, 118, (0.4 * 3) / 2);
number(2, 119, 1.8066 / 6.022);
number(3, 101, (14 / 101) * 100, 0.05);
number(3, 102, (24 / 40) * 100);
number(3, 107, (2.19 - 1.11) / 18 / (1.11 / 111));
number(3, 110, 0.46 - (0.88 * 12) / 44 - (0.54 * 2) / 18);
number(3, 112, 0.4 * 7.5);
number(3, 115, 5 * (1 - 0.36));
for (const [id, formula] of [
  [103, "C2H5"],
  [104, "Al2O3"],
  [105, "C6H6"],
  [106, "C2H4O"],
  [108, "C2H4O"],
  [109, "C3H8"],
  [113, "C4H10N2"],
  [116, "C2H3O"],
  [118, "N2O5"],
])
  assert.equal(answer(3, id), formula);
number(4, 103, Math.min(11.2 / 56, 3.2 / 32) * (56 + 32));
number(4, 107, ((17.5 * 0.7) / 122.5) * 1.5 * 32);
number(4, 109, (2.7 / 27 - (0.12 * 2) / 3) * 27);
number(4, 111, 30 - 5 * 5 + 3 * 5);
number(4, 112, 2 - 4.5 / 3 + 2 * (4.5 / 3));
number(4, 113, 12 / 0.75);
number(4, 116, (((8.4 / 40) * 84) / 20) * 100);
number(4, 118, Math.min(0.3 / 2, 0.2));
number(4, 119, 0.5 - 2 * 0.2);
number(4, 120, (0.09 / 0.12) * 100);
number(5, 101, 2 / 40 / 0.05);
number(5, 102, 6 / 60 / 0.2);
number(5, 104, 46 / 46 / (46 / 46 + 18 / 18));
number(5, 106, (0.2 * 0.1 + 0.1 * 0.4) / 0.3);
number(5, 109, (1.12 * 1000 * 0.16) / 56);
number(5, 112, 1 * (10 / 100) * (20 / 200));
number(5, 113, 25 / 50 / ((250 - 25) / 1000), 0.005);
number(5, 114, 1.5 / 0.3 - 1.5);
number(5, 115, 12 / 0.15 - 12);
number(5, 116, (8 / (100 - 20)) * 100);
number(5, 119, 0.25 * 0.2 * 180);
number(5, 120, 0.15 / 0.5);

const find = (suffix) =>
  items.find((item) => item.contentId === `cbse-chemistry-11.u1.${suffix}`);
assert.match(find("t1-3.mc.101").questionLatex, /one decimal place/);
assert.match(find("t1-1.saq.107").questionLatex, /7\.26\+0\.6/);
assert.ok(
  find("t1-1.saq.107").workedSolution.some((step) =>
    step.explanation.includes("7.9"),
  ),
);
assert.match(find("t1-3.saq.109").questionLatex, /phosphorus/);
assert.ok(!JSON.stringify(items).includes("S_4O_{17}"));
for (const suffix of [
  "t1-3.mc.113",
  "t1-3.mc.115",
  "t1-3.mc.116",
  "t1-3.mc.118",
  "t1-4.mc.114",
  "t1-5.mc.120",
]) {
  assert.equal(
    find(suffix).difficulty,
    2,
    `Routine-item difficulty regression: ${suffix}`,
  );
}

console.table(
  chapters.map(({ number, title, count }) => ({
    chapter: number,
    title,
    questions: count,
  })),
);
console.log(
  JSON.stringify(
    {
      status: "passed",
      chapter1: items.length,
      additions: additions.length,
      renderedFields,
      mathExpressions,
      newDifficulty: additions.reduce(
        (counts, item) => ({
          ...counts,
          [item.difficulty]: (counts[item.difficulty] ?? 0) + 1,
        }),
        {},
      ),
    },
    null,
    2,
  ),
);
