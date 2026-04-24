import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const docsDir = path.join(root, "docs", "auth");
fs.mkdirSync(docsDir, { recursive: true });

execFileSync(process.execPath, [path.join(root, "scripts", "auth-discovery.mjs")], { stdio: "inherit" });
const discovery = JSON.parse(fs.readFileSync(path.join(docsDir, "discovery-report.json"), "utf8"));

const markdown = `# Dry-Run Cleanup Report

Erzeugt am: ${new Date().toISOString()}

## Alte Auth-/Sync-Dateien

${discovery.legacyFiles
  .map((entry) => `- \`${entry.file}\` — ${entry.reason}${entry.exists ? "" : " (im aktuellen Checkout nicht gefunden)"}`)
  .join("\n")}

## DB-Artefakte

${discovery.dbArtifacts
  .map((entry) => `- \`${entry.name}\` (${entry.type}) aus \`${entry.source}\` → ${entry.action}`)
  .join("\n")}

## Geplante Loeschungen / Ersetzungen

- Legacy-Supabase-Auth in \`app.js\`, \`public/app.js\`, \`index.html\` und \`app/layout.tsx\` nach erfolgreichem Cutover ausbauen.
- \`supabase-schema.sql\` nach exportiertem Backup und abgeschlossener Datenmigration archivieren.
- Supabase-spezifische Umgebungsvariablen nach Cutover aus CI/CD und Vercel entfernen.
- Alte Sessions und Refresh Tokens invalidieren, bevor neuer Auth-Stack scharf geschaltet wird.

## Risiken

${discovery.risks.map((risk) => `- ${risk}`).join("\n")}

## Reihenfolge

1. Discovery bestaetigen.
2. Code- und Datenbank-Backup erstellen.
3. Neue Auth-Schicht ausrollen.
4. Test-User migrieren und Sessions widerrufen.
5. Nutzerkommunikation fuer Re-Login / Passwort-Reset / MFA-Re-Enrollment vorbereiten.
6. Execute-Cleanup nur nach erfolgreichem Cutover.
`;

const outputPath = path.join(docsDir, "DRY_RUN_REPORT.md");
fs.writeFileSync(outputPath, markdown);
console.log(`Dry-Run-Report geschrieben: ${outputPath}`);
