"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  ListChecks,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionReportButton } from "@/components/feedback/question-report-button";
import { Card } from "@/components/ui/card";
import { MixedMath, QuestionStem, Tex } from "@/components/math/math";
import {
  getDisplayLetterForOriginal,
  getDisplayMcChoices,
} from "@/lib/grading/choice-display";
import { gradeMcSingle } from "@/lib/grading/mc";
import { useLocalProfile } from "@/lib/local-memory";
import {
  markReviewMastered,
  recordMcError,
  removeReviewRecord,
  resetReviewRecord,
  type ReviewRecord,
  useReviewNotebook,
} from "@/lib/review-memory";
import { cn, formatDate } from "@/lib/utils";
import type { FrqItem, McSingleItem } from "@/lib/content/types";

export interface ReviewContentEntry {
  contentId: string;
  courseShortTitle: string;
  href: string;
  item: McSingleItem | FrqItem;
  topicCode: string;
  topicTitle: string;
  unitCode: string;
  unitTitle: string;
}

interface Props {
  entries: ReviewContentEntry[];
}

export function ReviewNotebook({ entries }: Props) {
  const { activeProfile, hydrated, profileStorageId } = useLocalProfile();
  const notebook = useReviewNotebook(profileStorageId);
  const [practiceIds, setPracticeIds] = React.useState<string[] | null>(null);
  const [practiceIndex, setPracticeIndex] = React.useState(0);

  React.useEffect(() => {
    setPracticeIds(null);
    setPracticeIndex(0);
  }, [profileStorageId]);

  const entryById = React.useMemo(
    () => new Map(entries.map((entry) => [entry.contentId, entry])),
    [entries],
  );

  const savedEntries = entries
    .map((entry) => ({
      entry,
      record: notebook.records[entry.contentId],
    }))
    .filter(
      (item): item is { entry: ReviewContentEntry; record: ReviewRecord } =>
        !!item.record,
    )
    .sort(
      (a, b) =>
        new Date(b.record.lastMissedAt).getTime() -
        new Date(a.record.lastMissedAt).getTime(),
    );

  const dueEntries = savedEntries.filter(
    ({ record }) => record.status === "needs_review",
  );
  const masteredEntries = savedEntries.filter(
    ({ record }) => record.status === "mastered",
  );
  const dueMcEntries = dueEntries.filter(
    ({ entry }) => entry.item.kind === "mc_single",
  );
  const dueFrqEntries = dueEntries.filter(
    ({ entry }) => entry.item.kind === "frq",
  );
  const activeLabel = activeProfile?.nickname ?? "Guest";

  const practiceEntry =
    practiceIds && practiceIds.length > 0
      ? entryById.get(practiceIds[practiceIndex])
      : null;

  if (practiceIds && practiceEntry?.item.kind === "mc_single") {
    return (
      <ReviewPractice
        entry={practiceEntry as ReviewContentEntry & { item: McSingleItem }}
        number={practiceIndex + 1}
        onNext={() => {
          if (practiceIndex + 1 >= practiceIds.length) {
            setPracticeIds(null);
            setPracticeIndex(0);
            return;
          }
          setPracticeIndex((index) => index + 1);
        }}
        onStop={() => {
          setPracticeIds(null);
          setPracticeIndex(0);
        }}
        profileStorageId={profileStorageId}
        total={practiceIds.length}
      />
    );
  }

  return (
    <div className="container max-w-content px-4 py-12">
      <header className="max-w-prose">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Local review
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Review notebook
        </h1>
        <p className="mt-3 text-muted-foreground">
          Saved for {hydrated ? activeLabel : "this profile"} on this browser.
        </p>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Needs review" value={dueEntries.length} />
        <Stat label="MCQ practice" value={dueMcEntries.length} />
        <Stat label="FRQ review" value={dueFrqEntries.length} />
        <Stat label="Mastered" value={masteredEntries.length} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button
          disabled={dueMcEntries.length === 0}
          onClick={() => {
            setPracticeIds(dueMcEntries.map(({ entry }) => entry.contentId));
            setPracticeIndex(0);
          }}
        >
          <ListChecks className="h-4 w-4" />
          Practice MCQ errors
        </Button>
        <Button variant="outline" asChild>
          <Link href="/calc-ab">Back to Calc AB</Link>
        </Button>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight">Needs review</h2>
        {dueEntries.length === 0 ? (
          <Card className="mt-4 p-6">
            <p className="font-medium">No saved errors for {activeLabel}.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Missed MCQs and unfinished FRQ rubric points will appear here.
            </p>
          </Card>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {dueEntries.map(({ entry, record }) => (
              <ReviewCard
                key={entry.contentId}
                entry={entry}
                onPractice={
                  entry.item.kind === "mc_single"
                    ? () => {
                        setPracticeIds([entry.contentId]);
                        setPracticeIndex(0);
                      }
                    : undefined
                }
                onRemove={() =>
                  removeReviewRecord(profileStorageId, entry.contentId)
                }
                onMastered={() =>
                  markReviewMastered(profileStorageId, entry.contentId)
                }
                record={record}
              />
            ))}
          </div>
        )}
      </section>

      {masteredEntries.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">Mastered</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {masteredEntries.slice(0, 8).map(({ entry, record }) => (
              <ReviewCard
                key={entry.contentId}
                entry={entry}
                onRemove={() =>
                  removeReviewRecord(profileStorageId, entry.contentId)
                }
                onReset={() =>
                  resetReviewRecord(profileStorageId, entry.contentId)
                }
                record={record}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
    </Card>
  );
}

function ReviewCard({
  entry,
  onMastered,
  onPractice,
  onRemove,
  onReset,
  record,
}: {
  entry: ReviewContentEntry;
  onMastered?: () => void;
  onPractice?: () => void;
  onRemove: () => void;
  onReset?: () => void;
  record: ReviewRecord;
}) {
  const visibleLastAnswer =
    record.kind === "mc_single" && entry.item.kind === "mc_single"
      ? getDisplayLetterForOriginal(entry.item, record.lastSelectedLetter)
      : null;
  const visibleCorrectAnswer =
    record.kind === "mc_single" && entry.item.kind === "mc_single"
      ? getDisplayLetterForOriginal(entry.item, record.correctLetter)
      : null;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {entry.courseShortTitle} / {entry.unitCode} / Topic{" "}
            {entry.topicCode}
          </p>
          <h3 className="mt-1 font-semibold tracking-tight">
            {entry.item.kind === "frq" ? "FRQ" : "MCQ"}: {entry.topicTitle}
          </h3>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            record.status === "mastered"
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning",
          )}
        >
          {record.status === "mastered" ? "Mastered" : "Needs review"}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <p>Saved {formatDate(record.lastMissedAt)}</p>
        {record.kind === "mc_single" ? (
          <p>
            Last answer {visibleLastAnswer ?? record.lastSelectedLetter};{" "}
            correct answer {visibleCorrectAnswer ?? record.correctLetter}.
            Missed {record.misses} {record.misses === 1 ? "time" : "times"}.
          </p>
        ) : (
          <p>
            Self-score {record.earnedPoints}/{record.maxPoints}. Missed{" "}
            {record.missedCriteria.length} rubric{" "}
            {record.missedCriteria.length === 1 ? "point" : "points"}.
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {onPractice && (
          <Button size="sm" onClick={onPractice}>
            Practice
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={entry.href}>
            Open
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
        {onMastered && (
          <Button variant="ghost" size="sm" onClick={onMastered}>
            <CheckCircle2 className="h-4 w-4" />
            Mark mastered
          </Button>
        )}
        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
            Review again
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
          Remove
        </Button>
      </div>
    </Card>
  );
}

function ReviewPractice({
  entry,
  number,
  onNext,
  onStop,
  profileStorageId,
  total,
}: {
  entry: ReviewContentEntry & { item: McSingleItem };
  number: number;
  onNext: () => void;
  onStop: () => void;
  profileStorageId: string;
  total: number;
}) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [showSolution, setShowSolution] = React.useState(false);
  const displayChoices = React.useMemo(
    () => getDisplayMcChoices(entry.item),
    [entry.item],
  );

  React.useEffect(() => {
    setSelected(null);
    setSubmitted(false);
    setShowSolution(false);
  }, [entry.contentId]);

  const result =
    submitted && selected ? gradeMcSingle(entry.item, selected) : null;

  function handleSubmit() {
    if (!selected) return;
    const grade = gradeMcSingle(entry.item, selected);
    if (grade.isCorrect) {
      markReviewMastered(profileStorageId, entry.contentId);
    } else {
      recordMcError({
        item: entry.item,
        profileStorageId,
        result: grade,
        selectedLetter: selected,
        source: "review-tool",
      });
    }
    setShowSolution(!grade.isCorrect);
    setSubmitted(true);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-prose flex-col px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Review {number} / {total}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {entry.topicTitle}
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={onStop}>
          Exit review
        </Button>
      </div>

      <div className="flex flex-1 flex-col justify-center py-8">
        <div className="space-y-8">
          <div>
            <div className="flex justify-end">
              <QuestionReportButton
                compact
                context={{
                  contentId: entry.item.contentId,
                  course: entry.item.course,
                  unit: entry.item.unit,
                  topic: entry.item.topic,
                  question: entry.item.questionLatex,
                }}
              />
            </div>
            <QuestionStem
              text={entry.item.questionLatex}
              className="mt-3 text-xl"
            />
          </div>

          <fieldset disabled={submitted} className="space-y-2.5">
            <legend className="sr-only">Choose an answer</legend>
            {displayChoices.map(({ choice, displayLetter }) => {
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
                    name={`review-${entry.contentId}`}
                    value={choice.letter}
                    checked={isChosen}
                    onChange={() => setSelected(choice.letter)}
                    className="h-4 w-4 cursor-pointer accent-primary"
                  />
                  <span className="font-semibold text-foreground">
                    {displayLetter}.
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

          {submitted && result && (
            <Card
              className={cn(
                "p-5",
                result.isCorrect
                  ? "border-success/40 bg-success/5"
                  : "border-destructive/40 bg-destructive/5",
              )}
            >
              <div className="flex items-start gap-3">
                {result.isCorrect ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">
                    {result.isCorrect ? "Marked mastered" : "Still in review"}
                  </p>
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
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSolution((value) => !value)}
                    >
                      {showSolution ? "Hide solution" : "See solution"}
                    </Button>
                    <Button size="sm" onClick={onNext}>
                      {number >= total ? "Finish review" : "Next error"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {showSolution && (
            <Card className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Worked solution
              </p>
              <ol className="mt-3 space-y-3 text-sm">
                {entry.item.workedSolution.map((step) => (
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
            </Card>
          )}
        </div>
      </div>

      {!submitted && (
        <div className="sticky bottom-0 bg-background py-5">
          <Button
            size="lg"
            disabled={!selected}
            onClick={handleSubmit}
            className="w-full"
          >
            Check answer
          </Button>
        </div>
      )}
    </div>
  );
}
