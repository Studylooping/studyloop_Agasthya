# Class 12 Chemistry: Solutions Expansion

Date: 28 September 2026. Founder authorised production deployment after local review.

## Scope

The initial inventory found **50 questions in each of ten NCERT theory
chapters**, not 90. The founder then explicitly selected **Solutions first,
adding 40 questions to each topic**. The other nine chapters remain at 50 each
and still need expansion. They are not reported as complete against the
90-question target.

Solutions now has **250 questions**, including all 50 original items and 200
additions. Each of its five topics has 50 questions: the original ten plus forty.
No multipart subquestion is counted as a separate question.

| Topic | Total | New MCQ | New 2-mark | New 3-mark | New 5-mark | New 4-mark case |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1.1 Concentration and composition | 50 | 20 | 4 | 8 | 4 | 4 |
| 1.2 Solubility, Henry and Raoult laws | 50 | 20 | 4 | 8 | 4 | 4 |
| 1.3 Boiling and freezing | 50 | 20 | 4 | 8 | 4 | 4 |
| 1.4 Osmotic pressure | 50 | 20 | 4 | 8 | 4 | 4 |
| 1.5 Abnormal molar mass | 50 | 20 | 4 | 8 | 4 | 4 |

Total additions: 100 MCQs, 20 VSAQs, 40 SAQs, 20 LAQs and 20 cases.
Every new MCQ has four distinct options, specific distractor feedback and a
worked solution. New written items have explicit one-mark criteria, model
solutions and common errors. All additions have three hints.

## Source Alignment

The NCERT rationalised Class XII books have five theory chapters in each part.
The app already maps these chapters one-to-one; the issue here was insufficient
practice, not incorrect chapter boundaries.

- [NCERT Solutions, 2026-27 reprint](https://www.ncert.nic.in/textbook/pdf/lech101.pdf):
  types of solutions; concentration; solubility; vapour pressure; ideal and
  non-ideal mixtures; colligative properties; abnormal molar masses.
- [NCERT Part I contents](https://www.ncert.nic.in/textbook/pdf/lech1ps.pdf)
- [NCERT Part II contents](https://ncert.nic.in/textbook/pdf/lech2ps.pdf)
- [CBSE Chemistry 2026-27 syllabus](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Chemistry_SecP2_2026-27.pdf)
- [CBSE XII Chemistry 2026-27 sample paper](https://cbseacademic.nic.in/web_material/SQP/ClassXII_2026_27/Chemistry-SQP.pdf):
  confirms MCQ and 2/3/4/5-mark written formats; calculators are not allowed.

The practice is newly authored, not copied from these sources. Case questions
use relevant data or a scenario; decorative diagrams were not added. Existing
figures are preserved. Formative reinforcement and practical work are counted
separately from the ten theory chapters.

## Difficulty And Review

After a second calibration pass the 200 additions comprise:

- d1: 1
- d2: 113
- d3: 84
- d4: 2
- d5: 0

Routine calculations and concept applications were lowered from d3 to d2 where
appropriate. The two d4 items require separating particle contributions in
mixtures. No artificial d5 quota was imposed. Eight original d4 labels were
lowered; original IDs, questions, answers and explanations were preserved.
Original-bank version is now 0.1.5; additions are 0.2.0.

Each topic's 20 new MCQs has five authoring keys at each of A/B/C/D. The app's
existing deterministic display shuffle and source-letter grading are preserved.

New questions are labelled **AI-reviewed; teacher review pending**. There is no
new teacher sign-off. Automated audits cannot certify all chemistry reasoning
or substitute for an independent subject-teacher review.

## Verification

- `node scripts/audit-chemistry12-expansion.mjs`: counts, original preservation,
  unique IDs/stems, choice keys and shuffle grading, hints, rubric totals,
  review metadata, strict KaTeX and rendered field checks.
- The same audit recomputes 61 numeric MCQ keys independently and checks the
  multi-solute numerical regressions. It examines 3,287 text fields and 2,349
  math expressions across the complete chapter.
- `npm run typecheck`: passed, including source hygiene.
- `node scripts/audit-launch-readiness.mjs`: passed.
- Local browser: a new MCQ starts unanswered, rejects the selected incorrect
  option and shows its feedback and worked solution; a new LAQ displays its
  model solution and five one-mark rubric criteria correctly.

Use `node scripts/audit-chemistry12-expansion.mjs --require-all-chapters` for the
future course-wide target. That strict mode is intentionally not expected to
pass until the remaining chapters have at least 90 questions each.

The checks above describe local authoring verification. Production release is
being coordinated with the Class 11 Maths update; deployment, cache purge and
live verification must complete before these additions are reported as live.

Local chapter: http://localhost:3000/cbse-chemistry-12/u1-solutions
