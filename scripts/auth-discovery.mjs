import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(root, "docs", "auth");
fs.mkdirSync(outputDir, { recursive: true });

const legacyFileRules = [
  { file: "app.js", reason: "enthaelt Legacy-Supabase-Login, Passwort-Reset, Magic Link und Sync-Aufrufe" },
  { file: "public/app.js", reason: "ausgerollte Legacy-Kopie von app.js mit denselben Supabase-Artefakten" },
  { file: "index.html", reason: "enthaelt Login-, Sync- und Supabase-Eingabefelder im Settings-Bereich" },
  { file: "app/layout.tsx", reason: "injiziert NEXT_PUBLIC_SUPABASE_* in die Runtime und laedt supabase-js von CDN" },
  { file: "supabase-schema.sql", reason: "Legacy-Sync-Tabelle public.voice_items mit auth.users-Referenz" },
  { file: "README.md", reason: "beschreibt den aktuellen Supabase-Login- und Sync-Weg" },
];

const dbArtifacts = [
  {
    name: "public.voice_items",
    type: "table",
    source: "supabase-schema.sql",
    action: "migrieren oder nach erfolgreichem Cutover entfernen",
  },
  {
    name: "auth.users",
    type: "managed-auth table",
    source: "Supabase Auth",
    action: "exportieren fuer Lazy Migration, nicht direkt loeschen",
  },
  {
    name: "auth.identities",
    type: "managed-auth table",
    source: "Supabase Auth",
    action: "exportieren fuer Social/OAuth-Zuordnungen",
  },
  {
    name: "RLS policies auf public.voice_items",
    type: "policy",
    source: "supabase-schema.sql",
    action: "nach Cutover pruefen und dann entfernen",
  },
];

const envRefs = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PROJECT_REF",
];

const report = {
  generatedAt: new Date().toISOString(),
  root,
  legacyFiles: legacyFileRules.map((rule) => ({
    ...rule,
    exists: fs.existsSync(path.join(root, rule.file)),
  })),
  dbArtifacts,
  envRefs,
  risks: [
    "Legacy-Auth ist direkt in app.js und public/app.js eingebettet und kann nicht blind per Dateiloeschung entfernt werden.",
    "Supabase-Sessions und Refresh Tokens muessen beim Cutover explizit widerrufen werden.",
    "OAuth-/Magic-Link-Routen brauchen neue Callback-/Logout-URLs und Tenant-Einstellungen.",
    "Bestehende Nutzer muessen fuer MFA-Re-Enrollment und gegebenenfalls Passwort-Reset sauber gefuehrt werden.",
  ],
};

const outputPath = path.join(outputDir, "discovery-report.json");
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Discovery-Report geschrieben: ${outputPath}`);
