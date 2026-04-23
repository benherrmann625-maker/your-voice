export default function NotFound() {
  return (
    <main className="empty-state" style={{ minHeight: "100vh" }}>
      <p className="eyebrow">Your Voice</p>
      <h2>Diese Seite gibt es nicht.</h2>
      <p>Bitte gehe zur Startseite zurueck und starte von dort neu.</p>
      <a className="ghost-button" href="/">
        Zur Startseite
      </a>
    </main>
  );
}
