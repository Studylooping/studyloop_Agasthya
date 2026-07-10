# StudyLoop Manual Verification

Use this file after each development phase. You do not need to understand the
code. Your job is to run the site, click the listed pages, and tell me what
looks wrong, confusing, broken, or untrue.

## Before You Test

Start the app locally:

```powershell
cd "C:\Users\pc\Documents\Claude\Projects\AP prep\studyloop"
pnpm dev
```

If `pnpm dev` says `Access is denied`, use this instead:

```powershell
cd "C:\Users\pc\Documents\Claude\Projects\AP prep\studyloop"
& "C:\Program Files\nodejs\node.exe" scripts\next-dev.mjs
```

You can also double-click `START_STUDYLOOP.cmd` in the project folder.

Open:

```text
http://localhost:3000
```

If `pnpm` or `node` is not recognized, follow `SETUP_GUIDE.md` Part 1 first.
If you see a runtime error like `Cannot find module './692.js'`, stop the
server with `Ctrl+C`, run `pnpm clean`, then run `pnpm dev` again.

## Phase 1 - Broad StudyLoop Direction

Goal: StudyLoop should feel like a broad STEM platform, with AP Calculus AB as
the first live course. It should not feel like an AP-only website anymore.

### 1. Landing Page

Open:

```text
http://localhost:3000
```

Pass if you see:

- The main headline says StudyLoop is a STEM study loop, not only AP prep.
- It clearly says AP Calc is the first live track.
- The path cards mention AP, CBSE, JEE, and SAT.
- Only AP Calculus AB is clickable/live.
- CBSE, JEE, and SAT look planned/locked, not broken.
- The header has a local profile control that defaults to Guest.

Fail if:

- The page still feels like only AP Physics/Chemistry are the future.
- It claims CBSE/JEE/SAT content is already live.
- Any card text overflows or looks messy on your screen.

### 2. AP Calc Course Page

Open:

```text
http://localhost:3000/calc-ab
```

Pass if you see:

- AP Calculus AB still works.
- Units 1, 2, 3, 4, 5, 6, 7, and 8 are live.
- No Calc AB unit card is locked.
- The page mentions the College Board AP framework, because this course is
  still AP-specific.

### 3. Unit Page

Open:

```text
http://localhost:3000/calc-ab/u1-limits
```

Pass if you see:

- A "Start practice" button.
- 16 topic sections, from Topic 1.1 through Topic 1.16.
- Each topic has 6 item cards: 5 MCQs and 1 FRQ.
- The full unit has 96 item cards.
- The item badges say "Verified by StudyLoop Review Team".

Open the graph-reading samples:

```text
http://localhost:3000/calc-ab/u1-limits/t1-3-mc-001
http://localhost:3000/calc-ab/u1-limits/t1-3-mc-002
http://localhost:3000/calc-ab/u1-limits/t1-3-mc-003
http://localhost:3000/calc-ab/u1-limits/t1-3-mc-004
http://localhost:3000/calc-ab/u1-limits/t1-3-mc-005
http://localhost:3000/calc-ab/u1-limits/t1-3-frq-001
http://localhost:3000/calc-ab/u1-limits/t1-9-mc-001
http://localhost:3000/calc-ab/u1-limits/t1-9-mc-002
http://localhost:3000/calc-ab/u1-limits/t1-9-mc-004
http://localhost:3000/calc-ab/u1-limits/t1-10-frq-001
```

Pass if:

- A graph figure appears between the question stem and the answer area.
- The question stem asks you to use the graph instead of describing the graph in words.
- The figure matches the prompt: open circles, filled points, jump behavior, or asymptote behavior are visible.
- On the removable-discontinuity graph with $f(-2)=-1$, the red point is below the x-axis.
- The figure does not have visible explanatory labels such as "hole", "filled point", or "vertical asymptote".
- No programming text or raw LaTeX appears in the choices, hints, rubric, or solution.

### 3A. Differentiation Unit 2

Open:

```text
http://localhost:3000/calc-ab/u2-differentiation
```

Pass if you see:

