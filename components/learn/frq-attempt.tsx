"use client";

import * as React from "react";
import { ScrollText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MixedMath } from "@/components/math/math";
import {
  makeLocalStorageKey,
  readLocalValue,
  useLocalProfile,
  writeLocalValue,
} from "@/lib/local-memory";
import { recordFrqSelfScore } from "@/lib/review-memory";
import type { FrqItem } from "@/lib/content/types";

interface StoredFrqAttempt {
  response: string;
  revealed: boolean;
  scored: Record<number, boolean>;
  updatedAt: string;
}

/**
 * Client component for attempting a free-response item.
 *
 * Per CONTENT_PIPELINE.md §3, there is NO AI grading and NO tutor queue
 * at launch. The student:
 *   1. Reads the multipart prompt.
 *   2. Writes a response (textarea) — OR works on paper and skips.
 *   3. Clicks "Show rubric and model solution".
 *   4. Self-scores against the rubric (checkbox per criterion).
 *   5. Sees their total out of max points.
 *
 * This mirrors how students prep with College Board's released FRQs.
 * Tutor verification of correctness happens post-launch.
 */
export function FrqAttempt({ item }: { item: FrqItem }) {
  const [response, setResponse] = React.useState("");
  const [revealed, setRevealed] = React.useState(false);
  const [scored, setScored] = React.useState<Record<number, boolean>>({});
  const [loadedStorageKey, setLoadedStorageKey] = React.useState<string | null>(
    null,
  );
  const { hydrated, profileStorageId } = useLocalProfile();

  const storageKey = React.useMemo(
    () => makeLocalStorageKey("frq-attempt", profileStorageId, item.contentId),
    [item.contentId, profileStorageId],
  );

  React.useEffect(() => {
    if (!hydrated) return;

    const stored = readLocalValue<StoredFrqAttempt>(storageKey);
    setResponse(stored?.response ?? "");
    setRevealed(stored?.revealed ?? false);
    setScored(stored?.scored ?? {});
    setLoadedStorageKey(storageKey);
  }, [hydrated, storageKey]);

  React.useEffect(() => {
    if (!hydrated || loadedStorageKey !== storageKey) return;

    writeLocalValue<StoredFrqAttempt>(storageKey, {
      response,
      revealed,
      scored,
      updatedAt: new Date().toISOString(),
    });
  }, [hydrated, loadedStorageKey, response, revealed, scored, storageKey]);

  const totalEarned = Object.entries(scored)
    .filter(([, v]) => v)
    .reduce((sum, [i]) => sum + (item.rubric.criteria[Number(i)]?.points ?? 0), 0);
  const usesMarks = Boolean(item.responseType && item.responseType !== "frq");
  const scoreLabel = (value: number, compact = false) => {
    const singular = usesMarks ? "mark" : compact ? "pt" : "point";
    const plural = usesMarks ? "marks" : compact ? "pts" : "points";
    return `${value} ${value === 1 ? singular : plural}`;
  };

  function handleScoreCriterion(index: number, checked: boolean) {
    const nextScored = { ...scored, [index]: checked };
    setScored(nextScored);
    recordFrqSelfScore({
      item,
      profileStorageId,
      scored: nextScored,
      source: "item-page",
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Multipart prompt ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
          <span className="font-semibold">Total:</span>{" "}
          {scoreLabel(item.rubric.maxPoints)}
        </div>

        {item.parts.map((part) => (
          <div
            key={part.letter}
            className="rounded-lg border border-border bg-muted/30 p-4"
          >
            <p className="text-sm">
              <span className="font-semibold">({part.letter})</span>{" "}
              <MixedMath text={part.promptMarkdown} />{" "}
              <span className="text-muted-foreground">
                ({scoreLabel(part.points)})
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* ── Response area ────────────────────────────────────────────── */}
      <div>
        <label htmlFor={`frq-response-${item.contentId}`} className="text-sm font-medium">
          Your response (optional — you can also work on paper)
        </label>
        <textarea
          id={`frq-response-${item.contentId}`}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={8}
          placeholder="Write your work and reasoning here, or solve on paper and skip ahead to self-grading."
          className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      {/* ── Reveal rubric + solution ─────────────────────────────────── */}
      {!revealed ? (
        <Button size="lg" onClick={() => setRevealed(true)}>
          <Eye className="h-4 w-4" />
          Show rubric & model solution
        </Button>
      ) : (
        <>
          {/* Worked solution */}
          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
              Model solution
            </div>
            <div className="mt-3 space-y-4">
              {item.workedSolution.map((part) => (
                <div key={part.part} className="space-y-1.5">
                  <p className="text-sm font-semibold">Part ({part.part})</p>
                  <p className="text-sm text-muted-foreground">
                    <MixedMath text={part.explanation} />
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Self-scoring */}
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Self-score against the rubric
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Check each criterion you believe you earned. Be honest — this is
              for your learning, not a grade.
            </p>

            <ul className="mt-4 space-y-2">
              {item.rubric.criteria.map((c, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md p-2 transition-colors hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={!!scored[i]}
                      onChange={(e) =>
                        handleScoreCriterion(i, e.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <div className="flex-1 text-sm">
                      <span className="font-medium">
                        Part ({c.part}) - {scoreLabel(c.points, true)}
                      </span>
                      <p className="mt-0.5 text-muted-foreground">
                        <MixedMath text={c.description} />
                      </p>
                    </div>
                  </label>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between rounded-md bg-primary/5 p-3 text-sm">
              <span className="font-medium">Your self-score</span>
              <span className="font-mono text-base font-semibold text-primary">
                {totalEarned} / {item.rubric.maxPoints}{" "}
                {usesMarks ? "marks" : "points"}
              </span>
            </div>
          </Card>

          {/* Common errors */}
          <div className="rounded-md border border-warning/30 bg-warning/5 p-4 text-sm">
            <p className="font-semibold text-warning">Common errors on this item</p>
            <ul className="mt-2 space-y-1 pl-5 text-muted-foreground [&>li]:list-disc">
              {item.commonErrors.map((err, i) => (
                <li key={i}>
                  <MixedMath text={err} />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
