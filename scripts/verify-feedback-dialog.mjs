import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const { chromium } = createRequire(import.meta.url)("playwright");
const base = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge",
});
const output = "review-packages/feedback-dialog";
mkdirSync(output, { recursive: true });
try {
  for (const viewport of [
    { width: 1280, height: 600 },
    { width: 360, height: 640 },
    { width: 800, height: 360 },
  ]) {
    const context = await browser.newContext({ viewport, hasTouch: true });
    const page = await context.newPage();
    const sent = [];
    const thirdParty = [];
    let deliveryFails = true;
    page.on("request", (request) => {
      if (/youtube|googlevideo|ytimg|doubleclick/.test(request.url()))
        thirdParty.push(request.url());
    });
    await page.route(
      "**/studyloop-feedback.mute-king-ecc6.workers.dev/**",
      (route) => {
        sent.push(route.request().postDataJSON());
        return route.fulfill({
          status: deliveryFails ? 503 : 200,
          contentType: "application/json",
          body: JSON.stringify(
            deliveryFails ? { error: "Test delivery failure" } : { ok: true },
          ),
        });
      },
    );
    await page.goto(`${base}/cbse-chemistry-12/u1-solutions`, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await page.locator("#video-preparation summary").click();
    await page
      .getByRole("button", { name: "Suggest a better video", exact: true })
      .click();
    const dialog = page.locator("dialog[open]");
    const send = dialog.getByRole("button", {
      name: "Send suggestion",
      exact: true,
    });
    const fields = dialog.getByTestId("feedback-fields");
    const url = dialog.getByLabel("YouTube video link", { exact: true });
    const reason = dialog.getByLabel("Why is this lesson useful?", {
      exact: true,
    });
    assert(
      await send.isEnabled(),
      "Missing input must be explained, not silently disable Send",
    );
    await send.click();
    assert.equal(sent.length, 0);
    assert(await dialog.getByRole("alert").isVisible());
    assert(await url.evaluate((el) => el === document.activeElement));
    await url.fill("www.youtube.com/watch?v=FQX48a7SGB8&si=tracking");
    await reason.fill("Clear worked examples.");
    const rect = await dialog.boundingBox();
    // Native scrollbar/border presses target the dialog itself, not a backdrop.
    await dialog.dispatchEvent("mousedown", {
      button: 0,
      clientX: rect.x + rect.width - 2,
      clientY: rect.y + rect.height / 2,
    });
    assert.equal(
      await dialog.count(),
      1,
      "Scrollbar press must not close the form",
    );
    await fields.evaluate((el) => {
      el.scrollTop = 0;
    });
    const bodyRect = await fields.boundingBox();
    await page.mouse.move(
      bodyRect.x + bodyRect.width - 8,
      bodyRect.y + bodyRect.height / 2,
    );
    await page.mouse.wheel(0, 900);
    await page.waitForFunction(
      () =>
        document.querySelector("dialog[open] [data-testid=feedback-fields]")
          ?.scrollTop > 0,
    );
    assert.equal(await reason.inputValue(), "Clear worked examples.");
    const footerBefore = await send.boundingBox();
    await fields.evaluate((el) => {
      el.scrollTop = 0;
    });
    const cdp = await context.newCDPSession(page);
    const x = bodyRect.x + bodyRect.width / 2;
    const y = bodyRect.y + bodyRect.height * 0.8;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let step = 1; step <= 5; step++)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y - (bodyRect.height * step) / 10 }],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    assert.equal(
      await dialog.count(),
      1,
      "Touch scroll must not dismiss the dialog",
    );
    const footerAfter = await send.boundingBox();
    assert(
      Math.abs(footerAfter.y - footerBefore.y) < 2,
      "Send stays fixed while fields scroll",
    );
    assert(
      footerAfter.y + footerAfter.height <= viewport.height,
      "Send stays within the viewport",
    );
    await dialog
      .getByLabel("Email (optional)", { exact: true })
      .fill("invalid-address");
    await send.click();
    assert.equal(sent.length, 0);
    assert(await dialog.getByText(/Enter a valid email address/).isVisible());
    await dialog.getByLabel("Email (optional)", { exact: true }).fill("");
    await send.click();
    await dialog
      .getByText("We could not send this automatically right now.", {
        exact: true,
      })
      .waitFor();
    assert.equal(
      await url.inputValue(),
      "www.youtube.com/watch?v=FQX48a7SGB8&si=tracking",
    );
    assert(await send.isEnabled(), "Failed delivery must allow retry");
    const failureBox = await dialog.getByRole("alert").boundingBox();
    assert(
      failureBox.y >= 0 && failureBox.y + failureBox.height <= viewport.height,
      "Delivery errors stay visible beside the actions",
    );
    await dialog.screenshot({
      path: `${output}/suggestion-${viewport.width}x${viewport.height}.png`,
    });
    deliveryFails = false;
    await send.click();
    await dialog
      .getByRole("heading", { name: "Feedback sent", exact: true })
      .waitFor();
    assert.equal(sent.length, 2);
    assert.deepEqual(sent[1].categories, ["suggestion"]);
    assert.match(
      sent[1].details,
      /Suggested video: https:\/\/www.youtube.com\/watch\?v=FQX48a7SGB8/,
    );
    assert.doesNotMatch(sent[1].details, /tracking/);
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await page.waitForFunction(
      () => document.documentElement.style.overflow !== "hidden",
    );

    // The shared site form retains required-category validation.
    await page
      .getByRole("button", { name: "Report video issue", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Send feedback", exact: true })
      .click();
    assert(
      await dialog
        .getByText("Choose a feedback type.", { exact: true })
        .isVisible(),
    );
    await dialog.getByLabel("Something is broken", { exact: true }).check();
    await dialog
      .getByRole("button", { name: "Send feedback", exact: true })
      .click();
    await dialog
      .getByRole("heading", { name: "Feedback sent", exact: true })
      .waitFor();
    assert.equal(sent.length, 3);
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () =>
        !document.querySelector("dialog[open]") &&
        document.documentElement.style.overflow !== "hidden",
    );
    await page.goto(`${base}/calc-ab/u1-limits/t1-1-mc-001`, {
      waitUntil: "networkidle",
      timeout: 120000,
    });
    await page
      .getByRole("button", { name: "Flag this question", exact: true })
      .click();
    await dialog
      .getByLabel("Answer or solution is wrong", { exact: true })
      .check();
    await dialog
      .getByRole("button", { name: "Send feedback", exact: true })
      .click();
    await dialog
      .getByRole("heading", { name: "Feedback sent", exact: true })
      .waitFor();
    assert.equal(sent.length, 4);
    assert.equal(sent[3].kind, "question");
    assert(sent[3].context.contentId);
    assert.equal(sent[3].details, "", "Question details remain optional");
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    assert.equal(
      thirdParty.length,
      0,
      "Suggesting/reporting must not load YouTube",
    );
    console.log(
      `PASS ${viewport.width}x${viewport.height}: scrolling, fixed actions, validation, URL normalization, failed delivery/retry, site feedback and question reports.`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
