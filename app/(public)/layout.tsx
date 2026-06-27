import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";

/**
 * MarketingShell — wraps every public marketing page with the sticky header
 * and the legally-required footer (College Board disclaimer + ethics links).
 *
 * Per DESIGN_SPEC.md §4.1.
 */
export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
