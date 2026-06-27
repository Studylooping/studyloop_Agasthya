import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const DIFFICULTY_LEVELS = [
  {
    value: 1,
    label: "Foundational",
    description: "Warm-up setup; checks one basic idea.",
  },
  {
    value: 2,
    label: "Routine exam skill",
    description: "Normal syllabus skill; usually one main rule or interpretation.",
  },
  {
    value: 3,
    label: "Standard multi-step",
    description: "Exam-style problem with multiple steps or a common trap.",
  },
  {
    value: 4,
    label: "Hard exam skill",
    description: "High-end exam problem; combines methods carefully.",
  },
  {
    value: 5,
    label: "Challenge",
    description: "Stretch problem beyond normal exam pressure.",
  },
] as const;

export function getDifficultyLabel(value: number) {
  return (
    DIFFICULTY_LEVELS.find((level) => level.value === value)?.label ??
    "Difficulty"
  );
}

export function DifficultyGuide({ className }: { className?: string }) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-base font-semibold tracking-tight">
          Difficulty guide
        </h2>
        <p className="text-sm text-muted-foreground">
          The label describes the problem, not your ability.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {DIFFICULTY_LEVELS.map((level) => (
          <div
            key={level.value}
            className="rounded-md border border-border/70 bg-muted/30 p-3"
          >
            <p className="text-sm font-semibold">
              {level.value}/5 - {level.label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {level.description}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
