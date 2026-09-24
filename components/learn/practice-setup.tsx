"use client";

import { useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PracticeSession } from "./practice-session";
import type { McSingleItem } from "@/lib/content/types";

interface Props {
  courseSlug: string;
  courseShortTitle: string;
  unitSlug: string;
  unitCode: string;
  unitTitle: string;
  items: McSingleItem[];
  topics: { topicCode: string; title: string }[];
}

export function PracticeSetup({ topics, items, ...unit }: Props) {
  const [topic, setTopic] = useState("all");
  const [size, setSize] = useState("5");
  const [mode, setMode] = useState<"learn" | "independent">("learn");
  const [run, setRun] = useState<{ items: McSingleItem[]; key: string; mode: "learn" | "independent" } | null>(null);
  const pool = items.filter((item) => topic === "all" || item.topic === topic);
  const count = size === "all" ? pool.length : Math.min(Number(size), pool.length);

  if (run) return <PracticeSession {...unit} items={run.items} sessionId={run.key} mode={run.mode} onConfigure={() => setRun(null)} />;

  return (
    <div className="mx-auto max-w-prose px-4 py-10">
      <Link href={`/${unit.courseSlug}/${unit.unitSlug}`} className="text-sm text-primary underline">Back to unit</Link>
      <h1 className="mt-6 text-2xl font-semibold">Practice: {unit.unitTitle}</h1>
      <form className="mt-8 space-y-6" onSubmit={(event) => {
        event.preventDefault();
        setRun({ items: pool.slice(0, count), key: `${topic}.${size}.${mode}`, mode });
      }}>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Topic
          <select value={topic} onChange={(event) => setTopic(event.target.value)} className="h-11 max-w-full rounded-md border border-input bg-background px-3">
            <option value="all">All topics</option>
            {topics.filter((entry) => items.some((item) => item.topic === entry.topicCode)).map((entry) => <option value={entry.topicCode} key={entry.topicCode}>{entry.topicCode}: {entry.title}</option>)}
          </select>
        </label>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Questions</legend>
          <div className="flex flex-wrap gap-4">
            {["5", "10", "all"].map((value) => <label key={value} className="flex items-center gap-2 text-sm"><input type="radio" name="size" value={value} checked={size === value} onChange={() => setSize(value)} />{value === "all" ? `All (${pool.length})` : value}</label>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Mode</legend>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="mode" checked={mode === "learn"} onChange={() => setMode("learn")} />Learn with hints</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="mode" checked={mode === "independent"} onChange={() => setMode("independent")} />Independent practice</label>
          </div>
        </fieldset>
        <Button type="submit" disabled={count === 0}><Play className="h-4 w-4" />Start {count} questions</Button>
        <Link href="/review" className="ml-4 inline-block text-sm text-primary underline">Review mistakes</Link>
      </form>
    </div>
  );
}
