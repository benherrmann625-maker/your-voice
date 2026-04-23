"use client";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <html lang="de">
      <body>
        <main className="empty-state" style={{ minHeight: "100vh" }}>
          <p className="eyebrow">Your Voice</p>
          <h2>Etwas ist schiefgelaufen.</h2>
          <p>{error.message || "Die App konnte nicht korrekt geladen werden."}</p>
          <button className="ghost-button" type="button" onClick={() => reset()}>
            Erneut versuchen
          </button>
        </main>
      </body>
    </html>
  );
}
