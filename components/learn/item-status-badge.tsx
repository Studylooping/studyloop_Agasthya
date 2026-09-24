import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/lib/content/types";

interface Props {
  reviewStatus?: ReviewStatus;
  verifiedBy?: string;
  className?: string;
}

export function ItemStatusBadge({
  reviewStatus,
  verifiedBy,
  className,
}: Props) {
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

  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {reviewStatus === "ai_reviewed" ? "AI checked; teacher review pending" : "Teacher review pending"}
    </span>
  );
}
