import { query } from "./db.js";

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  const result = await query("select * from app_users where email_normalized = $1", [normalized]);
  return result.rows[0] ?? null;
}

export async function findUserById(userId) {
  const result = await query("select * from app_users where id = $1", [userId]);
  return result.rows[0] ?? null;
}

export async function createUser({ email, passwordHash = null, emailVerified = false }) {
  const normalized = normalizeEmail(email);
  const result = await query(
    `insert into app_users (email, email_normalized, password_hash, email_verified_at)
     values ($1, $2, $3, $4)
     returning *`,
    [email.trim(), normalized, passwordHash, emailVerified ? new Date() : null],
  );
  return result.rows[0];
}

export async function markEmailVerified(userId) {
  const result = await query(
    `update app_users
        set email_verified_at = now(),
            updated_at = now()
      where id = $1
      returning *`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function updatePassword(userId, passwordHash) {
  const result = await query(
    `update app_users
        set password_hash = $2,
            refresh_token_version = refresh_token_version + 1,
            session_version = session_version + 1,
            reauth_required_at = now(),
            updated_at = now()
      where id = $1
      returning *`,
    [userId, passwordHash],
  );
  return result.rows[0] ?? null;
}

export async function bumpSessionVersion(userId) {
  await query(
    `update app_users
        set session_version = session_version + 1,
            reauth_required_at = now(),
            updated_at = now()
      where id = $1`,
    [userId],
  );
}

export async function resetLoginFailures(userId) {
  await query("update app_users set failed_login_count = 0, locked_until = null, updated_at = now() where id = $1", [userId]);
}

export async function registerLoginFailure(userId) {
  const result = await query(
    `update app_users
        set failed_login_count = failed_login_count + 1,
            locked_until = case
              when failed_login_count + 1 >= 10 then now() + interval '30 minutes'
              when failed_login_count + 1 >= 5 then now() + interval '10 minutes'
              else locked_until
            end,
            updated_at = now()
      where id = $1
      returning *`,
    [userId],
  );
  return result.rows[0] ?? null;
}
