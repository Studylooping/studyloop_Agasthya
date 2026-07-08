# StudyLoop

Free STEM practice for school, exams, and deep understanding at
**[studyloop.in](https://studyloop.in)**.

A privacy-first study companion with live practice for AP Calculus AB, CBSE
Class 11 Mathematics, CBSE Class 12 Mathematics, and JEE Main Mathematics.
Original practice questions, hint ladders, deterministic grading,
browser-local nickname profiles, and issue reporting are the core product
pattern. No ads. No tracking.

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

Recommended Pages settings:

1. In Cloudflare, open **Workers & Pages** and choose **Create application**.
2. Select **Pages** > **Import a repository** and choose
   `Studylooping/studyloop_Agasthya`.
3. Set the production branch to `main`.
4. Set the build command to `pnpm run build:pages`.
5. Set the output directory to `out`.
6. Add `NEXT_PUBLIC_SITE_URL=https://www2.studyloop.in` or the final canonical
   hostname as a Pages build variable.
7. Add `NEXT_PUBLIC_FEEDBACK_ENDPOINT=/api/feedback` if a feedback Worker is
   routed on the same hostname.

Feedback notifications should run through the tiny feedback-only Worker, not
the full Next app Worker:

```bash
pnpm deploy:feedback
```

Then route `www2.studyloop.in/api/feedback` to the `studyloop-feedback` Worker
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
|   |-- learning-paths.ts            CBSE/AP/SAT/JEE roadmap
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

## What's not in this alpha yet

These ship in subsequent phases:

- CBSE, JEE, and SAT content tracks
- Spaced-review scheduling beyond simple local resume
- Numeric and symbolic item input
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
report content errors by sharing the item URL and content ID with the project
owner. A proper report form should be connected before public launch.
