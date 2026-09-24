import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadSource } from "./lib/source-loader.mjs";
import { readSeo } from "./lib/seo-html.mjs";

const { siteUrl } = loadSource("lib/site-origin");
const xmlEscape = value => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);

export function exportSeo(outDir, manifestPath) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const entries = [];
  let checked = 0;
  for (const pathname of Object.keys(manifest.routes).sort()) {
    if (pathname.startsWith("/_") || pathname === "/404" || pathname === "/500") continue;
    const stem = pathname === "/" ? "index" : pathname.slice(1);
    const file = [join(outDir, `${stem}.html`), join(outDir, stem, "index.html")].find(existsSync);
    if (!file) {
      assert.ok(/\.(xml|txt|ico|png|svg)$/.test(pathname), `Missing exported HTML: ${pathname}`);
      continue;
    }
    const seo = readSeo(readFileSync(file, "utf8"));
    assert.deepEqual(seo.canonical.map(url => new URL(url).href), [siteUrl(pathname)], `Canonical: ${pathname}`);
    assert.equal(new URL(seo.meta["og:url"]).href, siteUrl(pathname), `OG URL: ${pathname}`);
    assert.equal(seo.meta["og:title"], seo.title, `OG title: ${pathname}`);
    assert.equal(seo.meta["og:description"], seo.meta.description, `OG description: ${pathname}`);
    assert.equal(seo.meta["twitter:title"], seo.title, `Twitter title: ${pathname}`);
    checked++;
    if (!/\bnoindex\b/i.test(seo.meta.robots ?? "")) entries.push(siteUrl(pathname));
  }
  assert.ok(entries.length > 0);
  writeFileSync(join(outDir, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + entries.map(url => `  <url><loc>${xmlEscape(url)}</loc></url>`).join("\n") + "\n</urlset>\n");
  console.log(`SEO export passed: ${checked} HTML pages, ${entries.length} indexable sitemap URLs.`);
}
