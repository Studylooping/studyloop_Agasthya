import type { McChoice, McSingleItem } from "@/lib/content/types";

type ChoiceDisplayItem = Pick<
  McSingleItem,
  "choices" | "contentId" | "version"
>;

const DISPLAY_LETTERS: McChoice["letter"][] = ["A", "B", "C", "D", "E"];

export interface DisplayMcChoice {
  choice: McChoice;
  displayLetter: McChoice["letter"];
  originalLetter: McChoice["letter"];
}

export function getDisplayMcChoices(
  item: ChoiceDisplayItem,
): DisplayMcChoice[] {
  const ordered = item.choices.map((choice, originalIndex) => ({
    choice,
    originalIndex,
  }));

  let state = hashString(`${item.contentId}|${item.version}`);

  for (let index = ordered.length - 1; index > 0; index -= 1) {
    state = nextSeed(state);
    const swapIndex = state % (index + 1);
    [ordered[index], ordered[swapIndex]] = [ordered[swapIndex], ordered[index]];
  }

  if (
    ordered.length > 1 &&
    ordered.every((entry, index) => entry.originalIndex === index)
  ) {
    state = nextSeed(state);
    const shiftBy = (state % (ordered.length - 1)) + 1;
    ordered.push(...ordered.splice(0, shiftBy));
  }

  return ordered.map((entry, displayIndex) => ({
    choice: entry.choice,
    displayLetter: DISPLAY_LETTERS[displayIndex] ?? entry.choice.letter,
    originalLetter: entry.choice.letter,
  }));
}

export function getDisplayLetterForOriginal(
  item: ChoiceDisplayItem,
  originalLetter: string,
): string {
  return (
    getDisplayMcChoices(item).find(
      (entry) => entry.originalLetter === originalLetter,
    )?.displayLetter ?? originalLetter
  );
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nextSeed(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}
