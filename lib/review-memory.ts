"use client";

import * as React from "react";
import type { FrqItem, McChoice, McSingleItem } from "@/lib/content/types";
import type { GradeResult } from "@/lib/grading/mc";
import {
  makeLocalStorageKey,
  readLocalValue,
  writeLocalValue,
} from "@/lib/local-memory";

export type ReviewRecordStatus = "needs_review" | "mastered";
export type ReviewRecordSource = "item-page" | "practice-session" | "review-tool";

interface ReviewRecordBase {
  contentId: string;
  course: string;
  unit: string;
  topic: string;
  status: ReviewRecordStatus;
  firstSavedAt: string;
  lastMissedAt: string;
  lastReviewedAt: string | null;
  reviewCount: number;
  source: ReviewRecordSource;
}

export interface McReviewRecord extends ReviewRecordBase {
  kind: "mc_single";
  correctLetter: McChoice["letter"];
  lastSelectedLetter: string;
  misconceptionTag: string | null;
  misses: number;
}

export interface FrqReviewRecord extends ReviewRecordBase {
  kind: "frq";
  earnedPoints: number;
  maxPoints: number;
  missedCriteria: number[];
  misses: number;
}

export type ReviewRecord = McReviewRecord | FrqReviewRecord;

interface ReviewNotebook {
  version: 1;
  records: Record<string, ReviewRecord>;
}

const CHANGE_EVENT = "studyloop-review-memory-change";
const NOTEBOOK_ID = "errors";

function emptyNotebook(): ReviewNotebook {
  return { version: 1, records: {} };
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function reviewKey(profileStorageId: string): string {
  return makeLocalStorageKey("review-notebook", profileStorageId, NOTEBOOK_ID);
}

function dispatchReviewChange() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readNotebook(profileStorageId: string): ReviewNotebook {
  const stored = readLocalValue<Partial<ReviewNotebook>>(
    reviewKey(profileStorageId),
  );
  if (!stored || typeof stored.records !== "object" || !stored.records) {
    return emptyNotebook();
  }

  return {
    version: 1,
    records: stored.records as Record<string, ReviewRecord>,
  };
}

function writeNotebook(profileStorageId: string, notebook: ReviewNotebook) {
  writeLocalValue(reviewKey(profileStorageId), notebook);
  dispatchReviewChange();
}

export function recordMcError({
  profileStorageId,
  item,
  result,
  selectedLetter,
  source,
}: {
  profileStorageId: string;
  item: McSingleItem;
  result: GradeResult;
  selectedLetter: string;
  source: ReviewRecordSource;
}) {
  if (!profileStorageId || result.isCorrect) return;

  const now = new Date().toISOString();
  const notebook = readNotebook(profileStorageId);
  const existing = notebook.records[item.contentId];
  const previousMisses =
    existing?.kind === "mc_single" ? existing.misses : existing ? 1 : 0;

  notebook.records[item.contentId] = {
    contentId: item.contentId,
    course: item.course,
    correctLetter: item.correctLetter,
    firstSavedAt: existing?.firstSavedAt ?? now,
    kind: "mc_single",
    lastMissedAt: now,
    lastReviewedAt: existing?.lastReviewedAt ?? null,
    lastSelectedLetter: selectedLetter,
    misconceptionTag: result.misconceptionTag ?? null,
    misses: previousMisses + 1,
    reviewCount: existing?.reviewCount ?? 0,
    source,
    status: "needs_review",
    topic: item.topic,
    unit: item.unit,
  };

  writeNotebook(profileStorageId, notebook);
}

export function markReviewMastered(
  profileStorageId: string,
  contentId: string,
) {
  if (!profileStorageId) return;

  const notebook = readNotebook(profileStorageId);
  const existing = notebook.records[contentId];
  if (!existing) return;

  notebook.records[contentId] = {
    ...existing,
    lastReviewedAt: new Date().toISOString(),
    reviewCount: existing.reviewCount + 1,
    status: "mastered",
  };
  writeNotebook(profileStorageId, notebook);
}

export function resetReviewRecord(
  profileStorageId: string,
  contentId: string,
) {
  if (!profileStorageId) return;

  const notebook = readNotebook(profileStorageId);
  const existing = notebook.records[contentId];
  if (!existing) return;

  notebook.records[contentId] = {
    ...existing,
    status: "needs_review",
  };
  writeNotebook(profileStorageId, notebook);
}

export function removeReviewRecord(
  profileStorageId: string,
  contentId: string,
) {
  if (!profileStorageId) return;

  const notebook = readNotebook(profileStorageId);
  delete notebook.records[contentId];
  writeNotebook(profileStorageId, notebook);
}

export function recordFrqSelfScore({
  profileStorageId,
  item,
  scored,
  source,
}: {
  profileStorageId: string;
  item: FrqItem;
  scored: Record<number, boolean>;
  source: ReviewRecordSource;
}) {
  if (!profileStorageId) return;

  const missedCriteria = item.rubric.criteria
    .map((_, index) => index)
    .filter((index) => !scored[index]);

  if (missedCriteria.length === 0) {
    markReviewMastered(profileStorageId, item.contentId);
    return;
  }

  const now = new Date().toISOString();
  const notebook = readNotebook(profileStorageId);
  const existing = notebook.records[item.contentId];
  const earnedPoints = item.rubric.criteria.reduce(
    (sum, criterion, index) => sum + (scored[index] ? criterion.points : 0),
    0,
  );
  const previousMisses =
    existing?.kind === "frq" ? existing.misses : existing ? 1 : 0;

  notebook.records[item.contentId] = {
    contentId: item.contentId,
    course: item.course,
    earnedPoints,
    firstSavedAt: existing?.firstSavedAt ?? now,
    kind: "frq",
    lastMissedAt: now,
    lastReviewedAt: existing?.lastReviewedAt ?? null,
    maxPoints: item.rubric.maxPoints,
    missedCriteria,
    misses: previousMisses + 1,
    reviewCount: existing?.reviewCount ?? 0,
    source,
    status: "needs_review",
    topic: item.topic,
    unit: item.unit,
  };

  writeNotebook(profileStorageId, notebook);
}

export function useReviewNotebook(profileStorageId: string) {
  const [notebook, setNotebook] = React.useState<ReviewNotebook>(() =>
    emptyNotebook(),
  );

  const refresh = React.useCallback(() => {
    setNotebook(readNotebook(profileStorageId));
  }, [profileStorageId]);

  React.useEffect(() => {
    refresh();
    if (!isBrowser()) return;

    window.addEventListener("storage", refresh);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, [refresh]);

  return notebook;
}
