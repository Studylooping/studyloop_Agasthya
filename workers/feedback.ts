const FOUNDER_EMAIL = "hello@studyloop.in";
const SENDER_EMAIL = "feedback@studyloop.in";
const MAX_REQUEST_BYTES = 16_000;
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

type FeedbackKind = "question" | "site";

interface EmailBinding {
  send(message: {
    to: string;
    from: string | { email: string; name?: string };
    subject: string;
    text: string;
    html: string;
  }): Promise<unknown>;
}

interface Env {
  FEEDBACK_EMAIL?: EmailBinding;
}

interface QuestionFeedbackContext {
  contentId: string;
  course: string;
  unit: string;
  topic: string;
  question: string;
}

interface FeedbackSubmission {
  kind: FeedbackKind;
  categories: string[];
  details: string;
  contactEmail: string;
  pageUrl: string;
  viewport: string;
  context?: QuestionFeedbackContext;
  openedAt: number;
  website: string;
}

const questionFeedbackLabels: Record<string, string> = {
  answer: "Answer or solution is wrong",
  math: "Math or LaTeX is broken",
  figure: "Figure is incorrect or unclear",
  wording: "Question wording is unclear",
  formatting: "Formatting or layout is broken",
  alignment: "Exam or syllabus mismatch",
  other: "Other issue",
};

const siteFeedbackLabels: Record<string, string> = {
  bug: "Something is broken",
  content: "Content quality",
  usability: "Navigation or usability",
  accessibility: "Accessibility",
  suggestion: "Suggestion or request",
  praise: "Something I liked",
  other: "Other feedback",
};

const rateLimits = new Map<string, { count: number; resetAt: number }>();

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });
}

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanContext(value: unknown): QuestionFeedbackContext | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const context = {
    contentId: cleanText(raw.contentId, 160),
    course: cleanText(raw.course, 120),
    unit: cleanText(raw.unit, 120),
    topic: cleanText(raw.topic, 80),
    question: cleanText(raw.question, 1000),
  };

  return context.contentId && context.question ? context : undefined;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const current = rateLimits.get(ip);
  if (!current || current.resetAt <= now) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (current.count >= RATE_LIMIT_COUNT) return true;
  current.count += 1;
  return false;
}

function isValidEmail(value: string): boolean {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getFeedbackLabel(kind: FeedbackKind, code: string): string | null {
  const labels =
    kind === "question" ? questionFeedbackLabels : siteFeedbackLabels;
  return labels[code] ?? null;
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  if (!origin) return {};

  try {
    const originUrl = new URL(origin);
    if (
      originUrl.host === requestUrl.host ||
      originUrl.hostname.endsWith(".studyloop.in")
    ) {
      return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        Vary: "Origin",
      };
    }
  } catch {
    return {};
  }

  return {};
}

async function handlePost(request: Request, env: Env) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (
        originUrl.host !== requestUrl.host &&
        !originUrl.hostname.endsWith(".studyloop.in")
      ) {
        return json({ error: "Invalid origin" }, { status: 403 });
      }
    } catch {
      return json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return json({ error: "Request too large" }, { status: 413 });
  }

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  if (isRateLimited(ip)) {
    return json(
      { error: "Please wait before sending more feedback." },
      { status: 429 },
    );
  }

  let raw: Partial<FeedbackSubmission>;
  try {
    raw = (await request.json()) as Partial<FeedbackSubmission>;
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }

  if (cleanText(raw.website, 200)) {
    return json({ ok: true });
  }

  const kind: FeedbackKind | null =
    raw.kind === "question" || raw.kind === "site" ? raw.kind : null;
  const categories =
    kind && Array.isArray(raw.categories)
      ? [...new Set(raw.categories)]
          .map((code) => ({ code, label: getFeedbackLabel(kind, code) }))
          .filter(
            (item): item is { code: string; label: string } => !!item.label,
          )
          .slice(0, 7)
      : [];
  const details = cleanText(raw.details, 2000);
  const contactEmail = cleanText(raw.contactEmail, 254);
  const pageUrl = cleanText(raw.pageUrl, 2000);
  const viewport = cleanText(raw.viewport, 40);
  const context = cleanContext(raw.context);

  if (
    !kind ||
    categories.length === 0 ||
    !pageUrl ||
    !isValidEmail(contactEmail) ||
    (kind === "site" && details.length < 3) ||
    (kind === "question" && !context)
  ) {
    return json({ error: "Incomplete feedback" }, { status: 400 });
  }

  const categoryLabels = categories.map((category) => category.label);
  const reportTitle = kind === "question" ? "Question report" : "Site feedback";
  const subjectTarget = context?.contentId ?? requestUrl.host;
  const subject = `[StudyLoop ${reportTitle}] ${categoryLabels[0]} - ${subjectTarget}`;
  const userAgent = cleanText(request.headers.get("user-agent"), 500);
  const submittedAt = new Date().toISOString();

  const text = [
    reportTitle,
    "",
    `Categories: ${categoryLabels.join(", ")}`,
    context ? `Content ID: ${context.contentId}` : null,
    context ? `Course: ${context.course}` : null,
    context ? `Unit: ${context.unit}` : null,
    context ? `Topic: ${context.topic}` : null,
    context ? `Question: ${context.question}` : null,
    `Details: ${details || "Not provided"}`,
    `Contact: ${contactEmail || "Not provided"}`,
    `Page: ${pageUrl}`,
    `Viewport: ${viewport || "Unknown"}`,
    `User agent: ${userAgent || "Unknown"}`,
    `Submitted: ${submittedAt}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const htmlRows = [
    ["Categories", categoryLabels.join(", ")],
    context ? ["Content ID", context.contentId] : null,
    context ? ["Course", context.course] : null,
    context ? ["Unit", context.unit] : null,
    context ? ["Topic", context.topic] : null,
    context ? ["Question", context.question] : null,
    ["Details", details || "Not provided"],
    ["Contact", contactEmail || "Not provided"],
    ["Page", pageUrl],
    ["Viewport", viewport || "Unknown"],
    ["User agent", userAgent || "Unknown"],
    ["Submitted", submittedAt],
  ]
    .filter((row): row is string[] => row !== null)
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:6px 12px 6px 0;vertical-align:top">${escapeHtml(label)}</th><td style="padding:6px 0">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const html = `<h1 style="font-size:20px">${escapeHtml(reportTitle)}</h1><table>${htmlRows}</table>`;

  try {
    if (!env.FEEDBACK_EMAIL) {
      throw new Error("FEEDBACK_EMAIL binding is unavailable");
    }

    await env.FEEDBACK_EMAIL.send({
      to: FOUNDER_EMAIL,
      from: { email: SENDER_EMAIL, name: "StudyLoop Feedback" },
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error(
      "Feedback notification failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return json({ error: "Feedback delivery is unavailable" }, { status: 503 });
  }

  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, { status: 405 });
    }

    const response = await handlePost(request, env);
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
    return response;
  },
};
