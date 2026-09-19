# Optional video preparation

## Catalogue and editorial limits

The 20 September 2026 catalogue has 425 scoped selections mapped to 90 live
units. All 425 CBSE topics have English and Hindi/Hinglish support. All 81 AP
Calculus topics have English support, and 66 also have Hindi support.

Selections were checked against topic scope, creator descriptions/listings,
chapter details and available source evidence. Original titles and channels
are retained in the locally generated metadata. These are relevant learning
supplements, not an objective highest-rated ranking, a full-duration review,
or a teacher sign-off. Some selections cover only part of a topic. Laboratory
videos do not replace supervised school experiments.

AP Hindi gaps remain at topic codes 1.3, 1.4, 1.9, 2.3, 4.7, 5.1, 5.8, 5.9,
5.12, 6.1, 6.5, 8.2, 8.3, 8.7 and 8.8. The strict coverage check fails on these
gaps rather than treating unrelated videos as coverage.

## Privacy and suggestions

No YouTube image, iframe or script is requested before a student's explicit
load action. The privacy-enhanced player may still show ads and process data;
the notice is shown before loading. Changing topic, language or lesson, closing
the player, or collapsing the section clears playback consent. Consent is not
persisted and practice remains available without videos.

The suggestion form accepts a validated HTTPS YouTube URL, topic, language
and rationale. It uses the existing founder-feedback route and does not load
the submitted URL or publish suggestions automatically. On 20 September the
production Worker reported permanent delivery failure for hello@studyloop.in.
Automatic email notification remains unresolved. Errors must never show a
successful submission; the email-draft fallback does not repair a mailbox.

## Verification and deployment

Mapping and privacy regression tests, source typecheck, desktop/mobile browser
checks and the full 6,464-page static build passed. Real English and Hindi
Solutions playback was sampled; every recording was not played end-to-end.

Use the static Cloudflare Pages export in `out`, not `.next` or the OpenNext
Worker bundle. Browser interactions remain client-side. The feedback Worker
is a separate service, excluded from the static export. Never deploy local
credentials or build workspaces. Purge the production zone after a successful
deployment and verify canonical URLs on each published custom domain.
