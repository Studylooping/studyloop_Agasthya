import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { CELL_COLLECTION, schoolCollectionItems } from "@/content/school-collection";
import { itemSlug } from "@/content/courses";
import { MixedMath, QuestionStem } from "@/components/math/math";
import { ItemFigure } from "@/components/learn/item-figure";
import { PrintButton } from "@/components/site/print-button";
import { getDisplayMcChoices } from "@/lib/grading/choice-display";

export const metadata = pageMetadata("/schools/cells", { title: "Cells practice worksheet", description: "Class IX cells practice, prepared for teacher review." });

export default function CellsWorksheet() {
  const items = schoolCollectionItems();
  return (
    <article className="school-print container max-w-prose px-4 py-8">
      <Link href="/schools" className="text-primary underline print:hidden">Teacher guide</Link>
      <h1 className="mt-4 text-2xl font-semibold">{CELL_COLLECTION.title}</h1>
      <p className="mt-2 text-sm">CBSE IX, {CELL_COLLECTION.curriculumYear}. Collection {CELL_COLLECTION.version}. Teacher review pending. Work on paper; give reasons for written answers.</p>
      <div className="mt-4 flex flex-wrap items-center gap-4 print:hidden"><PrintButton label="Print questions" /><Link href="/schools/cells/answers" className="text-primary underline">Separate answers and rubric</Link></div>
      {items.map((item, index) => (
        <section key={item.contentId} className="school-question mt-8 border-t border-border pt-5">
          <h2 className="mb-3 font-semibold">Question {index + 1}{item.kind === "frq" ? ` (${item.rubric.maxPoints} ${item.rubric.maxPoints === 1 ? "mark" : "marks"})` : " (multiple choice)"}</h2>
          <QuestionStem text={item.questionLatex} />
          {item.figure && <ItemFigure figure={item.figure} className="mt-3" />}
          {item.kind === "mc_single" && <ol className="mt-3 space-y-2">{getDisplayMcChoices(item).map(({choice, displayLetter}) => <li key={choice.letter}><span className="mr-2 font-medium">{displayLetter}.</span><MixedMath text={choice.text} /></li>)}</ol>}
          {item.kind === "frq" && <div className="mt-3 space-y-3">{item.parts.map((part) => <p key={part.letter}>({part.letter}) <MixedMath text={part.promptMarkdown} /> ({part.points} {part.points === 1 ? "mark" : "marks"})</p>)}</div>}
          <p className="mt-4 text-xs text-muted-foreground">{itemSlug(item.contentId)} | version {item.version} | teacher review pending</p>
          <Link href={`/${item.course}/${item.unit}/${itemSlug(item.contentId)}`} className="mt-2 inline-block text-sm text-primary underline print:hidden">Open question or report an issue</Link>
        </section>
      ))}
    </article>
  );
}
