import type { Metadata } from "next";
import { SITE } from "./utils";
import { siteUrl } from "./site-origin";

export function pageMetadata(
  pathname: string,
  input: { title: string | { absolute: string }; description?: string; robots?: Metadata["robots"] },
): Metadata {
  const title = typeof input.title === "string"
    ? `${input.title} \u2014 ${SITE.name}`
    : input.title.absolute;
  const description = input.description ?? SITE.description;
  return {
    ...input,
    alternates: { canonical: siteUrl(pathname) },
    openGraph: { type: "website", url: siteUrl(pathname), siteName: SITE.name, title, description, locale: "en_IN" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export const organizationData = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "@id": `${siteUrl()}#organization`,
  name: SITE.name,
  url: siteUrl(),
  description: SITE.description,
};

export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
