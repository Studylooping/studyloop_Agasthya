import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PracticeSession } from "@/components/learn/practice-session";
import { findCourse, findUnit, COURSES } from "@/content/courses";
import type { McSingleItem } from "@/lib/content/types";

interface Params {
  courseSlug: string;
  unitSlug: string;
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
  if (!course || !unit) return { title: "Practice" };
  return {
    title: `Practice — ${unit.title}`,
    robots: { index: false, follow: false },
  };
}

export default async function SessionPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { courseSlug, unitSlug } = await params;
  const course = findCourse(courseSlug);
  const unit = findUnit(courseSlug, unitSlug);
  if (!course || !unit) notFound();

  // A practice session is a rapid run through the multiple-choice items.
  // FRQs are deliberate, slower work and live on the individual item pages.
  const mcItems: McSingleItem[] = unit.topics
    .flatMap((t) => t.items)
    .filter((i): i is McSingleItem => i.kind === "mc_single");

  if (mcItems.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-prose-narrow flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          No practice items yet
        </h1>
        <p className="mt-2 text-muted-foreground">
          This unit doesn&apos;t have multiple-choice items ready for a practice
          session yet.
        </p>
        <Button asChild className="mt-6">
          <Link href={`/${course.slug}/${unit.slug}`}>Back to unit</Link>
        </Button>
      </div>
    );
  }

  return (
    <PracticeSession
      courseSlug={course.slug}
      courseShortTitle={course.shortTitle}
      unitSlug={unit.slug}
      unitCode={unit.unitCode}
      unitTitle={unit.title}
      items={mcItems}
    />
  );
}
