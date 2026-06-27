import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";

/**
 * Custom 404 page. Wrapped with the marketing shell so visitors who land
 * on a bad URL still see the header, footer, and required disclaimer.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-prose-narrow text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            404
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Page not found
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            We couldn't find what you were looking for. The link might be
            outdated, or the page may have moved.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/">Go home</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/calc-ab">Browse AP Calc AB</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
