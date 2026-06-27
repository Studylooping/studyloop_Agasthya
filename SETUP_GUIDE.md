# StudyLoop Setup Guide

Use this when you need to run StudyLoop locally on Windows.

## Part 1 - Install Tools

Open PowerShell as Administrator:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install GitHub.GitHubDesktop
```

Close PowerShell completely, reopen it, then install pnpm:

```powershell
npm install -g pnpm
```

Verify:

```powershell
node --version
pnpm --version
git --version
```

If `npm` is blocked by PowerShell script policy, run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then close and reopen PowerShell.

## Part 2 - Run Locally

```powershell
cd "C:\Users\pc\Documents\Claude\Projects\AP prep\studyloop"
pnpm install
pnpm dev
```

If `pnpm dev` says `Access is denied`, run the dev server directly with Node:

```powershell
cd "C:\Users\pc\Documents\Claude\Projects\AP prep\studyloop"
& "C:\Program Files\nodejs\node.exe" scripts\next-dev.mjs
```

You can also double-click `START_STUDYLOOP.cmd` in the project folder.

Open:

```text
http://localhost:3000
```

`pnpm dev` now uses `.next-dev` for development output. Production builds use
`.next`. Keeping these separate reduces stale chunk crashes like:

```text
Cannot find module './692.js'
```

To stop the server, press `Ctrl+C` in PowerShell.

## Founder Feedback Notifications

Question reports and site feedback use the `FEEDBACK_EMAIL` binding in
`wrangler.jsonc`. Production submissions notify `hello@studyloop.in` from
`feedback@studyloop.in`.

Complete this once in Cloudflare before the production deploy:

1. Open **Compute > Email Service > Email Routing > Destination Addresses**.
2. Add `hello@studyloop.in` and complete the verification email.
3. Onboard `studyloop.in` in Email Service so `feedback@studyloop.in` is an
   allowed sender on the domain.
4. Deploy the Worker and submit one question report from the live site.
5. Confirm the message arrives at `hello@studyloop.in`.

Local `pnpm dev` submissions are written to the terminal instead of sending
real email. If production delivery is unavailable, the form shows the founder
email address and does not claim that the report was sent.

## Pages To Check

| URL                                                            | What you should see                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| http://localhost:3000                                          | Landing page                                                                          |
| http://localhost:3000/calc-ab                                  | AP Calc course hub                                                                    |
| http://localhost:3000/calc-ab/u1-limits                        | Limits unit with 16 topics and 96 item cards                                          |
| http://localhost:3000/calc-ab/u1-limits/t1-1-mc-001            | Multiple-choice practice                                                              |
| http://localhost:3000/calc-ab/u1-limits/t1-1-frq-001           | Free-response self-grading                                                            |
| http://localhost:3000/session/calc-ab/u1-limits                | Focus practice session                                                                |
| http://localhost:3000/calc-ab/u2-differentiation               | Differentiation unit with 10 topics and 60 item cards                                 |
| http://localhost:3000/calc-ab/u2-differentiation/t2-1-mc-001   | Unit 2 multiple-choice practice                                                       |
| http://localhost:3000/calc-ab/u2-differentiation/t2-10-frq-001 | Unit 2 free-response self-grading                                                     |
| http://localhost:3000/session/calc-ab/u2-differentiation       | Unit 2 focus practice session                                                         |
| http://localhost:3000/calc-ab/u3-comp-implicit                 | Composite, implicit, and inverse differentiation unit with 6 topics and 36 item cards |
| http://localhost:3000/calc-ab/u3-comp-implicit/t3-1-mc-001     | Unit 3 multiple-choice practice                                                       |
| http://localhost:3000/calc-ab/u3-comp-implicit/t3-6-frq-001    | Unit 3 free-response self-grading                                                     |
| http://localhost:3000/session/calc-ab/u3-comp-implicit         | Unit 3 focus practice session                                                         |
| http://localhost:3000/calc-ab/u4-contextual-app                | Contextual applications unit with 7 topics and 42 item cards                          |
| http://localhost:3000/calc-ab/u4-contextual-app/t4-1-mc-001    | Unit 4 multiple-choice practice                                                       |
| http://localhost:3000/calc-ab/u4-contextual-app/t4-7-frq-001   | Unit 4 free-response self-grading                                                     |
| http://localhost:3000/session/calc-ab/u4-contextual-app        | Unit 4 focus practice session                                                         |
| http://localhost:3000/calc-ab/u5-analytical-app                | Analytical applications unit with 12 topics and 72 item cards                         |
| http://localhost:3000/calc-ab/u5-analytical-app/t5-1-mc-004    | Unit 5 graph-based Mean Value Theorem practice                                        |
| http://localhost:3000/calc-ab/u5-analytical-app/t5-11-frq-001  | Unit 5 optimization FRQ with a simple diagram                                         |
| http://localhost:3000/session/calc-ab/u5-analytical-app        | Unit 5 focus practice session                                                         |
| http://localhost:3000/calc-ab/u6-integration                   | Integration and accumulation unit with 11 topics and 66 item cards                    |
| http://localhost:3000/calc-ab/u6-integration/t6-2-mc-001       | Unit 6 Riemann sum practice with a sketch                                             |
| http://localhost:3000/calc-ab/u6-integration/t6-10-frq-001     | Unit 6 algebraic integration FRQ                                                      |
| http://localhost:3000/calc-ab/u6-integration/t6-11-mc-001      | Unit 6 technique-selection practice                                                   |
| http://localhost:3000/session/calc-ab/u6-integration           | Unit 6 focus practice session                                                         |
| http://localhost:3000/calc-ab/u7-diff-eqs                      | Differential equations unit with 7 AB topics and 42 item cards                        |
| http://localhost:3000/calc-ab/u7-diff-eqs/t7-3-mc-004          | Unit 7 slope-field equation matching                                                  |
| http://localhost:3000/calc-ab/u7-diff-eqs/t7-6-frq-001         | Unit 7 separation of variables FRQ                                                    |
| http://localhost:3000/session/calc-ab/u7-diff-eqs              | Unit 7 focus practice session                                                         |
| http://localhost:3000/calc-ab/u8-app-integration               | Applications of integration unit with 12 topics and 72 item cards                     |
| http://localhost:3000/calc-ab/u8-app-integration/t8-9-mc-001   | Unit 8 disk-method graph practice                                                     |
| http://localhost:3000/calc-ab/u8-app-integration/t8-11-mc-001  | Unit 8 washer-method graph practice                                                   |
| http://localhost:3000/calc-ab/u8-app-integration/t8-12-frq-001 | Unit 8 shifted-axis washer FRQ                                                        |
| http://localhost:3000/session/calc-ab/u8-app-integration       | Unit 8 focus practice session                                                         |
| http://localhost:3000/review                                   | Local review notebook                                                                 |

## Common Fixes

**Port 3000 is already in use**

Run:

```powershell
pnpm dev -- -p 3001
```

Then open:

```text
http://localhost:3001
```

**Runtime error: `Cannot find module './692.js'` or another numbered `.js` file**

Stop the server with `Ctrl+C`, then run:

```powershell
pnpm clean
pnpm dev
```

Refresh the browser only after the server says it is ready. Do not keep two
`pnpm dev` PowerShell windows running at the same time.

**The page loads but math looks like raw text**

Stop the server with `Ctrl+C`, then run:

```powershell
pnpm dev
```

**Any red error you do not understand**

Copy the full error message and send it to me. Do not guess; most first-run
errors have a one-line fix.

## Stability Changes Already Made

1. `pnpm dev` now refreshes `.next-dev` on startup.
2. Dev output and production build output are separated.
3. `pnpm build`, `pnpm start`, and `pnpm typecheck` call Node directly to avoid Windows script-policy wrapper issues.
4. Next dev keeps more generated pages warm, reducing rebuild churn while browsing many item pages.
5. Item URLs include topic and kind, such as `t1-1-mc-001`, so question pages do not collide.
