# Your Voice Mobile mit Capacitor

Your Voice bleibt im Kern dieselbe App, bekommt auf iOS und Android aber eine native Hülle. Genau dort kann der Kalender-Flow jetzt direkt in den Standardkalender des Geräts schreiben.

## Warum dieser Weg

- Die Web-App kann nicht zuverlässig in jeden nativen Gerätekalender schreiben.
- Capacitor ist laut offizieller Doku genau dafür gedacht, bestehende Web-Apps in eine native Laufzeit zu heben: [Capacitor Docs](https://capacitorjs.com/docs)
- Für den Kalenderzugriff nutzt dieses Repo `@ebarooni/capacitor-calendar`, das `getDefaultCalendar()` und `createEvent()` auf iOS und Android bereitstellt: [Plugin-Doku](https://ebarooni.github.io/capacitor-calendar/)

## Installieren

```bash
npm install
npm run mobile:sync
```

Falls die Plattform-Projekte noch nicht existieren:

```bash
npx cap add ios
npx cap add android
npm run mobile:sync
```

## Öffnen in Xcode / Android Studio

```bash
npm run mobile:ios
npm run mobile:android
```

## Was der Mobile-Build macht

- `scripts/build-mobile-shell.mjs` erzeugt aus `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `icon.svg` und `sw.js` den Ordner `mobile-shell/`
- `capacitor.config.ts` zeigt Capacitor auf genau diesen Ordner
- Die App nutzt auf mobilen Geräten den nativen Kalender-Plugin-Weg
- Im Browser bleibt Your Voice bei Google- oder `.ics`-Fallback

## App-Verhalten

Wenn in **Einstellungen → Kalender** das Ziel **Standardkalender des Geräts** aktiv ist:

- neue Termine mit Datum/Uhrzeit werden direkt in den nativen Standardkalender geschrieben
- Your Voice merkt sich die externe Event-ID
- spätere Änderungen am selben Eintrag können denselben nativen Kalendereintrag aktualisieren
- auf Wunsch öffnet Your Voice nach dem Speichern direkt die Kalender-App
- mit **Kalenderzugriff testen** kannst du prüfen, ob Berechtigung und Standardkalender schon sauber bereitstehen

## Wichtige native Berechtigungen

Der Kalender-Plugin verlangt zusätzliche Plattform-Konfiguration:

- iOS: [Apple – Calendar access levels](https://developer.apple.com/documentation/eventkit/accessing-calendar-using-eventkit-and-eventkitui)
- Android: [Android – Calendar Provider permissions](https://developer.android.com/identity/providers/calendar-provider)

### iOS

In Xcode musst du die passenden `Info.plist`-Einträge für Kalenderzugriff hinterlegen. Die genauen Keys hängen von der iOS-Version und dem gewünschten Zugriffstyp ab; richte dich hier nach der aktuellen Apple-Doku.

### Android

In `AndroidManifest.xml` müssen Kalender-Berechtigungen vorhanden sein. Auch hier bitte die aktuelle Android-Doku als Referenz nehmen.

## Empfohlener Test

1. Mobile App starten
2. **Einstellungen → Kalender**
3. `Standardkalender des Geräts` wählen
4. `Termine mit Datum/Uhrzeit automatisch in Kalender übernehmen` aktivieren
5. In **Agenda** einen Termin mit Datum/Uhrzeit speichern
6. Prüfen, ob der Eintrag direkt im nativen Standardkalender erscheint

## Wichtige ehrliche Grenze

Der direkte Gerätekalender-Flow funktioniert in der **mobilen App**. In der reinen Web-Version bleibt das technisch eingeschränkt. Genau deshalb ist dieser Capacitor-Weg hier jetzt der primäre Pfad für das Ziel „ohne Extra-Datei direkt im Gerätekalender speichern“.
