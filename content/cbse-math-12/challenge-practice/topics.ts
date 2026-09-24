import type { Item, Topic } from "@/lib/content/types";
import { jeeMatricesDeterminantsTopics } from "../../jee-main-math/u3-matrices-determinants/topics";

const COURSE = "cbse-math-12";
const UNIT = "challenge-practice";
const VERSION = "0.1.0";

function remapItem(item: Item, topicCode: string): Item {
  const [oldTopic, kind, number] = item.contentId.split(".").slice(-3);

  return {
    ...item,
    contentId: `${COURSE}.${UNIT}.jee-u3-${oldTopic}.${kind}.${number}`,
    course: COURSE,
    unit: UNIT,
    topic: topicCode,
    version: VERSION,
    skillTags: ["advanced_challenge", ...item.skillTags],
  } as Item;
}

export const math12ChallengePracticeTopics: Topic[] =
  jeeMatricesDeterminantsTopics.map((topic, index) => {
    const topicCode = `C12.${index + 1}`;
    return {
      topicCode,
      title: topic.title,
      subtopic: `Advanced challenge extension from ${topic.subtopic ?? topic.title}.`,
      items: topic.items.map((item) => remapItem(item, topicCode)),
    };
  });