- Unit 2 is live, not locked.
- 10 topic sections, from Topic 2.1 through Topic 2.10.
- Each topic has 6 item cards: 5 MCQs and 1 FRQ.
- The full unit has 60 item cards.
- The item badges say "Verified by StudyLoop Review Team".

Open two sample items:

```text
http://localhost:3000/calc-ab/u2-differentiation/t2-1-mc-001
http://localhost:3000/calc-ab/u2-differentiation/t2-10-frq-001
```

Pass if:

- The math renders cleanly.
- The MCQ lets you pick an option and check the answer.
- The FRQ lets you type, show the rubric, and self-score.
- The difficulty feels AP style or slightly above AP, not basic drill only.

### 3B. Local Nickname Profile

On any normal page with the header:

1. Click the profile button that says `Guest`.
2. Enter a nickname such as `LimitNinja`.
3. Click the plus button.
4. Confirm the header now shows `LimitNinja`.
5. Open the menu again and switch back to `Guest`.
6. Switch again to `LimitNinja`.

Pass if:

- No real name, email, or password is requested.
- The nickname remains available after refreshing the page.
- The menu says progress is stored only in this browser.

### 3C. Composite, Implicit, and Inverse Unit 3

Open:

```text
http://localhost:3000/calc-ab/u3-comp-implicit
```

Pass if you see:

- Unit 3 is live, not locked.
- 6 topic sections, from Topic 3.1 through Topic 3.6.
- Each topic has 6 item cards: 5 MCQs and 1 FRQ.
- The full unit has 36 item cards.
- The page shows a Difficulty guide explaining `Foundational`, `AP routine`,
  `AP medium`, `AP hard`, and `Challenge`.
- Difficulty labels use AP-calibrated wording such as `AP routine`, `AP
  medium`, and `AP hard`.

Open two sample items:

```text
http://localhost:3000/calc-ab/u3-comp-implicit/t3-1-mc-001
http://localhost:3000/calc-ab/u3-comp-implicit/t3-6-frq-001
```

Pass if:

- The math renders cleanly.
- The MCQ uses chain rule in a tangent-line context.
- The FRQ asks for higher-order derivatives and a speed interpretation.
- The item header shows a label such as `AP medium (3/5)` or `AP hard (4/5)`.
- The item page also shows the same Difficulty guide in plain language.

### 3D. Contextual Applications Unit 4

Open:

```text
http://localhost:3000/calc-ab/u4-contextual-app
```

Pass if you see:

- Unit 4 is live, not locked.
- 7 topic sections, from Topic 4.1 through Topic 4.7.
- Each topic has 6 item cards: 5 MCQs and 1 FRQ.
- The full unit has 42 item cards.
- The page shows the Difficulty guide.
- The item badges say "Verified by StudyLoop Review Team".

Open two sample items:

```text
http://localhost:3000/calc-ab/u4-contextual-app/t4-1-mc-001
http://localhost:3000/calc-ab/u4-contextual-app/t4-2-mc-003
http://localhost:3000/calc-ab/u4-contextual-app/t4-2-frq-001
http://localhost:3000/calc-ab/u4-contextual-app/t4-7-frq-001
```

Pass if:

- The math renders cleanly.
- The MCQ asks you to interpret a derivative in context.
- The Topic 4.2 MCQ and FRQ use velocity, acceleration, direction, and speed behavior only.
- The Topic 4.2 MCQ and FRQ do not ask for displacement, total distance, or integrals.
- The FRQ asks you to justify L'Hospital's Rule using indeterminate forms.
- The item header shows a label such as `AP routine (2/5)`, `AP medium (3/5)`, or `AP hard (4/5)`.
- You do not see any `Foundational (1/5)` items in Unit 4.

### 3E. Analytical Applications Unit 5

Open:

```text
http://localhost:3000/calc-ab/u5-analytical-app
```

Pass if you see:

- Unit 5 is live, not locked.
- 12 topic sections, from Topic 5.1 through Topic 5.12.
- Each topic has 6 item cards: 5 MCQs and 1 FRQ.
- The full unit has 72 item cards.
- The page shows the Difficulty guide.
- The item badges say "Verified by StudyLoop Review Team".
- You do not see any `Foundational (1/5)` items in Unit 5.

