import { NextResponse, type NextRequest } from "next/server";

/**
 * StudyLoop middleware — runs on every request.
 *
 * Three concerns:
 *   1. Security headers (CSP, HSTS, frame deny, etc.) — per IMPLEMENTATION_SPEC.md §11
 *   2. Rate limit on /api/* — basic in-memory bucket (replace with Upstash Redis
 *      when traffic warrants)
 *   3. Future: locale, geo redirects
 */

const RATE_LIMIT_PER_MIN = parseInt(process.env.RATE_LIMIT_PER_MIN ?? "60", 10);
const buckets = new Map<string, { count: number; resetAt: number }>();

function buildContentSecurityPolicy(isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    [
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com",
      isDev
        ? "ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:*"
        : "",
    ]
      .filter(Boolean)
      .join(" "),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security":
    "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const isDev = process.env.NODE_ENV !== "production";

  // 1. Security headers — applied to every response
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(name, value);
  }
  res.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy(isDev),
  );

  // 2. Rate limit on API routes only (skip for SSG pages)
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    const now = Date.now();
    const bucket = buckets.get(ip);

    if (!bucket || bucket.resetAt < now) {
      buckets.set(ip, { count: 1, resetAt: now + 60_000 });
    } else if (bucket.count >= RATE_LIMIT_PER_MIN) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    } else {
      bucket.count++;
    }
  }

  return res;
}

export const config = {
  // Skip middleware for static assets — they're served from Vercel/Cloudflare
  // cache and don't need headers re-applied per request.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
