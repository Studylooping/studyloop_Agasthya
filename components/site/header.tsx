import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { LocalProfileMenu } from "@/components/site/local-profile-menu";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/ethics", label: "Ethics" },
  { href: "/changelog", label: "Changelog" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container flex h-14 max-w-content items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
          aria-label={`${SITE.name} — home`}
        >
          <LoopMark className="h-6 w-6 text-primary" />
          <span className="text-base">{SITE.name}</span>
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-6 text-sm text-muted-foreground">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden sm:inline-flex"
          >
            <Link href="/review">
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
              Review
            </Link>
          </Button>
          <LocalProfileMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/**
 * Inline SVG loop glyph for the wordmark. Inherits currentColor so it
 * picks up `text-primary` from the parent.
 */
function LoopMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12a7 7 0 0 1 14 0 7 7 0 0 1-11.5 5.4" />
      <path d="M7.5 17.4 5 19.5l-.5-3" />
    </svg>
  );
}
