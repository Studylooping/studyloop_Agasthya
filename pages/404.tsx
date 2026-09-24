export default function Custom404() {
  return (
    <main
      style={{
        alignItems: "center",
        background: "#fcfcfd",
        color: "#1b1f2a",
        display: "flex",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        justifyContent: "center",
        margin: 0,
        minHeight: "100vh",
        padding: 24,
        textAlign: "center",
      }}
    >
      <section style={{ maxWidth: 560 }}>
        <p style={{ color: "#5f6878", margin: 0 }}>404</p>
        <h1 style={{ fontSize: 28, margin: "8px 0 0" }}>
          We could not find that StudyLoop page
        </h1>
        <p style={{ color: "#5f6878", lineHeight: 1.6 }}>
          The link may be old, or the content may not be live yet.
        </p>
        <a
          href="/"
          style={{
            background: "#4b3fd8",
            borderRadius: 8,
            color: "#ffffff",
            display: "inline-flex",
            fontWeight: 600,
            marginTop: 16,
            padding: "10px 16px",
            textDecoration: "none",
          }}
        >
          Go home
        </a>
      </section>
    </main>
  );
}
