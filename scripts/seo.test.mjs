import assert from "node:assert/strict";
import test from "node:test";
import { loadSource } from "./lib/source-loader.mjs";
import { readSeo } from "./lib/seo-html.mjs";
const { siteUrl, SITE_ORIGIN } = loadSource("lib/site-origin");
const { pageMetadata, jsonLd } = loadSource("lib/seo");

test("canonical paths are absolute and reject host/query injection", () => {
  assert.equal(siteUrl("/cbse-math-10"), `${SITE_ORIGIN}/cbse-math-10`);
  for (const invalid of ["//evil.example", "https://evil.example", "/a?q=x", "/a#b", "/\\evil.example"]) assert.throws(() => siteUrl(invalid));
});
test("page metadata preserves source text and noindex", () => {
  const result = pageMetadata("/review", { title: "Review Notebook", description: "Original description", robots: { index: false, follow: true } });
  assert.equal(result.title, "Review Notebook");
  assert.equal(result.description, "Original description");
  assert.equal(result.openGraph.description, result.description);
  assert.equal(result.openGraph.url, siteUrl("/review"));
  assert.equal(result.robots.index, false);
  assert.equal(result.twitter.title, "Review Notebook \u2014 StudyLoop");
});
test("metadata parsing handles attribute ordering, entities and duplicate canonicals", () => {
  const result = readSeo('<html><head><title>A &amp; B</title><link href="https://example.org/" rel="canonical"><meta content="noindex" name="robots"></head><body></body></html>');
  assert.equal(result.title, "A & B");
  assert.deepEqual(result.canonical, ["https://example.org/"]);
  assert.equal(result.meta.robots, "noindex");
});
test("structured data cannot terminate its script element", () => {
  assert.ok(!jsonLd({ name: "</script><script>bad" }).includes("<"));
});
