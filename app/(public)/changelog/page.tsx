import type { Metadata } from "next";
import { SITE } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Changelog",
  description: `What changed on ${SITE.name} and when.`,
};

interface Entry {
  version: string;
  date: string; // ISO
  title: string;
  highlights: string[];
}

const ENTRIES: Entry[] = [
  {
    version: "v0.1-alpha.25",
    date: "2026-06-01",
    title: "Applications of integration bank",
    highlights: [
      "AP Calculus AB Unit 8 is now live with 12 topics covering average value, motion and accumulation in context, area between curves, cross sections, disks, and washers.",
      "Added 60 original MCQs and 12 original FRQs, including graph-based region, cross-section, disk-method, and washer-method items.",
      "Added simple SVG sketches for area-between-curves, cross-section, disk, and washer problems, with explicit axes of rotation for x-axis, y-axis, and shifted-axis volumes.",
      "The reviewer export, MC feedback audit, and originality audit scripts now include Unit 8.",
    ],
  },
  {
    version: "v0.1-alpha.24",
    date: "2026-05-31",
    title: "Differential equations bank",
    highlights: [
      "AP Calculus AB Unit 7 is now live with 7 AB topics across modeling, verification, slope fields, separation of variables, particular solutions, and exponential models.",
      "Each topic has 5 original MCQs and 1 original FRQ, for 35 MCQs and 7 FRQs total.",
      "Kept Euler's Method and Logistic Models out of the AB bank because those Unit 7 topics are BC-only.",
      "Added generated slope-field figures whose line segments are computed from the differential equation instead of hand-drawn.",
      "The reviewer export and MC feedback audit scripts now include Unit 7.",
    ],
  },
  {
    version: "v0.1-alpha.23",
    date: "2026-05-31",
    title: "Unit 6 AP-style framing repair",
    highlights: [
      "Rewrote Topic 6.1 graph-area prompts so students infer the rectangle, triangle, semicircle, trapezoid, and signed area from the figures instead of being told the method in the stem.",
      "Removed giveaway wording from the Topic 6.1 composite FRQ prompt while preserving the same mathematical targets.",
      "Softened direct method labels in later Unit 6 FRQs so prompts ask for exact evaluation while hints and solutions carry the technique guidance.",
      "Regenerated the Unit 6 reviewer package after the framing repair.",
    ],
  },
  {
    version: "v0.1-alpha.22",
    date: "2026-05-31",
    title: "Unit 6 figure scale repair",
    highlights: [
      "Redrew the Topic 6.1 composite signed-area FRQ figure with a consistent x/y scale.",
      "Fixed the semicircle in the composite graph so radius 2 is visually faithful instead of stretched taller than the rectangle.",
      "Regenerated the Unit 6 reviewer package after the figure repair.",
    ],
  },
  {
    version: "v0.1-alpha.21",
    date: "2026-05-31",
    title: "Unit 6 topic numbering repair",
    highlights: [
      "Renumbered Selecting Techniques for Antidifferentiation from Topic 6.14 to Topic 6.11 in StudyLoop's student-facing sequence.",
      "Updated the technique-selection item URLs from t6-14 to t6-11 to avoid the 6.11-6.13 gap confusing students.",
      "Regenerated the Unit 6 reviewer package after the numbering repair.",
    ],
  },
  {
    version: "v0.1-alpha.20",
    date: "2026-05-31",
    title: "Unit 6 introduction repair",
    highlights: [
      "Rebuilt Topic 6.1 so it introduces integration through geometric and signed area instead of later integral-property and FTC-style ideas.",
      "Added rectangle, triangle, semicircle, trapezoid, and composite signed-area sketches to the opening Unit 6 topic.",
      "Kept existing Topic 6.1 URLs stable while replacing the misplaced additivity and total-change items.",
      "Regenerated the Unit 6 reviewer package after the introductory-topic repair.",
    ],
  },
  {
    version: "v0.1-alpha.19",
    date: "2026-05-30",
    title: "Unit 6 completion repair",
    highlights: [
      "Added Selecting Techniques for Antidifferentiation with 5 MCQs and 1 FRQ.",
      "Repaired the Unit 6 Riemann-sum sketch so the left-endpoint rectangles match f(x)=x^2 on [0,4].",
      "Updated Unit 6 reviewer and manual verification counts to 11 topics, 55 MCQs, and 11 FRQs.",
      "Regenerated the Unit 6 reviewer package after the technique-selection and figure repairs.",
    ],
  },
  {
    version: "v0.1-alpha.18",
    date: "2026-05-30",
    title: "Unit 6 topic alignment repair",
    highlights: [
      "Repaired Unit 6 Topic 6.1 items that used exact antiderivative evaluation even though the topic is about accumulation meaning and setup.",
      "Replaced a Topic 6.3 item that asked students to evaluate a represented integral with a notation-matching item.",
      "Replaced a Topic 6.10 plain substitution item with a long-division integration item.",
      "Regenerated the Unit 6 reviewer package after the topic-placement repairs.",
    ],
  },
  {
    version: "v0.1-alpha.17",
    date: "2026-05-30",
    title: "Integration question bank",
    highlights: [
      "The first AP Calculus AB Unit 6 pass went live with 10 topics across accumulation, Riemann sums, definite integrals, FTC, antiderivatives, substitution, and algebraic integration.",
      "Each topic has 5 original MCQs and 1 original FRQ, for 50 MCQs and 10 FRQs total.",
      "The new Unit 6 questions avoid Foundational difficulty and target AP routine through Challenge rigor.",
      "Added simple SVG sketches for signed area, Riemann sums, and accumulation-function graph reasoning.",
      "The reviewer export and MC feedback audit scripts now include Unit 6.",
    ],
  },
  {
    version: "v0.1-alpha.16",
    date: "2026-05-30",
    title: "Unit 5 polish repair",
    highlights: [
      "Aligned the Unit 5 Topic 5.9 f prime sketch so its minimum matches the f double prime sign change at x=2.",
      "Added the Unit 5 FRQ difficulty floor for parity with earlier Calc AB units.",
      "Regenerated the Unit 5 reviewer package after the polish repairs.",
    ],
  },
  {
    version: "v0.1-alpha.15",
    date: "2026-05-30",
    title: "MCQ feedback repair",
    highlights: [
      "Replaced Unit 5's generic wrong-answer fallback with diagnostic feedback that names the likely mistake and points to the decisive calculus step.",
      "Updated MCQ, focus-practice, and review feedback panels to show a clear 'Where this choice goes wrong' explanation.",
      "Added an MC feedback audit script so missing or generic wrong-choice rationales are caught before reviewer packages are shared.",
      "Regenerated the Unit 5 reviewer package with repaired feedback.",
    ],
  },
  {
    version: "v0.1-alpha.14",
    date: "2026-05-30",
    title: "Unit 5 vet repair",
    highlights: [
      "Added the same multiple-choice difficulty floor safety net to Unit 5 that Units 1-4 already used.",
      "Repaired Unit 5 derivative graph sketches so labeled x-values use a consistent horizontal scale.",
      "Added a graph-based Topic 5.9 FRQ figure connecting f, f prime, and f double prime.",
      "Regenerated the Unit 5 reviewer package after the content repairs.",
    ],
  },
  {
    version: "v0.1-alpha.13",
    date: "2026-05-29",
    title: "Analytical applications bank",
    highlights: [
      "AP Calculus AB Unit 5 is now live with 12 topics across MVT, extrema, monotonicity, concavity, derivative graphs, optimization, and implicit-relation behavior.",
      "Each topic has 5 original MCQs and 1 original FRQ, for 60 MCQs and 12 FRQs total.",
      "The new Unit 5 questions avoid Foundational difficulty and target AP routine through Challenge rigor.",
      "Added simple SVG sketches for graph-reading, derivative-sign, concavity, and optimization items.",
      "The reviewer export script can now create a Unit 5 review package with `pnpm review:export -- u5-analytical-app`.",
    ],
  },
  {
    version: "v0.1-alpha.12",
    date: "2026-05-29",
    title: "Graph alignment repair",
    highlights: [
      "Audited hand-authored graph SVGs for points that did not sit on their curves.",
      "Fixed the Unit 1 Topic 1.9 hole-at-(3,5) graph so the open circle lies on the drawn line.",
      "Fixed the Unit 1 Topic 1.9 hole-at-(2,4) graph so the open circle lies on the drawn line.",
      "Regenerated the Unit 1 reviewer package with the corrected graph source.",
    ],
  },
  {
    version: "v0.1-alpha.11",
    date: "2026-05-29",
    title: "Limits graph vet repair",
    highlights: [
      "Fixed the removable-discontinuity graph coordinate bug where the point labeled -1 was drawn above the x-axis.",
      "Added graph figures to Unit 1 Topic 1.9 multiple-representation items that previously used prose stand-ins.",
      "Added a graph figure to the Unit 1 Topic 1.10 discontinuity-types FRQ.",
      "Cleaned a misleading Unit 2 skill tag on a text-only tangent-line slope item.",
    ],
  },
  {
    version: "v0.1-alpha.10",
    date: "2026-05-28",
    title: "Graph practice repair",
    highlights: [
      "Practice-session mode now renders question figures, so graph items are not missing diagrams during focus practice.",
      "Every AP Calculus AB Unit 1 Topic 1.3 graph-reading item now has a student-facing SVG graph.",
      "Graph-reading stems now ask students to use the graph instead of describing the graph behavior in prose.",
      "Question figures now scale to the available width instead of forcing horizontal scrolling on small screens.",
    ],
  },
  {
    version: "v0.1-alpha.9",
    date: "2026-05-27",
    title: "Graph figures and motion cleanup",
    highlights: [
      "Added optional SVG figures to StudyLoop questions and rendered them on item pages for graph-reading practice.",
      "Attached actual graph figures to the Unit 1 graphical limits MCQ and FRQ that previously described the graph only in words.",
      "Replaced the Unit 4 motion questions that used displacement, total distance, and integrals with derivative-only velocity, acceleration, direction, and speed-behavior practice.",
      "Reviewer exports now include figure titles, descriptions, and SVG source for mentor review.",
    ],
  },
  {
    version: "v0.1-alpha.8",
    date: "2026-05-27",
    title: "Limits rigor repair",
    highlights: [
      "Repaired AP Calculus AB Unit 1 after mentor vetting by replacing the low-rigor recall and read-off MCQs with applied limit, continuity, asymptote, and IVT items.",
      "Unit 1 now has zero Foundational difficulty items while keeping the same stable item URLs.",
      "The Unit 1 content version is now v0.3.0 and remains marked Needs mentor review until a subject mentor signs off.",
    ],
  },
  {
    version: "v0.1-alpha.7",
    date: "2026-05-26",
    title: "Contextual applications bank",
    highlights: [
      "AP Calculus AB Unit 4 is now live with 7 topics across derivative interpretation, motion, applied rates, related rates, linearization, and L'Hospital's Rule.",
      "Each topic has 5 original MCQs and 1 original FRQ, for 35 MCQs and 7 FRQs total.",
      "The new Unit 4 questions avoid foundational recall labels and target AP routine through AP hard rigor.",
      "The reviewer export script can now create a Unit 4 review package with `pnpm review:export -- u4-contextual-app`.",
    ],
  },
  {
    version: "v0.1-alpha.6",
    date: "2026-05-26",
    title: "Student difficulty guide",
    highlights: [
      "Added a plain-language difficulty guide to unit pages and item pages.",
      "Difficulty labels now explain the difference between Foundational, AP routine, AP medium, AP hard, and Challenge.",
      "The guide reminds students that the label describes the problem, not their ability.",
    ],
  },
  {
    version: "v0.1-alpha.5",
    date: "2026-05-26",
    title: "Composite and implicit differentiation bank",
    highlights: [
      "AP Calculus AB Unit 3 is now live with 6 topics across chain rule, implicit differentiation, inverse functions, inverse trigonometric derivatives, mixed procedure selection, and higher-order derivatives.",
      "Each topic has 5 original MCQs and 1 original FRQ, for 30 MCQs and 6 FRQs total.",
      "The new Unit 3 questions start at AP routine difficulty and emphasize tangent lines, error analysis, table-based inverse derivatives, motion, and mixed derivative procedures.",
      "The reviewer export script can now create a Unit 3 review package with `pnpm review:export -- u3-comp-implicit`.",
    ],
  },
  {
    version: "v0.1-alpha.4",
    date: "2026-05-25",
    title: "Differentiation question bank",
    highlights: [
      "AP Calculus AB Unit 2 is now live with 10 Differentiation topics.",
      "Each topic has 5 original MCQs and 1 original FRQ, for 50 MCQs and 10 FRQs total.",
      "Questions target AP style or slightly above AP rigor across derivative definitions, estimates, differentiability, and first derivative rules.",
      "The reviewer export script can now create a Unit 2 review package with `pnpm review:export -- u2-differentiation`.",
    ],
  },
  {
    version: "v0.1-alpha.3",
    date: "2026-05-25",
    title: "Review notebook",
    highlights: [
      "Added a local Review page that stores missed MCQs and FRQ rubric gaps for the active nickname profile.",
      "Wrong MCQ answers are saved automatically from item pages and practice sessions.",
      "Review practice lets students retry saved MCQ errors and moves them to Mastered when answered correctly.",
      "FRQ self-scoring now saves missed rubric points so students can reopen those prompts later.",
    ],
  },
  {
    version: "v0.1-alpha.2",
    date: "2026-05-25",
    title: "Full Limits question bank",
    highlights: [
      "AP Calculus AB Unit 1 now has all 16 Limits and Continuity topics live.",
      "Each topic has 5 original MCQs and 1 original FRQ, for 80 MCQs and 16 FRQs total.",
      "Item URLs now include the topic, such as t1-1-mc-001, so questions from different topics do not collide.",
      "All new content is marked Needs mentor review until a teacher verifies it.",
    ],
  },
  {
    version: "v0.1-alpha.1",
    date: "2026-05-25",
    title: "Local nickname memory",
    highlights: [
      "Added browser-local nickname profiles so students can separate progress without real names, email, passwords, or server accounts.",
      "Practice sessions now resume where the student left off for the active nickname or Guest profile.",
      "Multiple-choice attempts and free-response drafts now save locally on the same browser.",
      "Public privacy copy now explains that clearing browser data deletes this local memory.",
    ],
  },
  {
    version: "v0.1-alpha",
    date: "2026-05-25",
    title: "Broad STEM direction set",
    highlights: [
      "StudyLoop is now framed as a broad STEM practice platform for CBSE, AP, SAT, and IIT-JEE.",
      "AP Calculus AB remains the first live track while the wider platform structure is prepared.",
      "First Calc AB content slice launched with Unit 1, Topic 1.6 draft practice.",
      "Public copy now explains that CBSE, JEE, and SAT are planned tracks, not live content.",
      "Alpha reporting language is honest: item issues should be noted by URL and content ID until a report form ships.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <article className="container max-w-prose px-4 py-16">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">Changelog</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          What changed on {SITE.name}, in plain language.
        </p>
      </header>

      <div className="space-y-12">
        {ENTRIES.map((entry) => (
          <section key={entry.version} className="space-y-4">
            <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border pb-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                {entry.version}
                <span className="ml-3 font-normal text-muted-foreground">
                  — {entry.title}
                </span>
              </h2>
              <time
                dateTime={entry.date}
                className="text-sm text-muted-foreground"
              >
                {formatDate(entry.date)}
              </time>
            </header>

            <ul className="space-y-2 pl-5 [&>li]:list-disc">
              {entry.highlights.map((h, i) => (
                <li key={i} className="leading-relaxed">{h}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-border/60 pt-6 text-sm text-muted-foreground">
        Impact notes should begin only after the site has real student usage.
        Until then, this page records product and content changes in plain
        language.
      </p>
    </article>
  );
}
