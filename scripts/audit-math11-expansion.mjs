import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import katex from "katex";
import { parseFragment } from "parse5";
import { loadSource } from "./lib/source-loader.mjs";

const require = createRequire(import.meta.url);
const { cbseMath11: course } = loadSource("content/cbse-math-11/index");
const { math11ChapterCounts } = loadSource(
  "content/cbse-math-11/ncert-chapters",
);
const { MixedMath, QuestionStem } = loadSource("components/math/math");
const core = course.units.filter((u) => /^u[1-5]-/.test(u.slug));
const all = core.flatMap((u) => u.topics.flatMap((t) => t.items));
const added = all.filter((i) => i.skillTags.includes("chapter_expansion_2026"));
const counts = math11ChapterCounts(course);
assert.equal(counts.length, 14);
for (const ch of counts) assert(ch.count >= 90, ch.title + " below 90");
for (const topic of core[0].topics)
  assert.equal(topic.items.length, 50, topic.topicCode);
assert.equal(added.length, 1170);
assert.equal(all.length, 1460);
assert.equal(new Set(all.map((i) => i.contentId)).size, all.length);

// Pin the pre-expansion baseline so this check remains valid after committing.
const baselineRef = "fb45a848614532d77deb3cc3ace760bd90917c2b";
let originals = 0;
for (const unit of core) {
  const path = "content/cbse-math-11/" + unit.slug + "/topics.ts";
  const old = execFileSync("git", ["show", baselineRef + ":" + path], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  const js = ts.transpileModule(old, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const exports = {};
  new Function("exports", "require", js)(exports, require);
  const topics = Object.values(exports).find(Array.isArray);
  for (const topic of topics)
    for (const item of topic.items) {
      assert.deepEqual(
        all.find((i) => i.contentId === item.contentId),
        item,
        "Original changed: " + item.contentId,
      );
      originals++;
    }
}
assert.equal(originals, 290);

// Evaluate only constant arithmetic in KaTeX's standard MathML output.
// Variables, equations, units, functions and tables deliberately return NaN.
function arithmetic(tokens) {
  let p = 0;
  function atom() {
    const t = tokens[p++];
    if (typeof t === "number") return t;
    if (t === "+") return atom();
    if (t === "-") return -atom();
    if (t === "(") {
      const x = sum();
      if (tokens[p++] !== ")") return NaN;
      return x;
    }
    return NaN;
  }
  function product() {
    let x = atom();
    while (p < tokens.length) {
      const op = tokens[p];
      if (op === "*" || op === "/") {
        p++;
        const y = atom();
        x = op === "*" ? x * y : x / y;
      } else if (typeof op === "number" || op === "(") x *= atom();
      else break;
    }
    return x;
  }
  function sum() {
    let x = product();
    while (tokens[p] === "+" || tokens[p] === "-") {
      const op = tokens[p++],
        y = product();
      x = op === "+" ? x + y : x - y;
    }
    return x;
  }
  const value = sum();
  return p === tokens.length ? value : NaN;
}
const child = (n) =>
  (n.childNodes ?? []).filter(
    (x) => x.nodeName !== "#text" && x.nodeName !== "annotation",
  );
const text = (n) =>
  n.nodeName === "#text" ? n.value : (n.childNodes ?? []).map(text).join("");
function evaluate(n) {
  if (n.tagName === "mn") return Number(text(n));
  if (n.tagName === "mi")
    return text(n) === "π" ? Math.PI : text(n) === "/" ? "/" : NaN;
  if (n.tagName === "mo")
    return (
      {
        "+": "+",
        "−": "-",
        "-": "-",
        "/": "/",
        "×": "*",
        "⋅": "*",
        "(": "(",
        ")": ")",
      }[text(n)] ?? NaN
    );
  const c = child(n);
  if (n.tagName === "mfrac") return evaluate(c[0]) / evaluate(c[1]);
  if (n.tagName === "msup") return evaluate(c[0]) ** evaluate(c[1]);
  if (n.tagName === "msqrt") return Math.sqrt(arithmetic(c.map(evaluate)));
  if (n.tagName === "semantics") return evaluate(c[0]);
  if (["math", "mrow", "mstyle", "mpadded"].includes(n.tagName))
    return arithmetic(c.filter((x) => x.tagName !== "mspace").map(evaluate));
  return NaN;
}
function find(n, tag) {
  if (n.tagName === tag) return n;
  for (const c of n.childNodes ?? []) {
    const r = find(c, tag);
    if (r) return r;
  }
}
const valueCache = new Map();
function value(s) {
  if (valueCache.has(s)) return valueCache.get(s);
  if (!/^\$[^$]+\$$/.test(s)) return NaN;
  const html = katex.renderToString(s.slice(1, -1), {
    output: "mathml",
    throwOnError: true,
  });
  const result = evaluate(find(parseFragment(html), "math"));
  valueCache.set(s, result);
  return result;
}
const close = (a, b) =>
  Number.isFinite(a) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
let fields = 0,
  numericOptions = 0;
const textCache = new Map(),
  stems = new Map(),
  issues = [];
function inspect(s, id, stem = false) {
  if (typeof s !== "string") return;
  fields++;
  const key = stem + ":" + s;
  let html = textCache.get(key);
  if (html === undefined) {
    html = renderToStaticMarkup(
      React.createElement(stem ? QuestionStem : MixedMath, { text: s }),
    );
    textCache.set(key, html);
  }
  assert(
    !html.includes("katex-error") && !html.includes("[math error]"),
    id + " invalid math: " + s,
  );
  assert(!s.includes("\u0000"), id + " NUL");
  assert(
    !/\\(?:frac|sqrt|sin|cos|tan|mathbb|log|ln|pi|theta)/.test(
      s.replace(/\$[^$]*\$/g, ""),
    ),
    id + " un-delimited math",
  );
}
for (const item of added) {
  assert.equal(item.hintLadder.length, 3);
  assert(item.workedSolution.length > 0);
  assert.equal(item.reviewStatus, "ai_reviewed");
  assert(!item.verifiedBy, "Do not claim human verification");
  inspect(item.questionLatex, item.contentId, true);
  const signature =
    item.questionLatex +
    "|" +
    (item.parts ?? []).map((p) => p.promptMarkdown).join("|") +
    "|" +
    (item.choices ?? [])
      .map((c) => c.text)
      .sort()
      .join("|") +
    "|" +
    (item.figure?.svg ?? "");
  if (stems.has(signature))
    issues.push(
      "Duplicate question: " + stems.get(signature) + " / " + item.contentId,
    );
  stems.set(signature, item.contentId);
  item.hintLadder.forEach((h) => inspect(h.body, item.contentId));
  item.workedSolution.forEach((s) => {
    inspect(s.explanation, item.contentId);
    (s.markingPoints ?? []).forEach((x) => inspect(x, item.contentId));
  });
  if (item.kind === "mc_single") {
    assert.equal(item.choices.filter((c) => c.isCorrect).length, 1);
    assert.equal(
      item.choices.find((c) => c.isCorrect).letter,
      item.correctLetter,
    );
    const seen = [];
    item.choices.forEach((c) => {
      inspect(c.text, item.contentId);
      inspect(c.rationaleIfWrong, item.contentId);
      if (!c.isCorrect) assert(c.rationaleIfWrong?.length > 15);
      const x = value(c.text);
      if (Number.isFinite(x)) {
        numericOptions++;
        if (seen.some((y) => close(x, y)))
          issues.push(
            item.contentId + " numerically equivalent options: " + c.text,
          );
        seen.push(x);
      }
    });
  } else {
    assert.equal(
      item.rubric.maxPoints,
      item.parts.reduce((n, p) => n + p.points, 0),
    );
    for (const p of item.parts) {
      inspect(p.promptMarkdown, item.contentId);
      assert.equal(
        item.rubric.criteria
          .filter((c) => c.part === p.letter)
          .reduce((n, c) => n + c.points, 0),
        p.points,
      );
      assert.equal(
        item.workedSolution.filter((s) => s.part === p.letter).length,
        1,
      );
    }
    item.rubric.criteria.forEach((c) => inspect(c.description, item.contentId));
    item.commonErrors.forEach((s) => inspect(s, item.contentId));
  }
}

// Independent numerical oracles for the expanded objective families.
const triples = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
];
const factorial = (n) =>
  Array.from({ length: n }, (_, i) => i + 1).reduce((p, x) => p * x, 1);
const choose = (n, r) =>
  r > n ? 0 : factorial(n) / factorial(r) / factorial(n - r);
const poly = (a, n) => {
  let coefficients = [1];
  for (let i = 0; i < n; i++) {
    const next = Array(coefficients.length + 1).fill(0);
    coefficients.forEach((x, j) => {
      next[j] += x;
      next[j + 1] += a * x;
    });
    coefficients = next;
  }
  return coefficients;
};
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const variance = (xs) => mean(xs.map((x) => (x - mean(xs)) ** 2));
let checked = 0;
for (const item of added.filter((i) => i.kind === "mc_single")) {
  const index = Number(item.contentId.split(".").at(-1)) - 101,
    v = Math.floor(index / 10),
    k = index % 10;
  let expected;
  const a = (v % 4) + 2,
    b = a + 3,
    n = a + 3;
  if (item.topic === "1.1") {
    if (k === 1) expected = v + 10;
    if (k === 2) expected = 2 ** (v + 3);
  }
  if (item.topic === "1.3" && k === 2) expected = 2 ** (2 * (v + 5));
  if (item.topic === "1.5") {
    if (k === 1) expected = -v - 3;
    if (k === 2) expected = 0;
  }
  if (item.topic === "1.6") {
    const [p, q, r] = triples[v];
    if (k === 0) expected = ([135, 150, 210, 240][v] * Math.PI) / 180;
    if (k === 2) expected = -Math.sqrt(1 - (p / r) ** 2);
    if (k === 3) expected = 0.5;
  }
  if (item.topic === "1.7") {
    if (k === 1) expected = -1;
    if (k === 2) expected = ((2 * (v + 2) + 1) * Math.PI) / 2;
    if (k === 3) expected = (2 * Math.PI) / (v + 2);
  }
  if (item.topic === "1.8") {
    const [p, q, r] = triples[v],
      [s, t, u] = triples[(v + 1) % 4];
    if (k === 0) expected = Math.sin(Math.asin(p / r) + Math.asin(s / u));
    if (k === 1) expected = Math.tan(Math.atan(p / q) - Math.atan(s / t));
    if (k === 2) expected = Math.sin(([15, 75, 105, 165][v] * Math.PI) / 180);
  }
  if (item.topic === "1.9") {
    const [p, q, r] = triples[v];
    if (k === 0) expected = Math.sin(2 * Math.atan(p / q));
    if (k === 1) expected = Math.cos(2 * Math.acos(q / r));
    if (k === 2) expected = Math.tan(2 * Math.atan(p / q));
  }
  if (item.topic === "2.1") {
    if (v < 4) {
      if (k === 2) expected = (1 - a) / 2;
      if (k === 3) expected = 2 * a;
      if (k === 4) expected = Math.hypot(3 * a, 4 * a);
    } else if (k === 4) expected = 5;
  }
  if (item.topic === "2.2") {
    if (v < 4 && k === 2) expected = a + b;
    if (v >= 4 && k === 3) expected = a * (b - 1);
  }
  if (item.topic === "2.3") {
    const a = (v % 4) + 3,
      n = a + 3;
    if (v < 4)
      expected = [
        a * (a + 2),
        a * (a - 1) * (a - 2),
        choose(n, 3),
        2 * factorial(n - 1),
        [60, 60, 180, 60][v],
      ][k];
    else if (k !== 3)
      expected = [
        choose(n - 1, 3),
        factorial(n) - 2 * factorial(n - 1),
        a ** 4,
        undefined,
        2 ** a - 1,
      ][k];
  }
  if (item.topic === "2.4") {
    if (v < 4)
      expected = [
        poly(a, n).reduce((s, x) => s + x, 0),
        poly(a, 4)[2],
        -n * a ** (n - 1),
        poly(1, n).length,
        a ** n,
      ][k];
    else
      expected = [
        poly(1, n)[2] - poly(1, n)[1],
        poly(a, 2)[1] + poly(-1, 3)[1],
        a,
        (1 - a) ** 4,
        poly(1, n)[4],
      ][k];
  }
  if (item.topic === "2.5") {
    if (v < 4)
      expected = [
        a * 2 ** 4,
        Array.from({ length: 4 }, (_, i) => a * 3 ** i).reduce(
          (x, y) => x + y,
          0,
        ),
        Math.sqrt(a * 9 * a),
        a * (-2) ** 3,
        Array.from({ length: 100 }, (_, i) => a * 0.5 ** i).reduce(
          (x, y) => x + y,
          0,
        ),
      ][k];
    else if (k !== 3)
      expected = [
        n,
        (4 * a) ** 2,
        Array.from({ length: 100 }, (_, i) => (a + 1) * (-1 / a) ** i).reduce(
          (x, y) => x + y,
          0,
        ),
        undefined,
        Math.max(
          ...Array.from({ length: 10 * a + 1 }, (_, i) => i * (10 * a - i)),
        ),
      ][k];
  }
  if (item.topic === "3.1") {
    if (k === 0) expected = 2;
    if (k === 3) expected = -1 / a;
  }
  if (item.topic === "3.2") {
    if (k === 0) expected = a;
    if (k === 1) expected = b - a;
    if (k === 2) expected = b;
  }
  if (item.topic === "3.3") {
    if (k === 1) expected = 3;
    if (k === 4) expected = 4 * a;
  }
  if (item.topic === "3.4") {
    const A = [5, 13, 17, 25][v],
      D = [3, 5, 8, 7][v],
      c = Math.sqrt(A * A - D * D);
    if (k === 1) expected = c / A;
    if (k === 3) expected = 2 * A;
    if (k === 4) expected = A / D;
  }
  if (item.topic === "3.5") {
    if (v < 4) {
      if (k === 0) expected = 7;
      if (k === 1) expected = b;
      if (k === 3) expected = 7 * a;
    } else {
      if (k === 0) expected = 5;
      if (k === 3) expected = b;
      if (k === 4) expected = a + b;
    }
  }
  if (item.topic === "4.1") expected = [6, 1 / 6, 3, -5][index];
  if (item.topic === "4.2") expected = [2.5, 0.5, 3, 4][index];
  if (item.topic === "4.3") {
    if (index === 1) expected = 0;
    if (index === 2) expected = -0.25;
  }
  if (item.topic === "4.4" && index !== 1)
    expected = [2, undefined, 3, 3][index];
  if (item.topic === "5.1") {
    const a = v + 2,
      t = 7 + v,
      data = [t - 2 * a, t - a, t, t + a, t + 2 * a],
      other = [a, 2 * a, 3 * a, 10 * a];
    if (k === 0) expected = Math.max(...data) - Math.min(...data);
    if (k === 1) expected = mean(data.map((x) => Math.abs(x - mean(data))));
    if (k === 3) expected = (other[1] + other[2]) / 2;
    if (k === 4)
      expected = mean(
        other.map((x) => Math.abs(x - (other[1] + other[2]) / 2)),
      );
  }
  if (item.topic === "5.2") {
    const a = v + 2,
      t = 7 + v;
    expected = [
      variance([t - 2 * a, t - a, t, t + a, t + 2 * a]),
      Math.sqrt(9 * a * a),
      4 * a * a,
      2 * a * a,
      a,
    ][k];
  }
  if (item.topic === "5.3") {
    const a = v + 2;
    if (k !== 3)
      expected = [
        mean([a, 2 * a, 2 * a, 3 * a]),
        variance([a, 2 * a, 2 * a, 3 * a]),
        10 * a + 5,
        undefined,
        3 * a,
      ][k];
  }
  if (item.topic === "5.4") {
    const a = 4 + v,
      N = 12 + 6 * v;
    if (index < 30 && k !== 1)
      expected = [
        Array.from({ length: N }, (_, i) => i + 1).filter(
          (x) => x % 2 === 0 || x % 3 === 0,
        ).length / N,
        undefined,
        (a + 3) / (2 * a + 3),
        (a + 1) / 10,
        1 - (a + 2) / 10,
      ][k];
    if (index === 30) expected = 7 / 8;
    if (index === 31) expected = 4 / 10;
  }
  if (item.topic === "5.5") {
    const a = 4 + v;
    if (index < 30)
      expected = [(3 + v) / 20, a / 10, (2 * a - 7) / 10, (a + 3) / 12, 0.2][k];
    if (index === 30) expected = 0.2;
    if (index === 31) expected = 0.75;
  }
  if (expected !== undefined) {
    const answer = item.choices.find((c) => c.isCorrect).text,
      actual = value(answer);
    if (!close(actual, expected))
      issues.push(
        item.contentId +
          " answer " +
          answer +
          " does not match independent expected value " +
          expected,
      );
    checked++;
  }
}
if (issues.length) {
  console.error(issues.join("\n"));
  throw new Error(issues.length + " expansion audit failures");
}
console.log(
  JSON.stringify(
    {
      status: "passed",
      chapters: counts.map((x) => ({
        chapter: x.number,
        title: x.title,
        count: x.count,
      })),
      originalQuestionsPreserved: originals,
      added: added.length,
      total: all.length,
      renderedFields: fields,
      numericOptions,
      independentObjectiveChecks: checked,
      difficulty: added.reduce(
        (r, i) => ((r[i.difficulty] = (r[i.difficulty] ?? 0) + 1), r),
        {},
      ),
    },
    null,
    2,
  ),
);
