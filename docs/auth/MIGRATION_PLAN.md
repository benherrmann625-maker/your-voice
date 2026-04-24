# Supabase zu neuer Auth-Schicht: Migrations- und Cleanup-Plan

## 1. Discovery

- `npm run auth:discovery`
- `npm run auth:dry-run`

Dabei werden Legacy-Dateien, DB-Artefakte und Risiken dokumentiert.

## 2. Backup

- `npm run auth:backup`
- `pg_dump "$SUPABASE_DB_URL" --schema=auth --schema=public`
- Exportiere:
  - `auth.users`
  - `auth.identities`
  - `public.voice_items`

## 3. Hash-Kompatibilitaet

- Supabase nutzt je nach Setup andere Hash-Strategien.
- Direkter Bulk-Import ist nur moeglich, wenn Zielsystem denselben Hash validieren kann.
- Falls nicht kompatibel:
  - **Lazy Migration**: Nutzer loggt sich einmal beim Alt-System ein oder setzt Passwort neu.
  - alternativ Passwort-Reset-Kampagne.

## 4. Lazy Migration

- E-Mail-Adresse + Verifikationsstatus uebernehmen
- Social-/OAuth-Identitaeten in `oauth_identities` oder Auth0-Identities ueberfuehren
- MFA **nicht** blind migrieren; immer neu enrollen
- alte Supabase-Sessions / Refresh Tokens beim Cutover widerrufen

## 5. Nutzerkommunikation

- Re-Login erforderlich
- eventuell Passwort-Reset erforderlich
- MFA neu einrichten erforderlich
- Social Login beim ersten erneuten Login erneut verknuepfen oder migrieren

## 6. Execute Cleanup

Erst nach bestaetigtem Cutover:

- `LEGACY_AUTH_FORCE=1 npm run auth:execute-cleanup -- --execute`
- danach eingebettete Legacy-Auth in `app.js`, `public/app.js`, `index.html`, `app/layout.tsx` manuell entfernen

## 7. Supabase-spezifische Artefakte nach Cutover entfernen

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF`
- `supabase-schema.sql`
- Legacy-Login-/Sync-Hinweise in `README.md`

## 8. Rollback

- Code-Backup aus `backups/<timestamp>/code`
- Datenbank-Backup einspielen
- Legacy-Supabase-Auth nur dann wieder aktivieren, wenn Sessions bewusst neu aufgebaut werden
