import assert from "node:assert/strict";
import { loadSource } from "./lib/source-loader.mjs";
import { readSeo } from "./lib/seo-html.mjs";
const { SITE_ORIGIN, siteUrl } = loadSource("lib/site-origin");
const paths = ["/", "/cbse-math-10", "/cbse-math-12", "/about", "/cbse-chemistry-12/u1-solutions", "/cbse-physics-11/u2-kinematics/t2-1-mc-001", "/calc-ab/u8-app-integration/t8-1-frq-001", "/review", "/schools/cells/answers"];
async function request(url, options = {}) {
  return fetch(url, { ...options, redirect: "manual", signal: AbortSignal.timeout(30000) });
}
for (const host of ["www.studyloop.in", "www2.studyloop.in", "studyloop2.pages.dev"]) {
  for (const path of ["/", "/cbse-math-10", "/about?source=seo-test&topic=1"]) {
    const result = await request(`https://${host}${path}`);
    assert.equal(result.status, 301, `Redirect status: ${host}${path}`);
    assert.equal(result.headers.get("location"), `${SITE_ORIGIN}${path}`, `Redirect target: ${host}${path}`);
  }
}
for (const path of paths) {
  const response = await request(siteUrl(path));
  assert.equal(response.status, 200, path);
  const seo = readSeo(await response.text());
  assert.deepEqual(seo.canonical.map(url => new URL(url).href), [siteUrl(path)], path);
  assert.equal(new URL(seo.meta["og:url"]).href, siteUrl(path), path);
  assert.equal(seo.meta["og:title"], seo.title, path);
  assert.equal(seo.meta["og:description"], seo.meta.description, path);
  assert.ok(!response.headers.get("x-robots-tag")?.includes("noindex"), `Production host noindex: ${path}`);
  const csp = response.headers.get("content-security-policy") ?? "";
  assert.match(csp, /script-src[^;]*https:\/\/static\.cloudflareinsights\.com/);
  assert.match(csp, /connect-src[^;]*https:\/\/cloudflareinsights\.com/);
  console.log("SEO", path);
}
const robots = await request(siteUrl("/robots.txt"));
assert.equal(robots.status, 200);
assert.match(await robots.text(), /Sitemap: https:\/\/studyloop\.in\/sitemap\.xml/);
const sitemap = await request(siteUrl("/sitemap.xml"));
assert.equal(sitemap.status, 200);
const xml = await sitemap.text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.ok(urls.length > 6000);
assert.equal(new Set(urls).size, urls.length);
for (const url of urls) {
  assert.equal(new URL(url).origin, SITE_ORIGIN);
  assert.ok(!new URL(url).pathname.startsWith("/session/"));
  assert.ok(!["/review", "/schools/cells/answers"].includes(new URL(url).pathname));
}
const alternate = await request("https://studyloop2.pages.dev/cbse-math-10");
assert.ok(alternate.status === 301 || alternate.headers.get("x-robots-tag")?.includes("noindex"), "pages.dev must redirect or noindex");
const preview = await request("https://aa8d9d19.studyloop2.pages.dev/");
assert.ok([302, 401, 403].includes(preview.status), "Old immutable deployment must be access protected");
if (process.argv.includes("--all")) {
  let next = 0;
  const failures = [];
  async function checkUrls() {
    while (next < urls.length) {
      const index = next++;
      try {
        const result = await request(urls[index], { method: "HEAD" });
        if (result.status !== 200) failures.push([urls[index], result.status]);
      } catch (error) { failures.push([urls[index], error.message]); }
      if ((index + 1) % 500 === 0) console.log(`Checked ${index + 1}/${urls.length} sitemap URLs`);
    }
  }
  await Promise.all(Array.from({ length: 4 }, checkUrls));
  assert.deepEqual(failures, [], "Every sitemap URL must return 200 without redirect");
}
console.log(`SEO release passed: redirects, metadata, CSP, robots, ${urls.length} sitemap URLs, preview protection.`);
