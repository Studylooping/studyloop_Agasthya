import type { McChoice, McSingleItem, Topic, Unit } from "@/lib/content/types";

const LETTERS: McChoice["letter"][] = ["A", "B", "C", "D"];

export function balanceMcAnswerLettersInUnits(units: readonly Unit[]): Unit[] {
  return units.map(balanceMcAnswerLettersInUnit);
}

export function balanceMcAnswerLettersInUnit(unit: Unit): Unit {
  let mcIndex = 0;

  return {
    ...unit,
    topics: unit.topics.map(
      (topic): Topic => ({
        ...topic,
        items: topic.items.map((item) => {
          if (item.kind !== "mc_single" || item.choices.length !== 4) {
            return item;
          }

          const targetLetter = LETTERS[mcIndex % LETTERS.length];
          mcIndex += 1;
          return moveCorrectChoiceToLetter(item, targetLetter);
        }),
      }),
    ),
  };
}

function moveCorrectChoiceToLetter(
  item: McSingleItem,
  targetLetter: McChoice["letter"],
): McSingleItem {
  const targetIndex = LETTERS.indexOf(targetLetter);
  const correctIndex = item.choices.findIndex((choice) => choice.isCorrect);

  if (targetIndex < 0 || correctIndex < 0) return item;

  const correctChoice = item.choices[correctIndex];
  const wrongChoices = item.choices.filter(
    (_, index) => index !== correctIndex,
  );
  const nextChoices: McChoice[] = [];

  for (let index = 0; index < LETTERS.length; index += 1) {
    nextChoices[index] =
      index === targetIndex
        ? correctChoice
        : (wrongChoices.shift() as McChoice);
  }

  const choices = nextChoices.map((choice, index) => ({
    ...choice,
    letter: LETTERS[index],
  }));

  return {
    ...item,
    choices,
    correctLetter: targetLetter,
  };
}