Open these sample items:

```text
http://localhost:3000/calc-ab/u5-analytical-app/t5-1-mc-004
http://localhost:3000/calc-ab/u5-analytical-app/t5-3-mc-003
http://localhost:3000/calc-ab/u5-analytical-app/t5-8-frq-001
http://localhost:3000/calc-ab/u5-analytical-app/t5-9-frq-001
http://localhost:3000/calc-ab/u5-analytical-app/t5-10-mc-002
http://localhost:3000/calc-ab/u5-analytical-app/t5-11-frq-001
http://localhost:3000/calc-ab/u5-analytical-app/t5-12-frq-001
```

Pass if:

- The math renders cleanly.
- Graph or diagram items show the figure between the question and answer area.
- The graph items do not explain away the answer with extra prose labels.
- The optimization diagrams are simple sketches, not decorative drawings.
- MCQs let you select an answer and click "Check answer".
- Wrong MCQ answers show a `Where this choice goes wrong` explanation that refers to the selected mistake.
- FRQs let you type, open the rubric/model solution, and self-score.
- The questions feel AP routine, AP medium, AP hard, or Challenge.

### 3F. Integration and Accumulation Unit 6

Open:

```text
http://localhost:3000/calc-ab/u6-integration
```

Pass if you see:

- Unit 6 is live, not locked.
- 11 topic sections, from Topic 6.1 through Topic 6.11.
- Each topic has 6 item cards: 5 MCQs and 1 FRQ.
- The full unit has 66 item cards.
- The page shows the Difficulty guide.
- The item badges say "Verified by StudyLoop Review Team".
- You do not see any `Foundational (1/5)` items in Unit 6.

Open these sample items:

```text
http://localhost:3000/calc-ab/u6-integration/t6-1-mc-005
http://localhost:3000/calc-ab/u6-integration/t6-1-mc-003
http://localhost:3000/calc-ab/u6-integration/t6-2-mc-001
http://localhost:3000/calc-ab/u6-integration/t6-3-frq-001
http://localhost:3000/calc-ab/u6-integration/t6-5-frq-001
http://localhost:3000/calc-ab/u6-integration/t6-9-frq-001
http://localhost:3000/calc-ab/u6-integration/t6-10-frq-001
http://localhost:3000/calc-ab/u6-integration/t6-11-mc-001
http://localhost:3000/calc-ab/u6-integration/t6-11-frq-001
```

Pass if:

- The math renders cleanly.
- Topic 6.1 feels introductory: it uses geometric/signed area, not antiderivative properties or FTC shortcuts.
- Riemann sum and accumulation graph items show the figure between the question and answer area.
- MCQs let you select an answer and click "Check answer".
- Wrong MCQ answers show a `Where this choice goes wrong` explanation that refers to the selected mistake.
- FRQs let you type, open the rubric/model solution, and self-score.
- The questions feel AP routine, AP medium, AP hard, or Challenge.

### 3G. Differential Equations Unit 7

Open:

```text
http://localhost:3000/calc-ab/u7-diff-eqs
```

Pass if you see:

- Unit 7 is live, not locked.
- 7 AP AB topic sections: Topic 7.1 through Topic 7.4, then Topic 7.6 through Topic 7.8.
- Each topic has 6 item cards: 5 MCQs and 1 FRQ.
- The full unit has 42 item cards.
- The page shows the Difficulty guide.
- The item badges say "Verified by StudyLoop Review Team".
- You do not see any `Foundational (1/5)` items in Unit 7.

Open these sample items:

```text
http://localhost:3000/calc-ab/u7-diff-eqs/t7-1-frq-001
http://localhost:3000/calc-ab/u7-diff-eqs/t7-3-mc-004
http://localhost:3000/calc-ab/u7-diff-eqs/t7-3-frq-001
http://localhost:3000/calc-ab/u7-diff-eqs/t7-4-frq-001
http://localhost:3000/calc-ab/u7-diff-eqs/t7-6-frq-001
http://localhost:3000/calc-ab/u7-diff-eqs/t7-7-frq-001
http://localhost:3000/calc-ab/u7-diff-eqs/t7-8-frq-001
```

