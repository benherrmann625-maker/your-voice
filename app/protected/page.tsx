import { redirect } from "next/navigation";
import { auth0, authEnabled } from "../../lib/auth0";

export default async function ProtectedPage() {
  if (!authEnabled || !auth0) {
    return (
      <main style={{ maxWidth: 880, margin: "0 auto", padding: "48px 24px 80px" }}>
        <p style={{ textTransform: "uppercase", letterSpacing: 1.2, fontSize: 12, opacity: 0.6 }}>Protected</p>
        <h1>Auth ist nicht aktiv</h1>
        <p style={{ lineHeight: 1.7, opacity: 0.8 }}>
          Diese Beispielroute wird erst nutzbar, wenn Auth0 in Vercel vollständig konfiguriert ist.
        </p>
      </main>
    );
  }

  const session = await auth0.getSession();

  if (!session?.user) {
    redirect("/auth/login?returnTo=/protected");
  }

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "48px 24px 80px" }}>
      <p style={{ textTransform: "uppercase", letterSpacing: 1.2, fontSize: 12, opacity: 0.6 }}>Protected</p>
      <h1>Geschützte Route</h1>
      <p style={{ lineHeight: 1.7, opacity: 0.8 }}>
        Diese Seite liest die Session serverseitig aus und zeigt, wie Your Voice geschützte Funktionen über das
        BFF-/Session-Modell absichern kann.
      </p>
      <pre
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 16,
          overflowX: "auto",
          background: "#0f172a",
          color: "#e2e8f0",
        }}
      >
        {JSON.stringify(
          {
            sub: session.user.sub,
            email: session.user.email,
            name: session.user.name,
            updatedAt: new Date().toISOString(),
          },
          null,
          2,
        )}
      </pre>
    </main>
  );
}
