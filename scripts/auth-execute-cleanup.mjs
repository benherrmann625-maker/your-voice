import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const args = new Set(process.argv.slice(2));

if (!args.has("--execute")) {
  console.error("Dry-Run only. Fuer die Ausfuehrung bitte --execute uebergeben.");
  process.exit(1);
}

if (process.env.LEGACY_AUTH_FORCE !== "1") {
  console.error("LEGACY_AUTH_FORCE=1 fehlt. Cleanup wird aus Sicherheitsgruenden abgebrochen.");
  process.exit(1);
}

execFileSync(process.execPath, [path.join(root, "scripts", "auth-backup.mjs")], { stdio: "inherit" });

const archiveDir = path.join(root, "docs", "auth", "archived-legacy");
fs.mkdirSync(archiveDir, { recursive: true });

const standaloneLegacyFiles = ["supabase-schema.sql"];
for (const file of standaloneLegacyFiles) {
  const source = path.join(root, file);
  if (!fs.existsSync(source)) continue;
  fs.renameSync(source, path.join(archiveDir, path.basename(file)));
}

const manualCleanup = [
  "app.js",
  "public/app.js",
  "index.html",
  "app/layout.tsx",
  "README.md",
];

fs.writeFileSync(
  path.join(archiveDir, "MANUAL_CLEANUP_REQUIRED.txt"),
  `${manualCleanup.join("\n")}\n`,
);

console.log("Cleanup-Execute abgeschlossen. Beachte MANUAL_CLEANUP_REQUIRED.txt fuer eingebettete Legacy-Auth.");
