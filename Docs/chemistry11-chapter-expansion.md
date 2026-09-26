# Class 11 Chemistry: NCERT Chapter Practice

Updated locally on 26 September 2026. No production deployment or GitHub push is part of this content update.

## Scope and Sources

The request was switched from Mathematics to Chemistry. The implemented scope is 40 additional questions in each of Chapter 1's five existing topics, plus a count and chapter-mapping check across the entire current NCERT Chemistry XI textbook. All nine theory chapters already had 100 questions each before this update, so none needed padding to reach the requested minimum of 90.

Official references:

- [NCERT Chemistry XI Part I contents, 2026-27 reprint](https://ncert.nic.in/textbook/pdf/kech1ps.pdf), particularly the contents on PDF pages 9-11.
- [NCERT Chemistry XI Part II contents](https://ncert.nic.in/textbook/pdf/kech2ps.pdf), with individual chapter PDFs linked below.
- [NCERT Chapter 1](https://ncert.nic.in/textbook/pdf/kech101.pdf), sections 1.1-1.10: measurement, chemical laws, atomic masses, mole concept, composition and stoichiometry, including concentration.
- [CBSE Chemistry curriculum 2026-27](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Chemistry_SecP2_2026-27.pdf).
- [CBSE Class XII Chemistry sample paper 2026-27](https://cbseacademic.nic.in/web_material/SQP/ClassXII_2026_27/Chemistry-SQP.pdf), used as a reference for senior-secondary response formats, not as a claim that Class XI school examinations must use the same question count.

These are original NCERT-aligned practice questions, not copied textbook exercises or official examination questions. Chemistry's existing theory units map one-to-one to these NCERT chapters; the broader-unit/chapter mismatch did not occur here. Formative supplements and practicals are excluded from the chapter minimum.

## Chapter Counts

| NCERT Chapter                                                                                                |  Before |       Now |
| ------------------------------------------------------------------------------------------------------------ | ------: | --------: |
| [1. Some Basic Concepts of Chemistry](https://ncert.nic.in/textbook/pdf/kech101.pdf)                         |     100 |       300 |
| [2. Structure of Atom](https://ncert.nic.in/textbook/pdf/kech102.pdf)                                        |     100 |       100 |
| [3. Classification of Elements and Periodicity in Properties](https://ncert.nic.in/textbook/pdf/kech103.pdf) |     100 |       100 |
| [4. Chemical Bonding and Molecular Structure](https://ncert.nic.in/textbook/pdf/kech104.pdf)                 |     100 |       100 |
| [5. Thermodynamics](https://ncert.nic.in/textbook/pdf/kech105.pdf)                                           |     100 |       100 |
| [6. Equilibrium](https://ncert.nic.in/textbook/pdf/kech106.pdf)                                              |     100 |       100 |
| [7. Redox Reactions](https://ncert.nic.in/textbook/pdf/kech201.pdf)                                          |     100 |       100 |
| [8. Organic Chemistry: Some Basic Principles and Techniques](https://ncert.nic.in/textbook/pdf/kech202.pdf)  |     100 |       100 |
| [9. Hydrocarbons](https://ncert.nic.in/textbook/pdf/kech203.pdf)                                             |     100 |       100 |
| **Theory total**                                                                                             | **900** | **1,100** |

The course also retains 40 formative-reinforcement and 50 practical/project questions. These do not substitute for textbook-chapter practice.

## Chapter 1 Additions

Each topic rises from 20 to 60 questions:

| Topic                                              | Added MCQs | Added Written Questions | New Total |
| -------------------------------------------------- | ---------: | ----------------------: | --------: |
| 1.1 Matter, Measurement and Laws                   |         20 |                      20 |        60 |
| 1.2 Atomic Masses and Mole Concept                 |         20 |                      20 |        60 |
| 1.3 Percentage Composition and Formulae            |         20 |                      20 |        60 |
| 1.4 Stoichiometry and Limiting Reagent             |         20 |                      20 |        60 |
| 1.5 Concentration and Integrated Mole Calculations |         20 |                      20 |        60 |

Per topic, the 40 additions comprise:

- 20 single-correct MCQs, including one assertion-reason question.
- Four 2-mark very-short-answer questions.
- Eight 3-mark short-answer questions.
- Four 5-mark long-answer questions.
- Four 4-mark case-based questions.

Across the chapter, this adds 100 MCQs, 20 VSAQs, 40 SAQs, 20 LAQs and 20 case-based questions. The finished chapter contains 150 MCQs and 150 written questions. Numerical calculations remain constructed responses with working, not JEE-style numerical-entry items. Each new item has three hints and a worked solution; each written item has explicit one-mark marking points. Every new MCQ has feedback specific to its three distractors. Source answer keys are balanced across A-D within each added topic bank, and the existing deterministic display shuffle remains active.

## Difficulty and Content Review

The original first-ten MCQ banks mostly test routine single-concept work and standard multistep applications. Their actual demand, rather than their occasionally inflated labels, set the target. New questions extend this with interpretation, error diagnosis, isotope abundance, composition and combustion analysis, limiting reagents, purity/yield, and concentration accounting.

The additions contain 2 d1, 101 d2, 90 d3 and 7 d4 questions. The full chapter contains 5 d1, 148 d2, 135 d3 and 12 d4 questions. The small d1 group covers genuine foundational recognition; d4 is reserved for the more involved synthesis problems. There is no artificial d5 quota. Several existing Chapter 1 routine items were deflated as well. The audit prints the current distribution.

Five existing repeated setups were replaced while retaining their IDs: 1.2 MC010, 1.3 MC006, 1.3 MC007, 1.3 SAQ006 and 1.5 SAQ006. The original bank's version is now 0.2.0. Rounding, chemically plausible formula data, molarity denominators, excess-reactant accounting and answer choices were checked during drafting. Formulae use delimited LaTeX, including chemical subscripts in prose, hints and feedback.

New questions are marked **AI-reviewed, teacher review pending**. This update does not claim independent teacher sign-off, an exhaustive fresh accuracy vet of Chapters 2-9, or immunity from all future defects.

## Verification

- `node scripts/audit-chemistry11-expansion.mjs`: chapter floors, 300 Chapter 1 questions, all 200 additions, original-ID retention, duplicate stems, source syntax, strict KaTeX, real React math rendering, independent answer calculations, difficulty regressions, marking totals, and choice-shuffle/grading consistency.
- `npm run typecheck`: full-project content hygiene and TypeScript validation.
- `node scripts/audit-educator-regressions.mjs`: passed for 11 published courses and 7,921 questions at the time of the run, checking 100,346 rendered text fields plus grading and figure pathways. This is a mechanical regression check, not an independent chemistry correctness review of every other chapter.
- Local course, chapter, MCQ and written-question routes returned HTTP 200. A browser check confirmed that a wrong MCQ answer shows both its specific feedback and the worked calculation.
- A new 5-mark written question also displayed its parts, worked solution and five individual marking points correctly. The later in-app-browser navigation to the complete 300-question chapter index timed out; its HTTP response was successful, but a full visual check of that large index was not completed.

No production build or deployment is claimed by these local checks.

Practice: [Chapter 1 on localhost](http://localhost:3000/cbse-chemistry-11/u1-some-basic-concepts).
