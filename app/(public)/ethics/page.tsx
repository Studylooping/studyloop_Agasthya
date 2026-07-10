import type { Metadata } from "next";
import { SITE } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Ethics",
  description: `Our commitments to students using ${SITE.name}.`,
};

export default function EthicsPage() {
  return (
    <article className="container max-w-prose-narrow px-4 py-16">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          Our commitments to students
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Four things we promise — and four things we will never do.
        </p>
      </header>

      <div className="space-y-8 text-base leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            1. The AI may make mistakes.
          </h2>
          <p>
            Many items on {SITE.name} are drafted with AI assistance and then
            reviewed before publication. We're upfront about this on every item
            with a visible review badge, such as "Verified by StudyLoop Review
            Team". If you spot an error during alpha testing, note the item URL
            and content ID so it can be retired or corrected quickly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            2. This site is for learning support, not official scoring.
          </h2>
          <p>
            We give you free, useful practice and feedback. We do not predict,
            estimate, or simulate your actual AP exam score. The College Board
            sets the scoring criteria for the real exam; we are independent
            and not affiliated with them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            3. This is not a mental-health or crisis service.
          </h2>
          <p>
            Exam stress is real. If you're struggling with anxiety, panic, or
            anything heavier, please talk to someone you trust or contact a
            professional service. In India:{" "}
            <a
              href="https://icallhelpline.org/"
              rel="noopener noreferrer"
              target="_blank"
              className="text-primary underline underline-offset-4 hover:no-underline"
            >
              iCall
            </a>
            . In the US:{" "}
            <a
              href="https://988lifeline.org/"
              rel="noopener noreferrer"
              target="_blank"
              className="text-primary underline underline-offset-4 hover:no-underline"
            >
              988 Lifeline
            </a>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            4. We minimize what we collect, and we never sell anything about you.
          </h2>
          <p>
            You can use the entire site without a server account. We do not
            show advertisements. We do not run trackers, pixels, or third-party
            analytics that build a profile of you. If you choose a nickname
            profile, your practice progress, saved errors, and review status
            are stored only in this browser's local storage so you can resume
            later. Use a nickname, not your real name.
          </p>
        </section>

        <hr className="border-border/60" />

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            Things we will never do
          </h2>
          <ul className="space-y-2 pl-5 [&>li]:list-disc">
            <li>Run targeted advertising — to anyone, especially minors.</li>
            <li>Sell, rent, or share your data with third parties.</li>
            <li>
              Behaviorally profile you to predict your study patterns or push
              you toward paid features.
            </li>
            <li>Use camera-based proctoring or biometric monitoring.</li>
            <li>
              Hide costs or pretend "free" means "free with conditions." Free
              means free.
            </li>
          </ul>
        </section>

        <p className="pt-4 text-sm text-muted-foreground">
          These commitments are non-negotiable. They're built into how the
          site is designed at the code level — not just policy promises.
        </p>
      </div>
    </article>
  );
}
