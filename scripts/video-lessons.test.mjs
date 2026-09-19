import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadSource } from "./lib/source-loader.mjs";

const { youtubeEmbedUrl, canonicalYouTubeLink } =
  loadSource("lib/video-lessons");
const { VideoPreparation } = loadSource("components/learn/video-preparation");
const { getVideoLessons } = loadSource("content/video-lessons");
const lessons = getVideoLessons("cbse-chemistry-12", "u1-solutions");

test("embeds use privacy-enhanced mode, inline playback and no autoplay", () => {
  const url = new URL(youtubeEmbedUrl("O_nyEj_hZzg", "en"));
  assert.equal(url.origin, "https://www.youtube-nocookie.com");
  assert.equal(url.pathname, "/embed/O_nyEj_hZzg");
  assert.equal(url.searchParams.get("autoplay"), "0");
  assert.equal(url.searchParams.get("playsinline"), "1");
  assert.equal(url.searchParams.get("rel"), "0");
  assert.equal(
    new URL(youtubeEmbedUrl("0M3kJJid0Rc", "hi")).searchParams.get("hl"),
    "hi",
  );
});

test("rejects arbitrary URLs and malformed IDs", () => {
  for (const value of [
    "",
    "../../bad",
    "https://example.com",
    '1234567890"',
    "aaaaaaaaaaaa",
  ]) {
    assert.throws(() => youtubeEmbedUrl(value, "en"));
  }
});

test("suggestions accept YouTube videos without retaining tracking parameters", () => {
  for (const url of [
    "https://youtu.be/O_nyEj_hZzg?si=tracking",
    "https://www.youtube.com/watch?v=O_nyEj_hZzg&t=30",
    "https://m.youtube.com/live/O_nyEj_hZzg",
  ])
    assert.equal(
      canonicalYouTubeLink(url),
      "https://www.youtube.com/watch?v=O_nyEj_hZzg",
    );
  for (const url of [
    "javascript:alert(1)",
    "http://youtu.be/O_nyEj_hZzg",
    "https://youtube.com.evil.test/watch?v=O_nyEj_hZzg",
    "https://evil.test@youtube.com/watch?v=O_nyEj_hZzg",
    "https://youtube.com/playlist?list=x",
    "https://youtube.com/watch?v=short",
  ]) {
    assert.equal(canonicalYouTubeLink(url), null);
  }
});

test("initial server HTML makes no third-party media or script requests", () => {
  const html = renderToStaticMarkup(
    React.createElement(VideoPreparation, { lessons }),
  );
  assert.ok(lessons.length >= 2);
  assert.doesNotMatch(html, /<(iframe|img|script|link)\b/i);
  assert.doesNotMatch(html, /<details[^>]*\sopen\b/);
  assert.match(html, /Load YouTube video/);
  assert.match(html, /not anonymous or ad-free/);
  assert.match(html, /Hindi \/ Hinglish/);
  assert.match(html, /Report video issue/);
  assert.match(html, /Suggest a better video/);
});

test("unmapped units do not advertise nonexistent lessons", () => {
  const empty = getVideoLessons("nonexistent-course", "nonexistent-unit");
  assert.deepEqual(empty, []);
  assert.equal(
    renderToStaticMarkup(
      React.createElement(VideoPreparation, { lessons: empty }),
    ),
    "",
  );
});

test("CSP permits only the intended video host without adding remote scripts", () => {
  for (const path of ["middleware.ts", "public/_headers"]) {
    const text = readFileSync(path, "utf8");
    assert.match(text, /frame-src https:\/\/www\.youtube-nocookie\.com/);
    assert.match(text, /frame-ancestors 'none'/);
    assert.match(text, /strict-origin-when-cross-origin/);
    assert.doesNotMatch(text, /script-src[^;\r\n]*https:\/\/(www\.)?youtube/);
  }
});

test("video consent is neither stored nor inferred from local practice profiles", () => {
  const source = readFileSync("components/learn/video-preparation.tsx", "utf8");
  assert.doesNotMatch(
    source,
    /localStorage|sessionStorage|document\.cookie|enablejsapi|iframe_api|i\.ytimg/,
  );
  assert.match(source, /min-h-\[216px\]/);
  assert.match(
    source,
    /if \(!event\.currentTarget\.open\) setLoadedId\(null\)/,
  );
});
