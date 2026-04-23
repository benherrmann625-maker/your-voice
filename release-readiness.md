# Your Voice Release Readiness

Dieses Dokument ist das kompakte Release-Gate für die aktuelle Your Voice App. Ziel ist nicht weiterer Feature-Ausbau, sondern ein stabiler Release Candidate.

## P0 Gates

### Login und Sync

- E-Mail und Passwort validieren vor jedem Login- oder Registrierungsversuch.
- Registrierung zeigt eindeutig, ob eine aktive Session besteht oder eine E-Mail-Bestätigung nötig ist.
- Passwort-Reset ist aus der App erreichbar.
- Magic Link bleibt Sekundärpfad.
- Redirect URL ist in der App kopierbar und muss in Supabase erlaubt sein.
- Session bleibt nach Neustart erhalten, sobald Supabase eine Session liefert.
- Sync darf nur aktiv werden, wenn ein echter Cloud-User vorhanden ist.

### Theme und Kontrast

- Light und Dark Mode müssen mit allen Farbschemata lesbar bleiben.
- Tokens statt fixer Einzelfarben verwenden.
- Inputs, Placeholder, Buttons, Tags, Cards, Sidebar, Kalender und Accordions müssen in allen Modi sichtbar bleiben.
- Dark Mode nutzt eigene Akzentwerte pro Farbschema.

### NLU und DateTime

- `Persönlich` und `Notizen` sind Fallbacks, keine Primär-Defaults.
- Multi-Tagging bleibt aktiv.
- Uhrzeiten wie `12:30 Uhr`, `12 30 Uhr`, `16 Uhr`, `8 Uhr` und `16h` müssen erkannt werden.
- Erkannte Zeiten erscheinen in der Review und in Eintrags-Metadaten.

## P1 Gates

- Inbox-Bereiche sind standardmäßig geschlossen.
- Einträge lassen sich anpinnen.
- Einträge lassen sich mit Hoch/Runter manuell sortieren.
- Sortierung wird in `localStorage` und im Sync-Payload gespeichert.
- Tipps, letzte Einträge und größere Details bleiben störungsarm eingeklappt.
- Suche zeigt Ergebnisse erst nach Eingabe.

## Manual QA Matrix

Prüfe jede Kombination:

- Theme: `light`, `dark`
- Farbschema: `Indigo`, `Graphit`, `Ocean`, `Warm`, `Rose`, `Forest`, `Kontrast`
- Schriftgröße: `Klein`, `Normal`, `Groß`
- Layout: normal, kompakt

Screens:

- Notiz erstellen
- Inbox
- Agenda
- Suche
- Tipps
- Einstellungen

## Release Smoke Commands

```bash
node --check app.js
node scripts/verify-release.mjs
```

