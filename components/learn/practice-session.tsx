"use client";

import * as React from "react";
import Link from "next/link";
import {
  X,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionReportButton } from "@/components/feedback/question-report-button";
import { ItemFigure } from "@/components/learn/item-figure";
import { Tex, MixedMath, QuestionStem } from "@/components/math/math";
import { getItemFingerprint } from "@/lib/content/item-fingerprint";
import { gradeMcSingle } from "@/lib/grading/mc";
import {
  makeLocalStorageKey,
  readLocalValue,
  useLocalProfile,
  writeLocalValue,
} from "@/lib/local-memory";
import { markReviewMastered, recordMcError } from "@/lib/review-memory";
import { cn } from "@/lib/utils";
import type { McSingleItem } from "@/lib/content/types";

interface Props {
  courseSlug: string;
  courseShortTitle: string;
  unitSlug: string;
  unitCode: string;
  unitTitle: string;
  items: McSingleItem[];
}

interface AnswerRecord {
  correct: boolean;
  hintsUsed: number;
}

interface StoredPracticeSession {
  answers: AnswerRecord[];
  finished: boolean;
  hintsShown: number;
  index: number;
  itemFingerprints: string[];
  itemIds: string[];
  selected: string | null;
  submitted: boolean;
  updatedAt: string;
}

/**
 * Distraction-free practice session. Runs through MC items one at a time on
 * a calm, solid background. Per the founder's direction: simple, focused, no
 * site chrome, nothing to divert the student.
 *
 * State is stored locally in the student's browser so anonymous students can
 * resume a session without StudyLoop tracking them on a server.
 */
