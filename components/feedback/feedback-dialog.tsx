"use client";

import * as React from "react";
import { CheckCircle2, Flag, MessageSquarePlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getFeedbackOptions,
  type FeedbackCode,
  type FeedbackKind,
  type FeedbackSubmission,
  type QuestionFeedbackContext,
} from "@/lib/feedback";
import { cn, SITE } from "@/lib/utils";

interface FeedbackDialogProps {
  kind: FeedbackKind;
  context?: QuestionFeedbackContext;
  compact?: boolean;
  className?: string;
}

type SubmissionState = "idle" | "sending" | "sent" | "error";

export function FeedbackDialog({
  kind,
  context,
  compact = false,
  className,
}: FeedbackDialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const [categories, setCategories] = React.useState<FeedbackCode[]>([]);
  const [details, setDetails] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [openedAt, setOpenedAt] = React.useState(0);
  const [submissionState, setSubmissionState] =
    React.useState<SubmissionState>("idle");

  const isQuestion = kind === "question";
  const options = getFeedbackOptions(kind);
  const canSubmit =
    categories.length > 0 &&
    (isQuestion || details.trim().length >= 3) &&
    submissionState !== "sending";

  function openDialog() {
    setCategories([]);
    setDetails("");
    setContactEmail("");
    setWebsite("");
    setOpenedAt(Date.now());
    setSubmissionState("idle");
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function toggleCategory(code: FeedbackCode) {
    setCategories((current) =>
      current.includes(code)
        ? current.filter((candidate) => candidate !== code)
        : [...current, code],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmissionState("sending");
    const payload: FeedbackSubmission = {
      kind,
      categories,
      details: details.trim(),
      contactEmail: contactEmail.trim(),
      pageUrl: window.location.href,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      context,
      openedAt,
      website,
    };

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_FEEDBACK_ENDPOINT ?? "/api/feedback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) throw new Error("Feedback delivery failed");
      setSubmissionState("sent");
    } catch {
      setSubmissionState("error");
    }
  }

  const TriggerIcon = isQuestion ? Flag : MessageSquarePlus;
  const triggerLabel = isQuestion
    ? compact
      ? "Flag"
      : "Flag this question"
    : "Feedback";

  return (
    <>
      <Button
        type="button"
        variant={isQuestion ? "ghost" : "outline"}
        size="sm"
        onClick={openDialog}
        className={cn(
          isQuestion && "text-muted-foreground hover:text-foreground",
          !isQuestion && "bg-background shadow-md",
          className,
        )}
        aria-haspopup="dialog"
        aria-label={
          !isQuestion ? "Feedback" : compact ? "Flag this question" : undefined
        }
        title={compact ? "Flag this question" : undefined}
      >
        <TriggerIcon className="h-4 w-4" aria-hidden="true" />
        <span className={cn(!isQuestion && "hidden sm:inline")}>
          {triggerLabel}
        </span>
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-foreground/40 backdrop:backdrop-blur-[2px]"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
      >
        {submissionState === "sent" ? (
          <div className="p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-success"
                aria-hidden="true"
              />
              <div>
                <h2 id={titleId} className="font-semibold">
                  Feedback sent
                </h2>
                <p
                  id={descriptionId}
                  className="mt-1 text-sm text-muted-foreground"
                >
                  Thank you. Your feedback has been submitted for review.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button type="button" onClick={closeDialog}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background px-5 py-4">
              <div>
                <h2 id={titleId} className="font-semibold">
                  {isQuestion
                    ? "Flag this question"
                    : "Please provide feedback"}
                </h2>
                <p
                  id={descriptionId}
                  className="mt-1 text-sm text-muted-foreground"
                >
                  {isQuestion
                    ? "What should we review?"
                    : "Tell us what would make StudyLoop better."}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeDialog}
                aria-label="Close feedback form"
                className="-mr-2 -mt-2"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="space-y-5 px-5 py-5">
              {context ? (
                <p className="font-mono text-xs text-muted-foreground">
                  {context.contentId}
                </p>
              ) : null}

              <fieldset>
                <legend className="text-sm font-medium">
                  {isQuestion ? "Issue type" : "Feedback type"}
                </legend>
                <div className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                  {options.map((option) => (
                    <label
                      key={option.code}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={categories.includes(option.code)}
                        onChange={() => toggleCategory(option.code)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label
                  htmlFor={`${titleId}-details`}
                  className="text-sm font-medium"
                >
                  Details{" "}
                  {isQuestion ? (
                    <span className="text-muted-foreground">(optional)</span>
                  ) : null}
                </label>
                <textarea
                  id={`${titleId}-details`}
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  required={!isQuestion}
                  placeholder={
                    isQuestion
                      ? "Add anything that will help us verify the issue."
                      : "Share your experience or suggestion."
                  }
                  className="mt-2 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label
                  htmlFor={`${titleId}-email`}
                  className="text-sm font-medium"
                >
                  Email{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  id={`${titleId}-email`}
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  maxLength={254}
                  autoComplete="email"
                  placeholder="Only if you would like a reply"
                  className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div hidden aria-hidden="true">
                <label>
                  Website
                  <input
                    type="text"
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                The current page address and technical context are included with
                your message. Your StudyLoop profile and answers are not sent.
              </p>

              {submissionState === "error" ? (
                <p role="alert" className="text-sm text-destructive">
                  We could not send this right now. Please email{" "}
                  <a
                    className="font-medium underline underline-offset-4"
                    href={`mailto:${SITE.feedbackEmail}`}
                  >
                    {SITE.feedbackEmail}
                  </a>
                  .
                </p>
              ) : null}
            </div>

            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-border bg-background px-5 py-4">
              <Button type="button" variant="ghost" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                <Send className="h-4 w-4" aria-hidden="true" />
                {submissionState === "sending" ? "Sending..." : "Send feedback"}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
