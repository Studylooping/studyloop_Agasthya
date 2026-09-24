import type { Metadata, Viewport } from "next";
import { SiteFeedbackButton } from "@/components/feedback/site-feedback-button";
import { ThemeProvider } from "@/components/site/theme-provider";
import { SITE } from "@/lib/utils";
import { organizationData, jsonLd } from "@/lib/seo";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Free STEM practice`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name }],
  keywords: [
    "CBSE STEM",
    "AP Calculus AB",
    "free STEM practice",
    "study companion",
    "practice questions",
  ],
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — Free STEM practice`,
    description: SITE.description,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — Free STEM practice`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfd" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1217" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationData) }} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          {children}
          <SiteFeedbackButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
