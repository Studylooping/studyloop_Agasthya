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
import { canonicalYouTubeLink } from "@/lib/video-lessons";

interface FeedbackDialogProps {
  kind: FeedbackKind;
  context?: QuestionFeedbackContext;
  compact?: boolean;
  className?: string;
  triggerText?: string;
  initialDetails?: string;
  videoSuggestion?: { context: string; language: "en" | "hi"; topics: string };
}

type SubmissionState = "idle" | "sending" | "sent" | "error";

function getSubjectTarget(payload: FeedbackSubmission) {
  if (payload.context?.contentId) return payload.context.contentId;

  try {
    return new URL(payload.pageUrl).hostname;
  } catch {
    return "studyloop.in";
  }
}

function buildFeedbackMailtoHref(
  payload: FeedbackSubmission,
  categoryLabels: string[],
) {
  const reportTitle =
    payload.kind === "question" ? "Question report" : "Site feedback";
  const subject = `[StudyLoop ${reportTitle}] ${
    categoryLabels[0] ?? "Feedback"
  } - ${getSubjectTarget(payload)}`;
  const body = [
    reportTitle,
    "",
    `Categories: ${categoryLabels.join(", ") || "Not provided"}`,
    payload.context ? `Content ID: ${payload.context.contentId}` : null,
    payload.context ? `Course: ${payload.context.course}` : null,
    payload.context ? `Unit: ${payload.context.unit}` : null,
    payload.context ? `Topic: ${payload.context.topic}` : null,
    payload.context ? `Question: ${payload.context.question}` : null,
    `Details: ${payload.details || "Not provided"}`,
    `Contact: ${payload.contactEmail || "Not provided"}`,
    `Page: ${payload.pageUrl}`,
    `Viewport: ${payload.viewport || "Unknown"}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  return `mailto:${SITE.feedbackEmail}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

export function FeedbackDialog({
  kind,
  context,
  compact = false,
  className,
  triggerText,
  initialDetails = "",
  videoSuggestion,
}: FeedbackDialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const [categories, setCategories] = React.useState<FeedbackCode[]>([]);
  const [details, setDetails] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [openedAt, setOpenedAt] = React.useState(0);
  const [videoUrl, setVideoUrl] = React.useState("");
  const [videoLanguage, setVideoLanguage] = React.useState("en");
  const [videoTopics, setVideoTopics] = React.useState("");
  const [fallbackMailtoHref, setFallbackMailtoHref] = React.useState(
    `mailto:${SITE.feedbackEmail}`,
  );
  const [submissionState, setSubmissionState] =
    React.useState<SubmissionState>("idle");

  const isQuestion = kind === "question";
  const options = getFeedbackOptions(kind);
  const canSubmit =
    categories.length > 0 &&
    (!videoSuggestion ||
      (!!canonicalYouTubeLink(videoUrl) && videoTopics.trim().length > 0)) &&
    (isQuestion || details.trim().length >= 3) &&
    submissionState !== "sending";

  function openDialog() {
    setCategories(videoSuggestion ? ["suggestion"] : []);
    setDetails(videoSuggestion ? "" : initialDetails);
    setVideoUrl("");
    setVideoLanguage(videoSuggestion?.language ?? "en");
    setVideoTopics(videoSuggestion?.topics ?? "");
    setContactEmail("");
    setWebsite("");
    setOpenedAt(Date.now());
    setFallbackMailtoHref(`mailto:${SITE.feedbackEmail}`);
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
      details: videoSuggestion
        ? `Video suggestion\n${videoSuggestion.context.slice(0, 600)}\nTopics: ${videoTopics.trim()}\nSuggested video: ${canonicalYouTubeLink(videoUrl)}\nTeaching language: ${videoLanguage === "hi" ? "Hindi / Hinglish" : "English"}\nWhy this lesson: ${details.trim()}`
        : details.trim(),
      contactEmail: contactEmail.trim(),
      pageUrl: window.location.href,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      context,
      openedAt,
      website,
    };
    const categoryLabels = categories.flatMap((code) => {
      const label = options.find((option) => option.code === code)?.label;
      return label ? [label] : [];
    });
    setFallbackMailtoHref(buildFeedbackMailtoHref(payload, categoryLabels));

    try {
      const response = await fetch(SITE.feedbackEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Feedback delivery failed");
      setSubmissionState("sent");
    } catch {
      setSubmissionState("error");
    }
  }

  const TriggerIcon = isQuestion ? Flag : MessageSquarePlus;
  const triggerLabel =
    triggerText ??
    (isQuestion ? (compact ? "Flag" : "Flag this question") : "Feedback");

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
          triggerText ??
          (!isQuestion
            ? "Feedback"
            : compact
              ? "Flag this question"
              : undefined)
        }
        title={compact ? "Flag this question" : undefined}
      >
        <TriggerIcon className="h-4 w-4" aria-hidden="true" />
        <span className={cn(!isQuestion && !triggerText && "hidden sm:inline")}>
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
                  {videoSuggestion
                    ? "Suggest a better video"
                    : isQuestion
                      ? "Flag this question"
                      : "Please provide feedback"}
                </h2>
                <p
                  id={descriptionId}
                  className="mt-1 text-sm text-muted-foreground"
                >
                  {videoSuggestion
                    ? `Send a lesson recommendation to ${SITE.feedbackEmail}. Suggestions are reviewed before publication.`
                    : isQuestion
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

              {!videoSuggestion && (
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
              )}

              {videoSuggestion && (
                <>
                  <div>
                    <label
                      htmlFor={`${titleId}-video-url`}
                      className="text-sm font-medium"
                    >
                      YouTube video link
                    </label>
                    <input
                      id={`${titleId}-video-url`}
                      type="url"
                      required
                      maxLength={500}
                      value={videoUrl}
                      onChange={(event) => setVideoUrl(event.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      aria-describedby={`${titleId}-video-url-note`}
                      className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                    <p
                      id={`${titleId}-video-url-note`}
                      className="mt-1 text-xs text-muted-foreground"
                    >
                      {videoUrl && !canonicalYouTubeLink(videoUrl)
                        ? "Enter a valid HTTPS YouTube video or youtu.be link."
                        : "Only the link is sent; the suggested video is not loaded."}
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor={`${titleId}-video-topics`}
                      className="text-sm font-medium"
                    >
                      Topic or concept
                    </label>
                    <input
                      id={`${titleId}-video-topics`}
                      required
                      maxLength={150}
                      value={videoTopics}
                      onChange={(event) => setVideoTopics(event.target.value)}
                      className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`${titleId}-video-language`}
                      className="text-sm font-medium"
                    >
                      Teaching language
                    </label>
                    <select
                      id={`${titleId}-video-language`}
                      value={videoLanguage}
                      onChange={(event) => setVideoLanguage(event.target.value)}
                      className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi / Hinglish</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor={`${titleId}-details`}
                  className="text-sm font-medium"
                >
                  {videoSuggestion ? "Why is this lesson useful?" : "Details"}{" "}
                  {isQuestion ? (
                    <span className="text-muted-foreground">(optional)</span>
                  ) : null}
                </label>
                <textarea
                  id={`${titleId}-details`}
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  rows={4}
                  maxLength={videoSuggestion ? 900 : 2000}
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
                The current page address, technical context, selected issue
                type, and any details or email you enter are sent with this
                report. Your StudyLoop profile and answers are not sent.
              </p>

              {submissionState === "error" ? (
                <div
                  role="alert"
                  className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
                >
                  <p className="text-destructive">
                    We could not send this automatically right now.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <a href={fallbackMailtoHref}>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      Open email draft
                    </a>
                  </Button>
                </div>
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