Pass if:

- The math renders cleanly.
- Unit 7 follows AP Calculus AB scope: Euler's Method and Logistic Models are not included because they are BC-only topics.
- Slope-field questions show slope-field figures between the question and answer area.
- Slope-field prompts match the displayed field: horizontal bands/diagonals should agree with the stated differential equation.
- MCQs let you select an answer and click "Check answer".
- Wrong MCQ answers show a `Where this choice goes wrong` explanation that refers to the selected mistake.
- FRQs let you type, open the rubric/model solution, and self-score.
- The questions feel AP routine, AP medium, AP hard, or Challenge.

### 3H. Applications of Integration Unit 8

Open:

```text
http://localhost:3000/calc-ab/u8-app-integration
```

Pass if you see:

- Unit 8 is live, not locked.
- 12 topic sections, from Topic 8.1 through Topic 8.12.
- Each topic has 6 item cards: 5 MCQs and 1 FRQ.
- The full unit has 72 item cards.
- The page shows the Difficulty guide.
- The item badges say "Verified by StudyLoop Review Team".
- You do not see any `Foundational (1/5)` items in Unit 8.

Open these sample items:

```text
http://localhost:3000/calc-ab/u8-app-integration/t8-4-mc-001
http://localhost:3000/calc-ab/u8-app-integration/t8-5-mc-001
http://localhost:3000/calc-ab/u8-app-integration/t8-6-frq-001
http://localhost:3000/calc-ab/u8-app-integration/t8-7-frq-001
http://localhost:3000/calc-ab/u8-app-integration/t8-8-frq-001
http://localhost:3000/calc-ab/u8-app-integration/t8-9-mc-001
http://localhost:3000/calc-ab/u8-app-integration/t8-10-frq-001
http://localhost:3000/calc-ab/u8-app-integration/t8-11-mc-001
http://localhost:3000/calc-ab/u8-app-integration/t8-12-frq-001
```

Pass if:

- The math renders cleanly.
- Area-between-curves questions use top-minus-bottom or right-minus-left correctly.
- Cross-section volume questions show simple base-region sketches where helpful.
- Disk and washer questions show the region and the axis of rotation clearly.
- For rotations about shifted axes such as `y=1` and `y=2`, the radius used in the question matches the displayed axis, not the x-axis by habit.
- Washer questions use outer-radius squared minus inner-radius squared, not thickness squared.
- MCQs let you select an answer and click "Check answer".
- Wrong MCQ answers show a `Where this choice goes wrong` explanation that refers to the selected mistake.
- FRQs let you type, open the rubric/model solution, and self-score.
- The questions feel AP routine, AP medium, AP hard, or Challenge.

### 4. MCQ Page

Open:

```text
http://localhost:3000/calc-ab/u1-limits/t1-1-mc-001
```

Pass if:

- The math renders nicely.
- You can pick an option and click "Check answer".
- Wrong answers show feedback.
- The bottom note tells you to report alpha issues using the URL and content ID.

### 5. FRQ Page

Open:

```text
http://localhost:3000/calc-ab/u1-limits/t1-1-frq-001
```

Pass if:

- You can type a response.
- "Show rubric & model solution" reveals the rubric.
- You can self-score using checkboxes.

### 5A. Review Notebook

Open:

```text
http://localhost:3000/review
```

Pass if:

- The header has a Review button on desktop-size screens.
- The page opens and says it is using your active nickname or Guest.

MCQ error check:

1. Open `http://localhost:3000/calc-ab/u1-limits/t1-1-mc-001`.
2. Pick a wrong answer and click "Check answer".
3. Open `http://localhost:3000/review`.
4. Click "Practice" on that saved MCQ error.
5. Answer it correctly.

Pass if:

- The wrong MCQ appears under "Needs review".
- After answering correctly in review practice, it moves to "Mastered".

