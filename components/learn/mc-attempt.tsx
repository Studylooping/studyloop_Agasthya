"use client";

import * as React from "react";
import { CheckCircle2, XCircle, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tex, MixedMath } from "@/components/math/math";
import { getItemFingerprint } from "@/lib/content/item-fingerprint";
import { cn } from "@/lib/utils";
import { getDisplayMcChoices } from "@/lib/grading/choice-display";
import { gradeMcSingle, type GradeResult } from "@/lib/grading/mc";
import {
  makeLocalStorageKey,
  readLocalValue,
  useLocalProfile,
  writeLocalValue,
} from "@/lib/local-memory";
import { markReviewMastered, recordMcError } from "@/lib/review-memory";
import type { McSingleItem } from "@/lib/content/types";

interface StoredMcAttempt {
  hintsShown: number;
  itemFingerprint: string;
  selected: string | null;
  showSolution: boolean;
  submitted: boolean;
  updatedAt: string;
}

/**
 * Client component for attempting a single-correct MC item.
 *
 * Behavior:
 * - Radio group of choices (keyboard-navigable, accessible).
 * - Submit button enabled when a choice is selected.
 * - On submit: deterministic grading via `gradeMcSingle`. Shows feedback.
 * - Hint ladder: "Need a hint?" reveals Hint 1, then 2, then 3.
 *
 * Attempt state is saved in browser localStorage under the active nickname
 * profile. StudyLoop does not need a real-name account or server tracking to
 * remember this work on the student's device.
 */
export function McAttempt({ item }: { item: McSingleItem }) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [hintsShown, setHintsShown] = React.useState(0);
  const [showSolution, setShowSolution] = React.useState(false);
  const [loadedStorageKey, setLoadedStorageKey] = React.useState<string | null>(
    null,
  );
  const { hydrated, profileStorageId } = useLocalProfile();
  const itemFingerprint = React.useMemo(() => getItemFingerprint(item), [item]);
  const displayChoices = React.useMemo(() => getDisplayMcChoices(item), [item]);

  const storageKey = React.useMemo(
    () => makeLocalStorageKey("mc-attempt", profileStorageId, item.contentId),
    [item.contentId, profileStorageId],
  );

  const result: GradeResult | null =
    submitted && selected ? gradeMcSingle(item, selected) : null;

  React.useEffect(() => {
    if (!hydrated) return;

    const stored = readLocalValue<Partial<StoredMcAttempt>>(storageKey);
    const canRestore = stored?.itemFingerprint === itemFingerprint;
    setSelected(canRestore ? (stored.selected ?? null) : null);
    setSubmitted(canRestore ? (stored.submitted ?? false) : false);
    setHintsShown(canRestore ? (stored.hintsShown ?? 0) : 0);
    setShowSolution(canRestore ? (stored.showSolution ?? false) : false);
    setLoadedStorageKey(storageKey);
  }, [hydrated, itemFingerprint, storageKey]);

  React.useEffect(() => {
    if (!hydrated || loadedStorageKey !== storageKey) return;

    writeLocalValue<StoredMcAttempt>(storageKey, {
      hintsShown,
      itemFingerprint,
      selected,
      showSolution,
      submitted,
      updatedAt: new Date().toISOString(),
    });
  }, [
    hintsShown,
    hydrated,
    itemFingerprint,
    loadedStorageKey,
    selected,
    showSolution,
    storageKey,
    submitted,
  ]);

  const reset = () => {
    setSelected(null);
    setSubmitted(false);
    setShowSolution(false);
    // Note: hintsShown is preserved across retries (you can't un-see a hint).
  };

  function handleSubmit() {
    if (!selected) return;

    const grade = gradeMcSingle(item, selected);
    if (grade.isCorrect) {
      markReviewMastered(profileStorageId, item.contentId);
    } else {
      recordMcError({
        item,
        profileStorageId,
        result: grade,
        selectedLetter: selected,
        source: "item-page",
      });
    }
    setShowSolution(!grade.isCorrect);
    setSubmitted(true);
  }

  return (
    <div className="space-y-6">
      {/* ── Choices ──────────────────────────────────────────────────── */}
      <fieldset disabled={submitted} className="space-y-2">
        <legend className="sr-only">Choose an answer</legend>
        {displayChoices.map(({ choice, displayLetter }) => {
          const isChosen = selected === choice.letter;
          const isCorrectChoice = result?.correctLetter === choice.letter;
          const isStudentWrongChoice =
            submitted && isChosen && !result?.isCorrect;

          return (
            <label
              key={choice.letter}
              onClick={() => {
                if (!submitted) setSelected(choice.letter);
              }}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-4 transition-colors",
                !submitted && "hover:border-primary/50",
                submitted && isCorrectChoice && "border-success bg-success/5",
                isStudentWrongChoice && "border-destructive bg-destructive/5",
                submitted && !isCorrectChoice && !isChosen && "opacity-60",
                submitted && "cursor-default",
              )}
            >
              <input
                type="radio"
                name={`item-${item.contentId}`}
                value={choice.letter}
                checked={isChosen}
                onChange={() => setSelected(choice.letter)}
                className="mt-1.5 h-4 w-4 cursor-pointer accent-primary"
                aria-describedby={
                  submitted ? `rationale-${choice.letter}` : undefined
                }
              />
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-foreground">
                    {displayLetter}.
                  </span>
                  <MixedMath text={choice.text} />
                </div>
                {submitted &&
                  choice.rationaleIfWrong &&
                  (isChosen || isCorrectChoice) && (
                    <p
                      id={`rationale-${choice.letter}`}
                      className="mt-2 text-sm text-muted-foreground"
                    >
                      <MixedMath text={choice.rationaleIfWrong} />
                    </p>
                  )}
              </div>
              {submitted && isCorrectChoice && (
                <CheckCircle2
                  className="mt-1 h-5 w-5 shrink-0 text-success"
                  aria-label="Correct answer"
                />
              )}
              {isStudentWrongChoice && (
                <XCircle
                  className="mt-1 h-5 w-5 shrink-0 text-destructive"
                  aria-label="Your answer (incorrect)"
                />
              )}
            </label>
          );
        })}
      </fieldset>

      {/* ── Hint ladder (only before submit) ─────────────────────────── */}
      {!submitted && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-warning">
            <Lightbulb className="h-4 w-4" aria-hidden="true" />
            Stuck?
          </div>
          {hintsShown === 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHintsShown(1)}
              className="mt-2 text-warning hover:bg-warning/10 hover:text-warning"
            >
              Show hint 1 of {item.hintLadder.length}
            </Button>
          ) : (
            <div className="mt-3 space-y-3">
              {item.hintLadder.slice(0, hintsShown).map((hint) => (
                <div key={hint.level} className="text-sm">
                  <p className="font-semibold text-foreground">
                    Hint {hint.level}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <MixedMath text={hint.body} />
                  </p>
                </div>
              ))}
              {hintsShown < item.hintLadder.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHintsShown(hintsShown + 1)}
                  className="text-warning hover:bg-warning/10 hover:text-warning"
                >
                  Show hint {hintsShown + 1} of {item.hintLadder.length}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Submit / feedback ────────────────────────────────────────── */}
      {!submitted ? (
        <Button
          size="lg"
          disabled={!selected}
          onClick={handleSubmit}
          className="w-full sm:w-auto"
        >
          Check answer
        </Button>
      ) : (
        <FeedbackPanel
          isCorrect={!!result?.isCorrect}
          hintsUsed={hintsShown}
          totalHints={item.hintLadder.length}
          item={item}
          studentChoiceRationale={result?.studentChoiceRationale ?? null}
          showSolution={showSolution}
          onToggleSolution={() => setShowSolution((s) => !s)}
          onRetry={reset}
        />
      )}
    </div>
  );
}

