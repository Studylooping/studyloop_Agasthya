# Class 11 Physics: NCERT chapter expansion

Requested 26 September 2026. Scope is Physics, not Mathematics. Use NCERT
chapters rather than treating broad CBSE curriculum units as chapters.
Retain existing content IDs and URLs. Do not deploy without an explicit release
request; new questions require local checks and honest review status.

## Baseline

| NCERT chapter | Existing items | Minimum additions for 90 |
| --- | ---: | ---: |
| Units and Measurement | 50 | 40 |
| Motion in a Straight Line | 20 | 70 |
| Motion in a Plane | 40 | 50 |
| Laws of Motion | 50 | 40 |
| Work, Energy and Power | 60 | 30 |
| System of Particles and Rotational Motion | 70 | 20 |
| Gravitation | 50 | 40 |
| Mechanical Properties of Solids | 10 | 80 |
| Mechanical Properties of Fluids | 50 | 40 |
| Thermal Properties of Matter | 20 | 70 |
| Thermodynamics | 70 | 20 |
| Kinetic Theory | 50 | 40 |
| Oscillations | 20 | 70 |
| Waves | 60 | 30 |
| Total theory | 620 | 640 |

Practical/viva questions are not counted towards the theory minimum. A case
with several subparts counts as one item, not several questions.

## Current progress

The first milestone is the explicit minimum of 90 items per NCERT chapter.
This does not claim that every existing subtopic has received 40 additional items.
No parallel authoring agents are being used, as requested.

Release note, 28 September 2026: the founder authorised publishing the completed
chapter 1-7 additions together with the Maths expansion, after release validation.
This does not change the remaining-work counts for chapters 8-14 below.

| NCERT chapters | Current items per chapter | Status |
| --- | ---: | --- |
| 1. Units and Measurement | 90 | Expanded locally |
| 2. Motion in a Straight Line | 90 | Expanded locally |
| 3. Motion in a Plane | 90 | Expanded locally |
| 4. Laws of Motion | 90 | Expanded locally |
| 5. Work, Energy and Power | 90 | Expanded locally |
| 6. System of Particles and Rotational Motion | 90 | Expanded locally |
| 7. Gravitation | 90 | Expanded locally |
| 8. Mechanical Properties of Solids | 10 | 80 additions remain |
| 9. Mechanical Properties of Fluids | 50 | 40 additions remain |
| 10. Thermal Properties of Matter | 20 | 70 additions remain |
| 11. Thermodynamics | 70 | 20 additions remain |
| 12. Kinetic Theory | 50 | 40 additions remain |
| 13. Oscillations | 20 | 70 additions remain |
| 14. Waves | 60 | 30 additions remain |

There are 290 additions (145 MCQs and 145 constructed-response items), bringing
the theory bank to 910. Another 350 are required for the chapter minimum.
Each of chapters 1-7 now has 45 MCQs and 45 constructed-response items.
The new questions retain `ai_reviewed` status; this is not independent teacher
verification and not authorization for a production release.

The course hub now lists NCERT chapters with live counts and links to their
mapped subtopics. Original item IDs, URLs and the existing broad-unit navigation
remain intact.

The post-review distribution of the 290 additions is d1: 2, d2: 171, d3: 111,
d4: 6, d5: 0. Sixteen routine items were lowered from d3 to d2 during review.
This is an evidence-based distribution, not a target percentage of hard items.

At this checkpoint the full-source typecheck passed, a separate-directory
production build generated 8,125 pages successfully, and the local browser check
passed the chapter hub plus 12 representative MC/written routes. The content
audit was rerun after the final wording, distractor and calibration corrections.
Signed areas for the five new velocity/force graphs were also recomputed
independently from their published data points. All seven new figures were
rendered at desktop and mobile widths and inspected. These checks do not replace
independent educator review or imply that chapters 8-14 are expanded.

### Reproducible checks

- `node scripts/audit-physics11-expansion.mjs`: loaded chapter counts, IDs,
  exact duplicate stems, answer keys, hint/solution presence, rubric alignment,
  raw-string escaping, strict inline KaTeX and actual React math-renderer checks.
- Add `--require-complete` only when all 14 chapters reach 90. It must fail at
  this intermediate checkpoint rather than silently calling the work complete.
- `node scripts/check-physics11-types.mjs`: isolated Physics TypeScript check.
- `node scripts/render-physics11-expansion.mjs`: all seven new figures, strict
  SVG parsing, label bounds and desktop/mobile rendering. Review images are in
  `review-packages/physics11-expansion`.
- `node scripts/verify-physics11-browser.mjs`: local chapter navigation and
  representative MC/written pages, fresh-answer state and revealed solutions.
- Full-source typecheck and production build remain separate release gates;
  content validation does not prove every numerical answer is correct.

## Question format and calibration

Existing ten-item topics generally contain five single-answer MCQs (including
Assertion-Reason), two VSAQs, one SAQ, one LAQ and one case. Later topics use
one VSAQ and two SAQs in the constructed half. Preserve these families; do not
substitute JEE numerical-entry questions for CBSE written-response practice.

- d1: direct recognition or one elementary step.
- d2: routine application, interpretation or a familiar short calculation.
- d3: linked reasoning, choosing a model, or interpreting data before solving.
- d4: substantial synthesis of distinct ideas, not merely a longer statement.
- d5: exceptional difficulty, not required as a quota for CBSE practice.

Difficulty is based on reasoning, not question position, marks, prose length or
the presence of a diagram. Do not inflate difficulty to manufacture a hard tail.
Include misconceptions, justifications, varied scenarios and non-identical data.
Do not duplicate an MCQ as a written item with the same givens and answer.

All new items need worked solutions, useful hints and correctly aligned keys or
marking criteria. Mix A-R truth patterns and ordinary MC answer positions. Use
explicit inline math delimiters in prose and raw strings for authored LaTeX.
Figures must supply necessary data, have meaningful scales and render correctly;
do not add decorative or answer-revealing diagrams.

## Sources

Official NCERT 2026-27 Physics Part I and Part II, chapter PDFs on
https://ncert.nic.in/textbook.php. Exact chapter source IDs are recorded in
content/cbse-physics-11/ncert-chapters.ts. Use the books for coverage and expected
reasoning, not to copy textbook exercises. A chapter coverage claim requires
checking its sections, not only its title.
