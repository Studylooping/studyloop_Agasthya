# Canonical URLs and aggregate analytics

The canonical origin is exported from `lib/site-origin.ts`. Page metadata uses
`pageMetadata` so canonical and social URLs follow the actual route. Preserve
existing page titles and descriptions. Never put request queries, nicknames or
student answers in canonical URLs or structured data.

The static Pages build validates every exported HTML route against Next's
prerender manifest and writes `out/sitemap.xml`. It omits error pages and pages
marked noindex, including practice sessions, the local review notebook and the
teacher answer sheet. `app/robots.ts` advertises the production sitemap.
`pnpm seo:test` checks metadata helpers; `pnpm seo:verify` checks live SEO.
Use `node scripts/verify-seo-release.mjs --all` for the full sitemap HTTP check.

Cloudflare configuration, applied 22 September 2026:

- Zone Single Redirect `StudyLoop canonical hostname` matches exactly www and
  www2 and issues 301 to the apex, preserving path and query. Existing custom
  domains remain attached to Pages.
- Account Bulk Redirect list `studyloop_pages_canonical` maps the production
  Pages alias to the apex. Subpath matching, path suffix and query preservation
  are enabled; include-subdomains is off so previews keep their access gate.
- Pages preview access is restricted using Cloudflare Access. No API token
  permissions or paid subscriptions were changed.
- Host-specific noindex headers also cover Pages aliases in new exports.

Keep the site static on Cloudflare Pages. Do not introduce per-request Next.js
or Worker rendering to implement SEO. `_redirects` cannot perform hostname
redirects; the above Cloudflare rules do that work.

The CSP authorizes only the two additional origins required for Cloudflare's
existing aggregate analytics beacon: static.cloudflareinsights.com for scripts
and cloudflareinsights.com for connections. There is no student-level event
instrumentation. The privacy disclosure distinguishes these aggregate metrics
from local answers, profiles and review data. A loaded script alone is not
proof of working analytics: verify collector acceptance and dashboard data.

After each production deployment, purge the zone and run the educator and SEO
release checks. Keep immutable deployment previews protected. Do not disable
access protection merely to make an unauthenticated preview smoke test pass.
