# Your Voice Organizer

Release-orientierte local-first Voice-Organizer-App auf Basis des Research-PDFs.

## Enthalten

- PWA für Web und mobile Browser
- Voice Capture über Web Speech API, wenn der Browser es unterstützt
- Texteingabe als vollständiger Fallback
- Premium Branding als `Your Voice`
- Ruhiger Home Screen mit Voice Input, kurzer Bestätigungsvorschau und letzten Einträgen
- Tipps und Einstellungen als eigene, einklappbare Bereiche
- Intelligente Inbox mit automatisch gruppierten, einklappbaren Bereichen
- Bereinigte Sidebar ohne doppelte Agenda
- Erweiterte Inbox-Kategorien für Schule, Einkauf, Essen, Finanzen, Gesundheit, Familie, Reisen, Projekte und mehr
- Zusätzliches Kasten-System für Arbeit, Zuhause, Sport und Dokumente
- Agenda-Farben folgen dem Kasten des Eintrags, z. B. Schule in Rot
- Kompaktere Agenda mit Kennzahlen, Monats-, Wochen- und Tagesansicht
- Agenda-Kalender ist zentriert und zeigt auch undatierte neue Kästen als heute empfohlen
- Klickbare Kalendertage mit Tagesdetails und Markierungen für vorhandene Einträge
- Modernes Logo aus Mikrofon, Voice-Bogen und Checkmark
- Erweiterte Settings für Konto, Sync, Backup, Farbschema, Layout, Voice, Benachrichtigungen und Datenschutz
- Settings sind wirksam: Theme, Farbschema, Schriftgröße, kompaktes Layout, Sprache, Mikrofonqualität, Auto-Erkennung, Erinnerungen, Fokusmodus und Backup ändern die App direkt
- Supabase Cloud-Sync mit E-Mail+Passwort, optionalem Magic Link, Passwort-Reset, Session-Erkennung, Upsert-Synchronisierung und lokalem Offline-Fallback
- Release-Härtung mit Dark-Mode/Farbschema-Tokens, anpinnbarer Inbox, manueller Reihenfolge und kompakten eingeklappten Bereichen
- Drag & Drop für Inbox-Bereiche und Einträge; geöffnete Listen bleiben beim Sortieren offen
- Vorgegebene Inbox-Bereiche können entfernt werden, eigene Bereiche bleiben direkt in der Inbox erstellbar
- Eigene Inbox-Bereiche erzeugen automatisch Zuordnungsmuster, z. B. Fitness für Training, Gym und Joggen
- Dezente Inbox-Archivbuttons für `Erledigt` und `Gelöscht`; aktive Views bleiben frei von erledigten oder gelöschten Einträgen
- Agenda mit reduzierter Termin-Erstellung und frei formulierbarer Wiederholung wie `alle 3 Tage` oder `jeden Montag`
- Suche mit sichtbarem Filter-Button, Datum, Inbox-Bereich und Wichtigkeit
- Single-Source-Datenlogik: Inbox, Agenda, Suche und letzte Einträge nutzen dieselbe aktive Datenquelle
- Kanonische Item-Felder für Transkript, Kurznotiz, Item-Typ, Kategorien, Konfidenz, Zeitkonfidenz und Lifecycle-Status
- Verbesserter de-DE-Zeitparser für `in drei Tagen`, `nächste Woche Freitag`, `alle drei Tage` und weitere Wiederholungen
- Confidence-Hinweise in der Review-Vorschau statt technischer Regel-Labels
- Stärker integriertes Farbsystem für Karten, Kategorien, Markierungen und aktive Zustände
- Kontaktbereich in den Einstellungen mit vorbereitetem Formular

## Supabase Setup

