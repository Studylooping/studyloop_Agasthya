import type { FrqPart, FrqRubric, FrqSolutionPart } from "./types";

export function answerRubric(parts: readonly FrqPart[], solutions: readonly FrqSolutionPart[]): FrqRubric {
  return {
    maxPoints: parts.reduce((sum, part) => sum + part.points, 0),
    criteria: parts.flatMap((part) => {
      const solution = solutions.find((entry) => entry.part === part.letter);
      if (!solution) throw new Error(`Missing solution for rubric part ${part.letter}`);
      if (part.points > 1 && solution.markingPoints?.length !== part.points) {
        throw new Error(`Part ${part.letter} requires ${part.points} explicit marking points`);
      }
      const requirements = solution.markingPoints ?? [
        `${solution.explanation}${solution.math ? ` $${solution.math}$` : ""}`,
      ];
      return requirements.map((requirement) => ({
        part: part.letter, points: 1,
        description: `${requirement} Accept equivalent scientifically correct wording or working.`,
      }));
    }),
  };
}
