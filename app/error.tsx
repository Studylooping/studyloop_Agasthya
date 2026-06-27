"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary.
 *
 * If any page or component throws at runtime, Next.js renders this instead of
 * crashing the whole app to a white screen. The rest of the site (header,
 * other routes) keeps working, and the student gets a recover button.
 *
 * This is the single biggest "reduce crash impact" win: one bad item or one
 * bad component can no longer take down the page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log so it shows in the browser console / Vercel logs.
    // When Sentry is added (Phase 0c), report here too.
    console.error("Route error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        Something went wrong
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        This page hit an unexpected error
      </h1>
      <p className="mt-4 max-w-prose-narrow text-muted-foreground">
        It&apos;s not your fault. Your progress is saved in your browser. Try
        again, or head back to the home page — the rest of the site is fine.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <a href="/">Go home</a>
        </Button>
      </div>
    </div>
  );
}
