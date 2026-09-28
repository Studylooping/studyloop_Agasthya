import assert from "node:assert/strict";
import test from "node:test";
import { loadSource } from "./lib/source-loader.mjs";

const { fraction } = loadSource("content/cbse-math-11/practice-authoring");
const { complexExpansion } = loadSource(
  "content/cbse-math-11/u2-algebra-xi/complex-expansion",
);
const { countingExpansion } = loadSource(
  "content/cbse-math-11/u2-algebra-xi/counting-expansion",
);
const { trigonometryExpansion } = loadSource(
  "content/cbse-math-11/u1-sets-functions/trigonometry-expansion",
);
const { setsExpansion } = loadSource(
  "content/cbse-math-11/u1-sets-functions/sets-expansion",
);
const correct = (item) => item.choices.find((choice) => choice.isCorrect).text;

test("difficulty follows the shortest standard solution, not a longer optional route", () => {
  const items = [
    ...setsExpansion("1.1"),
    ...setsExpansion("1.2"),
    ...trigonometryExpansion("1.9"),
  ];
  for (const [family, level] of [
    ["absolute_interval", 2],
    ["de_morgan", 3],
    ["symmetric_difference", 3],
    ["double_sine_tangent", 2],
    ["double_cosine", 2],
    ["double_tangent", 2],
  ]) {
    const variants = items.filter((item) => item.skillTags.includes(family));
    assert.equal(variants.length, 4, family);
    for (const item of variants)
      assert.equal(item.difficulty, level, item.contentId);
  }
  for (const item of items.filter((item) =>
    item.skillTags.includes("double_sine_tangent"),
  )) {
    assert(
      item.workedSolution.some((step) =>
        step.explanation.includes("\\frac{2\\tan\\theta}{1+\\tan^2\\theta}"),
      ),
    );
  }
});

test("rational coefficients retain signs and omit redundant symbolic coefficients", () => {
  for (const [n, d, symbol, expected] of [
    [2, 4, "", "\\frac{1}{2}"],
    [-2, 4, "", "-\\frac{1}{2}"],
    [2, -4, "", "-\\frac{1}{2}"],
    [-2, -4, "", "\\frac{1}{2}"],
    [0, 4, "", "0"],
    [4, 2, "", "2"],
    [2, 2, "\\pi", "\\pi"],
    [-2, 2, "\\pi", "-\\pi"],
    [2, 4, "\\pi", "\\frac{\\pi}{2}"],
    [6, 4, "\\pi", "\\frac{3\\pi}{2}"],
    [0, 2, "\\pi", "0"],
    [2, 2, "x", "x"],
    [1, 2, "x", "\\frac{x}{2}"],
    [-2, 2, "i", "-i"],
  ])
    assert.equal(fraction(n, d, symbol), expected);
  assert.throws(() => fraction(1, 0), /Zero denominator/);
});

test("complex products use i, -i and real-only choices without changing the key", () => {
  const items = complexExpansion();
  for (let v = 0; v < 4; v++) {
    const a = v + 2,
      b = a + 1;
    const item = items[v * 10 + 1];
    assert.equal(item.questionLatex, `Find $(${a}+i)(${b}-i)$.`);
    assert.equal(correct(item), `$${a * b + 1}+i$`);
    assert.deepEqual(
      new Set(item.choices.map((choice) => choice.text)),
      new Set([
        `$${a * b + 1}+i$`,
        `$${a * b - 1}+i$`,
        `$${a * b + 1}-i$`,
        `$${a + b}$`,
      ]),
    );
  }
  assert.match(items[12].workedSolution[1].explanation, /\$2-i\$/);
});

test("trigonometric difference answers omit the coefficient one", () => {
  const items = trigonometryExpansion("1.8");
  const sine = items.find((item) =>
    item.skillTags.includes("recognise_sine_difference"),
  );
  assert.equal(correct(sine), "$\\sin x$");
  assert(sine.choices.some((choice) => choice.text === "$\\cos x$"));
  const cosine = items.find((item) =>
    item.skillTags.includes("recognise_cosine_difference"),
  );
  assert(
    cosine.workedSolution.some((step) =>
      step.explanation.includes("$\\cos x$"),
    ),
  );
});

test("period answers use conventional reduced multiples of pi", () => {
  const items = trigonometryExpansion("1.7").filter((item) =>
    item.skillTags.includes("scaled_period"),
  );
  assert.deepEqual(items.map(correct), [
    "$\\pi$",
    "$\\frac{2\\pi}{3}$",
    "$\\frac{\\pi}{2}$",
    "$\\frac{2\\pi}{5}$",
  ]);
});

test("subset counting wording agrees for every generated set size", () => {
  const items = countingExpansion().filter((item) =>
    item.questionLatex.includes("nonempty subsets"),
  );
  assert.equal(items.length, 4);
  items.forEach((item, i) => {
    const n = i + 3;
    assert.equal(
      item.questionLatex,
      `How many nonempty subsets does a set with ${n} elements have?`,
    );
    assert.equal(correct(item), `$${2 ** n - 1}$`);
  });
});

test("all Maths expansion text remains free of the reported formatting defects", () => {
  const { cbseMath11 } = loadSource("content/cbse-math-11/index");
  const patterns = [
    /(?<![\d.])[01]i\b/,
    /(?<!\d)1x\b/,
    /(?<!\d)1\\pi\b/,
    /\\(?:t|d)?frac\{[^}]+\}\{[^}]+\}\\pi/,
    /\bAn [3-6]-element/,
  ];
  function inspect(value, id) {
    if (typeof value === "string") {
      for (const pattern of patterns)
        assert(!pattern.test(value), `${id}: ${value}`);
    } else if (value && typeof value === "object") {
      for (const child of Object.values(value)) inspect(child, id);
    }
  }
  const items = cbseMath11.units
    .flatMap((unit) => unit.topics.flatMap((topic) => topic.items))
    .filter((item) => item.skillTags.includes("chapter_expansion_2026"));
  assert.equal(items.length, 1170);
  for (const item of items) inspect(item, item.contentId);
  for (const item of [
    ...complexExpansion(),
    ...countingExpansion(),
    ...trigonometryExpansion("1.8"),
  ]) {
    assert.equal(item.version, "0.3.1");
  }
});
