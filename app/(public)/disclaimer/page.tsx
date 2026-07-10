import type { Metadata } from "next";
import { SITE } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: `Trademark, content, and AI disclosures for ${SITE.name}.`,
};

export default function DisclaimerPage() {
  return (
    <article className="container max-w-prose-narrow px-4 py-16">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Disclaimer</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Trademark, content, and AI disclosures.
        </p>
      </header>

      <div className="space-y-8 text-base leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Trademark notice
          </h2>
          <p>
            AP&reg; is a trademark registered by the College Board. {SITE.name}{" "}
            is an independent, student-led educational project. We are not
            affiliated with, sponsored by, or endorsed by the College Board.
            References to AP course frameworks on this site are descriptive
            and used in good faith to help students find the right material
            for their exam preparation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Original content
          </h2>
          <p>
            Every question, lesson, and worked example on {SITE.name} should
            be original. Nothing should be copied, paraphrased, or adapted
            from College Board released items, AP Classroom, CBSE/NCERT
            materials, SAT materials, textbooks, or commercial prep platforms.
            If an item resembles copyrighted material, it should be retired
            and rewritten after confirmation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            AI disclosure
          </h2>
          <p>
            Questions may be drafted with AI assistance and reviewed by a
            human before publication. AI does not grade your answers. Current
            multiple-choice items are checked by deterministic code;
            free-response items use self-grading rubrics; future algebraic
            answers should be verified for mathematical equivalence using
            SymPy or an equivalent symbolic system.
          </p>
          <p>
            Items carry visible badges showing the level of review. Current
            public content is marked "Verified by StudyLoop Review Team" after
            review, and future alpha content must remain visibly labelled until
            it is reviewed. You can always see which level of review an item
            has received.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Open educational resources
          </h2>
          <p>
            Where helpful, we link to external open resources such as OpenStax
            textbooks and PhET interactive simulations. We do not republish
            their content. Those resources are licensed under Creative Commons
            and remain the property of their respective creators.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Not a substitute for school instruction
          </h2>
          <p>
            {SITE.name} is a study companion. It does not replace classroom
            instruction, a laboratory science requirement, or the guidance of
            a qualified teacher. Use it alongside your school's curriculum,
            not in place of it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Local nickname profiles
          </h2>
          <p>
            Nickname profiles are local browser memory, not real accounts.
            They are meant to separate progress, saved errors, and review
            status for different students using the same device. Do not use
            real names. Clearing browser data may delete this local progress.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Limitation of liability
          </h2>
          <p>
            We do our best to provide accurate, useful practice content, but
            errors may exist. Your performance on the actual AP exam depends
            on many factors beyond your use of this site. {SITE.name} and its
            contributors accept no responsibility for exam outcomes or for
            decisions students or families make based on practice results.
          </p>
        </section>
      </div>
    </article>
  );
}
