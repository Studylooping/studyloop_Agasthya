import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.argv[2] ?? "https://studyloop.in";
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge" });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const analyticsResponses = [];
  page.on("response", r => {
    if (r.url().includes("cloudflareinsights.com") || r.url().includes("/cdn-cgi/rum")) analyticsResponses.push({ url: r.url(), status: r.status() });
  });
  await page.addInitScript(() => {
    window.__seoViolations = [];
    document.addEventListener("securitypolicyviolation", e => window.__seoViolations.push({ directive: e.effectiveDirective, uri: e.blockedURI }));
  });
  const beacon = page.waitForResponse(r => r.url().includes("static.cloudflareinsights.com/beacon.min.js"), { timeout: 30000 });
  const rum = page.waitForResponse(r => r.request().method() === "POST" && (r.url().includes("cloudflareinsights.com") || r.url().includes("/cdn-cgi/rum")), { timeout: 45000 });
  // Observe promptly so a timeout never becomes an unhandled rejection.
  const rumResult = rum.catch(error => ({ error: error.message }));
  await page.goto(base, { waitUntil: "networkidle" });
  const beaconResponse = await beacon;
  assert.equal(beaconResponse.status(), 200);
  await beaconResponse.finished();
  const beaconBytes = await beaconResponse.request().sizes();
  const state = await page.evaluate(() => ({
    violations: window.__seoViolations,
    resources: performance.getEntriesByType("resource").filter(e => e.name.includes("static.cloudflareinsights.com")).map(e => ({ name: e.name, transferSize: e.transferSize, duration: e.duration })),
    canonical: document.querySelector('link[rel="canonical"]')?.href,
  }));
  assert.equal(state.canonical, `${base}/`);
  assert.equal(state.violations.filter(v => v.uri.includes("cloudflareinsights.com")).length, 0);
  // Cross-origin Resource Timing can conceal transferSize without Timing-Allow-Origin.
  assert.ok(beaconBytes.responseBodySize > 0, "Beacon must have transferred bytes in a clean context");
  mkdirSync("review-packages/seo", { recursive: true });
  await page.screenshot({ path: "review-packages/seo/home-desktop.png" });
  await page.goto(`${base}/cbse-math-10`, { waitUntil: "networkidle" });
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `${base}/cbse-math-10`);
  const data = await page.locator('script[type="application/ld+json"]').allTextContents();
  assert.ok(data.map(JSON.parse).some(v => v["@type"] === "Course"));
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: "review-packages/seo/course-mobile.png" });
  const delivery = await rumResult;
  assert.ok(!delivery.error, `No analytics delivery: ${delivery.error}`);
  assert.ok(delivery.status() >= 200 && delivery.status() < 300, "Analytics collector must accept the beacon");
  writeFileSync("review-packages/seo/browser-verification.json", JSON.stringify({ ...state, beaconBytes, analyticsResponses }, null, 2));
  console.log("PASS: beacon transferred bytes without CSP violations; analytics collector accepted POST; canonical URLs, structured data and mobile layout verified.");
} finally { await browser.close(); }
