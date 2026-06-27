import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";

/**
 * LearnShell - wraps course, item, and review pages.
 *
 * A future progress dashboard can grow this into a fuller learning layout
 * with a unit tree.
 */
export default function LearnLayout({
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
