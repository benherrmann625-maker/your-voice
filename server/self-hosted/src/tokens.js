import { createOpaqueToken, hashOpaqueToken, verifyOpaqueToken } from "./crypto.js";
import { query } from "./db.js";

export async function issueSingleUseToken(userId, tokenType, ttlMs, metadata = {}) {
  const plainToken = createOpaqueToken();
  const tokenHash = await hashOpaqueToken(plainToken);
  const expiresAt = new Date(Date.now() + ttlMs);

  await query(
    `insert into auth_tokens (user_id, token_type, token_hash, metadata, expires_at)
     values ($1, $2, $3, $4, $5)`,
    [userId, tokenType, tokenHash, metadata, expiresAt],
  );

  return { plainToken, expiresAt };
}

export async function consumeSingleUseToken(tokenType, plainToken) {
  const result = await query(
    `select *
       from auth_tokens
      where token_type = $1
        and consumed_at is null
        and expires_at > now()
      order by created_at desc`,
    [tokenType],
  );

  for (const row of result.rows) {
    const match = await verifyOpaqueToken(row.token_hash, plainToken);
    if (!match) continue;

    await query("update auth_tokens set consumed_at = now() where id = $1 and consumed_at is null", [row.id]);
    return row;
  }

  return null;
}
