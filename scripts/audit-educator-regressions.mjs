import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadSource } from "./lib/source-loader.mjs";

const { COURSES, itemSlug } = loadSource("content/courses");
const { QuestionStem, MixedMath, Tex } = loadSource("components/math/math");
const { ReviewPractice } = loadSource("components/review/review-notebook");
const { PracticeSession } = loadSource("components/learn/practice-session");
const { ItemFigure } = loadSource("components/learn/item-figure");
const { schoolCollectionItems, CELL_COLLECTION } = loadSource("content/school-collection");
const { getDisplayMcChoices, getDisplayLetterForOriginal } = loadSource("lib/grading/choice-display");
const { gradeMcSingle } = loadSource("lib/grading/mc");

const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
for (const prose of [
  "Use the idea to answer this situation: A plant cell shrinks.",
  "Avoid this: calls the change diffusion but does not mention water movement.",
  "Observation: Water enters the cell. Conclusion: The cell swells.",
  "Plasmolysis occurs in concentrated sugar solution.",
]) {
  for (const component of [QuestionStem, MixedMath]) {
    assert(!render(component, { text: prose }).includes('class="katex"'), `Prose was treated as maths: ${prose}`);
  }
}
assert(render(QuestionStem, { text: "Find $x^2$ when $x=3$." }).includes('class="katex"'));
assert(render(QuestionStem, { text: String.raw`\text{Find }\frac{1}{2}\text{ of the amount.}` }).includes('class="katex"'));

const items = COURSES.flatMap((course) => course.units.filter((unit) => unit.status === "live").flatMap((unit) => unit.topics.flatMap((topic) => topic.items)));
const ids = new Set();
const routes = new Set();
const failures = [];
const rendered = new Map();
let textFields = 0;

function inspectText(item, location, text, mathOnly = false) {
  if (text === undefined || text === null) return;
  textFields++;
  const key = `${mathOnly}:${location === "stem"}:${text}`;
  let html = rendered.get(key);
  if (html === undefined) {
    html = render(mathOnly ? Tex : location === "stem" ? QuestionStem : MixedMath, mathOnly ? { tex: text } : { text });
    rendered.set(key, html);
  }
  if (html.includes('class="katex-error"') || html.includes("[math error]")) failures.push(`${item.contentId} ${location}: invalid rendered maths`);
}

for (const item of items) {
  const route = `${item.course}/${item.unit}/${itemSlug(item.contentId)}`;
  assert(!ids.has(item.contentId), `Duplicate ID: ${item.contentId}`);
  assert(!routes.has(route), `Duplicate route: ${route}`);
  ids.add(item.contentId); routes.add(route);
  assert(!item.skillTags.includes("board_booster") || !item.course.startsWith("cbse-science-"), `Quarantined template is still live: ${item.contentId}`);
  inspectText(item, "stem", item.questionLatex);
  item.hintLadder.forEach((hint) => inspectText(item, "hint", hint.body));
  item.workedSolution.forEach((step) => {
    inspectText(item, "solution", step.explanation);
    inspectText(item, "solution formula", step.math, true);
  });
  if (item.kind === "mc_single") {
    const correct = item.choices.filter((choice) => choice.isCorrect);
    assert.equal(correct.length, 1, item.contentId);
    assert.equal(correct[0].letter, item.correctLetter, item.contentId);
    for (const {choice, displayLetter} of getDisplayMcChoices(item)) {
      assert.equal(gradeMcSingle(item, choice.letter).isCorrect, choice.isCorrect, item.contentId);
      assert.equal(getDisplayLetterForOriginal(item, choice.letter), displayLetter, item.contentId);
      inspectText(item, "choice", choice.text);
      inspectText(item, "feedback", choice.rationaleIfWrong);
    }
  }
  if (item.kind === "frq") {
    for (const part of item.parts) {
      assert.equal(item.rubric.criteria.filter((criterion) => criterion.part === part.letter).reduce((sum, criterion) => sum + criterion.points, 0), part.points, `${item.contentId} part ${part.letter}`);
      inspectText(item, "part", part.promptMarkdown);
    }
    assert.equal(item.rubric.maxPoints, item.parts.reduce((sum, part) => sum + part.points, 0), item.contentId);
    item.rubric.criteria.forEach((criterion) => inspectText(item, "rubric", criterion.description));
    item.commonErrors.forEach((error) => inspectText(item, "common error", error));
  }
}

const diagramItem = items.find((item) => item.course === "cbse-physics-11" && item.unit === "u2-kinematics" && itemSlug(item.contentId) === "t2-1-mc-001");
assert(diagramItem?.figure);
const figureLabel = diagramItem.figure.description.replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
for (const html of [
  render(ItemFigure, { figure: diagramItem.figure }),
  render(PracticeSession, { courseSlug: diagramItem.course, courseShortTitle: "Physics XI", unitSlug: diagramItem.unit, unitCode: "U2", unitTitle: "Kinematics", items: [diagramItem] }),
  render(ReviewPractice, { entry: { contentId: diagramItem.contentId, item: diagramItem, topicTitle: "Kinematics", href: "/question" }, number: 1, total: 1, onNext() {}, onStop() {}, profileStorageId: "audit" }),
]) {
  assert(html.includes("<figure"), "A question pathway omitted its figure");
  assert(html.includes(figureLabel), "Figure description is missing from a pathway");
}

const pack = schoolCollectionItems();
assert.equal(pack.length, 15);
assert.equal(CELL_COLLECTION.humanReview.status, "pending");
for (const item of pack.filter((item) => item.kind === "frq")) {
  assert(item.rubric.criteria.every((criterion) => criterion.points === 1), `Pack contains all-or-nothing multi-mark criterion: ${item.contentId}`);
}
for (const course of ["cbse-chemistry-11", "cbse-chemistry-12"]) {
  const relevant = items.filter((item) => item.course === course && item.kind === "frq" && (item.unit === "practicals-projects" || (course === "cbse-chemistry-12" && item.unit === "u5-coordination-compounds")));
  for (const item of relevant) {
    assert(item.rubric.criteria.every((criterion) => criterion.points === 1 && !criterion.description.startsWith("Completes part")), `Generic rubric: ${item.contentId}`);
  }
}
if (failures.length) {
  console.error(failures.slice(0, 50).join("\n"));
  throw new Error(`${failures.length} rendering failures`);
}
console.log(JSON.stringify({ status: "passed", courses: COURSES.length, publishedItems: items.length, textFields, uniqueRenderedTexts: rendered.size, figurePathways: 3, schoolCollectionItems: pack.length }, null, 2));
