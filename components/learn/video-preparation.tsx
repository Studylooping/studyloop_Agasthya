"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ChevronDown,
  Copy,
  LoaderCircle,
  Play,
  RotateCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "@/components/feedback/feedback-dialog";
import {
  youtubeEmbedUrl,
  type LessonLanguage,
  type VideoLesson,
} from "@/lib/video-lessons";

function LessonPlayer({ lesson }: { lesson: VideoLesson }) {
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState("");

  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, [attempt, loading]);

  async function copyPageLink() {
    const url = `${window.location.origin}${window.location.pathname}#video-preparation`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyFallback("");
    } catch {
      setCopyFallback(url);
    }
  }

  return (
    <div className="space-y-3">
      {loading && !failed && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <LoaderCircle
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none"
          />
          {slow
            ? "YouTube is taking longer than usual to load."
            : "Loading YouTube player..."}
        </p>
      )}
      {failed ? (
        <p role="alert" className="border-l-2 border-destructive pl-3 text-sm">
          The YouTube player could not load. You can retry below or continue
          practising.
        </p>
      ) : (
        <iframe
          key={attempt}
          data-testid="lesson-player"
          src={youtubeEmbedUrl(lesson.videoId, lesson.language)}
          title={`${lesson.title} - ${lesson.channel}`}
          className="aspect-video min-h-[216px] w-full border-0 bg-black"
          width="960"
          height="540"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />
      )}
      {/* A cross-origin iframe load event cannot confirm that its video player rendered. */}
      <div className="space-y-2 text-sm">
        <p className="max-w-prose text-muted-foreground">
          Blank player? Try reloading. In an in-app preview, open this same
          StudyLoop page in Edge, Chrome, Firefox or Brave. The lesson stays on
          StudyLoop.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              setSlow(false);
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            <RotateCw aria-hidden="true" />
            Reload video
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyPageLink}
          >
            <Copy aria-hidden="true" />
            Copy StudyLoop page link
          </Button>
        </div>
        {copied && <p role="status">StudyLoop page link copied.</p>}
        {copyFallback && (
          <label className="block">
            StudyLoop page link
            <input
              readOnly
              value={copyFallback}
              onFocus={(event) => event.currentTarget.select()}
              className="mt-1 block w-full min-w-0 rounded-md border border-input bg-background p-2"
            />
          </label>
        )}
      </div>
    </div>
  );
}

