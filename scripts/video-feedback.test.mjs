import assert from "node:assert/strict";
import test from "node:test";
import { loadSource } from "./lib/source-loader.mjs";

const worker = loadSource("workers/feedback").default;

test("video suggestions use the founder notification route without loading the suggested URL", async () => {
  const emails = [];
  const details =
    "Video suggestion\nCourse: cbse-chemistry-12\nUnit: u1-solutions\nTopics: 1.1\nSuggested video: https://www.youtube.com/watch?v=FQX48a7SGB8\nTeaching language: English\nWhy this lesson: Clear examples <test>";
  const response = await worker.fetch(
    new Request("https://studyloop.in/api/feedback", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://studyloop.in",
      },
      body: JSON.stringify({
        kind: "site",
        categories: ["suggestion"],
        details,
        pageUrl: "https://studyloop.in/cbse-chemistry-12/u1-solutions",
        contactEmail: "",
        website: "",
        openedAt: Date.now() - 5000,
      }),
    }),
    {
      FEEDBACK_EMAIL: {
        async send(message) {
          emails.push(message);
        },
      },
    },
  );
  assert.equal(response.status, 200);
  assert.equal(emails.length, 1);
  assert.equal(emails[0].to, "hello@studyloop.in");
  assert.match(emails[0].subject, /Suggestion or request/);
  assert.ok(emails[0].text.includes(details));
  assert.match(emails[0].html, /&lt;test&gt;/);
});

test("a failed founder notification is not reported as a successful submission", async () => {
  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args);
  try {
    const response = await worker.fetch(
      new Request("https://studyloop.in/api/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://studyloop.in",
        },
        body: JSON.stringify({
          kind: "site",
          categories: ["suggestion"],
          details: "A suggested video for the Solutions chapter.",
          pageUrl: "https://studyloop.in/cbse-chemistry-12/u1-solutions",
          contactEmail: "",
          website: "",
        }),
      }),
      {
        FEEDBACK_EMAIL: {
          async send() {
            throw new Error("permanent delivery failure");
          },
        },
      },
    );
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: "Feedback delivery is unavailable",
    });
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(errors.length, 1);
  } finally {
    console.error = originalError;
  }
});