FRQ error check:

1. Open `http://localhost:3000/calc-ab/u1-limits/t1-1-frq-001`.
2. Click "Show rubric & model solution".
3. Check only one rubric checkbox, leaving the others unchecked.
4. Open `http://localhost:3000/review`.

Pass if:

- The FRQ appears under "Needs review" with its self-score.
- The "Open" button returns to the FRQ page.

### 6. Practice Session

Open:

```text
http://localhost:3000/session/calc-ab/u1-limits
```

Pass if:

- It opens without the normal header/footer.
- You can answer MCQs one by one. There are 80 MCQs in the full Limits run.
- You get a final score screen.
- The exit button returns to the unit page.
- It says work is saving locally as your active nickname or Guest.
- When a graph item appears, the graph appears in the practice session too.

Resume check:

1. Answer two questions in the practice session.
2. Exit to the unit page.
3. Open the practice session again.

Pass if:

- The session resumes at question 3 instead of restarting at question 1.
- Switching to a different nickname profile gives that profile its own separate progress.

Unit 2 practice check:

```text
http://localhost:3000/session/calc-ab/u2-differentiation
```

Pass if:

- It opens a Differentiation practice run.
- There are 50 MCQs in the full Unit 2 run.
- Answering, exiting, and reopening resumes from the next question.

Unit 3 practice check:

```text
http://localhost:3000/session/calc-ab/u3-comp-implicit
```

Pass if:

- It opens a Unit 3 practice run.
- There are 30 MCQs in the full Unit 3 run.
- Answering, exiting, and reopening resumes from the next question.

Unit 4 practice check:

```text
http://localhost:3000/session/calc-ab/u4-contextual-app
```

Pass if:

- It opens a Unit 4 practice run.
- There are 35 MCQs in the full Unit 4 run.
- Answering, exiting, and reopening resumes from the next question.

Unit 5 practice check:

```text
http://localhost:3000/session/calc-ab/u5-analytical-app
```

Pass if:

- It opens a Unit 5 practice run.
- There are 60 MCQs in the full Unit 5 run.
- Graph and optimization sketch questions show their figures inside practice mode.
- Answering, exiting, and reopening resumes from the next question.

Unit 6 practice check:

```text
http://localhost:3000/session/calc-ab/u6-integration
```

Pass if:

- It opens a Unit 6 practice run.
- There are 55 MCQs in the full Unit 6 run.
- Riemann sum and accumulation graph questions show their figures inside practice mode.
- Answering, exiting, and reopening resumes from the next question.

Unit 7 practice check:

```text
http://localhost:3000/session/calc-ab/u7-diff-eqs
```

Pass if:

- It opens a Unit 7 practice run.
- There are 35 MCQs in the full Unit 7 run.
- Slope-field questions show their figures inside practice mode.
- Answering, exiting, and reopening resumes from the next question.

Unit 8 practice check:

```text
http://localhost:3000/session/calc-ab/u8-app-integration
```

Pass if:

- It opens a Unit 8 practice run.
- There are 60 MCQs in the full Unit 8 run.
- Area, cross-section, disk, and washer graph questions show their figures inside practice mode.
- Answering, exiting, and reopening resumes from the next question.

### 7. Public Pages

Open each:

```text
http://localhost:3000/about
http://localhost:3000/ethics
http://localhost:3000/disclaimer
http://localhost:3000/changelog
```

Pass if:

- About explains CBSE/AP/SAT/JEE as the long-term plan.
- Ethics is honest that AI can make mistakes.
- Ethics explains local nickname profiles and says to avoid real names.
- Disclaimer does not claim official affiliation.
- Changelog says May 25, 2026 alpha direction, not a future June 1 launch.

## How To Report Back To Me

Send me a short message like:

```text
Phase 1 verification:
1. Landing page: pass
2. AP Calc page: pass
3. Unit page: fail - the badges are hard to read in dark mode
4. MCQ page: pass
5. FRQ page: pass
6. Practice session: pass
7. Public pages: pass
```

That is enough. I will fix the failed items and give you the next checklist.
