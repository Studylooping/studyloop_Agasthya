import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { CELL_COLLECTION } from "@/content/school-collection";
import { PrintButton } from "@/components/site/print-button";

export const metadata = pageMetadata("/schools", { title: "For teachers", description: "A printable practice collection and review guide for teachers." });

export default function SchoolsPage() {
  return (
    <article className="school-print container max-w-prose px-4 py-8">
      <h1 className="text-3xl font-semibold">For teachers</h1>
      <p className="mt-3">Start with one collection that you have checked for your class. StudyLoop is supplementary practice; publication and automated checks do not mean teacher verification.</p>
      <section className="mt-6 border-y border-border py-5">
        <h2 className="text-xl font-semibold">{CELL_COLLECTION.title}</h2>
        <p className="mt-2">CBSE Class IX Science, {CELL_COLLECTION.curriculumYear}. 15 questions. Allow approximately 40-50 minutes for the complete set, or choose five for a shorter activity. Timing is an estimate.</p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt>Collection version</dt><dd>{CELL_COLLECTION.version}</dd>
          <dt>Prepared</dt><dd>17 September 2026</dd>
          <dt>Teacher review</dt><dd>Pending; no teacher sign-off recorded</dd>
          <dt>Review date / role</dt><dd>Not yet recorded</dd>
          <dt>Prerequisites</dt><dd>Basic cell structures, solution concentration, and movement through a membrane</dd>
        </dl>
        <div className="mt-4 flex flex-wrap gap-4 print:hidden">
          <Link href="/schools/cells" className="text-primary underline">Questions and printable worksheet</Link>
          <Link href="/schools/cells/answers" className="text-primary underline">Answers and marking guidance</Link>
        </div>
        <p className="mt-2 text-sm">Worksheet: studyloop.in/schools/cells</p>
      </section>
      <h2 className="mt-6 text-xl font-semibold">Learning objectives</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">{CELL_COLLECTION.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>
      <p className="mt-2 text-sm">Scope reference: <a href={CELL_COLLECTION.syllabusUrl} className="text-primary underline">official CBSE Science syllabus, Cell section, pages 4-5</a>. This collection samples those objectives; it does not cover the whole chapter or practical assessment.</p>
      <h2 className="mt-6 text-xl font-semibold">Before classroom use</h2>
      <p className="mt-2">Solve the selected questions from the worksheet before reading the answers. Check each diagram, distractor and marking point, then record your role, date and the versions you reviewed. Send corrections through the question&apos;s flag button or hello@studyloop.in. Public reviewer names require permission.</p>
      <h2 className="mt-6 text-xl font-semibold">A short classroom routine</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>Students attempt a few selected questions independently on paper or in their browser.</li>
        <li>In pairs, one explains a step and the other identifies a possible misconception; swap roles.</li>
        <li>Compare against the marking guidance. A teacher resolves disagreements.</li>
        <li>On another day, use different questions on the same ideas to check understanding.</li>
      </ol>
      <p className="mt-2">Projection or paper works without personal devices. No student answers, names or marks need to be sent to StudyLoop.</p>
      <h2 className="mt-6 text-xl font-semibold">Privacy and sharing</h2>
      <p className="mt-2">No StudyLoop account or class roster is required. Practice progress stays in the browser; clearing its storage removes it. A local nickname is not a secure account on a shared machine. Optional feedback sends only the details described in the feedback form.</p>
      <p className="mt-2">A general content-reuse licence has not yet been published. For permission to redistribute a classroom pack, contact hello@studyloop.in; a source-code licence should not be assumed to cover educational content.</p>
      <div className="mt-6"><PrintButton label="Print teacher guide" /></div>
    </article>
  );
}
