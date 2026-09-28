import type {
  FrqItem,
  Item,
  ItemFigure,
  McSingleItem,
} from "@/lib/content/types";

export const math = (tex: string | number) => "$" + tex + "$";
export const range = (a: number, b: number) =>
  Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
export const set = (values: (number | string)[]) =>
  values.length
    ? "\\{" + [...new Set(values)].join(",") + "\\}"
    : "\\varnothing";
export function fraction(n: number, d: number): string {
  if (!d) throw new Error("Zero denominator in authored answer");
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const g = gcd(Math.abs(n), Math.abs(d));
  const a = (n / g) * Math.sign(d),
    b = Math.abs(d) / g;
  return b === 1
    ? String(a)
    : (a < 0 ? "-" : "") + "\\frac{" + Math.abs(a) + "}{" + b + "}";
}
export const signed = (n: number) => (n < 0 ? String(n) : "+" + n);
export const pair = (a: number | string, b: number | string) =>
  "(" + a + "," + b + ")";
export type Level = 1 | 2 | 3 | 4;
export type Context = {
  unit: string;
  topic: string;
  chapter: number;
  offset?: number;
};
export type WrittenPart = {
  prompt: string;
  answer: string;
  working: string;
  marks: string[];
};
export const part = (
  prompt: string,
  answer: string,
  working: string,
  ...marks: string[]
): WrittenPart => ({ prompt, answer, working, marks });
type Clues = [string, string, string];
type Wrong = [string, string];

function base(
  c: Context,
  index: number,
  kind: string,
  q: string,
  d: Level,
  skill: string,
  clues: Clues,
  figure?: ItemFigure,
) {
  return {
    contentId:
      "cbse-math-11.u" +
      c.unit.match(/^u(\d+)/)![1] +
      ".t" +
      c.topic.replace(".", "-") +
      "." +
      kind +
      "." +
      String((c.offset ?? 101) + index).padStart(3, "0"),
    course: "cbse-math-11",
    unit: c.unit,
    topic: c.topic,
    difficulty: d,
    calculatorAllowed: false,
    questionLatex: q,
    skillTags: ["ncert_chapter_" + c.chapter, "chapter_expansion_2026", skill],
    commonMisconceptions: [skill + "_condition_or_operation"],
    hintLadder: clues.map((body, i) => ({ level: (i + 1) as 1 | 2 | 3, body })),
    reviewStatus: "ai_reviewed" as const,
    sourceType: "original_ai_assisted_question" as const,
    version: "0.3.0",
    ...(figure ? { figure } : {}),
  };
}

export function mc(
  c: Context,
  index: number,
  q: string,
  d: Level,
  skill: string,
  answer: string,
  wrong: [Wrong, Wrong, Wrong],
  working: string[],
  clues: Clues,
  figure?: ItemFigure,
): McSingleItem {
  const options = [
    { text: answer, rationale: null as string | null, isCorrect: true },
    ...wrong.map(([text, rationale]) => ({
      text,
      rationale,
      isCorrect: false,
    })),
  ];
  if (new Set(options.map((o) => o.text)).size !== 4)
    throw new Error("Repeated options: " + c.topic + "/" + index);
  const correctIndex =
    (Math.floor(index / 10) * 5 +
      (index % 10) +
      Number(c.topic.split(".")[1])) %
    4;
  const ordered = [
    ...options.slice(4 - correctIndex),
    ...options.slice(0, 4 - correctIndex),
  ];
  const letters = ["A", "B", "C", "D"] as const;
  return {
    ...base(c, index, "mc", q, d, skill, clues, figure),
    kind: "mc_single",
    choices: ordered.map((o, i) => ({
      letter: letters[i],
      text: o.text,
      isCorrect: o.isCorrect,
      rationaleIfWrong: o.rationale,
      misconceptionTag: o.isCorrect ? null : skill + "_distractor_" + i,
    })),
    correctLetter: letters[correctIndex],
    workedSolution: working.map((explanation, i) => ({
      step: i + 1,
      explanation,
    })),
  };
}

export function written(
  c: Context,
  index: number,
  type: "vsaq" | "saq" | "laq" | "case",
  q: string,
  d: Level,
  skill: string,
  parts: WrittenPart[],
  clues: Clues,
  errors: string[],
  figure?: ItemFigure,
): FrqItem {
  const letters = ["a", "b", "c", "d"];
  return {
    ...base(c, index, type, q, d, skill, clues, figure),
    kind: "frq",
    responseType: type,
    parts: parts.map((p, i) => ({
      letter: letters[i],
      promptMarkdown: p.prompt,
      points: p.marks.length,
    })),
    rubric: {
      maxPoints: parts.reduce((n, p) => n + p.marks.length, 0),
      criteria: parts.flatMap((p, i) =>
        p.marks.map((description) => ({
          part: letters[i],
          points: 1,
          description,
        })),
      ),
    },
    commonErrors: errors,
    workedSolution: parts.map((p, i) => ({
      part: letters[i],
      explanation: p.working + " " + p.answer,
      markingPoints: p.marks,
    })),
  };
}

export function assertion(
  c: Context,
  i: number,
  a: string,
  r: string,
  state: 0 | 1 | 2 | 3,
  explanation: string,
  skill: string,
): Item {
  const texts = [
    "Both A and R are true, and R correctly explains A.",
    "Both A and R are true, but R does not correctly explain A.",
    "A is true, but R is false.",
    "A is false, but R is true.",
  ];
  return mc(
    c,
    i,
    "Assertion (A): " + a + " Reason (R): " + r + " Choose the correct option.",
    2,
    skill,
    texts[state],
    texts.flatMap((t, j) =>
      j === state ? [] : [[t, explanation] as Wrong],
    ) as [Wrong, Wrong, Wrong],
    [explanation],
    [
      "Check the assertion and reason separately.",
      "Test the stated rule, including its conditions.",
      "If both statements are true, decide whether the reason proves the assertion.",
    ],
  );
}
