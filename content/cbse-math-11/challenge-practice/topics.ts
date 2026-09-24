import type { Item, Topic } from "@/lib/content/types";
import { jeeSetsRelationsFunctionsTopics } from "../../jee-main-math/u1-sets-relations-functions/topics";
import { jeeComplexQuadraticTopics } from "../../jee-main-math/u2-complex-numbers-quadratic-equations/topics";

const COURSE = "cbse-math-11";
const UNIT = "challenge-practice";
const VERSION = "0.1.0";

function remapItem(
  item: Item,
  topicCode: string,
  sourceUnit: "jee-u1" | "jee-u2",
): Item {
  const [oldTopic, kind, number] = item.contentId.split(".").slice(-3);

  return {
    ...item,
    contentId: `${COURSE}.${UNIT}.${sourceUnit}-${oldTopic}.${kind}.${number}`,
    course: COURSE,
    unit: UNIT,
    topic: topicCode,
    version: VERSION,
    skillTags: ["advanced_challenge", ...item.skillTags],
  } as Item;
}

function remapTopics(
  sourceTopics: readonly Topic[],
  sourceUnit: "jee-u1" | "jee-u2",
  startIndex: number,
): Topic[] {
  return sourceTopics.map((topic, index) => {
    const topicCode = `C11.${startIndex + index}`;
    return {
      topicCode,
      title: topic.title,
      subtopic: `Advanced challenge extension from ${topic.subtopic ?? topic.title}.`,
      items: topic.items.map((item) => remapItem(item, topicCode, sourceUnit)),
    };
  });
}

export const math11ChallengePracticeTopics: Topic[] = [
  ...remapTopics(jeeSetsRelationsFunctionsTopics, "jee-u1", 1),
  ...remapTopics(jeeComplexQuadraticTopics, "jee-u2", 6),
];
