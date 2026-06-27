"use client";

import * as React from "react";
import { CheckCircle2, Lightbulb, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MixedMath, Tex } from "@/components/math/math";
import {
  makeLocalStorageKey,
  readLocalValue,
  useLocalProfile,
  writeLocalValue,
} from "@/lib/local-memory";
import { cn } from "@/lib/utils";
import type { NumericItem } from "@/lib/content/types";

interface StoredNumericAttempt {
  answerText: string;
  hintsShown: number;
  showSolution: boolean;
  submitted: boolean;
  updatedAt: string;
}

function isCorrectNumeric(item: NumericItem, answerText: string): boolean {
  const value = Number(answerText.trim());
  if (!Number.isFinite(value)) return false;

  const expected = item.answer.value;
  const absTol = item.answer.toleranceAbs ?? 0;
  const relTol = item.answer.toleranceRel
    ? Math.abs(expected) * item.answer.toleranceRel
    : 0;
  const tolerance = Math.max(absTol, relTol);
  return Math.abs(value - expected) <= tolerance;
}

export function NumericAttempt({ item }: { item: NumericItem }) {
  const [answerText, setAnswerText] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [hintsShown, setHintsShown] = React.useState(0);
  const [showSolution, setShowSolution] = React.useState(false);
  const [loadedStorageKey, setLoadedStorageKey] = React.useState<string | null>(
    null,
  );
  const { hydrated, profileStorageId } = useLocalProfile();

  const storageKey = React.useMemo(
    () => makeLocalStorageKey("numeric-attempt", profileStorageId, item.contentId),
    [item.contentId, profileStorageId],
  );

  React.useEffect(() => {
    if (!hydrated) return;

    const stored = readLocalValue<StoredNumericAttempt>(storageKey);
    setAnswerText(stored?.answerText ?? "");
    setSubmitted(stored?.submitted ?? false);
    setHintsShown(stored?.hintsShown ?? 0);
    setShowSolution(stored?.showSolution ?? false);
    setLoadedStorageKey(storageKey);
  }, [hydrated, storageKey]);

  React.useEffect(() => {
    if (!hydrated || loadedStorageKey !== storageKey) return;

    writeLocalValue<StoredNumericAttempt>(storageKey, {
      answerText,
      hintsShown,
      showSolution,
      submitted,
      updatedAt: new Date().toISOString(),
    });
  }, [
    answerText,
    hintsShown,
    hydrated,
    loadedStorageKey,
    showSolution,
    storageKey,
    submitted,
  ]);

  const isCorrect = submitted && isCorrectNumeric(item, answerText);

  function reset() {
    setSubmitted(false);
    setShowSolution(false);
  }

  function handleSubmit() {
    const correct = isCorrectNumeric(item, answerText);
    setShowSolution(!correct);
    setSubmitted(true);
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <label
          htmlFor={`numeric-answer-${item.contentId}`}
          className="text-sm font-medium"
        >
          Numerical value answer
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id={`numeric-answer-${item.contentId}`}
            value={answerText}
            onChange={(event) => {
              setAnswerText(event.target.value);
              if (submitted) {
                setSubmitted(false);
                setShowSolution(false);
              }
            }}
            inputMode="decimal"
            placeholder="Enter the number only"
            className="min-h-11 flex-1 rounded-md border border-input bg-background px-3 py-2 text-base font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <Button
            size="lg"
            disabled={!answerText.trim()}
            onClick={handleSubmit}
          >
            Check answer
          </Button>
        </div>
        {item.answer.unit ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Unit: {item.answer.unit}
          </p>
        ) : null}
      </Card>

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

      {submitted && (
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
                {!isCorrect && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Recheck the exact count. JEE numerical questions expect the
                    final number, without units or extra text.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSolution((value) => !value)}
                >
                  {showSolution ? "Hide solution" : "See worked solution"}
                </Button>
                {!isCorrect && (
                  <Button variant="ghost" size="sm" onClick={reset}>
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
                  <div className="rounded-md bg-primary/5 p-3 text-sm">
                    Correct numerical value:{" "}
                    <span className="font-mono font-semibold text-primary">
                      {item.answer.value}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
