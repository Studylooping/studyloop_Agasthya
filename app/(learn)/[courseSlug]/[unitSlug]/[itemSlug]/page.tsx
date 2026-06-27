import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Calculator, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QuestionStem } from "@/components/math/math";
import { Breadcrumb } from "@/components/learn/breadcrumb";
import {
  DifficultyGuide,
  getDifficultyLabel,
} from "@/components/learn/difficulty-guide";
import { ItemFigure } from "@/components/learn/item-figure";
import { ItemStatusBadge } from "@/components/learn/item-status-badge";
import { McAttempt } from "@/components/learn/mc-attempt";
import { FrqAttempt } from "@/components/learn/frq-attempt";
import { NumericAttempt } from "@/components/learn/numeric-attempt";
import { QuestionReportButton } from "@/components/feedback/question-report-button";
import {
  findCourse,
  findUnit,
  findItem,
  COURSES,
  itemSlug as toSlug,
} from "@/content/courses";
import type { Item } from "@/lib/content/types";

interface Params {
  courseSlug: string;
  unitSlug: string;
  itemSlug: string;
}

function itemKindLabel(item: Item) {
  if (item.kind === "mc_single") return "Multiple choice";
  if (item.kind === "numeric") return "Numerical value";
  if (item.kind !== "frq") return "Practice";
  if (item.responseType === "vsaq") return "Very short answer";
  if (item.responseType === "saq") return "Short answer";
  if (item.responseType === "laq") return "Long answer";
  if (item.responseType === "case") return "Case study";
  return "Free response";
}

export function generateStaticParams(): Params[] {
  return COURSES.flatMap((c) =>
    c.units
      .filter((u) => u.status === "live")
      .flatMap((u) =>
        u.topics.flatMap((t) =>
          t.items.map((item) => ({
            courseSlug: c.slug,
            unitSlug: u.slug,
            itemSlug: toSlug(item.contentId),
          })),
        ),
      ),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { courseSlug, unitSlug, itemSlug } = await params;
  const found = findItem(courseSlug, unitSlug, itemSlug);
  if (!found) return { title: "Not found" };
  return {
    title: `${found.item.kind === "frq" ? "FRQ" : "Practice"} — ${found.unit.title}`,
  };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { courseSlug, unitSlug, itemSlug } = await params;
  const course = findCourse(courseSlug);
  const unit = findUnit(courseSlug, unitSlug);
  const found = findItem(courseSlug, unitSlug, itemSlug);

  if (!course || !unit || !found) notFound();

  const { item, topic } = found;

  // Find prev/next item slugs within this topic for navigation
  const items = topic.items;
  const currentIndex = items.findIndex((i) => i.contentId === item.contentId);
  const prevItem = currentIndex > 0 ? items[currentIndex - 1] : null;
  const nextItem =
    currentIndex < items.length - 1 ? items[currentIndex + 1] : null;
  const slugOf = toSlug;

  return (
    <div className="container max-w-prose px-4 py-12">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: course.shortTitle, href: `/${course.slug}` },
          { label: unit.unitCode, href: `/${course.slug}/${unit.slug}` },
          { label: `Item ${currentIndex + 1}` },
        ]}
      />

      <article className="mt-6 space-y-6">
        {/* ── Header bar ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium uppercase tracking-wider text-muted-foreground">
            {itemKindLabel(item)}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {getDifficultyLabel(item.difficulty)} ({item.difficulty}/5)
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            {item.calculatorAllowed ? (
              <>
                <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
                Calculator allowed
              </>
            ) : (
              <>
                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                No calculator
              </>
            )}
          </span>
          <ItemStatusBadge
            reviewStatus={item.reviewStatus}
            verifiedBy={item.verifiedBy}
            className="ml-auto"
          />
        </div>

        {/* ── Stem ─────────────────────────────────────────────────────── */}
        <DifficultyGuide />

        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Question
          </p>
          <div className="mt-3 text-lg leading-relaxed">
            <QuestionStem text={item.questionLatex} />
          </div>
        </Card>
        {item.figure ? <ItemFigure figure={item.figure} /> : null}

        {/* ── Attempt UI (client component) ────────────────────────────── */}
        {item.kind === "mc_single" ? (
          <McAttempt item={item} />
        ) : item.kind === "numeric" ? (
          <NumericAttempt item={item} />
        ) : item.kind === "frq" ? (
          <FrqAttempt item={item} />
        ) : (
          <Card className="p-6 text-sm text-muted-foreground">
            This item type ({item.kind}) isn't yet supported in v0.1. It will be
            enabled in Phase 0c.
          </Card>
        )}

        {/* ── Prev / Next nav ──────────────────────────────────────────── */}
        <nav
          aria-label="Navigate items"
          className="flex items-center justify-between gap-4 border-t border-border pt-6"
        >
          {prevItem ? (
            <Button variant="ghost" size="sm" asChild>
              <Link
                href={`/${course.slug}/${unit.slug}/${slugOf(prevItem.contentId)}`}
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${course.slug}/${unit.slug}`}>Back to unit</Link>
          </Button>
          {nextItem ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/${course.slug}/${unit.slug}/${slugOf(nextItem.contentId)}`}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>

        {/* ── Report-an-error footer ───────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 border-t border-border pt-4 text-sm text-muted-foreground">
          <span>Something wrong with this item?</span>
          <QuestionReportButton
            context={{
              contentId: item.contentId,
              course: item.course,
              unit: item.unit,
              topic: item.topic,
              question: item.questionLatex,
            }}
          />
        </div>
      </article>
    </div>
  );
}
