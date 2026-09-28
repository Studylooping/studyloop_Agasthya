# Class 11 Mathematics Chapter Expansion

## Scope

Add 40 questions to each of the nine existing Unit 1 topics. Expand every
NCERT Class 11 Mathematics chapter to at least 90 main-bank questions.
Existing questions, content IDs, and routes remain available. The separate
challenge bank is not counted toward chapter minima.

## Sources

- NCERT Mathematics XI, 2026-27 contents: https://ncert.nic.in/textbook/pdf/kemh1ps.pdf
- NCERT chapter PDFs: https://ncert.nic.in/textbook/pdf/kemh101.pdf through kemh114.pdf
- CBSE Mathematics 041, 2026-27:
  https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Maths_SecP2_2026-27.pdf
- CBSE Class XII Mathematics sample paper, 2025-26 (question-type reference,
  not a claim about a newly issued 2026-27 sample paper):
  https://cbseacademic.nic.in/web_material/SQP/ClassXII_2025_26/Maths-SQP.pdf

These are original practice questions aligned to the topics, not copied
NCERT exercises or official CBSE questions.

## Authoring Rules

- Use single-correct MCQs, assertion-reason, very short answers, short answers,
  long answers and case-based questions. This is a practice-bank mix, not an
  assertion that CBSE prescribes a fixed Class 11 school-paper format.
- New Unit 1 topic additions retain the current five objective/five written
  pattern, repeated four times.
- Difficulty 1: foundational recognition; 2: standard concept or one-formula
  application; 3: connected steps or a meaningful condition; 4: substantial
  reasoning involving multiple ideas. Do not increase labels merely because
  calculations are longer.
- Include correct-answer working, three hints, meaningful wrong-option
  explanations, and mark-specific written rubrics.
- Use delimited inline mathematics inside prose; do not send prose through
  display mathematics. Draw figures only when they supply necessary data.
- Follow the rationalised textbook chapters rather than treating CBSE units
  as chapters. Keep formative-only extensions out of the core expansion.
- New material is AI-reviewed, not teacher-verified. Automated checks do not
  replace a teacher's independent review.

## Class 11/12 Mathematics Question Types

The verified Class XII sample paper uses 18 single-correct MCQs, 2
assertion-reason questions, 5 two-mark very short answers, 6 three-mark short
answers, 4 five-mark long answers, and 3 four-mark case studies. Calculators
are not allowed. Class XI school assessments can vary; the CBSE syllabus
supplies cognitive-demand and assessment guidance rather than that same
mandatory paper blueprint.

StudyLoop should therefore retain objective questions AND written,
step-marked problems in these branches. Do not substitute the JEE
MCQ/numerical-value-only pattern. A practice bank is not a mock examination:
the bank need not have the sample paper's exact category proportions.

## Chapter Counts

| NCERT chapter                                  | Main-bank questions |
| ---------------------------------------------- | ------------------: |
| 1. Sets                                        |                 100 |
| 2. Relations and Functions                     |                 150 |
| 3. Trigonometric Functions                     |                 200 |
| 4. Complex Numbers and Quadratic Equations     |                  90 |
| 5. Linear Inequalities                         |                  90 |
| 6. Permutations and Combinations               |                  90 |
| 7. Binomial Theorem                            |                  90 |
| 8. Sequences and Series                        |                  90 |
| 9. Straight Lines                              |                 100 |
| 10. Conic Sections                             |                 100 |
| 11. Introduction to Three-dimensional Geometry |                  90 |
| 12. Limits and Derivatives                     |                  90 |
| 13. Statistics                                 |                  90 |
| 14. Probability                                |                  90 |
| **Total**                                      |           **1,460** |

There are 1,170 additions. The 290 original questions are preserved, with
unchanged content IDs, versions and answers. Each Unit 1 topic now contains
25 MCQs and 25 written questions, up from 5 and 5. The separately labelled
150-question challenge bank is excluded from these totals.

The added questions cover 697 routine (d2) and 473 multi-step (d3) items.
The final calibration lowered 29 provisional d4 labels: ordinary case splitting,
polynomial coefficient collection, and scaffolded GP or statistics problems
are standard multi-step practice, not automatically hard because they carry
four or five marks. Difficulty is not increased to meet a target distribution.
The existing, separate challenge bank remains available for harder practice.
Some skill families have multiple numerical variants for deliberate practice;
these are not claimed to be 1,170 different solution techniques.

## Progress

- [x] Verify chapter mapping against NCERT and CBSE.
- [x] Expand Unit 1: Sets; Relations and Functions; Trigonometric Functions.
- [x] Expand algebra: Complex Numbers; Inequalities; Permutations and
      Combinations; Binomial Theorem; Sequences and Series.
- [x] Expand coordinate geometry: Straight Lines; Conics; Introduction to 3D.
- [x] Expand Limits and Derivatives; Statistics; Probability.
- [x] Math-specific audit: chapter minima, preserved originals, unique
      IDs/problems, keys, hints, written rubrics, 16,070 rendered text fields,
      1,370 numerical options, and 338 independent numerical MC checks.
- [x] Run content, mathematics, rendering, type, and build checks.

## Verification Results

- `node scripts/audit-math11-expansion.mjs`: passed on the final content.
  This checks all 14 chapter minima, all nine Unit 1 topic counts, original
  question preservation, unique IDs and exact problem signatures, answer-key
  consistency, distinct numerical choices, hints, solutions and rubric totals.
- `npm run typecheck`: passed in the shared working repository.
- `npm run launch:audit`: passed in an isolated copy containing the Maths
  expansion, avoiding interference from concurrent Chemistry/Physics work.
  The educator regression pass covered 94,722 text fields and 7,431 items.
- `npm run build:pages`: completed in that isolated copy, generating all
  7,635 pages. A fresh production compilation also passed after the inline
  math spacing repair; the final graph-stem wording was checked by the
  content audit and in the main local browser.
- Browser checks: chapter counts, 50 links per Unit 1 topic, wrong-answer
  worked solutions, written rubrics, absolute-value/parabola/sine diagrams,
  and 390-pixel mobile layouts. Fixed unnecessary fraction/subscript
  scrollbars and checked tall matrices for regressions. Long probability
  rosters now use standard ellipsis notation. The sine-range item requires
  reading the supplied graph rather than obtaining the answer from a formula.
- Main local course and newly added question routes load on port 3000.

The 338 independent numerical checks cover a subset of MC answers, not a
proof of every symbolic answer or written solution. Exact-duplicate checks
also do not claim that numerical variants teach different techniques.
An independent content vet remains useful before publication.

The expansion was prepared and checked locally first. The founder authorised
publication together with the completed Physics additions on 28 September 2026.
