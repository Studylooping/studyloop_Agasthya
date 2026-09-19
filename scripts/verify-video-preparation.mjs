import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

// NODE_PATH may point to the desktop's bundled Playwright installation.
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHANNEL
    ? { channel: process.env.PLAYWRIGHT_CHANNEL }
    : {}),
});
const output = "review-packages/video-preparation-2026-09-19";
mkdirSync(output, { recursive: true });
const thirdParty = /youtube|ytimg|googlevideo|doubleclick|google\.com|gstatic/i;
try {
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 360, height: 800 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const requests = [];
    page.on("request", (request) => {
      if (thirdParty.test(request.url())) requests.push(request.url());
    });
    await page.goto(`${base}/cbse-chemistry-12/u1-solutions`, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await page.locator("#video-preparation summary").click();
    assert.equal(
      requests.length,
      0,
      "Opening a chapter must not contact Google/YouTube",
    );
    assert.equal(await page.locator("iframe").count(), 0);
    await page.getByLabel("Hindi / Hinglish", { exact: true }).check();
    assert.equal(
      requests.length,
      0,
      "Language selection must not contact Google/YouTube",
    );
    assert.match(
      await page
        .getByRole("heading", { name: /Solutions in One Shot/ })
        .innerText(),
      /Solutions in One Shot/,
    );
    await page
      .locator("#video-preparation")
      .screenshot({ path: `${output}/consent-${viewport.width}.png` });

    // Mock the iframe response only for deterministic UI tests, never for the live playback check.
    await page.route("https://www.youtube-nocookie.com/embed/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Test player</title><p>Embedded player fixture</p>",
      }),
    );
    await page
      .getByRole("button", { name: "Load YouTube video", exact: true })
      .click();
    const frame = page.locator("iframe[data-testid=lesson-player]");
    await frame.waitFor();
    assert.match(
      await frame.getAttribute("src"),
      /youtube-nocookie\.com\/embed\/0M3kJJid0Rc/,
    );
    assert.equal(
      await frame.getAttribute("referrerpolicy"),
      "strict-origin-when-cross-origin",
    );
    const box = await frame.boundingBox();
    assert.ok(box.width >= 200 && box.height >= 200);
    assert.ok(
      requests.some((url) => url.includes("youtube-nocookie.com/embed/")),
    );
    assert.equal(
      await page.getByText(/Blank player\? Try reloading/).isVisible(),
      true,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Copy StudyLoop page link", exact: true })
        .isVisible(),
      true,
    );
    const reloadRequest = page.waitForRequest((request) =>
      request.url().includes("youtube-nocookie.com/embed/0M3kJJid0Rc"),
    );
    await page
      .getByRole("button", { name: "Reload video", exact: true })
      .click();
    await reloadRequest;
    assert.equal(
      await frame.count(),
      1,
      "Retry replaces the frame instead of adding a second player",
    );
    await page
      .getByRole("button", { name: "Close video", exact: true })
      .click();
    assert.equal(await frame.count(), 0);
    await page
      .getByRole("button", { name: "Load YouTube video", exact: true })
      .click();
    await page.getByLabel("English", { exact: true }).check();
    assert.equal(
      await frame.count(),
      0,
      "A new language must require fresh consent",
    );
    await page
      .getByRole("button", { name: "Load YouTube video", exact: true })
      .click();
    await page.locator("#video-preparation summary").click();
    await page.waitForFunction(
      () => document.querySelectorAll("iframe").length === 0,
    );
    await page.locator("#video-preparation summary").click();
    assert.equal(
      await frame.count(),
      0,
      "Collapsing the section must unload playback",
    );
    await page
      .getByRole("button", { name: "Load YouTube video", exact: true })
      .click();
    await page.getByLabel("Topic", { exact: true }).selectOption("1.2");
    assert.equal(await frame.count(), 0, "Changing topic must unload playback");
    assert.equal(
      await page.getByLabel("Lesson", { exact: true }).inputValue(),
      "FQX48a7SGB8",
    );
    await page.getByLabel("Topic", { exact: true }).selectOption("all");
    await context.setOffline(true);
    await page
      .getByRole("button", { name: "Load YouTube video", exact: true })
      .click();
    assert.equal(await frame.count(), 0, "Offline must not load an iframe");
    assert.match(
      await page.locator("#video-preparation").getByRole("alert").innerText(),
      /internet connection/,
    );
    await context.setOffline(false);
    await page
      .getByRole("button", { name: "Report video issue", exact: true })
      .click();
    assert.match(
      await page.locator("dialog[open] textarea").inputValue(),
      /O_nyEj_hZzg/,
    );
    await page
      .getByRole("button", { name: "Close feedback form", exact: true })
      .click();
    const sentSuggestions = [];
    await page.route(
      "**/studyloop-feedback.mute-king-ecc6.workers.dev/**",
      (route) => {
        sentSuggestions.push(route.request().postDataJSON());
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: '{"ok":true}',
        });
      },
    );
    await page
      .getByRole("button", { name: "Suggest a better video", exact: true })
      .click();
    const suggestion = page.locator("dialog[open]");
    assert.match(await suggestion.innerText(), /hello@studyloop.in/);
    await suggestion
      .getByLabel("YouTube video link", { exact: true })
      .fill("https://example.com/video");
    await suggestion
      .getByLabel("Why is this lesson useful?", { exact: true })
      .fill("Clear worked concentration examples.");
    assert.equal(
      await suggestion
        .getByRole("button", { name: "Send feedback", exact: true })
        .isEnabled(),
      false,
    );
    const beforeSuggestion = requests.length;
    await suggestion
      .getByLabel("YouTube video link", { exact: true })
      .fill("https://youtu.be/FQX48a7SGB8?si=tracking");
    await suggestion.screenshot({
      path: `${output}/suggestion-${viewport.width}.png`,
    });
    await suggestion
      .getByRole("button", { name: "Send feedback", exact: true })
      .click();
    await suggestion
      .getByRole("heading", { name: "Feedback sent", exact: true })
      .waitFor();
    assert.equal(sentSuggestions.length, 1);
    assert.deepEqual(sentSuggestions[0].categories, ["suggestion"]);
    assert.match(sentSuggestions[0].details, /cbse-chemistry-12/);
    assert.match(sentSuggestions[0].details, /Topics: 1.1/);
    assert.match(
      sentSuggestions[0].details,
      /Suggested video: https:\/\/www.youtube.com\/watch\?v=FQX48a7SGB8/,
    );
    assert.doesNotMatch(sentSuggestions[0].details, /tracking/);
    assert.equal(
      requests.length,
      beforeSuggestion,
      "Suggestions must not contact YouTube",
    );
    await suggestion.getByRole("button", { name: "Done", exact: true }).click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    assert.equal(overflow, false, "No horizontal overflow");
    if (viewport.width === 1280) {
      await page.unroute("https://www.youtube-nocookie.com/embed/**");
      const stalledRequests = [];
      await page.route("https://www.youtube-nocookie.com/embed/**", (route) => {
        stalledRequests.push(route);
      });
      await page
        .getByRole("button", { name: "Load YouTube video", exact: true })
        .click();
      await page
        .getByText("YouTube is taking longer than usual to load.", {
          exact: true,
        })
        .waitFor({ timeout: 18000 });
      assert.equal(
        await page
          .getByRole("button", { name: "Reload video", exact: true })
          .isVisible(),
        true,
      );
      await page.unroute("https://www.youtube-nocookie.com/embed/**");
      await page.route("https://www.youtube-nocookie.com/embed/**", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: "<!doctype html><title>Recovered player</title><p>Recovered player fixture</p>",
        }),
      );
      await page
        .getByRole("button", { name: "Reload video", exact: true })
        .click();
      await page
        .frameLocator("iframe[data-testid=lesson-player]")
        .getByText("Recovered player fixture", { exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByText("YouTube is taking longer than usual to load.", {
            exact: true,
          })
          .count(),
        0,
      );
      for (const request of stalledRequests)
        await request.abort().catch(() => {});
      console.log(
        "PASS: stalled embed shows a loading warning and recovers after retry.",
      );
    }
    await context.close();
    console.log(
      `PASS: ${viewport.width}px consent, language, retry, browser help, close, collapse, offline, feedback and layout.`,
    );
  }
  if (process.argv.includes("--catalogue")) {
    const context = await browser.newContext({
      viewport: { width: 360, height: 800 },
    });
    const page = await context.newPage();
    const external = [];
    page.on("request", (request) => {
      if (thirdParty.test(request.url())) external.push(request.url());
    });
    for (const path of [
      "/cbse-math-12/u3-calculus",
      "/cbse-physics-12/practicals-projects",
      "/cbse-chemistry-11/practicals-projects",
      "/cbse-science-9/u4-earth-as-a-system",
      "/calc-ab/u8-app-integration",
    ]) {
      await page.goto(`${base}${path}`, {
        waitUntil: "networkidle",
        timeout: 120000,
      });
      await page.locator("#video-preparation summary").click();
      const topic = page.getByLabel("Topic", { exact: true });
      const values = await topic
        .locator("option:not([disabled])")
        .evaluateAll((options) => options.map((option) => option.value));
      await topic.selectOption(values.at(-1));
      for (const name of ["English", "Hindi / Hinglish"]) {
        const language = page.getByLabel(name, { exact: true });
        assert.equal(
          await language.isEnabled(),
          true,
          `Language unavailable at ${path}`,
        );
        await language.check();
        assert.ok(
          (await page.getByLabel("Lesson", { exact: true }).inputValue())
            .length === 11,
        );
      }
      assert.equal(await page.locator("iframe").count(), 0);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `Overflow at ${path}`,
      );
      assert.equal(
        external.length,
        0,
        "Browsing topic options must not load YouTube",
      );
      console.log(
        `PASS: mobile topic/language navigation and privacy at ${path}`,
      );
    }
    await context.close();
  }
  if (process.argv.includes("--live")) {
    const playbackFailures = [];
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    page.on("requestfailed", (request) =>
      console.log(
        `LIVE REQUEST FAILED: ${new URL(request.url()).hostname}${new URL(request.url()).pathname} ${request.failure()?.errorText}`,
      ),
    );
    page.on("pageerror", (error) =>
      console.log(`LIVE PAGE ERROR: ${error.message}`),
    );
    await page.goto(`${base}/cbse-chemistry-12/u1-solutions`, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await page.locator("#video-preparation summary").click();
    for (const language of ["English", "Hindi / Hinglish"]) {
      await page.getByLabel(language, { exact: true }).check();
      const navigated = page.waitForEvent("framenavigated", {
        predicate: (frame) =>
          frame.url().startsWith("https://www.youtube-nocookie.com/embed/"),
        timeout: 45000,
      });
      await page
        .getByRole("button", { name: "Load YouTube video", exact: true })
        .click();
      await navigated;
      const player = page.frameLocator("iframe[data-testid=lesson-player]");
      try {
        await player
          .locator(
            "button.ytmCuedOverlayPlayButton, button.ytp-large-play-button",
          )
          .waitFor({ state: "visible", timeout: 30000 });
        console.log(
          `LIVE ${language}: ${await player.locator("body").innerText({ timeout: 30000 })}`,
        );
        await page.locator("iframe[data-testid=lesson-player]").screenshot({
          path: `${output}/live-${language === "English" ? "en" : "hi"}.png`,
        });
        await player
          .locator(
            "button.ytmCuedOverlayPlayButton, button.ytp-large-play-button",
          )
          .click();
        const frame = page
          .frames()
          .find((f) =>
            f.url().startsWith("https://www.youtube-nocookie.com/embed/"),
          );
        await frame.waitForFunction(
          () =>
            [...document.querySelectorAll("video")].some(
              (video) => video.currentTime > 1 && !video.paused,
            ),
          undefined,
          { timeout: 45000 },
        );
        console.log(
          `PASS: ${language} real player started streaming. This is not a full lesson review.`,
        );
      } catch (error) {
        console.log(
          `PLAYBACK NOT VERIFIED ${language}: ${await player.locator("body").innerText()}`,
        );
        console.log(
          await player.locator("button").evaluateAll((buttons) =>
            buttons.map((button) => ({
              label: button.getAttribute("aria-label"),
              title: button.title,
              classes: button.className,
            })),
          ),
        );
        await page.locator("iframe[data-testid=lesson-player]").screenshot({
          path: `${output}/blocked-${language === "English" ? "en" : "hi"}.png`,
        });
        playbackFailures.push(language);
      }
      await page
        .getByRole("button", { name: "Close video", exact: true })
        .click();
    }
    await context.close();
    assert.deepEqual(
      playbackFailures,
      [],
      "Real playback could not be verified for all sampled lessons",
    );
  }
} finally {
  await browser.close();
}
