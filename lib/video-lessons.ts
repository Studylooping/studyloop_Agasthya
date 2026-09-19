export type LessonLanguage = "en" | "hi";

export interface VideoSelection {
  videoId: string;
  courseSlug: string;
  unitSlug: string;
  topicCodes: string[];
  language: LessonLanguage;
  focus: string;
  format: "concept" | "lesson" | "revision";
  coverage: string;
}

export interface VideoMetadata {
  title: string;
  channel: string;
  checkedOn: string;
}

export type VideoLesson = VideoSelection & VideoMetadata;

export function canonicalYouTubeLink(value: string): string | null {
  try {
    const input = value.trim();
    const url = new URL(
      /^(?:(?:www|m|music)\.)?youtube\.com\/|^youtu\.be\//i.test(input)
        ? `https://${input}`
        : input,
    );
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port
    )
      return null;
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);
    let id: string | null = null;
    if (host === "youtu.be" && parts.length === 1) id = parts[0];
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
      ].includes(host)
    ) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      if (["shorts", "live", "embed"].includes(parts[0]) && parts.length === 2)
        id = parts[1];
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id)
      ? `https://www.youtube.com/watch?v=${id}`
      : null;
  } catch {
    return null;
  }
}

export function youtubeEmbedUrl(
  videoId: string,
  language: LessonLanguage,
): string {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw new Error("Invalid YouTube video ID");
  }
  const url = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  url.search = new URLSearchParams({
    autoplay: "0",
    playsinline: "1",
    rel: "0",
    hl: language,
  }).toString();
  return url.href;
}
