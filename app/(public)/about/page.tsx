import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/utils";

export const metadata: Metadata = pageMetadata("/about", {
  title: "About",
  description: `What ${SITE.name} offers and how its free STEM practice is built.`,
});

export default function AboutPage() {
  return (
    <article className="container max-w-prose-narrow px-4 py-16">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">About {SITE.name}</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Free STEM practice with hints, feedback, and review.
        </p>
      </header>

      <div className="space-y-6 text-base leading-relaxed">
        <p>
          {SITE.name} exists because serious STEM learning should not depend on
          expensive prep platforms. The site is built around one loop:
          exam-style practice, progressive hints, mistake-aware feedback, worked
          solutions, and review of missed questions.
        </p>

        <p>
          {SITE.name} is developed by Agasthya Venkatesh Bhairampally, a Class
          11 student.
          It is designed to stay free, ad-free, privacy-respecting, and useful
          for students who want practice that explains the mistake instead of
          only revealing the answer.
        </p>

        <h2 className="pt-6 text-2xl font-semibold tracking-tight">
          What's here right now
        </h2>
        <p>
          {SITE.name} now hosts a growing catalogue for CBSE school subjects,
          and AP Calculus AB. Course pages show published units only after the
          local automated checks pass. These checks catch structural and
          rendering problems; they do not certify academic accuracy. Question
          pages show whether teacher review is still pending.
        </p>

        <h2 className="pt-6 text-2xl font-semibold tracking-tight">
          How learning works here
        </h2>
        <p>
          Multiple-choice and written-answer practice offer progressive hints
          where available: a nudge, a strategy, then a structured setup.
          Wrong answers come with feedback that points to the specific
          misconception so you understand what to fix, not just what to
          memorize. A local nickname profile lets the browser resume practice
          sessions, restore drafted free-response work, and save missed items
          for review without sending that work to StudyLoop.
        </p>

        <h2 className="pt-6 text-2xl font-semibold tracking-tight">
          A note on AI
        </h2>
        <p>
          Questions and explanations may be drafted with AI assistance, then
          revised through automated checks and multiple review passes before
          publication. The goal is original practice that closely matches the
          style and rigor of the relevant exam, such as CBSE or AP, without
          copying from published papers or commercial resources. AI does not
          decide whether your answer is right: multiple-choice answers are
          checked by deterministic code, and free-response items use
          self-grading rubrics. Items carry visible review badges so students,
          parents, and schools can see the review status of each question.
        </p>

        <h2 className="pt-6 text-2xl font-semibold tracking-tight">Contact</h2>
        <p>
          Found an error in a question or have an idea for the site? Use the
          feedback button on the page. Reports include the current page address
          and technical context, plus any details or email address you choose to
          enter. Your StudyLoop nickname profile and practice answers are not
          sent.
        </p>
      </div>
    </article>
  );
}
