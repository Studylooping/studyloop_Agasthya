import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubjectCard } from "@/components/site/subject-card";
import { LEARNING_PATHS } from "@/content/learning-paths";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Original practice",
    body:
      "Every item is written for StudyLoop. The platform is built to cover school foundations, AP, SAT, and JEE without copying official or commercial material.",
  },
  {
    icon: Sparkles,
    title: "3-step hint ladders",
    body:
      "Stuck? Get a nudge first, then a strategy, then a structured setup — never the answer.",
  },
  {
    icon: CheckCircle2,
    title: "Deterministic grading",
    body:
      "Multiple-choice is checked by code today, not by a chatbot. Numeric and symbolic grading should follow the same deterministic rule as they are added.",
  },
  {
    icon: RotateCcw,
    title: "Local review memory",
    body:
      "Choose a nickname profile and the browser remembers your practice session, missed MCQs, FRQ rubric gaps, and drafts on this device only.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="container max-w-content px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-prose-narrow text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            Free, always
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            A free STEM study loop.
            <br />
            <span className="text-primary">CBSE Math, AP Calc, and JEE Main Math are live.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            StudyLoop is being built for Classes 9-12, CBSE, AP, SAT, and
            IIT-JEE: concept-first practice, hint ladders when you get stuck,
            and feedback that helps you understand the mistake instead of just
            memorizing an answer.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg">
              <Link href="/about">How this works</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Learning paths ───────────────────────────────────────────── */}
      <section className="container max-w-content px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight">Choose a path</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live tracks are listed first. Each one uses original questions,
            hints, worked solutions, and local review memory.
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
          <h2 className="text-2xl font-semibold tracking-tight">What's inside</h2>
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
                <h3 className="font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.body}</p>
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
              Free forever. No ads. No tracking. No selling your data.
            </p>
            <p className="mt-2">
              Every track follows the same rule: original content, visible
              review status, and deterministic grading wherever code can do the
              job.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
