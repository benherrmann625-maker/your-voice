import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { config } from "./config.js";
import { query } from "./db.js";

export async function createRegistrationOptions(user) {
  const existingCredentials = await query(
    "select credential_id from passkey_credentials where user_id = $1 and created_at is not null",
    [user.id],
  );

  return generateRegistrationOptions({
    rpName: "Your Voice",
    rpID: new URL(config.APP_BASE_URL).hostname,
    userName: user.email,
    userID: user.webauthn_user_handle,
    attestationType: "none",
    excludeCredentials: existingCredentials.rows.map((row) => ({
      id: row.credential_id,
      type: "public-key",
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });
}

export async function verifyRegistration({ response, expectedChallenge, user }) {
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: config.WEB_APP_URL,
    expectedRPID: new URL(config.APP_BASE_URL).hostname,
  });

  if (!verification.verified || !verification.registrationInfo) return verification;

  const { credential } = verification.registrationInfo;
  await query(
    `insert into passkey_credentials
      (user_id, credential_id, public_key, counter, transports, backed_up, device_type)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      user.id,
      credential.id,
      Buffer.from(credential.publicKey).toString("base64"),
      credential.counter,
      response.response.transports ?? [],
      credential.backedUp,
      credential.deviceType,
    ],
  );

  return verification;
}

export async function createAuthenticationOptionsForUser(user) {
  const credentials = await query(
    "select credential_id, transports from passkey_credentials where user_id = $1",
    [user.id],
  );

  return generateAuthenticationOptions({
    rpID: new URL(config.APP_BASE_URL).hostname,
    allowCredentials: credentials.rows.map((row) => ({
      id: row.credential_id,
      type: "public-key",
      transports: row.transports ?? undefined,
    })),
    userVerification: "preferred",
  });
}

export async function verifyAuthentication({ response, expectedChallenge, user }) {
  const credentials = await query(
    "select * from passkey_credentials where user_id = $1 and credential_id = $2",
    [user.id, response.id],
  );
  const authenticator = credentials.rows[0];
  if (!authenticator) throw new Error("Passkey nicht gefunden.");

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: config.WEB_APP_URL,
    expectedRPID: new URL(config.APP_BASE_URL).hostname,
    authenticator: {
      credentialID: authenticator.credential_id,
      credentialPublicKey: Buffer.from(authenticator.public_key, "base64"),
      counter: Number(authenticator.counter),
      transports: authenticator.transports ?? undefined,
    },
  });

  if (verification.verified) {
    await query(
      "update passkey_credentials set counter = $2, last_used_at = now() where id = $1",
      [authenticator.id, verification.authenticationInfo.newCounter],
    );
  }

  return verification;
}
