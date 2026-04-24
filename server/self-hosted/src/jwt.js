import crypto from "node:crypto";
import { SignJWT, importPKCS8, importSPKI, jwtVerify } from "jose";
import { config } from "./config.js";
import { createOpaqueToken, hashOpaqueToken, verifyOpaqueToken } from "./crypto.js";
import { query } from "./db.js";

let privateKeyPromise;
let publicKeyPromise;

function ensurePrivateKey() {
  if (!config.JWT_PRIVATE_KEY_PEM) return null;
  privateKeyPromise ??= importPKCS8(config.JWT_PRIVATE_KEY_PEM, "RS256");
  return privateKeyPromise;
}

function ensurePublicKey() {
  if (!config.JWT_PUBLIC_KEY_PEM) return null;
  publicKeyPromise ??= importSPKI(config.JWT_PUBLIC_KEY_PEM, "RS256");
  return publicKeyPromise;
}

export async function issueApiTokens(user) {
  const privateKey = await ensurePrivateKey();
  if (!privateKey) {
    throw new Error("JWT_PRIVATE_KEY_PEM fehlt fuer API-Token-Ausgabe.");
  }

  const accessToken = await new SignJWT({
    sub: user.id,
    email: user.email,
    scope: "api:read api:write",
    session_version: user.session_version,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(config.JWT_ISSUER)
    .setAudience(config.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${config.accessTokenDurationSeconds}s`)
    .sign(privateKey);

  const refreshToken = createOpaqueToken();
  const refreshTokenHash = await hashOpaqueToken(refreshToken);
  const tokenFamilyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + config.refreshTokenDurationMs);

  await query(
    `insert into refresh_tokens (user_id, token_family_id, token_hash, expires_at)
     values ($1, $2, $3, $4)`,
    [user.id, tokenFamilyId, refreshTokenHash, expiresAt],
  );

  return { accessToken, refreshToken, expiresAt };
}

export async function rotateRefreshToken(user, plainToken) {
  const candidateRows = await query(
    `select *
       from refresh_tokens
      where user_id = $1
        and revoked_at is null
        and expires_at > now()
      order by created_at desc`,
    [user.id],
  );

  for (const row of candidateRows.rows) {
    const match = await verifyOpaqueToken(row.token_hash, plainToken);
    if (!match) continue;

    const nextToken = createOpaqueToken();
    const nextHash = await hashOpaqueToken(nextToken);
    const expiresAt = new Date(Date.now() + config.refreshTokenDurationMs);

    const inserted = await query(
      `insert into refresh_tokens (user_id, token_family_id, token_hash, previous_token_id, expires_at)
       values ($1, $2, $3, $4, $5)
       returning id`,
      [user.id, row.token_family_id, nextHash, row.id, expiresAt],
    );

    await query("update refresh_tokens set revoked_at = now(), replaced_by_token_id = $2 where id = $1", [row.id, inserted.rows[0].id]);

    const privateKey = await ensurePrivateKey();
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      scope: "api:read api:write",
      session_version: user.session_version,
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(config.JWT_ISSUER)
      .setAudience(config.JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${config.accessTokenDurationSeconds}s`)
      .sign(privateKey);

    return { accessToken, refreshToken: nextToken, expiresAt };
  }

  return null;
}

export async function revokeRefreshTokensForUser(userId) {
  await query("update refresh_tokens set revoked_at = coalesce(revoked_at, now()) where user_id = $1 and revoked_at is null", [userId]);
}

export async function verifyAccessToken(token) {
  const publicKey = await ensurePublicKey();
  if (!publicKey) {
    throw new Error("JWT_PUBLIC_KEY_PEM fehlt fuer API-Token-Verifikation.");
  }
  return jwtVerify(token, publicKey, {
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
  });
}
