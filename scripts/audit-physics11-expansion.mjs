import assert from "node:assert/strict";
import katex from "katex";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadSource } from "./lib/source-loader.mjs";
const course = loadSource("content/cbse-physics-11").cbsePhysics11;
const { physics11ChapterCounts, physics11Chapters } = loadSource("content/cbse-physics-11/ncert-chapters");
const { MixedMath, QuestionStem } = loadSource("components/math/math");
const seenIds = new Set();
const seenQuestions = new Set();
const additions = [];
for (const file of [
  "content/cbse-physics-11/u1-physical-world-measurement/expansion.ts",
  "content/cbse-physics-11/u2-kinematics/straight-line-expansion.ts",
  "content/cbse-physics-11/u2-kinematics/plane-expansion.ts",
  "content/cbse-physics-11/u3-laws-of-motion/expansion.ts",
  "content/cbse-physics-11/u4-work-energy-power/expansion.ts",
  "content/cbse-physics-11/u5-system-particles-rigid-body/expansion.ts",
  "content/cbse-physics-11/u6-gravitation/expansion.ts",
]) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (ts.isStringLiteral(node)) assert.ok(!node.getText(source).includes("\\"), `Use String.raw for LaTeX in ${file}: ${node.getText(source)}`);
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const mapped = physics11Chapters.flatMap(chapter => chapter.topics);
assert.equal(new Set(mapped).size, mapped.length, "Each theory topic belongs to exactly one chapter");
for (const unit of course.units) for (const topic of unit.topics) {
  if (unit.slug !== "practicals-activities") assert.ok(mapped.includes(topic.topicCode), topic.topicCode);
  for (const item of topic.items) {
    assert.ok(!seenIds.has(item.contentId), item.contentId);
    seenIds.add(item.contentId);
    const isNew = item.skillTags.includes("ncert_chapter_expansion");
    const normalized = item.questionLatex.toLowerCase().replace(/\s+/g, " ").trim();
    if (isNew) assert.ok(!seenQuestions.has(normalized), `Repeated stem: ${item.contentId}`);
    seenQuestions.add(normalized);
    if (!isNew) continue;
    additions.push(item);
    assert.equal(item.unit, unit.slug);
    assert.equal(item.topic, topic.topicCode);
    assert.equal(item.reviewStatus, "ai_reviewed");
    assert.ok(!item.verifiedBy);
    assert.equal(item.hintLadder.length, 3);
    assert.ok(item.workedSolution.length > 0);
    function check(value) {
      if (typeof value === "string") {
        assert.ok(!/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value), `Control character in ${item.contentId}`);
        assert.equal((value.match(/(?<!\\)\$/g) ?? []).length % 2, 0, `Unbalanced delimiters in ${item.contentId}`);
        for (const [, expression] of value.matchAll(/(?<!\\)\$([^$]+)(?<!\\)\$/g)) {
          katex.renderToString(expression, { throwOnError: true, strict: "error" });
        }
      } else if (Array.isArray(value)) value.forEach(check);
      else if (value && typeof value === "object") Object.values(value).forEach(check);
    }
    check(item);
    const stemHtml = renderToStaticMarkup(createElement(QuestionStem, { text: item.questionLatex }));
    assert.ok(!/katex-error|\[math error\]/.test(stemHtml), `Stem renderer failed: ${item.contentId}`);
    const displayFields = [
      ...item.hintLadder.map(hint => hint.body),
      ...item.workedSolution.map(step => step.explanation),
      ...(item.choices ?? []).flatMap(choice => [choice.text, choice.rationaleIfWrong ?? ""]),
      ...(item.parts ?? []).map(part => part.promptMarkdown),
    ];
    for (const text of displayFields) {
      const html = renderToStaticMarkup(createElement(MixedMath, { text }));
      assert.ok(!/katex-error|\[math error\]/.test(html), `MixedMath renderer failed: ${item.contentId}: ${text}`);
    }
    if (item.kind === "mc_single") {
      assert.equal(item.choices.length, 4);
      assert.equal(new Set(item.choices.map(choice => choice.text)).size, 4);
      assert.equal(item.choices.filter(choice => choice.isCorrect).length, 1);
      assert.equal(item.choices.find(choice => choice.isCorrect).letter, item.correctLetter);
      assert.ok(item.choices.every(choice => choice.isCorrect || choice.rationaleIfWrong));
    } else {
      assert.equal(item.rubric.maxPoints, item.parts.reduce((sum, part) => sum + part.points, 0));
      assert.equal(item.rubric.maxPoints, item.rubric.criteria.reduce((sum, point) => sum + point.points, 0));
      for (const part of item.parts) {
        const solution = item.workedSolution.find(solution => solution.part === part.letter);
        assert.ok(solution, item.contentId);
        assert.equal(solution.markingPoints.length, part.points);
      }
    }
  }
}
const chapters = physics11ChapterCounts(course);
// Integrate the published graph data independently of the authored solutions.
for (const [suffix, expected] of Object.entries({
  "t2-2.mc.104": 12,
  "t2-2.case.114": 32,
  "t2-2.case.115": 5,
  "t3-2.case.104": 12,
  "t4-1.case.103": 0,
})) {
  const item = additions.find(item => item.contentId.endsWith(suffix));
  assert.ok(item?.figure, `Missing graph ${suffix}`);
  const points = [...item.figure.description.matchAll(/\((-?[\d.]+), (-?[\d.]+)\)/g)]
    .map(match => [Number(match[1]), Number(match[2])]);
  assert.ok(points.length >= 2, suffix);
  const area = points.slice(1).reduce((sum, end, index) => {
    const start = points[index];
    return sum + (start[1] + end[1]) * (end[0] - start[0]) / 2;
  }, 0);
  assert.equal(area, expected, `Signed graph area: ${suffix}`);
}
const vectorItem = additions.find(item => item.contentId.endsWith("t2-3.mc.101"));
assert.ok(vectorItem.choices.some(choice => choice.text.includes("\\sqrt{65}")), "Subtraction distractor must use sqrt(65)");
console.table(chapters.map(({ number, title, count }) => ({ chapter: number, title, count, missing: Math.max(0, 90 - count) })));
console.log(`Validated ${additions.length} new questions. Difficulty:`, additions.reduce((counts, item) => ({ ...counts, [item.difficulty]: (counts[item.difficulty] ?? 0) + 1 }), {}));
if (process.argv.includes("--require-complete")) assert.ok(chapters.every(chapter => chapter.count >= 90), "Chapter expansion is not complete");
