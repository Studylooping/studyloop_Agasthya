/**
 * FocusShell — the distraction-free layout for practice sessions.
 *
 * Deliberately minimal: NO site header, NO footer, NO navigation. Just a
 * calm, solid background and the session itself. The goal (per the founder's
 * direction) is that a student testing themselves has nothing pulling their
 * attention away from the question in front of them.
 *
 * The theme provider, fonts, and skip-link come from the root layout
 * (app/layout.tsx), so dark mode and accessibility still work here.
 */
export default function FocusLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-background">
      <main id="main-content">{children}</main>
    </div>
  );
}
