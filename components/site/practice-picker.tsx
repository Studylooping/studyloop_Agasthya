"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CourseOption { slug: string; title: string; group: string }

export function PracticePicker({ courses }: { courses: CourseOption[] }) {
  const [group, setGroup] = useState("11");
  const [slug, setSlug] = useState("");
  const available = courses.filter((course) => course.group === group);
  const selected = available.find((course) => course.slug === slug) ?? available[0];
  return (
    <div className="mt-6 grid grid-cols-2 items-end gap-3 text-left sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <label className="flex min-w-0 flex-col gap-1 text-sm">
        Class / exam
        <select value={group} onChange={(event) => { setGroup(event.target.value); setSlug(""); }} className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-3">
          {["9", "10", "11", "12"].map((value) => <option key={value} value={value}>CBSE Class {value}</option>)}
          <option value="ap">AP</option>
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-sm">
        Subject
        <select value={selected?.slug ?? ""} onChange={(event) => setSlug(event.target.value)} className="h-11 w-full max-w-full rounded-md border border-input bg-background px-3">
          {available.map((course) => <option key={course.slug} value={course.slug}>{course.title}</option>)}
        </select>
      </label>
      {selected && <Button asChild size="lg" className="col-span-2 sm:col-span-1"><Link href={`/${selected.slug}`}>Start practicing <ArrowRight className="h-4 w-4" /></Link></Button>}
    </div>
  );
}