export function PracticeSession({
  courseSlug,
  courseShortTitle,
  unitSlug,
  unitCode,
  unitTitle,
  items,
}: Props) {
  const total = items.length;
  const [index, setIndex] = React.useState(0);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [hintsShown, setHintsShown] = React.useState(0);
  const [answers, setAnswers] = React.useState<AnswerRecord[]>([]);
  const [finished, setFinished] = React.useState(false);
  const [loadedStorageKey, setLoadedStorageKey] = React.useState<string | null>(
    null,
  );
  const { activeProfile, hydrated, profileStorageId } = useLocalProfile();

  const current = items[index];
  const unitHref = `/${courseSlug}/${unitSlug}`;
  const itemIds = React.useMemo(
    () => items.map((item) => item.contentId),
    [items],
  );
  const itemFingerprints = React.useMemo(
    () => items.map((item) => getItemFingerprint(item)),
    [items],
  );
  const storageKey = React.useMemo(
    () =>
      makeLocalStorageKey(
        "practice-session",
        profileStorageId,
        `${courseSlug}.${unitSlug}`,
      ),
    [courseSlug, profileStorageId, unitSlug],
  );

  const result =
    submitted && selected ? gradeMcSingle(current, selected) : null;

  React.useEffect(() => {
    if (!hydrated) return;

    const stored = readLocalValue<StoredPracticeSession>(storageKey);
    if (
      stored &&
      stored.itemIds.join("|") === itemIds.join("|") &&
      stored.itemFingerprints?.join("|") === itemFingerprints.join("|")
    ) {
      setIndex(Math.min(Math.max(stored.index, 0), total - 1));
      setSelected(stored.selected);
      setSubmitted(stored.submitted);
      setHintsShown(stored.hintsShown);
      setAnswers(stored.answers.slice(0, total));
      setFinished(stored.finished);
    } else {
      setIndex(0);
      setSelected(null);
      setSubmitted(false);
      setHintsShown(0);
      setAnswers([]);
      setFinished(false);
    }
    setLoadedStorageKey(storageKey);
  }, [hydrated, itemFingerprints, itemIds, storageKey, total]);

  React.useEffect(() => {
    if (!hydrated || loadedStorageKey !== storageKey) return;

    writeLocalValue<StoredPracticeSession>(storageKey, {
      answers,
      finished,
      hintsShown,
      index,
      itemFingerprints,
      itemIds,
      selected,
      submitted,
      updatedAt: new Date().toISOString(),
    });
  }, [
    answers,
    finished,
    hintsShown,
    hydrated,
    index,
    itemFingerprints,
    itemIds,
    loadedStorageKey,
    selected,
    storageKey,
    submitted,
  ]);

  function handleSubmit() {
    if (!selected) return;
    const r = gradeMcSingle(current, selected);
    if (r.isCorrect) {
      markReviewMastered(profileStorageId, current.contentId);
    } else {
      recordMcError({
        item: current,
        profileStorageId,
        result: r,
        selectedLetter: selected,
        source: "practice-session",
      });
    }
    setAnswers((prev) => [
      ...prev,
      { correct: r.isCorrect, hintsUsed: hintsShown },
    ]);
    setSubmitted(true);
  }

  function handleNext() {
    if (index + 1 >= total) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setSubmitted(false);
    setHintsShown(0);
  }

  function handleRestart() {
    setIndex(0);
    setSelected(null);
    setSubmitted(false);
    setHintsShown(0);
    setAnswers([]);
    setFinished(false);
  }

  // ── End-of-session summary ────────────────────────────────────────────
  if (finished) {
    const correctCount = answers.filter((a) => a.correct).length;
    const noHintCorrect = answers.filter(
      (a) => a.correct && a.hintsUsed === 0,
    ).length;
    const pct = Math.round((correctCount / total) * 100);

    return (
      <div className="mx-auto flex min-h-screen max-w-prose-narrow flex-col justify-center px-4 py-12">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Trophy className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">
            Session complete
          </h1>
          <p className="mt-2 text-muted-foreground">
            {courseShortTitle} · {unitCode} — {unitTitle}
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">You got</p>
          <p className="mt-1 text-5xl font-bold tracking-tight">
            {correctCount}
            <span className="text-2xl font-normal text-muted-foreground">
              {" "}
              / {total}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{pct}% correct</p>

          {noHintCorrect < correctCount && (
            <p className="mt-3 text-sm text-muted-foreground">
              {noHintCorrect} solved without any hints.
            </p>
          )}
        </div>

        {/* Per-question dots */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {answers.map((a, i) => (
            <span
              key={i}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium",
                a.correct
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive",
              )}
              title={`Question ${i + 1}: ${a.correct ? "correct" : "incorrect"}`}
            >
              {i + 1}
            </span>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={handleRestart}>
            <RotateCcw className="h-4 w-4" />
            Practice again
          </Button>
          <Button variant="outline" asChild>
            <Link href={unitHref}>Back to unit</Link>
          </Button>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Want free-response practice? Open the FRQ items on the{" "}
          <Link href={unitHref} className="underline underline-offset-4">
            unit page
          </Link>
          .
        </p>
      </div>
    );
  }

  // ── Active question ───────────────────────────────────────────────────
  const progressPct = Math.round((index / total) * 100);

  return (
    <div className="mx-auto flex min-h-screen max-w-prose flex-col px-4">
      {/* Thin top bar — exit + progress only. No nav, no logo. */}
      <div className="flex items-center gap-4 py-4">
        <Button
          variant="ghost"
          size="icon"
          asChild
          aria-label="Exit practice session"
        >
          <Link href={unitHref}>
            <X className="h-5 w-5" />
          </Link>
        </Button>
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={index}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`Question ${index + 1} of ${total}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
          {index + 1} / {total}
        </span>
      </div>
      <p className="-mt-1 text-center text-xs text-muted-foreground">
        Saving locally as {activeProfile?.nickname ?? "Guest"} on this device.
      </p>

      {/* Question — centered, generous whitespace, nothing else competing. */}
      <div className="flex flex-1 flex-col justify-center py-8">
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Question {index + 1}
              </p>
              <QuestionReportButton
                compact
                context={{
                  contentId: current.contentId,
                  course: current.course,
                  unit: current.unit,
                  topic: current.topic,
                  question: current.questionLatex,
                }}
              />
            </div>
            <div className="mt-4 text-xl leading-relaxed">
              <QuestionStem text={current.questionLatex} />
            </div>
            {current.figure ? (
              <ItemFigure figure={current.figure} className="mt-5" />
            ) : null}
          </div>

          {/* Choices */}
          <fieldset disabled={submitted} className="space-y-2.5">
            <legend className="sr-only">Choose an answer</legend>
            {current.choices.map((choice) => {
              const isChosen = selected === choice.letter;
              const isCorrectChoice = result?.correctLetter === choice.letter;
              const isWrongPick = submitted && isChosen && !result?.isCorrect;

              return (
                <label
                  key={choice.letter}
                  onClick={() => {
                    if (!submitted) setSelected(choice.letter);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-4 py-3.5 transition-colors",
                    !submitted && "hover:border-primary/50",
                    submitted &&
                      isCorrectChoice &&
                      "border-success bg-success/5",
                    isWrongPick && "border-destructive bg-destructive/5",
                    submitted && !isCorrectChoice && !isChosen && "opacity-50",
                    submitted && "cursor-default",
                  )}
                >
                  <input
                    type="radio"
                    name={`q-${current.contentId}`}
                    value={choice.letter}
                    checked={isChosen}
                    onChange={() => setSelected(choice.letter)}
                    className="h-4 w-4 cursor-pointer accent-primary"
                  />
                  <span className="font-semibold text-foreground">
                    {choice.letter}.
                  </span>
                  <MixedMath text={choice.text} className="flex-1" />
                  {submitted && isCorrectChoice && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  )}
                  {isWrongPick && (
                    <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                  )}
                </label>
              );
            })}
          </fieldset>

          {/* Hint ladder — quiet until invoked */}
          {!submitted && (
            <div>
              {hintsShown === 0 ? (
                <button
                  type="button"
                  onClick={() => setHintsShown(1)}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-warning"
                >
                  <Lightbulb className="h-4 w-4" aria-hidden="true" />
                  Need a hint?
                </button>
              ) : (
                <div className="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
                  {current.hintLadder.slice(0, hintsShown).map((hint) => (
                    <div key={hint.level} className="text-sm">
                      <p className="font-semibold text-foreground">
                        Hint {hint.level}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        <MixedMath text={hint.body} />
                      </p>
                    </div>
                  ))}
                  {hintsShown < current.hintLadder.length && (
                    <button
                      type="button"
                      onClick={() => setHintsShown(hintsShown + 1)}
                      className="text-sm font-medium text-warning hover:underline"
                    >
                      Show hint {hintsShown + 1} of {current.hintLadder.length}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Feedback after submit */}
          {submitted && result && (
            <div
              className={cn(
                "rounded-lg border p-4",
                result.isCorrect
                  ? "border-success/40 bg-success/5"
                  : "border-destructive/40 bg-destructive/5",
              )}
            >
              <div className="flex items-center gap-2">
                {result.isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <p className="font-semibold">
                  {result.isCorrect ? "Correct" : "Not quite"}
                </p>
              </div>
              {!result.isCorrect && result.studentChoiceRationale && (
                <div className="mt-3 rounded-md bg-background/70 p-3 text-sm">
                  <p className="font-medium text-foreground">
                    Where this choice goes wrong
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <MixedMath text={result.studentChoiceRationale} />
                  </p>
                </div>
              )}
              {!result.isCorrect && current.workedSolution.length > 0 && (
                <div className="mt-3 space-y-3 rounded-md bg-background/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Worked solution
                  </p>
                  <ol className="space-y-3 text-sm">
                    {current.workedSolution.map((step) => (
                      <li key={step.step} className="flex gap-3">
                        <span className="shrink-0 font-semibold text-muted-foreground">
                          {step.step}.
                        </span>
                        <div className="space-y-1.5">
                          <p>
                            <MixedMath text={step.explanation} />
                          </p>
                          {step.math && <Tex tex={step.math} display />}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 bg-background py-5">
        {!submitted ? (
          <Button
            size="lg"
            disabled={!selected}
            onClick={handleSubmit}
            className="w-full"
          >
            Check answer
          </Button>
        ) : (
          <Button size="lg" onClick={handleNext} className="w-full">
            {index + 1 >= total ? "Finish session" : "Next question"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
