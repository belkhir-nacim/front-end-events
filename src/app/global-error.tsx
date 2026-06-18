"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100dvh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#edf0ee",
          color: "#14211d",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p
            style={{
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontSize: "0.7rem",
              color: "#5c6c66",
            }}
          >
            Something broke
          </p>
          <h1 style={{ fontSize: "1.6rem", margin: "0.75rem 0 1.25rem" }}>
            The skies are unclear right now.
          </h1>
          <button
            onClick={() => reset()}
            style={{
              border: "none",
              borderRadius: "9999px",
              background: "#0e6b63",
              color: "white",
              padding: "0.6rem 1.4rem",
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
