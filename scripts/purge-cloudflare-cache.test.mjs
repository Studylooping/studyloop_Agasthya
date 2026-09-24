import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { purgeCloudflareCache } from "./purge-cloudflare-cache.mjs";

const env = {
  CLOUDFLARE_API_TOKEN: "test-only-token",
  CLOUDFLARE_ZONE_ID: "1".repeat(32),
};
const response = (status, body) =>
  new Response(JSON.stringify(body), { status });
const validZone = () =>
  response(200, { success: true, result: { name: "studyloop.in" } });

test("checks the zone before purging; uses only the official API", async () => {
  const calls = [];
  await purgeCloudflareCache(env, async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? validZone() : response(200, { success: true });
  });
  assert.equal(calls.length, 2);
  assert.equal(
    calls[0].url,
    `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}`,
  );
  assert.equal(calls[1].url, `${calls[0].url}/purge_cache`);
  assert.equal(calls[1].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    purge_everything: true,
  });
  for (const { options } of calls) {
    assert.equal(
      options.headers.Authorization,
      `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
    );
    assert.equal(options.redirect, "error");
    assert(options.signal instanceof AbortSignal);
  }
});

test("missing credentials and invalid zone IDs make no API request", async () => {
  const unexpectedFetch = () => assert.fail("must not make a request");
  await assert.rejects(purgeCloudflareCache({}, unexpectedFetch), /requires/);
  await assert.rejects(
    purgeCloudflareCache(
      { ...env, CLOUDFLARE_ZONE_ID: "wrong" },
      unexpectedFetch,
    ),
    /zone ID/,
  );
});

test("refuses to purge another zone", async () => {
  let calls = 0;
  await assert.rejects(
    purgeCloudflareCache(env, async () => {
      calls++;
      return response(200, { success: true, result: { name: "example.org" } });
    }),
    /Refusing to purge/,
  );
  assert.equal(calls, 1);
});

for (const status of [401, 403, 429, 500]) {
  test(`HTTP ${status} fails without retrying or leaking the token`, async () => {
    let calls = 0;
    await assert.rejects(
      purgeCloudflareCache(env, async () => {
        calls++;
        return calls === 1
          ? validZone()
          : response(status, {
              success: false,
              errors: [{ code: 10000, message: env.CLOUDFLARE_API_TOKEN }],
            });
      }),
      (error) => {
        assert.match(error.message, new RegExp(`HTTP ${status}`));
        assert(!error.message.includes(env.CLOUDFLARE_API_TOKEN));
        return true;
      },
    );
    assert.equal(calls, 2);
  });
}

test("HTTP 200 with success false is not treated as a successful purge", async () => {
  let calls = 0;
  await assert.rejects(
    purgeCloudflareCache(env, async () =>
      ++calls === 1 ? validZone() : response(200, { success: false }),
    ),
    /rejected/,
  );
});

test("invalid JSON and network failures stop verification", async () => {
  await assert.rejects(
    purgeCloudflareCache(env, async () => new Response("not JSON")),
    /invalid response/,
  );
  await assert.rejects(
    purgeCloudflareCache(env, async () => {
      throw new Error("offline");
    }),
    /failed or timed out/,
  );
});

test("all deployment commands run purge then verification only after deployment succeeds", () => {
  const { scripts } = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  for (const [name, command] of Object.entries(scripts)) {
    if (
      name === "deploy" ||
      (name.startsWith("deploy:") && name !== "deploy:verify")
    ) {
      assert(command.endsWith(" && pnpm run deploy:verify"), name);
    }
  }
  assert.equal(
    scripts["deploy:verify"],
    "node scripts/purge-cloudflare-cache.mjs && node scripts/verify-educator-release.mjs https://studyloop.in && node scripts/verify-educator-release.mjs https://www.studyloop.in && node scripts/verify-educator-release.mjs https://www2.studyloop.in",
  );
  for (const name of [
    "build",
    "build:pages",
    "preview",
    "upload",
    "upload:cloudflare",
  ]) {
    assert(!scripts[name].includes("deploy:verify"), name);
  }
});
