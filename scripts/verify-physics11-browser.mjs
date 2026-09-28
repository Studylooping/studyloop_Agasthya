import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { loadSource } from "./lib/source-loader.mjs";
const { chromium } = createRequire(import.meta.url)("playwright");
const course = loadSource("content/cbse-physics-11").cbsePhysics11;
const { physics11ChapterCounts } = loadSource("content/cbse-physics-11/ncert-chapters");
const base = process.argv[2] ?? "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Use a local server for this draft-content check");
const directory = "review-packages/physics11-expansion";
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  async function open(path) {
    const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 180000 });
    assert.equal(response.status(), 200, path);
    assert.equal(await page.locator(".katex-error").count(), 0, path);
  }
  await open("/cbse-physics-11");
  const chapterHeading = page.getByRole("heading", { name: "NCERT Chapters", exact: true });
  await chapterHeading.waitFor();
  const chapterSection = chapterHeading.locator("..");
  for (const chapter of physics11ChapterCounts(course)) {
    assert.ok((await chapterSection.innerText()).includes(chapter.title), chapter.title);
  }
  await chapterHeading.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${directory}/chapter-hub.png` });
  await page.setViewportSize({ width: 390, height: 900 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Chapter hub overflow");
  await chapterHeading.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${directory}/chapter-hub-mobile.png` });
  await page.setViewportSize({ width: 1280, height: 900 });
  let routes = 0;
  for (const unit of course.units) {
    const added = unit.topics.flatMap(topic => topic.items).filter(item => item.skillTags.includes("ncert_chapter_expansion"));
    if (!added.length) continue;
    const mc = added.find(item => item.kind === "mc_single");
    const written = added.find(item => item.kind === "frq" && item.figure) ?? added.find(item => item.kind === "frq");
    for (const item of [mc, written]) {
      const slug = item.contentId.split(".").slice(-3).join("-");
      await open(`/cbse-physics-11/${unit.slug}/${slug}`);
      await page.waitForFunction(id => Object.keys(localStorage).some(key => key.endsWith(id)), item.contentId, { timeout: 60000 });
      if (item.kind === "mc_single") {
        assert.equal(await page.locator('input[type="radio"]:checked').count(), 0, "A fresh question must be unanswered");
        const wrong = item.choices.find(choice => !choice.isCorrect);
        await page.locator(`input[type="radio"][value="${wrong.letter}"]`).check();
        await page.getByRole("button", { name: "Check answer", exact: true }).click();
        await page.getByText("Worked solution", { exact: true }).waitFor();
        assert.equal(await page.locator(".katex-error").count(), 0, "Solution rendering");
      } else {
        await page.getByRole("button", { name: "Show rubric & model solution", exact: true }).click();
        await page.getByText("Model solution", { exact: true }).waitFor();
        assert.equal(await page.locator(".katex-error").count(), 0, "Constructed solution rendering");
      }
      for (const width of [1280,390]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Page overflow: ${slug} at ${width}`);
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `${directory}/${slug}-mobile.png`, fullPage: true });
      await page.setViewportSize({ width: 1280, height: 900 });
      routes++;
    }
  }
  assert.deepEqual(errors, [], "Browser runtime errors");
  console.log(`Verified chapter hub and ${routes} representative question routes, fresh-answer state, wrong-answer worked solutions, desktop/mobile page bounds.`);
} finally { await browser.close(); }
