import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { loadSource } from "./lib/source-loader.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const course = loadSource("content/cbse-physics-11").cbsePhysics11;
const figures = course.units.flatMap(unit => unit.topics.flatMap(topic => topic.items))
  .filter(item => item.skillTags.includes("ncert_chapter_expansion") && item.figure);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const directory = "review-packages/physics11-expansion";
mkdirSync(directory, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1160, height: 800 } });
  for (const item of figures) {
    const result = await page.evaluate(svg => {
      const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
      return doc.querySelector("parsererror")?.textContent;
    }, item.figure.svg);
    assert.ok(!result, `${item.contentId}: ${result}`);
  }
  const html = `<html><head><style>body{font-family:Arial;margin:16px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}figure{margin:0}svg{width:100%;height:auto}figcaption{font-size:14px}@media(max-width:600px){main{grid-template-columns:1fr}}</style></head><body><main>${figures.map(item => `<figure>${item.figure.svg}<figcaption>${item.contentId}</figcaption></figure>`).join("")}</main></body></html>`;
  writeFileSync(`${directory}/graphs.html`, html);
  await page.setContent(html);
  for (const width of [1160, 390]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Horizontal overflow");
    const clipped = await page.locator("svg text").evaluateAll(nodes => nodes.filter(node => {
      const rect = node.getBoundingClientRect(), svg = node.ownerSVGElement.getBoundingClientRect();
      return rect.left < svg.left || rect.right > svg.right || rect.top < svg.top || rect.bottom > svg.bottom;
    }).map(node => node.textContent));
    assert.deepEqual(clipped, [], "Clipped graph labels");
    await page.screenshot({ path: `${directory}/graphs-${width}.png`, fullPage: true });
  }
  console.log(`Rendered ${figures.length} figures: valid SVG XML, no clipped labels or horizontal overflow at desktop/mobile sizes.`);
} finally { await browser.close(); }
