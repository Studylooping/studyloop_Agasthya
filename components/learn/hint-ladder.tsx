"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { MixedMath } from "@/components/math/math";
import type { Hint } from "@/lib/content/types";

export function HintLadder({ hints }: { hints: Hint[] }) {
  const [shown, setShown] = useState(0);
  if (!hints.length) return null;
  return (
    <div className="space-y-3">
      {hints.slice(0, shown).map((hint) => (
        <div key={hint.level} className="border-l-2 border-warning pl-3 text-sm">
          <p className="font-medium">Hint {hint.level}</p>
          <MixedMath text={hint.body} />
        </div>
      ))}
      {shown < hints.length && (
        <button type="button" onClick={() => setShown(shown + 1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Lightbulb className="h-4 w-4" aria-hidden="true" />
          {shown === 0 ? "Need a hint?" : `Show hint ${shown + 1}`}
        </button>
      )}
    </div>
  );
}
