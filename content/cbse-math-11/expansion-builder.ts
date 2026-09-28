import type { Item, ItemFigure } from "@/lib/content/types";
import {
  mc,
  written,
  type Context,
  type Level,
  type WrittenPart,
} from "./practice-authoring";

export type Hints = [string, string, string];
export type Distractors = [
  [string, string],
  [string, string],
  [string, string],
];

export function builder(context: Context) {
  const items: Item[] = [];
  return {
    items,
    mc(
      q: string,
      answer: string,
      wrong: Distractors,
      steps: string[],
      hints: Hints,
      d: Level = 2,
      figure?: ItemFigure,
    ) {
      items.push(
        mc(
          context,
          items.length,
          q,
          d,
          "chapter_" + context.chapter + "_skill_" + items.length,
          answer,
          wrong,
          steps,
          hints,
          figure,
        ),
      );
    },
    frq(
      type: "vsaq" | "saq" | "laq" | "case",
      q: string,
      parts: WrittenPart[],
      hints: Hints,
      errors: string[],
      d: Level = 3,
      figure?: ItemFigure,
    ) {
      items.push(
        written(
          context,
          items.length,
          type,
          q,
          d,
          "chapter_" + context.chapter + "_skill_" + items.length,
          parts,
          hints,
          errors,
          figure,
        ),
      );
    },
  };
}

export const factorial = (n: number): number =>
  n < 2 ? 1 : n * factorial(n - 1);
export const choose = (n: number, r: number): number =>
  r < 0 || r > n ? 0 : factorial(n) / (factorial(r) * factorial(n - r));
