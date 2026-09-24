import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { CELL_COLLECTION, schoolCollectionItems } from "@/content/school-collection";
import { MixedMath, Tex } from "@/components/math/math";
import { PrintButton } from "@/components/site/print-button";
import { getDisplayLetterForOriginal } from "@/lib/grading/choice-display";

export const metadata = pageMetadata("/schools/cells/answers", { title: "Cells marking guidance", robots: { index: false, follow: true } });

export default function CellsAnswers() {
  return (
    <article className="school-print container max-w-prose px-4 py-8">
      <Link href="/schools/cells" className="text-primary underline print:hidden">Question worksheet</Link>
      <h1 className="mt-4 text-2xl font-semibold">Cells: answers and marking guidance</h1>
      <p className="mt-2 text-sm">Collection {CELL_COLLECTION.version}. Teacher review pending. Accept equivalent correct wording. Mark each stated criterion independently; no penalty for a different valid method.</p>
      <div className="mt-4"><PrintButton label="Print answers" /></div>
      {schoolCollectionItems().map((item, index) => (
        <section key={item.contentId} className="school-question mt-8 border-t border-border pt-5">
          <h2 className="font-semibold">Question {index + 1}</h2>
          {item.kind === "mc_single" && <p className="mt-2 font-medium">Correct option: {getDisplayLetterForOriginal(item, item.correctLetter)}</p>}
          <div className="mt-3 space-y-3">{item.workedSolution.map((step, number) => <div key={number}><p><MixedMath text={step.explanation} /></p>{step.math && <Tex tex={step.math} display />}</div>)}</div>
          {item.kind === "frq" && <ul className="mt-4 list-disc space-y-2 pl-5">{item.rubric.criteria.map((criterion, number) => <li key={number}>({criterion.part}) {criterion.points} {criterion.points === 1 ? "mark" : "marks"}: <MixedMath text={criterion.description} /></li>)}</ul>}
          <p className="mt-3 text-xs text-muted-foreground">Content version {item.version}; human review not recorded.</p>
        </section>
      ))}
    </article>
  );
}
