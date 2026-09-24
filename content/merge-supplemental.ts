import type { Topic } from "@/lib/content/types";

export function mergeSupplementalTopics(
  baseTopics: readonly Topic[],
  supplementalTopics: readonly Topic[],
): Topic[] {
  const supplementalByCode = new Map(
    supplementalTopics.map((topic) => [topic.topicCode, topic]),
  );

  const merged = baseTopics.map((topic) => {
    const supplemental = supplementalByCode.get(topic.topicCode);
    if (!supplemental) return topic;
    supplementalByCode.delete(topic.topicCode);
    return {
      ...topic,
      items: [...topic.items, ...supplemental.items],
    };
  });

  return [...merged, ...supplementalByCode.values()];
}
