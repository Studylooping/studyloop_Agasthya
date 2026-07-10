# StudyLoop Content Intake And Publication Plan

Last updated: 2026-07-11

This repository is allowed to become the primary StudyLoop site only if content
quality, minor-safety, and Cloudflare Free deployability stay enforceable by
scripts rather than memory.

## Operating Principle

The public site may be broad and polished, but every question must stay inside
one of three states:

| State | Meaning | Public behavior |
|---|---|---|
| `human_review_required` | Alpha content awaiting subject mentor review | May appear only with a visible review badge |
| `ai_reviewed` | Founder/AI pre-review completed, no named mentor sign-off | May appear only with a visible review badge |
| `verified` | Named mentor/teacher has signed off | May appear as verified content; `verifiedBy` is required |

No content should be described as fully verified unless `reviewStatus:
"verified"` and `verifiedBy` are both present in source.

## Intake Flow For New Question Batches

1. Author new items in `content/<course>/<unit>/topics.ts`.
2. Keep new items at `reviewStatus: "human_review_required"`.
3. Run the content inventory:

   ```bash
   npm run content:inventory
   ```

4. Export the unit review packet:

   ```bash
   npm run review:export -- <unit-slug>
   ```

5. Send the generated `review-packages/<package-name>/` folder to the mentor.
6. Apply reviewer decisions in the source file:
   - approved items may become `reviewStatus: "verified"` with `verifiedBy`
   - held items remain `human_review_required`
   - rejected items are removed or kept out of live course registries
   - if a whole imported unit has already been externally verified but still
     carries stale flags, run the dry-run reset first:

     ```bash
     npm run content:mark-verified -- --reviewer="Reviewer display name"
     ```

     Then rerun with `--write` only after the reviewer/source label is correct:

     ```bash
     npm run content:mark-verified -- --reviewer="Reviewer display name" --write
     ```

7. Run the full deploy gate:

   ```bash
   npm run audit:deploy
   ```

8. Only then build and deploy static Pages output.

## Production Review Policy

There are two intentional modes:

| Mode | Command | Use |
|---|---|---|
| Labelled alpha | `npm run audit:public-content` | Allows unverified content only if every item carries review metadata and the UI can badge it |
| Strict school launch | `STUDYLOOP_PUBLIC_REVIEW_POLICY=verified-only npm run audit:public-content` | Fails if any public item is not mentor verified |

The first mode lets StudyLoop publish honest alpha tracks. The second mode is
the one to use before sending the site to schools as a trusted bank.

## Cloudflare Free Plan Guardrails

StudyLoop should stay static-first so it can run for a long time on Cloudflare
Pages Free:

- Main practice routes must be static Pages output.
- Practice, review, nickname, and progress must work with browser-local storage.
- API routes and Workers may exist only as optional features, such as feedback.
- The static `out/` folder must stay below Cloudflare Pages Free file limits.
- Deploy scripts must audit the static output before upload.

Current official constraints to watch:

- Cloudflare Pages Free supports up to 20,000 files per site.
- Cloudflare Pages Free includes 500 deploys per month.
- Workers and Pages Functions Free share a 100,000 requests/day quota, so
  learning paths must not depend on Functions.

## Public-Safety Checks

Every deploy gate should confirm:

- no item has missing or invalid `reviewStatus`
- `verified` items have a named `verifiedBy`
- all content IDs and routes are unique
- SVG figures are trusted inline SVG, not executable HTML
- figure-backed items are inventoried with content ID, route, SVG hash, title,
  description, and text-overlap evidence
- no item text or SVG contains scripts, event handlers, `javascript:`, iframes,
  or external object/embed content
- figures have titles and descriptions
- launch-readiness math/SVG rendering checks pass
- MC wrong-answer rationales pass quality checks
- Cloudflare static output is within Free plan limits

## How New Courses Are Added

1. Create `content/<course>/index.ts`.
2. Add unit folders with `topics.ts`.
3. Export the course from `content/courses.ts`.
4. Add or confirm the course appears in `content/learning-paths.ts`.
5. Run `npm run content:inventory`.
6. Run `npm run audit:deploy`.

If the new course uses a new item kind, update `lib/content/types.ts`, the
renderer, the review exporter, and the deploy gate in the same commit.

## Figure-To-Question Integrity

Figures are part of the question contract, not decorative assets. Every SVG
must stay attached to the exact item that references it.

Run:

```bash
npm run audit:figures
```

This writes:

- `Docs/generated/figure-integrity.md`
- `Docs/generated/figure-integrity.json`

The report includes every figure-backed item, its public route, SVG hash, title,
description, and overlap between the figure description and the item text. The
audit fails executable or malformed SVG immediately. In normal mode it warns on
weak text association; in strict mode it fails those too:

```bash
STUDYLOOP_FIGURE_AUDIT=strict npm run audit:figures
```

## Current Decision

It is acceptable to prepare this repository to become the primary site, because
it already has:

- static Pages build support
- local-only study memory
- visible review badges
- launch-readiness audits
- review packet export tooling
- inline SVG content support

It is not acceptable to promote content as fully trusted until the strict
verified-only gate passes.
