import type { FrqItem, McChoice, McSingleItem } from "@/lib/content/types";

type Level = 1 | 2 | 3 | 4 | 5;
type Hints = readonly [string, string, string];
type Wrong = readonly [string, string];
type Part = readonly [string, ...string[]];
const letters = ["A", "B", "C", "D"] as const;
const positions = [2, 0, 3, 1, 1, 3, 0, 2, 0, 2, 1, 3, 3, 1, 2, 0, 1, 0, 3, 2];

function base(
  topic: string,
  number: number,
  kind: string,
  difficulty: Level,
  questionLatex: string,
  hintText: Hints,
  skill: string,
) {
  return {
    contentId: `cbse-chemistry-11.u1.t${topic.replace(".", "-")}.${kind}.${number}`,
    course: "cbse-chemistry-11",
    unit: "u1-some-basic-concepts",
    topic,
    difficulty,
    calculatorAllowed: false,
    questionLatex,
    skillTags: ["ncert_chapter_expansion", skill],
    commonMisconceptions: [skill],
    hintLadder: hintText.map((body, index) => ({
      level: (index + 1) as 1 | 2 | 3,
      body,
    })),
    version: "0.2.0",
    reviewStatus: "ai_reviewed" as const,
    sourceType: "original_ai_assisted_question" as const,
  };
}

export function mc(
  topic: string,
  number: number,
  difficulty: Level,
  question: string,
  answer: string,
  wrong: readonly [Wrong, Wrong, Wrong],
  hints: Hints,
  solution: readonly string[],
  skill: string,
): McSingleItem {
  const correctPosition = positions[(number - 101) % positions.length];
  const choices: McChoice[] = wrong.map(([text, rationaleIfWrong]) => ({
    letter: "A",
    text,
    isCorrect: false,
    rationaleIfWrong,
    misconceptionTag: skill,
  }));
  choices.splice(correctPosition, 0, {
    letter: "A",
    text: answer,
    isCorrect: true,
    rationaleIfWrong: null,
    misconceptionTag: null,
  });
  choices.forEach((choice, index) => {
    choice.letter = letters[index];
  });
  return {
    ...base(topic, number, "mc", difficulty, question, hints, skill),
    kind: "mc_single",
    choices,
    correctLetter: letters[correctPosition],
    workedSolution: solution.map((explanation, index) => ({
      step: index + 1,
      explanation,
    })),
  };
}

export function written(
  topic: string,
  number: number,
  responseType: "vsaq" | "saq" | "laq" | "case",
  difficulty: Level,
  question: string,
  parts: readonly Part[],
  hints: Hints,
  commonErrors: readonly string[],
  skill: string,
): FrqItem {
  const labelled = parts.map(([prompt, ...points], index) => ({
    letter: String.fromCharCode(97 + index),
    prompt,
    points,
  }));
  return {
    ...base(topic, number, responseType, difficulty, question, hints, skill),
    kind: "frq",
    responseType,
    parts: labelled.map(({ letter, prompt, points }) => ({
      letter,
      promptMarkdown: prompt,
      points: points.length,
    })),
    rubric: {
      maxPoints: labelled.reduce((sum, part) => sum + part.points.length, 0),
      criteria: labelled.flatMap(({ letter, points }) =>
        points.map((description) => ({ part: letter, points: 1, description })),
      ),
    },
    workedSolution: labelled.map(({ letter, points }) => ({
      part: letter,
      explanation: points.join(" "),
      markingPoints: points,
    })),
    commonErrors: [...commonErrors],
  };
}
