# StudyLoop

Free STEM practice for school, exams, and deep understanding at
**[studyloop.in](https://studyloop.in)**.

A privacy-first study companion with live practice for AP Calculus AB and CBSE
school subjects. Original practice questions, hint ladders, deterministic
grading, browser-local nickname profiles, and issue reporting are the core
product pattern. No StudyLoop ads or behavioural tracking. Optional, opt-in
YouTube lessons use privacy-enhanced embeds but may show ads and process playback
data; questions remain usable without loading them.

This repository is the deployable StudyLoop application and its original
question banks.

---

## Prerequisites

- **Node.js 22 LTS** — install via [nvm](https://github.com/nvm-sh/nvm) or
  [Volta](https://volta.sh)
- **pnpm 9+** — `npm install -g pnpm` (or `corepack enable pnpm`)
- A code editor (VS Code recommended)
- Git
- A GitHub account with access to this repository
- A Cloudflare account for Workers, DNS, and feedback notifications

---

## Local development

```bash
# Clone and install
git clone https://github.com/Studylooping/studyloop_Agasthya.git
cd studyloop_Agasthya
pnpm install

# Copy environment template (no real secrets needed yet — public site only)
cp .env.example .env.local

# Start the dev server
pnpm dev
# → http://localhost:3000
```

`pnpm dev` uses a separate `.next-dev` folder and refreshes it on startup.
This avoids stale development chunks such as `Cannot find module './692.js'`.
If the dev server ever crashes, stop it with `Ctrl+C` and run `pnpm dev`
again.

The site should load with a broad StudyLoop landing page, theme toggle, public
pages at `/`, `/about`, `/ethics`, `/disclaimer`, `/changelog`, and the first
working course path:

- `/calc-ab`
- `/calc-ab/u1-limits`
- `/calc-ab/u1-limits/t1-1-mc-001`
- `/calc-ab/u1-limits/t1-1-frq-001`
- `/session/calc-ab/u1-limits`
- `/calc-ab/u2-differentiation`
- `/calc-ab/u2-differentiation/t2-1-mc-001`
- `/calc-ab/u2-differentiation/t2-10-frq-001`
- `/session/calc-ab/u2-differentiation`
- `/calc-ab/u3-comp-implicit`
- `/calc-ab/u3-comp-implicit/t3-1-mc-001`
- `/calc-ab/u3-comp-implicit/t3-6-frq-001`
- `/session/calc-ab/u3-comp-implicit`
- `/calc-ab/u4-contextual-app`
- `/calc-ab/u4-contextual-app/t4-1-mc-001`
- `/calc-ab/u4-contextual-app/t4-7-frq-001`
- `/session/calc-ab/u4-contextual-app`
- `/calc-ab/u5-analytical-app`
- `/calc-ab/u5-analytical-app/t5-1-mc-004`
- `/calc-ab/u5-analytical-app/t5-11-frq-001`
- `/session/calc-ab/u5-analytical-app`
- `/calc-ab/u6-integration`
- `/calc-ab/u6-integration/t6-2-mc-001`
- `/calc-ab/u6-integration/t6-10-frq-001`
- `/calc-ab/u6-integration/t6-11-mc-001`
- `/session/calc-ab/u6-integration`
- `/calc-ab/u7-diff-eqs`
- `/calc-ab/u7-diff-eqs/t7-3-mc-004`
- `/calc-ab/u7-diff-eqs/t7-6-frq-001`
- `/session/calc-ab/u7-diff-eqs`
- `/calc-ab/u8-app-integration`
- `/calc-ab/u8-app-integration/t8-9-mc-001`
- `/calc-ab/u8-app-integration/t8-12-frq-001`
- `/session/calc-ab/u8-app-integration`
- `/review`

A 404 lives at any unknown URL.

---

## Scripts

| Command                                    | What it does                                                 |
| ------------------------------------------ | ------------------------------------------------------------ |
| `pnpm dev`                                 | Clean `.next-dev` and start the dev server with hot reload   |
| `pnpm clean`                               | Remove generated Next.js build folders                       |
| `pnpm build`                               | Build the production Next.js bundle                          |
| `pnpm build:pages`                         | Build static Cloudflare Pages output in `out/`               |
| `pnpm start`                               | Run the production build locally                             |
| `pnpm build:cloudflare`                    | Build the OpenNext Worker bundle                             |
| `pnpm deploy:cloudflare`                   | Deploy an already-built Worker bundle                        |
| `pnpm deploy:pages`                        | Build and upload static Pages output to project `studyloop2` |
| `pnpm deploy:feedback`                     | Deploy the tiny feedback-only Worker                         |
| `pnpm lint`                                | ESLint check                                                 |
| `pnpm typecheck`                           | TypeScript check (no emit)                                   |
| `pnpm feedback:audit`                      | Check MCQ wrong-answer feedback quality                      |
| `pnpm review:export -- u2-differentiation` | Export Unit 2 reviewer package                               |
| `pnpm review:export -- u3-comp-implicit`   | Export Unit 3 reviewer package                               |
| `pnpm review:export -- u4-contextual-app`  | Export Unit 4 reviewer package                               |
| `pnpm review:export -- u5-analytical-app`  | Export Unit 5 reviewer package                               |
| `pnpm review:export -- u6-integration`     | Export Unit 6 reviewer package                               |
| `pnpm review:export -- u7-diff-eqs`        | Export Unit 7 reviewer package                               |
| `pnpm review:export -- u8-app-integration` | Export Unit 8 reviewer package                               |
| `pnpm format`                              | Prettier write                                               |
| `pnpm format:check`                        | Prettier check (CI)                                          |

---

## Deploying to Cloudflare

The public learning site should deploy as static Cloudflare Pages output. This
keeps course, unit, question, and practice-session pages out of the Worker
runtime, which is important on Cloudflare's free Worker CPU limits.

**Required after every production deployment:** purge the `studyloop.in` cache,
then run the release smoke checks. The `deploy`, `deploy:cloudflare`,
`deploy:pages`, and `deploy:feedback` scripts do this automatically after a
successful deployment. Failed purges or live checks make the command fail, but
do not roll back an already published deployment. Update the smoke checks when
release expectations change; do not ignore a failing withdrawn-question check.

For a direct Wrangler or dashboard deployment, run `pnpm deploy:verify` after
the deployment succeeds. This checks the bare domain, `www`, and `www2` without
cache-busting. Repository-connected Cloudflare builds do not run this local
post-deployment command automatically; do not put it in the build command,
because the new deployment is not live at that point.

The purge script reads `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID` from the
environment or the ignored `.env.cloudflare.local` file. The token needs
**Cache Purge** for **studyloop.in only**, in addition to its existing deployment
access. Never commit the file or disable TLS verification. Local test:
`node --test scripts/purge-cloudflare-cache.test.mjs` (no network requests).

Recommended Pages settings:

1. In Cloudflare, open **Workers & Pages** and choose **Create application**.
2. Select **Pages** > **Import a repository** and choose
   `Studylooping/studyloop_Agasthya`.
3. Set the production branch to `main`.
4. Set the build command to `pnpm run build:pages`.
5. Set the output directory to `out`.
6. Add `NEXT_PUBLIC_SITE_URL=https://www.studyloop.in` or the final canonical
   hostname as a Pages build variable.
7. Add `NEXT_PUBLIC_FEEDBACK_ENDPOINT=/api/feedback` if a feedback Worker is
   routed on the same hostname.

Feedback notifications should run through the tiny feedback-only Worker, not
the full Next app Worker:

```bash
pnpm deploy:feedback
```

Then route `www.studyloop.in/api/feedback` to the `studyloop-feedback` Worker
or set `NEXT_PUBLIC_FEEDBACK_ENDPOINT` to the Worker URL/subdomain before the
Pages build. Before enabling public notifications, verify `hello@studyloop.in`
under **Email Service > Email Routing > Destination Addresses** and onboard
`studyloop.in` as an Email Service domain so `feedback@studyloop.in` can send.

The OpenNext Worker scripts are still present for experimentation, but they are
not the recommended public deployment path for the question site.

---

## Project structure

```
studyloop/
|-- app/
|   |-- (public)/                    Public pages and broad landing page
|   |-- (learn)/                     Course, unit, and item pages
|   |-- (focus)/                     Distraction-free practice sessions
|   |-- globals.css                  Tailwind layers and design tokens
|   |-- layout.tsx                   Root layout, fonts, metadata
|   `-- not-found.tsx                Custom 404
|-- components/
|   |-- learn/                       Attempt UIs, breadcrumbs, badges
|   |-- math/                        KaTeX render helpers
|   |-- review/                      Local mistake notebook and review practice
|   |-- site/                        Header, footer, theme toggle
|   `-- ui/                          shadcn primitives
|-- content/
|   |-- learning-paths.ts            Public AP/CBSE subject list
|   |-- courses.ts                   Live course registry
|   `-- calc-ab/                     AP Calc AB content, starting with Units 1-8
|-- lib/
|   |-- content/types.ts             Course and item data types
|   |-- grading/mc.ts                Deterministic MC grading
|   |-- local-memory.ts              Browser-local nickname profiles and progress
|   |-- review-memory.ts             Browser-local saved errors and mastery
|   `-- utils.ts                     cn() helper, SITE constants
|-- public/                          Manifest and StudyLoop icons
|-- middleware.ts                    Security headers + API rate limit
|-- package.json
`-- README.md
```

---

## Design tokens

Current design foundation:

- **Fonts.** Inter (UI), Source Serif 4 (lesson body — phase 2+),
  JetBrains Mono (math input — phase 2+). All loaded via `next/font/google`
  so they're self-hosted at build time (no external request at runtime).
- **Color.** Calm neutral background, deep indigo (`hsl(244 58% 51%)`) accent.
  Mirrored dark mode (`hsl(234 89% 74%)` accent on `hsl(224 27% 9%)`
  background). All colors as CSS variables in `app/globals.css`.
- **Spacing.** Strict 4px scale — Tailwind defaults.
- **Border radius.** `--radius: 0.5rem` (8px) default, `0.75rem` (12px) for
  cards.
- **Motion.** Default 150-200ms; `prefers-reduced-motion` honored globally
  via `app/globals.css`.

---

## Accessibility

Target: WCAG 2.2 AA. Verified before launch with axe DevTools.

- Skip-to-content link on every page
- Semantic landmarks (`<header>`, `<main>`, `<footer>`)
- Visible focus rings (never `outline: none` without replacement)
- Color is not the only signal (icons accompany green/red feedback)
- Keyboard navigation works for every interactive element
- All fonts load via `next/font` (no FOUT, no layout shift)

---

## Optional video preparation

Chapter pages provide topic-filtered English and Hindi/Hinglish lesson selections.
Each selection records its actual concept coverage and whether it is a chapter
lesson, revision or a focused refresher. These are supplements, not guarantees of
complete syllabus coverage or objective popularity rankings.

YouTube's privacy-enhanced player loads only after an explicit click and notice
about ads and playback data. No YouTube thumbnail, iframe or script loads on the
initial page. Changing topic, lesson or language clears playback consent.

Students can use **Suggest a better video** to submit a YouTube link, topic,
language and reason. The existing feedback worker targets `hello@studyloop.in`;
suggestions are not published automatically. The latest live check returned a
permanent delivery failure for that mailbox, so automatic notification is not
currently verified. Failed submissions offer an email-draft fallback. Local UI
tests stub delivery rather than emailing the founder.

Run `pnpm videos:audit` for mapping integrity, coverage reporting and privacy tests;
`pnpm videos:coverage` is the stricter zero-gap check and currently fails for 15
AP Calculus Hindi topic gaps. All CBSE topics have both language options; every
AP topic has English support. Do not describe the catalogue as fully bilingual.
Run `pnpm videos:check-links` for current YouTube availability. Refresh stored
titles/channels with `node --use-system-ca scripts/check-video-lessons.mjs --refresh`.
An availability check is not an academic review or a guarantee of regional playback.
Research notes are kept in the local `review-packages/videos-*.md` files.

## What's not in this alpha yet

These remain active roadmap items:

- Spaced-review scheduling beyond simple local resume
- Supabase database wiring + RLS
- Admin console
- SymPy serverless function for symbolic grading
- AI content drafting pipeline (`scripts/draft-items.ts`)
- Sentry error monitoring
- E2E tests (Playwright)

Each should be built on top of the current AP Calc loop without breaking the
working routes listed above.

---

## License

MIT. See `LICENSE`. The mission is public-service education; the code is
free to fork and adapt.

---

## Contributing

Public contributions welcome once mentors come on board. During alpha testing,
report content errors with the feedback form on the site or by sharing the item
URL and content ID with the project owner.
