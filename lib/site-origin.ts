export const SITE_ORIGIN = "https://studyloop.in";

export function siteUrl(pathname = "/"): string {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || /[?#\\]/.test(pathname)) {
    throw new Error(`Expected a site pathname: ${pathname}`);
  }
  return new URL(pathname, SITE_ORIGIN).href;
}
