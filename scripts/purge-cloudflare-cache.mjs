import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function purgeCloudflareCache(
  env = process.env,
  fetchImpl = fetch,
) {
  const token = env.CLOUDFLARE_API_TOKEN?.trim();
  const zoneId = env.CLOUDFLARE_ZONE_ID?.trim();
  if (!token || !zoneId) {
    throw new Error(
      "Cache purge requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID.",
    );
  }
  if (!/^[a-f0-9]{32}$/i.test(zoneId)) {
    throw new Error(
      "CLOUDFLARE_ZONE_ID must be a 32-character hexadecimal zone ID.",
    );
  }

  const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  async function request(endpoint, options = {}) {
    let response;
    try {
      response = await fetchImpl(endpoint, {
        ...options,
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      throw new Error(
        "Cloudflare request failed or timed out. Check connectivity and trusted certificates; keep TLS verification enabled.",
      );
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error(
        `Cloudflare returned an invalid response (HTTP ${response.status}).`,
      );
    }
    if (!response.ok || payload?.success !== true) {
      // Report status/codes only: never echo a response that might contain secrets.
      const codes = (Array.isArray(payload?.errors) ? payload.errors : [])
        .map((error) => error?.code)
        .filter(Number.isInteger)
        .join(", ");
      throw new Error(
        `Cloudflare rejected the request (HTTP ${response.status}${codes ? `; codes ${codes}` : ""}). Check token scope and Cache Purge permission.`,
      );
    }
    return payload;
  }

  const zone = await request(url);
  if (zone.result?.name !== "studyloop.in") {
    throw new Error(
      "Refusing to purge: the configured zone is not studyloop.in.",
    );
  }
  await request(`${url}/purge_cache`, {
    method: "POST",
    body: JSON.stringify({ purge_everything: true }),
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    if (existsSync(".env.cloudflare.local"))
      process.loadEnvFile(".env.cloudflare.local");
    await purgeCloudflareCache();
    console.log(
      "Cloudflare accepted the studyloop.in cache purge. Live verification is still required.",
    );
  } catch (error) {
    console.error(`Post-deployment cache purge failed: ${error.message}`);
    console.error(
      "An already completed deployment is still published; do not mark the release verified.",
    );
    process.exitCode = 1;
  }
}
