import { NextResponse } from "next/server";
import {
  getFeedbackLabel,
  type FeedbackCode,
  type FeedbackKind,
  type FeedbackSubmission,
  type QuestionFeedbackContext,
} from "@/lib/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOUNDER_EMAIL = "hello@studyloop.in";
const SENDER_EMAIL = "feedback@studyloop.in";
const MAX_REQUEST_BYTES = 16_000;
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

interface EmailBinding {
  send(message: {
    to: string;
    from: string | { email: string; name?: string };
    subject: string;
    text: string;
    html: string;
  }): Promise<unknown>;
}

const rateLimits = new Map<string, { count: number; resetAt: number }>();

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

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== requestUrl.host) {
        return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Please wait before sending more feedback." },
      { status: 429 },
    );
  }

  let raw: Partial<FeedbackSubmission>;
  try {
    raw = (await request.json()) as Partial<FeedbackSubmission>;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Quietly accept bot submissions so the honeypot is not discoverable.
  if (cleanText(raw.website, 200)) {
    return NextResponse.json({ ok: true });
  }

  const kind: FeedbackKind | null =
    raw.kind === "question" || raw.kind === "site" ? raw.kind : null;
  const categories =
    kind && Array.isArray(raw.categories)
      ? [...new Set(raw.categories)]
          .map((code) => ({ code, label: getFeedbackLabel(kind, code) }))
          .filter(
            (item): item is { code: FeedbackCode; label: string } =>
              !!item.label,
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
    return NextResponse.json({ error: "Incomplete feedback" }, { status: 400 });
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

  if (process.env.NODE_ENV === "development") {
    console.info("[StudyLoop development feedback]\n" + text);
    return NextResponse.json({ ok: true, delivery: "development-log" });
  }

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const email = (env as unknown as { FEEDBACK_EMAIL?: EmailBinding })
      .FEEDBACK_EMAIL;
    if (!email) throw new Error("FEEDBACK_EMAIL binding is unavailable");

    await email.send({
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
    return NextResponse.json(
      { error: "Feedback delivery is unavailable" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
