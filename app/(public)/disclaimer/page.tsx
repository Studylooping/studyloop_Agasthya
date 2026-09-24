import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/utils";

export const metadata: Metadata = pageMetadata("/disclaimer", {
  title: "Disclaimer",
  description: `Trademark, content, and AI disclosures for ${SITE.name}.`,
});

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
            Exam-board and trademark notice
          </h2>
          <p>
            AP&reg; is a trademark registered by the College Board. {SITE.name}{" "}
            is an independent, student-led educational project. We are not
            affiliated with, sponsored by, or endorsed by the College Board.
            References to AP course frameworks on this site are descriptive and
            used in good faith to help students find the right material for
            their exam preparation.
          </p>
          <p>
            {SITE.name} is also not affiliated with, sponsored by, or endorsed
            by CBSE or NCERT. References to CBSE classes, subject codes,
            syllabi, and NCERT topics are descriptive labels for syllabus
            alignment and student navigation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Original content
          </h2>
          <p>
            Every StudyLoop-authored question, lesson, and worked example should be
            original. Nothing should be copied, paraphrased, or adapted from
            College Board released items, AP Classroom, CBSE/NCERT materials,
            textbooks, or commercial prep platforms. If an item resembles
            copyrighted material, it should be retired and rewritten after
            confirmation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            AI disclosure
          </h2>
          <p>
            Questions may be drafted with AI assistance and revised through
            automated checks, reviewer passes, and founder review before
            publication. The aim is original practice that matches the style and
            rigor of the relevant exam without copying from published papers,
            textbooks, or commercial prep resources. AI does not grade your
            answers. Current multiple-choice items are checked by deterministic
            code; free-response items use self-grading rubrics; future algebraic
            answers should be verified for mathematical equivalence using SymPy
            or an equivalent symbolic system.
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
            instruction, a laboratory science requirement, or the guidance of a
            qualified teacher. Use it alongside your school's curriculum, not in
            place of it.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">Optional YouTube lessons</h2>
          <p>
            These recordings belong to their named creators, are played through
            YouTube, and are not StudyLoop-authored or endorsed by CBSE. Selections
            are matched to the stated concepts, not an objective ranking of all
            videos. Older recordings may include extra topics or different exam
            formats. Follow your teacher's current assessment syllabus.
          </p>
          <p>
            Loading a video connects to Google/YouTube. Privacy-enhanced mode does
            not prevent all data processing or ads. Google can receive your IP
            address, device information and playback activity; videos may also
            contain creator promotions. StudyLoop does not send your nickname,
            answers or saved practice history to the player. Consent is not saved
            across lessons or visits. Closing the player stops further playback
            but cannot undo data already sent to Google.
          </p>
          <p>
            You can skip videos and use every practice activity. Families and
            schools should decide whether third-party playback is appropriate
            for their students. Google's <a href="https://policies.google.com/privacy"
              target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">privacy policy</a> and
            YouTube's terms apply when you use the player.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Local nickname profiles
          </h2>
          <p>
            Nickname profiles are local browser memory, not real accounts. They
            are meant to separate progress, saved errors, and review status for
            different students using the same device. Do not use real names.
            Clearing browser data may delete this local progress.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Student privacy and children's data
          </h2>
          <p>
            {SITE.name} is designed for students, including students under 18.
            India's{" "}
            <a
              href="https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf"
              rel="noopener noreferrer"
              target="_blank"
              className="text-primary underline underline-offset-4 hover:no-underline"
            >
              Digital Personal Data Protection Act, 2023
            </a>{" "}
            treats a person under 18 as a child and places special duties on
            anyone processing a child's personal data, including verifiable
            parental consent and restrictions on tracking, behavioural
            monitoring, and targeted advertising directed at children.
          </p>
          <p>
            To avoid collecting student data during ordinary practice,{" "}
            {SITE.name} does not require server accounts, passwords, real names,
            school names, phone numbers, server-side answer history, advertising
            trackers or behavioural profiles. Practice
            progress, drafts, saved mistakes, and nickname profiles stay in the
            browser's local storage on the device being used.
          </p>
          <p>
            Cloudflare Web Analytics measures aggregate page views, referrers
            and website performance. It does not use analytics cookies or
            browser fingerprinting. StudyLoop does not send your answers,
            nickname, saved mistakes or hint activity to this service.
          </p>
          <p>
            Feedback reports are one exception because they are deliberately
            sent to us for review. A report may include the page address,
            selected issue type, technical context, optional written details,
            and an optional email address if you choose to provide one. Students
            should not include unnecessary personal information in feedback; if
            you are under 18, use feedback with a parent, guardian, or teacher's
            knowledge.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Limitation of liability
          </h2>
          <p>
            We do our best to provide accurate, useful practice content, but
            errors may exist. Your performance on an actual exam depends on many
            factors beyond your use of this site. {SITE.name} and its
            contributors accept no responsibility for exam outcomes, school
            marks, admissions results, or decisions students or families make
            based on practice results.
          </p>
        </section>
      </div>
    </article>
  );
}
