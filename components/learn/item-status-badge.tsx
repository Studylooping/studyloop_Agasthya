import { Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/lib/content/types";

interface Props {
  reviewStatus?: ReviewStatus;
  verifiedBy?: string;
  className?: string;
}

/**
 * Trust badge shown on every item page. Per CONTENT_PIPELINE.md §6:
 * - Needs mentor review = alpha item awaiting subject mentor verification.
 * - AI-reviewed = founder spot-checked, no teacher yet.
 * - Verified by [Name] = subject teacher signed off.
 *
 * Mandatory visibility on the item card; this is part of how we keep the
 * honest-about-AI promise to students (see /ethics).
 */
export function ItemStatusBadge({ reviewStatus, verifiedBy, className }: Props) {
  if (verifiedBy || reviewStatus === "verified") {
    const label = verifiedBy ? `Verified by ${verifiedBy}` : "Verified";
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success",
          className,
        )}
        title={label}
      >
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </span>
    );
  }

  if (reviewStatus === "human_review_required") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning",
          className,
        )}
        title="AI-assisted alpha item. Awaiting mentor verification."
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Needs mentor review
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
      title="AI-drafted; founder spot-checked. Awaiting teacher verification."
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      AI-reviewed
    </span>
  );
}
