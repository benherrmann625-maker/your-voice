import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.resolve(process.env.AUTH_BACKUP_DIR || path.join(root, "backups"), timestamp);
const codeBackupDir = path.join(backupRoot, "code");

fs.mkdirSync(codeBackupDir, { recursive: true });

const filesToCopy = [
  "app.js",
  "public/app.js",
  "index.html",
  "app/layout.tsx",
  "supabase-schema.sql",
  "README.md",
  ".env.example",
];

for (const relativeFile of filesToCopy) {
  const source = path.join(root, relativeFile);
  if (!fs.existsSync(source)) continue;
  const destination = path.join(codeBackupDir, relativeFile);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

const notes = {
  generatedAt: new Date().toISOString(),
  backupRoot,
  copiedFiles: filesToCopy,
  manualDatabaseBackup: process.env.SUPABASE_DB_URL
    ? `pg_dump "${process.env.SUPABASE_DB_URL}" --schema=auth --schema=public --file=${path.join(backupRoot, "supabase.sql")}`
    : "SUPABASE_DB_URL nicht gesetzt. Bitte Datenbank-Export separat anlegen.",
  authExportChecklist: [
    "Supabase auth.users exportieren",
    "Supabase auth.identities exportieren",
    "voice_items exportieren",
    "aktive Sessions / Refresh Tokens dokumentieren",
  ],
};

fs.writeFileSync(path.join(backupRoot, "backup-notes.json"), `${JSON.stringify(notes, null, 2)}\n`);
console.log(`Backup vorbereitet unter ${backupRoot}`);
