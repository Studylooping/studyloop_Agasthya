import type { FrqItem, Item, McSingleItem, Topic } from "@/lib/content/types";

type Level = 1 | 2 | 3 | 4 | 5;
type Hints = readonly [string, string, string];
type Wrong = readonly [string, string];
type Part = readonly [string, ...string[]];
const letters = ["A", "B", "C", "D"] as const;
const positions = [2, 0, 3, 1, 1, 3, 0, 2, 0, 2, 1, 3, 3, 1, 2, 0, 1, 0, 3, 2];

export function chapterPractice(unit: string) {
  function base(
    topic: string,
    number: number,
    kind: string,
    difficulty: Level,
    questionLatex: string,
    hints: Hints,
  ) {
    return {
      contentId: `cbse-chemistry-12.u${topic.split(".")[0]}.t${topic.replace(".", "-")}.${kind}.${number}`,
      course: "cbse-chemistry-12",
      unit,
      topic,
      difficulty,
      questionLatex,
      calculatorAllowed: false,
      version: "0.2.0",
      reviewStatus: "ai_reviewed" as const,
      sourceType: "original_ai_assisted_question" as const,
      skillTags: [
        "ncert_chapter_expansion",
        `chemistry12_${topic.replace(".", "_")}`,
      ],
      commonMisconceptions: ["incorrect_concept_application"],
      hintLadder: hints.map((body, index) => ({
        level: (index + 1) as 1 | 2 | 3,
        body,
      })),
    };
  }
  function mc(
    topic: string,
    number: number,
    difficulty: Level,
    question: string,
    answer: string,
    wrong: readonly [Wrong, Wrong, Wrong],
    hints: Hints,
    solution: readonly string[],
  ): McSingleItem {
    const position = positions[(number - 101) % positions.length];
    const options = wrong.map(([text, rationaleIfWrong]) => ({
      text,
      rationaleIfWrong: rationaleIfWrong as string | null,
      isCorrect: false,
      misconceptionTag: "incorrect_concept_application" as string | null,
    }));
    options.splice(position, 0, {
      text: answer,
      rationaleIfWrong: null,
      isCorrect: true,
      misconceptionTag: null,
    });
    return {
      ...base(topic, number, "mc", difficulty, question, hints),
      kind: "mc_single",
      choices: options.map((choice, index) => ({
        ...choice,
        letter: letters[index],
      })),
      correctLetter: letters[position],
      workedSolution: solution.map((explanation, index) => ({
        step: index + 1,
        explanation,
      })),
    };
  }
  function written(
    topic: string,
    number: number,
    responseType: "vsaq" | "saq" | "laq" | "case",
    difficulty: Level,
    question: string,
    parts: readonly Part[],
    hints: Hints,
    commonErrors: readonly string[],
  ): FrqItem {
    const labelled = parts.map(([prompt, ...points], index) => ({
      prompt,
      points,
      letter: String.fromCharCode(97 + index),
    }));
    const maxPoints = labelled.reduce(
      (sum, part) => sum + part.points.length,
      0,
    );
    const expected = { vsaq: 2, saq: 3, laq: 5, case: 4 }[responseType];
    if (maxPoints !== expected)
      throw new Error(`Invalid mark total: ${topic}/${number}`);
    return {
      ...base(topic, number, responseType, difficulty, question, hints),
      kind: "frq",
      responseType,
      parts: labelled.map(({ prompt, points, letter }) => ({
        letter,
        promptMarkdown: prompt,
        points: points.length,
      })),
      rubric: {
        maxPoints,
        criteria: labelled.flatMap(({ letter, points }) =>
          points.map((description) => ({
            part: letter,
            points: 1,
            description,
          })),
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
  return { mc, written };
}

export function appendChapterPractice(
  topics: Topic[],
  additions: Item[],
): Topic[] {
  const codes = new Set(topics.map((topic) => topic.topicCode));
  if (additions.some((item) => !codes.has(item.topic)))
    throw new Error("Expansion topic is not in chapter");
  return topics.map((topic) => ({
    ...topic,
    items: [
      ...topic.items,
      ...additions.filter((item) => item.topic === topic.topicCode),
    ],
  }));
}
