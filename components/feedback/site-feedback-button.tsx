import { FeedbackDialog } from "@/components/feedback/feedback-dialog";

export function SiteFeedbackButton() {
  return (
    <div className="fixed bottom-24 right-4 z-40 sm:bottom-5 sm:right-5">
      <FeedbackDialog kind="site" />
    </div>
  );
}
