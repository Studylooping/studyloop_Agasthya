import assert from "node:assert/strict";
import { parse } from "parse5";

const base = process.argv[2] ?? "https://studyloop.in";
const subjects = [
  ["calc-ab", "AP Calculus AB"],
  ["cbse-math-9", "CBSE Class 9 Mathematics"],
  ["cbse-science-9", "CBSE Class 9 Science"],
  ["cbse-math-10", "CBSE Class 10 Mathematics"],
  ["cbse-science-10", "CBSE Class 10 Science"],
  ["cbse-math-11", "CBSE Class 11 Mathematics"],
  ["cbse-physics-11", "CBSE Class 11 Physics"],
  ["cbse-chemistry-11", "CBSE Class 11 Chemistry"],
  ["cbse-math-12", "CBSE Class 12 Mathematics"],
  ["cbse-physics-12", "CBSE Class 12 Physics"],
  ["cbse-chemistry-12", "CBSE Class 12 Chemistry"],
];
const subjectPaths = new Set(subjects.map(([slug]) => `/${slug}`));
const chapterCounts = {
  "/cbse-math-11": [100, 150, 200, 90, 90, 90, 90, 90, 100, 100, 90, 90, 90, 90],
  "/cbse-physics-11": [90, 90, 90, 90, 90, 90, 90, 10, 50, 20, 70, 50, 20, 60],
};

function descendants(node, predicate) {
  return [
    ...(predicate(node) ? [node] : []),
    ...(node.childNodes ?? []).flatMap(child => descendants(child, predicate)),
  ];
}

function textContent(node) {
  return node.nodeName === "#text" ? node.value
    : (node.childNodes ?? []).map(textContent).join("");
}

function checkChapterCounts(path, html) {
  if (!chapterCounts[path]) return;
  const section = descendants(parse(html), node => node.tagName === "section"
    && node.attrs?.some(attr => attr.name === "aria-labelledby" && attr.value === "ncert-chapters"))[0];
  assert(section, `${path}: missing NCERT chapter navigation`);
  const rows = descendants(section, node => node.tagName === "li");
  assert.equal(rows.length, 14, `${path}: expected 14 NCERT chapters`);
  rows.forEach((row, index) => {
    const count = textContent(row).match(/(\d+)\s+questions/);
    assert(count, `${path}: chapter ${index + 1} has no question count`);
    assert.equal(Number(count[1]), chapterCounts[path][index], `${path}: stale count for chapter ${index + 1}`);
  });
}

const checks = [
  ["/cbse-math-11/u1-sets-functions/t1-7-mc-101", ["One complete cycle of a sinusoidal function", "<figure"]],
  ["/cbse-math-11/u2-algebra-xi/t2-5-case-110", ["A ball is released", "Find the first and third rebound heights."]],
  ["/cbse-physics-11/u6-gravitation/t6-1-mc-101", ["common star", "8:27"]],
  ["/cbse-chemistry-11/u1-some-basic-concepts/t1-3-mc-101", ["Show hint 1", "KNO"]],
  ["/cbse-chemistry-11/u1-some-basic-concepts/t1-5-laq-115", ["5 marks"]],
  ["/", ["Class / exam", "Start practicing", "For teachers"]],
  ...subjects.map(([slug, title]) => [`/${slug}`, [title]]),
  ["/cbse-science-9/u1-world-of-living/t1-1-mc-201", ["Its protoplast shrinks away", "Water leaves the cell by osmosis"]],
  ["/cbse-science-9/u1-world-of-living/t1-1-mc-202", ["Two equal strips", "After blotting"]],
  ["/cbse-science-9/u1-world-of-living/t1-1-case-205", ["A living onion epidermal cell", "The cell wall keeps its outline"]],
  ["/cbse-science-9/u1-world-of-living/t1-1-case-212", ["A fresh onion epidermal cell", "transferred to water"]],
  ["/cbse-science-9/u1-world-of-living/t1-1-laq-206", ["An onion epidermal cell and an animal cell", "Need a hint?"]],
  ["/cbse-science-9/u2-matter-nature-behaviour/t2-1-case-205", ["5 g of salt", "95 g of water", "25 g of water"]],
  ["/cbse-science-9/u3-motion-force-work-sound/t3-1-case-205", ["60 m east in 12 s", "20 m west in 8 s"]],
  ["/cbse-physics-11/u2-kinematics/t2-1-mc-001", ["position-time graph", "<figure"]],
  ["/session/cbse-science-9/u1-world-of-living", ["All topics", "Independent practice", "Learn with hints"]],
  ["/review", ["Review notebook"]],
  ["/schools", ["no teacher sign-off recorded", "2026-27"]],
  ["/schools/cells", ["t1-1-laq-206", "Print questions"]],
  ["/schools/cells/answers", ["Correct option:", "Accept equivalent correct wording"]],
  ["/changelog", ["v0.1-alpha.31", "v0.1-alpha.30", "v0.1-alpha.29", "v0.1-alpha.28", "293 Class IX and 360 Class X"]],
];

for (const [path, expected] of checks) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  const html = await response.text();
  checkChapterCounts(path, html);
  for (const fragment of expected) assert(html.includes(fragment), `${path}: missing ${fragment}`);
  if (path === "/" || subjectPaths.has(path)) {
    assert(!/SAT Math|JEE Main/.test(html), `${path}: removed subject is advertised`);
    assert(!/first live StudyLoop track|will unlock after|local authoring and vetting|coming after the core STEM loop/.test(html), `${path}: stale availability copy`);
  }
  if (path === "/") {
    for (const [slug] of subjects) assert(html.includes(`href="/${slug}"`), `Homepage: missing ${slug}`);
  }
  assert(!html.includes('class="katex-error"'), `${path}: KaTeX error`);
  console.log(`PASS ${path}`);
}
for (const path of ["/sat", "/sat-math", "/jee-main-math"]) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30000) });
  const redirectedHome = response.redirected && new URL(response.url).pathname === "/";
  assert(response.status === 404 || (response.status === 200 && redirectedHome), `${path}: removed subject is still served`);
  console.log(`REMOVED SUBJECT ${path}`);
}

for (const path of [
  "/cbse-science-9/u1-world-of-living/t1-1-mc-203",
  "/cbse-science-10/u1-chemical-substances-nature-behaviour/t1-1-mc-201",
]) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 404, `${path}: withdrawn template is still served`);
  console.log(`WITHDRAWN ${path}`);
}
console.log(`Release smoke check passed: ${checks.length} pages, 3 removed subjects and 2 withdrawn routes at ${base}`);
