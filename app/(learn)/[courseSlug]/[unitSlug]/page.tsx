import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Hash, ScrollText, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Breadcrumb } from "@/components/learn/breadcrumb";
import {
  DifficultyGuide,
  getDifficultyLabel,
} from "@/components/learn/difficulty-guide";
import { ItemStatusBadge } from "@/components/learn/item-status-badge";
import { findCourse, findUnit, COURSES, itemSlug } from "@/content/courses";
import { cn } from "@/lib/utils";
import type { Item } from "@/lib/content/types";

interface Params {
  courseSlug: string;
  unitSlug: string;
}

function itemKindLabel(item: Item) {
  if (item.kind === "mc_single") return "MC";
  if (item.kind === "numeric") return "Num";
  if (item.kind !== "frq") return "Practice";
  if (item.responseType === "vsaq") return "VSAQ";
  if (item.responseType === "saq") return "SAQ";
  if (item.responseType === "laq") return "LAQ";
  if (item.responseType === "case") return "Case";
  return "FRQ";
}

export function generateStaticParams(): Params[] {
  return COURSES.flatMap((c) =>
    c.units
      .filter((u) => u.status === "live")
      .map((u) => ({ courseSlug: c.slug, unitSlug: u.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { courseSlug, unitSlug } = await params;
  const course = findCourse(courseSlug);
  const unit = findUnit(courseSlug, unitSlug);
  if (!course || !unit) return { title: "Not found" };
  return {
    title: `${unit.title} — ${course.shortTitle}`,
    description: unit.description,
  };
}

export default async function UnitPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { courseSlug, unitSlug } = await params;
  const course = findCourse(courseSlug);
  const unit = findUnit(courseSlug, unitSlug);
  if (!course || !unit) notFound();

  return (
    <div className="container max-w-content px-4 py-12">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: course.shortTitle, href: `/${course.slug}` },
          { label: unit.unitCode },
        ]}
      />

      <header className="mt-6">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {course.shortTitle} · {unit.unitCode}
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{unit.title}</h1>
        {unit.description && (
          <p className="mt-3 max-w-prose text-lg text-muted-foreground">
            {unit.description}
          </p>
        )}
      </header>

      {(() => {
        const mcCount = unit.topics
          .flatMap((t) => t.items)
          .filter((i) => i.kind === "mc_single").length;
        if (mcCount === 0) return null;
        return (
          <div className="mt-8 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold tracking-tight">Test yourself</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                A focused, distraction-free run through {mcCount} multiple-choice
                questions. Hints if you need them; your score at the end.
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link href={`/session/${course.slug}/${unit.slug}`}>
                <Play className="h-4 w-4" />
                Start practice
              </Link>
            </Button>
          </div>
        );
      })()}

      <DifficultyGuide className="mt-6" />

      {unit.topics.length === 0 ? (
        <div className="mt-12 rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">
            Items for this unit are being prepared. Check back soon.
          </p>
        </div>
      ) : (
        unit.topics.map((topic) => {
          const itemId = itemSlug;

          return (
            <section key={topic.topicCode} className="mt-12">
              <header className="mb-6">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Topic {topic.topicCode}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  {topic.title}
                </h2>
                {topic.subtopic && (
                  <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                    {topic.subtopic}
                  </p>
                )}
              </header>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {topic.items.map((item, i) => {
                  const slug = itemId(item.contentId);
                  return (
                    <Link
                      key={item.contentId}
                      href={`/${course.slug}/${unit.slug}/${slug}`}
                      className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <Card className="h-full p-4 transition-all hover:border-primary/50 hover:shadow-md">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {item.kind === "frq" ? (
                              <>
                                <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
                                {itemKindLabel(item)}
                              </>
                            ) : item.kind === "numeric" ? (
                              <>
                                <Hash className="h-3.5 w-3.5" aria-hidden="true" />
                                {itemKindLabel(item)}
                              </>
                            ) : (
                              <span>MC</span>
                            )}
                            <span aria-hidden="true">·</span>
                            <span>{getDifficultyLabel(item.difficulty)}</span>
                          </div>
                          <ItemStatusBadge
                            reviewStatus={item.reviewStatus}
                            verifiedBy={item.verifiedBy}
                          />
                        </div>
                        <p className="mt-3 font-medium text-foreground">
                          Item {i + 1}
                        </p>
                        <p className="mt-3 inline-flex items-center gap-1 text-sm text-primary group-hover:underline">
                          Open
                          <ArrowRight
                            className={cn(
                              "h-4 w-4 transition-transform group-hover:translate-x-0.5",
                            )}
                            aria-hidden="true"
                          />
                        </p>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
