import type { McSingleItem, McMultiItem } from "@/lib/content/types";

/**
 * Multiple-choice grading. Deterministic, server-safe, no AI.
 * Per ARCHITECTURE.md §1: "AI never decides whether an answer is right."
 */

export interface GradeResult {
  isCorrect: boolean;
  /** Which choice (or set) was correct, for the feedback panel. */
  correctLetter?: string;
  correctLetters?: string[];
  /** The student's chosen rationale, for showing why-wrong. */
  studentChoiceRationale?: string | null;
  /** Which misconception the student likely triggered, if any. */
  misconceptionTag?: string | null;
}

export function gradeMcSingle(
  item: McSingleItem,
  studentLetter: string,
): GradeResult {
  const choice = item.choices.find((c) => c.letter === studentLetter);
  const isCorrect = !!choice?.isCorrect;
  return {
    isCorrect,
    correctLetter: item.correctLetter,
    studentChoiceRationale: choice?.rationaleIfWrong ?? null,
    misconceptionTag: choice?.misconceptionTag ?? null,
  };
}

export function gradeMcMulti(
  item: McMultiItem,
  studentLetters: string[],
): GradeResult {
  const correctSet = new Set(item.correctLetters);
  const studentSet = new Set(studentLetters);
  const isCorrect =
    correctSet.size === studentSet.size &&
    [...correctSet].every((l) => studentSet.has(l));
  return {
    isCorrect,
    correctLetters: item.correctLetters,
  };
}
