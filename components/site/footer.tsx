import Link from "next/link";
import { SITE } from "@/lib/utils";

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/ethics", label: "Ethics" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/changelog", label: "Changelog" },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="container max-w-content py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold tracking-tight">{SITE.name}</p>
            <p className="text-sm text-muted-foreground">{SITE.tagline}</p>
          </div>

          <nav aria-label="Footer" className="text-sm">
            <ul className="space-y-2">
              {FOOTER_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Free forever. No StudyLoop ads or behavioural tracking.</p>
            <p className="mt-2">Optional YouTube lessons may show ads and process playback data.</p>
            <p>
              Source code:{" "}
              <a
                href="https://github.com/Studylooping/studyloop_Agasthya"
                rel="noopener noreferrer"
                target="_blank"
                className="underline underline-offset-4 hover:text-foreground"
              >
                Studylooping/studyloop_Agasthya
              </a>
            </p>
          </div>
        </div>

        {/* MANDATORY College Board trademark disclaimer. Must appear on every
            page. Per ARCHITECTURE.md §5.5 and the original research. */}
        <p className="mt-8 border-t border-border/40 pt-6 text-xs leading-relaxed text-muted-foreground">
          AP&reg; is a trademark registered by the College Board, which is not
          affiliated with, and does not endorse, this site. {SITE.name} is an
          independent, free educational project. All practice content is
          original and not derived from College Board materials.
        </p>
      </div>
    </footer>
  );
}
