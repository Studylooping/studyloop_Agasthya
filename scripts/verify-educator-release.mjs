import assert from "node:assert/strict";

const base = process.argv[2] ?? "https://studyloop.in";
const checks = [
  ["/", ["Class / exam", "Start practicing", "For teachers"]],
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
  ["/changelog", ["v0.1-alpha.28", "293 Class IX and 360 Class X"]],
];

for (const [path, expected] of checks) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  const html = await response.text();
  for (const fragment of expected) assert(html.includes(fragment), `${path}: missing ${fragment}`);
  assert(!html.includes('class="katex-error"'), `${path}: KaTeX error`);
  console.log(`PASS ${path}`);
}

for (const path of [
  "/cbse-science-9/u1-world-of-living/t1-1-mc-203",
  "/cbse-science-10/u1-chemical-substances-nature-behaviour/t1-1-mc-201",
]) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 404, `${path}: withdrawn template is still served`);
  console.log(`WITHDRAWN ${path}`);
}
console.log(`Release smoke check passed: ${checks.length} pages and 2 withdrawn routes at ${base}`);
