import type { FrqItem, ItemFigure, McSingleItem } from "@/lib/content/types";

type Level = 1 | 2 | 3 | 4 | 5;
type Hints = readonly [string, string, string];
type Option = readonly [text: string, reason: string];
type Part = { prompt: string; answer: string; marking: readonly string[] };
const letters = ["A", "B", "C", "D"] as const;

export function expansionBank(unit: string, unitCode: string) {
  function base(topic: string, id: number, kind: string, difficulty: Level, questionLatex: string, hints: Hints) {
    return {
      contentId: `cbse-physics-11.${unitCode}.t${topic.replace(".", "-")}.${kind}.${id}`,
      course: "cbse-physics-11", unit, topic, difficulty,
      calculatorAllowed: false,
      questionLatex,
      skillTags: ["ncert_chapter_expansion", `physics_${topic.replace(".", "_")}`],
      commonMisconceptions: [] as string[],
      hintLadder: hints.map((body, index) => ({ level: (index + 1) as 1 | 2 | 3, body })),
      reviewStatus: "ai_reviewed" as const,
      version: "0.1.0", sourceType: "original_ai_assisted_question" as const,
    };
  }
  function mc(topic: string, id: number, difficulty: Level, question: string,
    correct: string, wrong: readonly [Option, Option, Option], solution: string,
    hints: Hints, figure?: ItemFigure): McSingleItem {
    const correctIndex = (id - 101) % 4;
    const options: Option[] = [...wrong];
    options.splice(correctIndex, 0, [correct, ""]);
    return {
      ...base(topic, id, "mc", difficulty, question, hints), kind: "mc_single",
      ...(figure ? { figure } : {}),
      choices: options.map(([text, reason], index) => ({
        letter: letters[index], text, isCorrect: index === correctIndex,
        rationaleIfWrong: index === correctIndex ? null : reason,
        misconceptionTag: index === correctIndex ? null : "incorrect_physical_reasoning",
      })),
      correctLetter: letters[correctIndex], workedSolution: [{ step: 1, explanation: solution }],
    };
  }
  function written(topic: string, id: number, responseType: "vsaq" | "saq" | "laq" | "case",
    difficulty: Level, question: string, parts: readonly Part[], hints: Hints,
    errors: readonly string[], figure?: ItemFigure): FrqItem {
    return {
      ...base(topic, id, responseType, difficulty, question, hints), kind: "frq", responseType,
      ...(figure ? { figure } : {}),
      parts: parts.map((part, index) => ({ letter: String.fromCharCode(97 + index), promptMarkdown: part.prompt, points: part.marking.length })),
      rubric: {
        maxPoints: parts.reduce((sum, part) => sum + part.marking.length, 0),
        criteria: parts.flatMap((part, index) => part.marking.map(description => ({ part: String.fromCharCode(97 + index), points: 1, description }))),
      },
      commonErrors: [...errors],
      workedSolution: parts.map((part, index) => ({ part: String.fromCharCode(97 + index), explanation: part.answer, markingPoints: [...part.marking] })),
    };
  }
  return { mc, written };
}
