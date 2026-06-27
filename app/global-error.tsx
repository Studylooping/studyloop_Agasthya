"use client";

/**
 * Global error boundary — the last line of defense.
 *
 * Catches errors that happen in the root layout itself (where the normal
 * error.tsx can't help). Because it replaces the root layout, it must render
 * its own <html> and <body>. Kept dependency-free and inline-styled so it
 * works even if the stylesheet or a component failed to load.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // eslint-disable-next-line no-console
  console.error("Global error boundary caught:", error);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "1rem",
          margin: 0,
          background: "#fcfcfd",
          color: "#1b1f2a",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            StudyLoop hit a problem
          </h1>
          <p style={{ marginTop: "0.5rem", color: "#6b7280" }}>
            The app encountered an unexpected error. Please reload the page.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: "1.5rem",
              padding: "0.6rem 1.25rem",
              borderRadius: "0.5rem",
              background: "#4338ca",
              color: "white",
              border: "none",
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
