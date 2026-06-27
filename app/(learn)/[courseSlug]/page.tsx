import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Breadcrumb } from "@/components/learn/breadcrumb";
import { findCourse, COURSES } from "@/content/courses";
import { cn } from "@/lib/utils";

interface Params {
  courseSlug: string;
}

export function generateStaticParams(): Params[] {
  return COURSES.map((c) => ({ courseSlug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { courseSlug } = await params;
  const course = findCourse(courseSlug);
  if (!course) return { title: "Not found" };
  return {
    title: course.title,
    description: course.description,
  };
}

export default async function CourseHubPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { courseSlug } = await params;
  const course = findCourse(courseSlug);
  if (!course) notFound();

  return (
    <div className="container max-w-content px-4 py-12">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: course.title }]} />

      <header className="mt-6">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {course.examFamily} · {course.shortTitle} · {course.audience}
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">{course.title}</h1>
        <p className="mt-3 max-w-prose text-lg text-muted-foreground">
          {course.description}
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Units</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {course.units.length} units mapped to the {course.frameworkLabel}.
          Click into a live unit to start practicing.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {course.units.map((unit) => {
            const isLive = unit.status === "live";
            const itemCount = unit.topics.reduce(
              (sum, t) => sum + t.items.length,
              0,
            );

            const cardInner = (
              <Card
                className={cn(
                  "h-full transition-all",
                  isLive && "hover:border-primary/50 hover:shadow-md",
                  !isLive && "opacity-60",
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {unit.unitCode}
                      </p>
                      <CardTitle className="mt-1 text-lg">{unit.title}</CardTitle>
                    </div>
                    {!isLive && (
                      <Lock
                        className="mt-1 h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLive ? (
                    <p className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
                      {itemCount > 0 ? `${itemCount} items` : "Start"}
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Coming soon</p>
                  )}
                </CardContent>
              </Card>
            );

            if (!isLive) {
              return (
                <div key={unit.slug} aria-disabled className="group block">
                  {cardInner}
                </div>
              );
            }

            return (
              <Link
                key={unit.slug}
                href={`/${course.slug}/${unit.slug}`}
                className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {cardInner}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