export function VideoPreparation({
  lessons,
  topics,
}: {
  lessons: VideoLesson[];
  topics?: { topicCode: string; title: string }[];
}) {
  const id = useId();
  const loadButton = useRef<HTMLButtonElement>(null);
  const [language, setLanguage] = useState<LessonLanguage>(
    lessons[0]?.language ?? "en",
  );
  const [selectedId, setSelectedId] = useState(lessons[0]?.videoId ?? "");
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [topicCode, setTopicCode] = useState("all");
  const topicOptions =
    topics ??
    [...new Set(lessons.flatMap((lesson) => lesson.topicCodes))].map(
      (code) => ({ topicCode: code, title: `Topic ${code}` }),
    );
  const topicLessons = lessons.filter(
    (lesson) => topicCode === "all" || lesson.topicCodes.includes(topicCode),
  );
  const options = topicLessons.filter((lesson) => lesson.language === language);
  const selected =
    options.find((lesson) => lesson.videoId === selectedId) ?? options[0];
  if (!selected) return null;
  const loaded = loadedId === selected.videoId;

  function closeVideo() {
    setLoadedId(null);
    setOffline(false);
    requestAnimationFrame(() => loadButton.current?.focus());
  }

  return (
    <details
      id="video-preparation"
      className="group mt-8 scroll-mt-24 border-y border-border py-4 print:hidden"
      onToggle={(event) => {
        if (!event.currentTarget.open) setLoadedId(null);
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3">
          <Play aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
          <span className="font-semibold">
            Video prep &amp; review{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-5 min-w-0 space-y-4">
        <p className="max-w-prose text-sm text-muted-foreground">
          Each lesson covers the concepts listed below, not every skill in a
          unit. Follow your school's current chapter and exam scope.
        </p>
        <div>
          <label
            htmlFor={`${id}-topic`}
            className="mb-2 block text-sm font-medium"
          >
            Topic
          </label>
          <select
            id={`${id}-topic`}
            value={topicCode}
            onChange={(event) => {
              const code = event.target.value;
              const matching = lessons.filter(
                (lesson) => code === "all" || lesson.topicCodes.includes(code),
              );
              const next =
                matching.find((lesson) => lesson.language === language) ??
                matching[0];
              if (!next) return;
              setLoadedId(null);
              setOffline(false);
              setTopicCode(code);
              setLanguage(next.language);
              setSelectedId(next.videoId);
            }}
            className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All topics</option>
            {topicOptions.map((topic) => (
              <option
                key={topic.topicCode}
                value={topic.topicCode}
                disabled={
                  !lessons.some((lesson) =>
                    lesson.topicCodes.includes(topic.topicCode),
                  )
                }
              >
                {topic.topicCode} - {topic.title}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="flex flex-wrap items-center gap-3">
          <legend className="mb-2 text-sm font-medium">
            Teaching language
          </legend>
          {(
            [
              ["en", "English"],
              ["hi", "Hindi / Hinglish"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="radio"
                name={`${id}-language`}
                value={value}
                checked={language === value}
                disabled={
                  !topicLessons.some((lesson) => lesson.language === value)
                }
                onChange={() => {
                  setLoadedId(null);
                  setOffline(false);
                  setLanguage(value);
                  setSelectedId(
                    topicLessons.find((lesson) => lesson.language === value)
                      ?.videoId ?? "",
                  );
                }}
                className="h-4 w-4 accent-primary"
              />
              {label}
            </label>
          ))}
        </fieldset>
        {topicCode !== "all" &&
          !topicLessons.some((lesson) => lesson.language === "hi") && (
            <p className="text-sm text-muted-foreground">
              No Hindi/Hinglish lesson has been verified for this topic yet. You
              can suggest one below.
            </p>
          )}
        {topicCode !== "all" &&
          !topicLessons.some((lesson) => lesson.language === "en") && (
            <p className="text-sm text-muted-foreground">
              No English lesson has been verified for this topic yet. You can
              suggest one below.
            </p>
          )}
        <div>
          <label
            htmlFor={`${id}-lesson`}
            className="mb-2 block text-sm font-medium"
          >
            Lesson
          </label>
          <select
            id={`${id}-lesson`}
            value={selected.videoId}
            onChange={(event) => {
              setLoadedId(null);
              setOffline(false);
              setSelectedId(event.target.value);
            }}
            className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {options.map((lesson) => (
              <option key={lesson.videoId} value={lesson.videoId}>
                {lesson.focus}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0" aria-live="polite">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {selected.format === "concept"
              ? "Concept refresher"
              : selected.format === "lesson"
                ? "Chapter lesson"
                : "Chapter revision"}
          </p>
          <h2 className="mt-1 break-words text-lg font-semibold">
            {selected.title}
          </h2>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            YouTube · {selected.channel}
          </p>
          <p className="mt-2 max-w-prose text-sm">{selected.coverage}</p>
          {/practical/.test(selected.unitSlug) && (
            <p className="mt-2 max-w-prose border-l-2 border-border pl-3 text-sm">
              Watch for preparation only. Perform experiments in a supervised
              school laboratory, following your teacher's safety instructions.
            </p>
          )}
        </div>
        {loaded ? (
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                YouTube may show ads and process playback data.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeVideo}
              >
                <X aria-hidden="true" />
                Close video
              </Button>
            </div>
            <LessonPlayer key={selected.videoId} lesson={selected} />
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 border-l-2 border-border pl-4">
            <p
              id={`${id}-privacy`}
              className="max-w-prose text-sm text-muted-foreground"
            >
              Loading this optional video connects to Google/YouTube, which may
              process device and playback data and show ads. The recording may
              include creator promotions. Privacy-enhanced mode is not anonymous
              or ad-free. No YouTube player or thumbnail loads before you choose
              below.
            </p>
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline underline-offset-4"
            >
              Google privacy policy
            </a>
            {offline && (
              <p role="alert" className="text-sm text-destructive">
                An internet connection is needed for YouTube. You can continue
                practising without the video.
              </p>
            )}
            <Button
              ref={loadButton}
              type="button"
              aria-describedby={`${id}-privacy`}
              onClick={() => {
                if (!navigator.onLine) {
                  setOffline(true);
                  return;
                }
                setOffline(false);
                setLoadedId(selected.videoId);
              }}
              className="h-auto min-h-11 whitespace-normal text-left"
            >
              <ShieldCheck aria-hidden="true" />
              Load YouTube video
            </Button>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {selected.topicCodes.map((code) => (
              <a
                key={code}
                href={`#topic-${code}`}
                onClick={() => setLoadedId(null)}
                className="text-primary underline underline-offset-4"
              >
                Practise topic {code}
              </a>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <FeedbackDialog
              kind="site"
              triggerText="Suggest a better video"
              videoSuggestion={{
                context: `Course: ${selected.courseSlug}\nUnit: ${selected.unitSlug}\nCurrent lesson: ${selected.focus}\nCurrent video: https://www.youtube.com/watch?v=${selected.videoId}`,
                language: selected.language,
                topics:
                  topicCode === "all"
                    ? selected.topicCodes.join(", ")
                    : topicCode,
              }}
            />
            <FeedbackDialog
              kind="site"
              triggerText="Report video issue"
              initialDetails={`Video: ${selected.title}\nChannel: ${selected.channel}\nhttps://www.youtube.com/watch?v=${selected.videoId}\n\nIssue: `}
            />
          </div>
        </div>
        <noscript>
          <p className="text-sm text-muted-foreground">
            Videos require JavaScript and an internet connection. Questions
            remain available below.
          </p>
        </noscript>
      </div>
    </details>
  );
}
