# Your Voice Organizer

Ruhige, local-first Voice-Organizer-App mit klarer Inbox, Agenda, Suche und reduzierter Capture-Oberfläche.

## Aktueller Stand

- lokale Speicherung über IndexedDB mit Fallback auf Browser-Speicher
- deutscher Regelparser für Aufgaben, Termine, Erinnerungen und Wiederholungen
- kompakte Inbox mit Drag & Drop, `Erledigt` und `Gelöscht`
- reduzierte Agenda mit manueller Termin-Erstellung und `.ics`-Export
- Suche mit Filtern für Datum, Bereich und Wichtigkeit
- Reminder, Snooze und Schnellbearbeitung direkt an Einträgen
- schlichte, bewusst reduzierte Oberfläche ohne Install-Prompts, Gast-Hinweise oder Fokus-Overlay

## Auth-Referenzen im Repository

Zusätzlich zur aktuellen local-first App liegen zwei vollständige Auth-Referenzen im Repository:

- **Managed:** Auth0 + Next.js App Router mit serverseitigen Sessions unter `/app/auth`, `/app/protected`, `/app/api/auth/*`, `/lib/auth0.ts` und `/middleware.ts`
- **Self-hosted:** Node/Express + Passport.js + Postgres Session Store unter `/server/self-hosted`

Dry-Run, Backup, Migration und Cleanup sind dokumentiert in:

- [docs/auth/README.md](/Users/benten09/Documents/Codex/2026-04-21-ich-werde-dir-gleich-eine-gesamte-2/docs/auth/README.md)
- [docs/auth/MIGRATION_PLAN.md](/Users/benten09/Documents/Codex/2026-04-21-ich-werde-dir-gleich-eine-gesamte-2/docs/auth/MIGRATION_PLAN.md)

Wichtige Skripte:

```bash
npm run auth:discovery
npm run auth:dry-run
npm run auth:backup
npm run auth:execute-cleanup -- --execute
npm run auth:invalidate
```

## Lokal starten

Falls Node/npm installiert ist:

```bash
npm install
npm run dev
```

Dann öffnen:

```text
http://localhost:3000
```

## Legacy-Start ohne Next.js

```bash
python3 -m http.server 5173
```

Dann öffnen:

```text
http://localhost:5173
```

## GitHub + Vercel Deployment

Das Projekt ist als minimales Next.js-Projekt vorbereitet. Die bestehende Your-Voice-App wird weiter als stabile Vanilla-Runtime ausgeliefert.

### Auf GitHub hochladen

```bash
git init
git add .
git commit -m "Update Your Voice"
git branch -M main
git remote add origin https://github.com/DEIN-NAME/your-voice.git
git push -u origin main
```

### Auf Vercel deployen

1. In Vercel **Add New Project** wählen.
2. Das GitHub-Repository `your-voice` importieren.
3. Framework Preset: **Next.js**.
4. Für die App selbst sind aktuell keine Pflicht-Variablen nötig.
5. Build Command: `npm run build`.
6. Output Directory leer lassen.
7. Deploy klicken.

Wenn du später die neue Auth-Architektur aktivieren willst, kommen die benötigten Variablen aus [.env.example](/Users/benten09/Documents/Codex/2026-04-21-ich-werde-dir-gleich-eine-gesamte-2/.env.example).

Bei jedem Build werden `app.js`, `styles.css`, `icon.svg`, `manifest.webmanifest` und `sw.js` nach `public/` synchronisiert.

## Release Checks

```bash
node --check app.js
node scripts/verify-release.mjs
```

Die manuelle Release-Matrix steht in `release-readiness.md`. Das NLU-Goldset für die wichtigsten de-DE-Beispiele steht in `qa-nlu-goldset.json`.
