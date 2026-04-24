import type { CSSProperties } from "react";
import Link from "next/link";
import { auth0 } from "../../lib/auth0";

export default async function AuthLandingPage() {
  const session = await auth0.getSession();
  const user = session?.user;

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "48px 24px 80px" }}>
      <p style={{ textTransform: "uppercase", letterSpacing: 1.2, fontSize: 12, opacity: 0.6 }}>Authentifizierung</p>
      <h1 style={{ marginTop: 8 }}>Neue Login-Schicht für Your Voice</h1>
      <p style={{ maxWidth: 680, lineHeight: 1.6, opacity: 0.82 }}>
        Diese Seite ist die produktionsnahe Referenz für die neue Managed-Variante mit Auth0, serverseitigen
        Sessions und gehostetem Login. Die bestehende Legacy-Supabase-Auth bleibt bis zum dokumentierten Cutover
        noch unangetastet im Frontend, damit wir sicher migrieren können.
      </p>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", marginTop: 28 }}>
        <section style={cardStyle}>
          <h2 style={headingStyle}>Status</h2>
          <p style={bodyStyle}>{user ? `Eingeloggt als ${user.email ?? user.name ?? user.sub}` : "Noch keine aktive Auth0-Session."}</p>
          <div style={buttonRowStyle}>
            <a href="/auth/login" style={primaryButtonStyle}>Login</a>
            <a href="/auth/login?screen_hint=signup" style={secondaryButtonStyle}>Registrieren</a>
            <a href="/auth/logout" style={secondaryButtonStyle}>Logout</a>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={headingStyle}>Passwordless & Social</h2>
          <p style={bodyStyle}>
            Magic Links, Passkeys, MFA und Social Login werden in Auth0 über Universal Login, Passwordless
            Connections und Guardian/WebAuthn aktiviert.
          </p>
          <div style={buttonRowStyle}>
            <a href="/auth/login?connection=email" style={secondaryButtonStyle}>Magic Link</a>
            <a href="/auth/login?connection=google-oauth2" style={secondaryButtonStyle}>Google</a>
            <Link href="/protected" style={secondaryButtonStyle}>Geschützte Route</Link>
          </div>
        </section>
      </div>

      <section style={{ ...cardStyle, marginTop: 16 }}>
        <h2 style={headingStyle}>Session und CSRF prüfen</h2>
        <p style={bodyStyle}>
          Für Browser-Clients ist hier bewusst das serverseitige Session-Modell gesetzt. Cookie-Flags, Session-Rotation
          und CSRF-Schutz werden im BFF-Layer dokumentiert und mit Beispielrouten abgesichert.
        </p>
        <ul style={{ margin: "16px 0 0 18px", lineHeight: 1.7 }}>
          <li>
            <Link href="/api/auth/session">`/api/auth/session`</Link> liefert die aktuelle Session für geschützte UI.
          </li>
          <li>
            <Link href="/api/auth/csrf">`/api/auth/csrf`</Link> stellt ein Double-Submit-Token für zustandsändernde BFF-Requests aus.
          </li>
          <li>
            <Link href="/protected">`/protected`</Link> zeigt serverseitig geschützte Ausgabe.
          </li>
        </ul>
      </section>
    </main>
  );
}

const cardStyle: CSSProperties = {
  border: "1px solid rgba(148, 163, 184, 0.24)",
  borderRadius: 16,
  padding: 20,
  background: "rgba(15, 23, 42, 0.02)",
};

const headingStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
};

const bodyStyle: CSSProperties = {
  marginTop: 10,
  marginBottom: 0,
  lineHeight: 1.6,
  opacity: 0.78,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
};

const primaryButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "0 16px",
  borderRadius: 999,
  textDecoration: "none",
  background: "#111827",
  color: "white",
};

const secondaryButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: "transparent",
  color: "#111827",
  border: "1px solid rgba(17, 24, 39, 0.14)",
};
