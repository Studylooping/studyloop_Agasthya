export const QUESTION_FEEDBACK_OPTIONS = [
  { code: "answer", label: "Answer or solution is wrong" },
  { code: "math", label: "Math or LaTeX is broken" },
  { code: "figure", label: "Figure is incorrect or unclear" },
  { code: "wording", label: "Question wording is unclear" },
  { code: "formatting", label: "Formatting or layout is broken" },
  { code: "alignment", label: "Exam or syllabus mismatch" },
  { code: "other", label: "Other issue" },
] as const;

export const SITE_FEEDBACK_OPTIONS = [
  { code: "bug", label: "Something is broken" },
  { code: "content", label: "Content quality" },
  { code: "usability", label: "Navigation or usability" },
  { code: "accessibility", label: "Accessibility" },
  { code: "suggestion", label: "Suggestion or request" },
  { code: "praise", label: "Something I liked" },
  { code: "other", label: "Other feedback" },
] as const;

export type FeedbackKind = "question" | "site";
export type FeedbackCode =
  | (typeof QUESTION_FEEDBACK_OPTIONS)[number]["code"]
  | (typeof SITE_FEEDBACK_OPTIONS)[number]["code"];

export interface QuestionFeedbackContext {
  contentId: string;
  course: string;
  unit: string;
  topic: string;
  question: string;
}

export interface FeedbackSubmission {
  kind: FeedbackKind;
  categories: FeedbackCode[];
  details: string;
  contactEmail: string;
  pageUrl: string;
  viewport: string;
  context?: QuestionFeedbackContext;
  openedAt: number;
  /** Honeypot. Real visitors never see or fill this field. */
  website: string;
}

export function getFeedbackOptions(kind: FeedbackKind) {
  return kind === "question"
    ? QUESTION_FEEDBACK_OPTIONS
    : SITE_FEEDBACK_OPTIONS;
}

export function getFeedbackLabel(
  kind: FeedbackKind,
  code: string,
): string | null {
  const option = getFeedbackOptions(kind).find(
    (candidate) => candidate.code === code,
  );
  return option?.label ?? null;
}
