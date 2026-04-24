import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const requiredFiles = [
  "lib/auth0.ts",
  "lib/csrf.ts",
  "middleware.ts",
  "app/auth/page.tsx",
  "app/protected/page.tsx",
  "app/api/auth/session/route.ts",
  "app/api/auth/csrf/route.ts",
  "docs/auth/README.md",
  "docs/auth/MIGRATION_PLAN.md",
  "scripts/auth-discovery.mjs",
  "scripts/auth-backup.mjs",
  "scripts/auth-dry-run-cleanup.mjs",
  "scripts/auth-execute-cleanup.mjs",
  "scripts/auth-invalidate-sessions.mjs",
  "server/self-hosted/src/routes/auth.js",
  "server/self-hosted/sql/001_auth_schema.sql",
];

test("wichtige Auth-Dateien existieren", () => {
  for (const relativePath of requiredFiles) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), true, `${relativePath} fehlt`);
  }
});
