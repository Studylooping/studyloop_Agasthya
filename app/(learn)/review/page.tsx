import type { Metadata } from "next";
import {
  COURSES,
  itemSlug,
} from "@/content/courses";
import {
  ReviewNotebook,
  type ReviewContentEntry,
} from "@/components/review/review-notebook";

export const metadata: Metadata = {
  title: "Review Notebook",
  description: "Local StudyLoop review notebook for saved practice errors.",
};

function getReviewEntries(): ReviewContentEntry[] {
  return COURSES.flatMap((course) =>
    course.units.flatMap((unit) =>
      unit.topics.flatMap((topic) =>
        topic.items
          .filter((item) => item.kind === "mc_single" || item.kind === "frq")
          .map((item) => ({
            contentId: item.contentId,
            courseShortTitle: course.shortTitle,
            href: `/${course.slug}/${unit.slug}/${itemSlug(item.contentId)}`,
            item,
            topicCode: topic.topicCode,
            topicTitle: topic.title,
            unitCode: unit.unitCode,
            unitTitle: unit.title,
          })),
      ),
    ),
  );
}

export default function ReviewPage() {
  return <ReviewNotebook entries={getReviewEntries()} />;
}