1. Neues Supabase-Projekt erstellen.
2. In Supabase den SQL Editor öffnen.
3. Den Inhalt von `supabase-schema.sql` ausführen.
4. Lokal kannst du in der App unter `Einstellungen -> Sync` die Project URL und den Anon Key eintragen.
5. `Cloud verbinden` klicken.
6. Unter `Login` E-Mail und Passwort eintragen.
7. `Registrieren` oder `Einloggen` klicken.
8. Optional: `Magic Link` oder `Passwort zurücksetzen` verwenden.
9. Nach Login `Sync zwischen Geräten` aktivieren oder `Jetzt synchronisieren` klicken.

Für Magic Link, Registrierung und Passwort-Reset muss die in der App angezeigte Redirect URL in Supabase erlaubt sein. Für produktive E-Mail-Zustellung sollte Custom SMTP eingerichtet werden.
- Reduzierte Farbwelt mit Hauptfarbe, neutralen Flächen und dezentem Akzent
- Deutscher Regelparser für Kategorie, Datum, Uhrzeit, Ort, Personen, Einkaufslisten, Essen, Schule, Finanzen und Erinnerungsabstand
- Vereinfachter Review: Bestätigen oder Bearbeiten, Details erst auf Klick
- Intelligentere Darstellung von Einträgen, z. B. Einkaufslisten als einzelne Punkte
- Schlichterer Capture-Bereich mit dezenter Mikrofon-Animation
- Dark Mode, Floating Voice Button und Success Toast
- Lokale Speicherung per `localStorage`
- Inbox, Today, Suche und Privacy/Export-Bereich
- Manifest und Service Worker für installierbare Offline-Nutzung

## GitHub + Vercel Deployment

Das Projekt ist als minimales Next.js-Projekt vorbereitet. Die bestehende Your-Voice-App bleibt als stabile Vanilla-Runtime erhalten und wird von Next.js ausgeliefert.

### Lokal starten

Falls Node/npm installiert ist:

```bash
npm install
npm run dev
```

Dann öffnen:

```text
http://localhost:3000
```

### Auf GitHub hochladen

```bash
git init
git add .
git commit -m "Prepare Your Voice for Next.js and Vercel"
git branch -M main
git remote add origin https://github.com/DEIN-NAME/your-voice.git
git push -u origin main
```

### Auf Vercel deployen

1. In Vercel **Add New Project** wählen.
2. Das GitHub-Repository `your-voice` importieren.
3. Framework Preset: **Next.js**.
4. Unter **Environment Variables** diese Werte aus `.env.example` anlegen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Build Command: `npm run build`.
6. Output Directory leer lassen.
7. Deploy klicken.

In Production zieht die App Supabase automatisch aus den `NEXT_PUBLIC_...` Variablen. Die Felder in den Einstellungen werden dann nicht mehr manuell benoetigt.

### Supabase Redirects fuer Production

In Supabase unter **Authentication -> URL Configuration** sollten mindestens diese Redirects erlaubt sein:

- `https://deine-domain.vercel.app`
- spaeter optional deine eigene Domain, z. B. `https://app.deinedomain.de`

Wenn du Preview Deployments fuer Login verwenden willst, musst du auch die jeweilige Vercel-Preview-Domain erlauben.

Bei jedem Build werden `app.js`, `styles.css`, `icon.svg`, `manifest.webmanifest` und `sw.js` automatisch nach `public/` synchronisiert.

## Legacy-Start ohne Next.js

```bash
python3 -m http.server 5173
```

Dann öffnen:

```text
http://localhost:5173
```

## Release Checks

```bash
node --check app.js
node scripts/verify-release.mjs
```

Die manuelle Release-Matrix steht in `release-readiness.md`. Das NLU-Goldset für die wichtigsten de-DE-Beispiele steht in `qa-nlu-goldset.json`.

## Nächste Produktionsschritte

- `localStorage` durch SQLite/IndexedDB Repository ersetzen
- STT-Abstraktion für native iOS/Android und Cloud Provider ergänzen
- Sync-Outbox und Backend API einführen
- Parser-Regeln gegen `qa-nlu-goldset.json` automatisiert messen
- Kalender-, Reminder- und Maps-Integrationen anbinden
- Expo/React Native Shell oder Capacitor-Wrapper für Stores evaluieren
