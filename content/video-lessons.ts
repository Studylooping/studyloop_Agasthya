import { VIDEO_SELECTIONS } from "@/content/video-selections";
import { VIDEO_METADATA } from "@/content/video-metadata";
import type { VideoLesson } from "@/lib/video-lessons";

export function getVideoLessons(
  courseSlug: string,
  unitSlug: string,
): VideoLesson[] {
  return VIDEO_SELECTIONS.filter(
    (lesson) =>
      lesson.courseSlug === courseSlug && lesson.unitSlug === unitSlug,
  ).flatMap((lesson) => {
    const metadata = VIDEO_METADATA[lesson.videoId];
    return metadata ? [{ ...lesson, ...metadata }] : [];
  });
}
