import type { Metadata } from "next";
import { SITE } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About",
  description: `Who built ${SITE.name} and why. A free, student-led STEM practice platform.`,
};

export default function AboutPage() {
  return (
    <article className="container max-w-prose-narrow px-4 py-16">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">About {SITE.name}</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          A free, student-led STEM practice platform.
        </p>
      </header>

      <div className="space-y-6 text-base leading-relaxed">
        <p>
          {SITE.name} exists because serious STEM learning should not depend
          on expensive prep platforms. The long-term goal is to support CBSE
          Classes 9-12, AP, SAT, and IIT-JEE through one careful learning
          loop: practice, hints, feedback, and review.
        </p>

        <p>
          The project is built and maintained by a Class 11 student in India,
          with an adult sponsor overseeing the legal and operational side.
          The goal is not to compete with huge education companies on day one.
          It is to build a small, careful, honest study tool that is free,
          ad-free, and respectful of the students who use it.
        </p>

        <h2 className="pt-6 text-2xl font-semibold tracking-tight">
          What's here right now
        </h2>
        <p>
          AP Calculus AB is the first live track. It currently has full Unit
          1 Limits, Unit 2 Differentiation, Unit 3 Composite/Implicit/Inverse
          Differentiation, Unit 4 Contextual Applications, and Unit 5
          Analytical Applications, Unit 6 Integration, Unit 7 Differential
          Equations, and Unit 8 Applications of Integration question banks with
          multiple-choice practice, free-response self-grading, hint ladders,
          worked solutions, and local nickname profiles that remember your work
          on this device. CBSE, JEE, and SAT are planned tracks, but they should
          be added only after the first AP Calc loop is stable.
        </p>

        <h2 className="pt-6 text-2xl font-semibold tracking-tight">
          How learning works here
        </h2>
        <p>
          Every practice item gives you three progressive hints if you're
          stuck — first a nudge, then a strategic direction, then a structured
          setup. Wrong answers come with feedback that points to the specific
          misconception so you understand what to fix, not just what to
          memorize. A local nickname profile lets the browser resume practice
          sessions, restore drafted free-response work, and save missed items
          for review without sending that work to StudyLoop.
        </p>

        <h2 className="pt-6 text-2xl font-semibold tracking-tight">
          A note on AI
        </h2>
        <p>
          AI may help draft questions and explanations. AI does not decide
          whether your answer is right. Multiple-choice answers are checked by
          deterministic code, free-response items use self-grading rubrics, and
          future symbolic math should be checked by a real algebra system such
          as SymPy. Items carry visible review badges so students, parents, and
          schools can see the level of review behind each question.
        </p>

        <h2 className="pt-6 text-2xl font-semibold tracking-tight">Contact</h2>
        <p>
          Found an error in a question during alpha testing? Note the item
          page URL and content ID, then share it with the project owner. A
          proper report form should be connected before public launch.
        </p>
      </div>
    </article>
  );
}