function FeedbackPanel({
  isCorrect,
  hintsUsed,
  totalHints,
  item,
  studentChoiceRationale,
  showSolution,
  onToggleSolution,
  onRetry,
}: {
  isCorrect: boolean;
  hintsUsed: number;
  totalHints: number;
  item: McSingleItem;
  studentChoiceRationale: string | null;
  showSolution: boolean;
  onToggleSolution: () => void;
  onRetry: () => void;
}) {
  return (
    <Card
      className={cn(
        "p-5",
        isCorrect
          ? "border-success/40 bg-success/5"
          : "border-destructive/40 bg-destructive/5",
      )}
    >
      <div className="flex items-start gap-3">
        {isCorrect ? (
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" />
        ) : (
          <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-destructive" />
        )}
        <div className="flex-1 space-y-3">
          <div>
            <p className="font-semibold">
              {isCorrect ? "Correct" : "Not quite"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isCorrect && hintsUsed === 0 && "Nailed it on the first try."}
              {isCorrect &&
                hintsUsed > 0 &&
                `Solved with ${hintsUsed} of ${totalHints} hints.`}
              {!isCorrect &&
                !studentChoiceRationale &&
                hintsUsed === 0 &&
                "Try a hint, then compare your work with the solution."}
              {!isCorrect &&
                !studentChoiceRationale &&
                hintsUsed > 0 &&
                "Check the worked solution below to see where it diverged."}
            </p>
            {!isCorrect && studentChoiceRationale && (
              <div className="mt-3 rounded-md bg-background/70 p-3 text-sm">
                <p className="font-medium text-foreground">
                  Where this choice goes wrong
                </p>
                <p className="mt-1 text-muted-foreground">
                  <MixedMath text={studentChoiceRationale} />
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onToggleSolution}>
              {showSolution ? "Hide solution" : "See worked solution"}
            </Button>
            {!isCorrect && (
              <Button variant="ghost" size="sm" onClick={onRetry}>
                Try again
              </Button>
            )}
          </div>

          {showSolution && (
            <div className="mt-2 space-y-3 rounded-md bg-background/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Worked solution
              </p>
              <ol className="space-y-3 text-sm">
                {item.workedSolution.map((step) => (
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
      </div>
    </Card>
  );
}
