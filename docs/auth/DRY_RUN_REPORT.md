# Dry-Run Cleanup Report

Erzeugt am: 2026-04-24T20:22:15.211Z

## Alte Auth-/Sync-Dateien

- `app.js` — enthaelt Legacy-Supabase-Login, Passwort-Reset, Magic Link und Sync-Aufrufe
- `public/app.js` — ausgerollte Legacy-Kopie von app.js mit denselben Supabase-Artefakten
- `index.html` — enthaelt Login-, Sync- und Supabase-Eingabefelder im Settings-Bereich
- `app/layout.tsx` — injiziert NEXT_PUBLIC_SUPABASE_* in die Runtime und laedt supabase-js von CDN
- `supabase-schema.sql` — Legacy-Sync-Tabelle public.voice_items mit auth.users-Referenz
- `README.md` — beschreibt den aktuellen Supabase-Login- und Sync-Weg

## DB-Artefakte

- `public.voice_items` (table) aus `supabase-schema.sql` → migrieren oder nach erfolgreichem Cutover entfernen
- `auth.users` (managed-auth table) aus `Supabase Auth` → exportieren fuer Lazy Migration, nicht direkt loeschen
- `auth.identities` (managed-auth table) aus `Supabase Auth` → exportieren fuer Social/OAuth-Zuordnungen
- `RLS policies auf public.voice_items` (policy) aus `supabase-schema.sql` → nach Cutover pruefen und dann entfernen

## Geplante Loeschungen / Ersetzungen

- Legacy-Supabase-Auth in `app.js`, `public/app.js`, `index.html` und `app/layout.tsx` nach erfolgreichem Cutover ausbauen.
- `supabase-schema.sql` nach exportiertem Backup und abgeschlossener Datenmigration archivieren.
- Supabase-spezifische Umgebungsvariablen nach Cutover aus CI/CD und Vercel entfernen.
- Alte Sessions und Refresh Tokens invalidieren, bevor neuer Auth-Stack scharf geschaltet wird.

## Risiken

- Legacy-Auth ist direkt in app.js und public/app.js eingebettet und kann nicht blind per Dateiloeschung entfernt werden.
- Supabase-Sessions und Refresh Tokens muessen beim Cutover explizit widerrufen werden.
- OAuth-/Magic-Link-Routen brauchen neue Callback-/Logout-URLs und Tenant-Einstellungen.
- Bestehende Nutzer muessen fuer MFA-Re-Enrollment und gegebenenfalls Passwort-Reset sauber gefuehrt werden.

## Reihenfolge

1. Discovery bestaetigen.
2. Code- und Datenbank-Backup erstellen.
3. Neue Auth-Schicht ausrollen.
4. Test-User migrieren und Sessions widerrufen.
5. Nutzerkommunikation fuer Re-Login / Passwort-Reset / MFA-Re-Enrollment vorbereiten.
6. Execute-Cleanup nur nach erfolgreichem Cutover.
