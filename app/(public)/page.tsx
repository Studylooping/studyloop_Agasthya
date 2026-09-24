import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/utils";

export const metadata = pageMetadata("/", { title: { absolute: `${SITE.name} \u2014 Free STEM practice` }, description: SITE.description });
import { BookOpen, Sparkles, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubjectCard } from "@/components/site/subject-card";
import { LEARNING_PATHS } from "@/content/learning-paths";
import { COURSES } from "@/content/courses";
import { PracticePicker } from "@/components/site/practice-picker";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Original practice",
    body: "Every published item is written for StudyLoop. The catalogue grows through original school and exam practice without copying official or commercial material.",
  },
  {
    icon: Sparkles,
    title: "3-step hint ladders",
    body: "Hints move from a nudge to a more explicit strategy or setup. Available hints appear on each question before you reveal the worked solution.",
  },
  {
    icon: CheckCircle2,
    title: "Deterministic grading",
    body: "Multiple-choice and supported numerical answers are checked by code, not by a chatbot. Written responses use a worked solution and self-marking criteria.",
  },
  {
    icon: RotateCcw,
    title: "Local review memory",
    body: "Choose a nickname profile and your browser remembers practice sessions, missed questions, rubric gaps, and drafts on this device only.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="container max-w-content px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-prose-narrow text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span
              className="h-1.5 w-1.5 rounded-full bg-success"
              aria-hidden="true"
            />
            Free, always
          </p>
          <h1 className="text-4xl font-bold sm:text-5xl">
            StudyLoop
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Free CBSE and AP practice, with hints, worked solutions and a
            private notebook for your mistakes.
          </p>
          <PracticePicker courses={COURSES.filter((course) => course.status === "live").map((course) => ({
            slug: course.slug,
            title: course.title.replace(/^CBSE Class \d+ /, ""),
            group: course.slug.match(/-(9|10|11|12)$/)?.[1] ?? "ap",
          }))} />
          <div className="mt-4 flex justify-center">
            <Button asChild variant="ghost">
              <Link href="/about">How this works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Learning paths ───────────────────────────────────────────── */}
      <section id="subjects" className="container max-w-content scroll-mt-28 px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            Choose a path
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each subject uses original questions, hints, worked solutions, and
            local review memory.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LEARNING_PATHS.map((path) => (
            <SubjectCard key={path.href} {...path} />
          ))}
        </div>
      </section>

      {/* ── What's inside ────────────────────────────────────────────── */}
      <section className="container max-w-content px-4 py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            What's inside
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-4 rounded-lg border border-border bg-card p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────── */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="container max-w-content px-4 py-10">
          <div className="mx-auto max-w-prose-narrow text-center text-sm text-muted-foreground">
            <p className="text-base font-medium text-foreground">
              Free forever. No StudyLoop ads or behavioural tracking. No selling your
              data.
            </p>
            <p className="mt-2">
              Every track follows the same rule: original content, visible
              readiness status, and deterministic grading wherever code can do
              the job.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
