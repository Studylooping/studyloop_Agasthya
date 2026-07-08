import type { Item, McChoice } from "@/lib/content/types";

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function choiceSnapshot(choice: McChoice) {
  return {
    isCorrect: choice.isCorrect,
    letter: choice.letter,
    text: choice.text,
  };
}

function itemSnapshot(item: Item) {
  const base = {
    contentId: item.contentId,
    figure: item.figure
      ? {
          description: item.figure.description,
          svg: item.figure.svg,
          title: item.figure.title,
        }
      : null,
    kind: item.kind,
    questionLatex: item.questionLatex,
    version: item.version,
  };

  if (item.kind === "mc_single") {
    return {
      ...base,
      choices: item.choices.map(choiceSnapshot),
      correctLetter: item.correctLetter,
    };
  }

  if (item.kind === "numeric") {
    return {
      ...base,
      answer: item.answer,
    };
  }

  if (item.kind === "frq") {
    return {
      ...base,
      parts: item.parts,
      rubric: item.rubric,
    };
  }

  return base;
}

export function getItemFingerprint(item: Item): string {
  return `item.v1.${stableHash(JSON.stringify(itemSnapshot(item)))}`;
}
