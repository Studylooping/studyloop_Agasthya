# StudyLoop deployment requirements

- After every successful production deployment, purge the Cloudflare cache for
  `studyloop.in`, then verify the live website. This is a standing founder
  instruction from 19 September 2026.
- Use `pnpm deploy:pages` for the public site. The deployment scripts include the
  purge and release smoke check. For a direct Wrangler or dashboard deployment,
  run `pnpm deploy:verify` after the deployment succeeds. A build or preview upload
  alone is not a production deployment and must not trigger a production purge.
- Do not claim a deployment is fully verified if the purge or live checks fail.
  Distinguish a successful upload from a failed post-deployment check. Purging
  does not prove that stale pages have disappeared; test their canonical URLs
  without cache-busting query strings and check all published custom domains.
- Use the configured API token from environment variables or the ignored
  `.env.cloudflare.local`. Never print, commit, or expose credentials. Its added
  Cache Purge permission is limited to `studyloop.in`; do not broaden it without
  explicit approval. Do not weaken TLS verification to make API requests work.
- Maintain the release smoke checks when the release's expected content changes.
  Never remove an assertion solely to make an unresolved deployment pass.

## Canonical-host release checks

- Canonical site URLs come from `lib/site-origin.ts`. Preserve per-page titles
  and descriptions when changing SEO metadata.
- `www`, `www2` and the production Pages alias redirect to the apex. Preview
  URLs require Cloudflare Access; do not make them public for convenience.
- The static build audits canonical/social metadata and creates a sitemap from
  actual exported routes. Run `pnpm seo:verify` after production deployments.
- Cloudflare aggregate Web Analytics was founder-approved on 22 September 2026.
  Do not add answer, hint, nickname or student-level engagement tracking.

# Optional video preparation

- Founder approved optional YouTube embeds with an explicit ads/privacy notice
  on 19 September 2026. StudyLoop itself must not add advertising or behavioural
  profiling. Never describe YouTube playback as anonymous or ad-free.
- Use privacy-enhanced embeds only after an explicit per-video load action.
  Do not preload third-party thumbnails, player scripts, preconnects or iframes.
  Switching lesson/language, collapsing the section, and leaving the page must
  unload the player; do not persist playback consent.
- Prioritise CBSE Classes 11-12 PCM, with English and Hindi/Hinglish options.
  Label actual concept coverage and distinguish revision from first teaching.
  Half-yearly coverage is school-specific, not a universal CBSE Term 1 syllabus.
- Do not call selections objectively highest rated or imply teacher vetting from
  popularity or oEmbed checks. Keep original creator attribution, source IDs,
  review notes, and availability checks. Do not download or rehost recordings.
- Curate cost-consciously using original creator descriptions, chapter lists and
  targeted transcript samples, not end-to-end viewing of every recording. Do not
  claim full-video review. Use the existing feedback email route for student video
  suggestions; recommendations require review before entering the catalogue.
