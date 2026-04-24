import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = {
  generatedAt: new Date().toISOString(),
  supabase: {
    note: "Supabase-Sessions muessen tenant-seitig widerrufen werden. Plane einen forced re-login zum Cutover.",
    steps: [
      "Auth0 live schalten und Login-UI umstellen",
      "SUPABASE_SERVICE_ROLE_KEY nutzen, um Refresh-Token-/Session-Revocation ueber Admin-API oder Policy-Cutover anzustossen",
      "Legacy NEXT_PUBLIC_SUPABASE_* Variablen danach entfernen",
    ],
  },
  selfHosted: {
    sql: [
      "update app_users set session_version = session_version + 1, refresh_token_version = refresh_token_version + 1;",
      "delete from user_sessions;",
      "update refresh_tokens set revoked_at = coalesce(revoked_at, now()) where revoked_at is null;",
    ],
  },
};

const target = path.join(root, "docs", "auth", "session-invalidation.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Session-Invalidierungsplan geschrieben: ${target}`);
