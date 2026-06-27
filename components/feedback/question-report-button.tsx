import { FeedbackDialog } from "@/components/feedback/feedback-dialog";
import type { QuestionFeedbackContext } from "@/lib/feedback";

export function QuestionReportButton({
  context,
  compact = false,
  className,
}: {
  context: QuestionFeedbackContext;
  compact?: boolean;
  className?: string;
}) {
  return (
    <FeedbackDialog
      kind="question"
      context={context}
      compact={compact}
      className={className}
    />
  );
}
