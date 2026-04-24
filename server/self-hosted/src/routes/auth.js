import express from "express";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { z } from "zod";
import { audit } from "../audit.js";
import { config } from "../config.js";
import { createBackupCode, decryptSecret, encryptSecret, hashOpaqueToken, hashPassword, verifyOpaqueToken, verifyPassword } from "../crypto.js";
import { query } from "../db.js";
import { issueApiTokens, revokeRefreshTokensForUser, rotateRefreshToken } from "../jwt.js";
import { sendEmail } from "../mail.js";
import { authLimiter, highRiskLimiter, issueCsrfCookie } from "../security.js";
import { rotateSession, serializeSessionUser } from "../session.js";
import { createAuthenticationOptionsForUser, createRegistrationOptions, verifyAuthentication, verifyRegistration } from "../webauthn.js";
import { bumpSessionVersion, createUser, findUserByEmail, findUserById, markEmailVerified, normalizeEmail, registerLoginFailure, resetLoginFailures, updatePassword } from "../users.js";
import { consumeSingleUseToken, issueSingleUseToken } from "../tokens.js";

const router = express.Router();

const emailSchema = z.string().email().transform((value) => normalizeEmail(value));
const passwordSchema = z.string().min(12).max(128);

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

const forgotPasswordSchema = z.object({ email: emailSchema });
const tokenSchema = z.object({ token: z.string().min(20) });
const resetSchema = z.object({ token: z.string().min(20), password: passwordSchema });
const mfaSchema = z.object({ code: z.string().min(6).max(12) });
const emailOnlySchema = z.object({ email: emailSchema });
const refreshSchema = z.object({ refreshToken: z.string().min(20) });

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.email_verified_at),
    createdAt: user.created_at,
    hasPassword: Boolean(user.password_hash),
  };
}

function requireAuth(req, res, next) {
  if (!req.session?.user?.id) {
    return res.status(401).json({ error: "Nicht authentifiziert." });
  }
  return next();
}

async function loadCurrentUser(req, res, next) {
  if (!req.session?.user?.id) return next();
  const user = await findUserById(req.session.user.id);
  if (!user) {
    req.session.destroy(() => undefined);
    return res.status(401).json({ error: "Session ungueltig." });
  }
  if (req.session.user.sessionVersion !== user.session_version) {
    req.session.destroy(() => undefined);
    return res.status(401).json({ error: "Session wurde widerrufen. Bitte erneut anmelden." });
  }
  req.currentUser = user;
  return next();
}

function requireCurrentUser(req, res, next) {
  if (!req.currentUser) return res.status(401).json({ error: "Nicht authentifiziert." });
  return next();
}

function markRecentAuth(req) {
  if (req.session?.user) req.session.user.reauthAt = Date.now();
}

function requireRecentAuth(req, res, next) {
  const age = Date.now() - (req.session?.user?.reauthAt ?? 0);
  if (age > config.stepUpWindowMs) {
    return res.status(403).json({ error: "Bitte vor dieser Aenderung erneut bestaetigen." });
  }
  return next();
}

async function issueVerificationEmail(user) {
  const { plainToken, expiresAt } = await issueSingleUseToken(user.id, "verify_email", config.verificationDurationMs);
  const link = `${config.APP_BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(plainToken)}`;
  await sendEmail({
    to: user.email,
    subject: "Bitte bestaetige deine E-Mail fuer Your Voice",
    text: `Bitte bestaetige deine E-Mail ueber diesen Link: ${link}\n\nGueltig bis ${expiresAt.toISOString()}`,
    html: `<p>Bitte bestaetige deine E-Mail fuer Your Voice.</p><p><a href="${link}">E-Mail bestaetigen</a></p>`,
  });
}

async function issuePasswordResetEmail(user, req) {
  const { plainToken, expiresAt } = await issueSingleUseToken(user.id, "password_reset", config.resetDurationMs, {
    requestedFromIp: req.ip,
  });
  const link = `${config.WEB_APP_URL}/auth/reset-password?token=${encodeURIComponent(plainToken)}`;
  await sendEmail({
    to: user.email,
    subject: "Passwort fuer Your Voice zuruecksetzen",
    text: `Setze dein Passwort hier zurueck: ${link}\n\nGueltig bis ${expiresAt.toISOString()}`,
    html: `<p>Setze dein Passwort fuer Your Voice zurueck.</p><p><a href="${link}">Passwort zuruecksetzen</a></p>`,
  });
}

async function issueMagicLinkEmail(user, req) {
  const { plainToken, expiresAt } = await issueSingleUseToken(user.id, "magic_link", config.magicLinkDurationMs, {
    requestedFromIp: req.ip,
  });
  const link = `${config.WEB_APP_URL}/auth/magic-link?token=${encodeURIComponent(plainToken)}`;
  await sendEmail({
    to: user.email,
    subject: "Dein Magic Link fuer Your Voice",
    text: `Mit diesem Link meldest du dich bei Your Voice an: ${link}\n\nGueltig bis ${expiresAt.toISOString()}`,
    html: `<p>Mit diesem Link meldest du dich direkt bei Your Voice an.</p><p><a href="${link}">Magic Link oeffnen</a></p>`,
  });
}

router.get("/csrf-token", (req, res) => {
  const csrfToken = issueCsrfCookie(req, res);
  res.json({
    csrfToken,
    cookieName: config.csrfCookieName,
    headerName: "x-csrf-token",
  });
});

router.get("/me", loadCurrentUser, (req, res) => {
  res.json({
    authenticated: Boolean(req.currentUser),
    user: req.currentUser ? publicUser(req.currentUser) : null,
    session: req.session?.user
      ? {
          authenticatedAt: req.session.user.authenticatedAt,
          reauthAt: req.session.user.reauthAt,
        }
      : null,
  });
});

router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const existing = await findUserByEmail(payload.email);
    if (existing) {
      await audit(req, { userId: existing.id, eventType: "auth.register.duplicate", status: "accepted" });
      return res.status(202).json({ ok: true, message: "Wenn die E-Mail frei ist, wurde ein Registrierungsprozess gestartet." });
    }

    const passwordHash = await hashPassword(payload.password);
    const user = await createUser({ email: payload.email, passwordHash });
    await issueVerificationEmail(user);
    await audit(req, { userId: user.id, eventType: "auth.register", status: "success" });

    return res.status(201).json({
      ok: true,
      message: "Registrierung gestartet. Bitte bestaetige deine E-Mail.",
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/verify-email", async (req, res, next) => {
  try {
    const { token } = tokenSchema.parse(req.query);
    const row = await consumeSingleUseToken("verify_email", token);
    if (!row) {
      await audit(req, { eventType: "auth.verify-email", status: "failed", metadata: { reason: "invalid_or_expired" } });
      return res.status(400).json({ error: "Link ungueltig oder abgelaufen." });
    }
    const user = await markEmailVerified(row.user_id);
    await audit(req, { userId: row.user_id, eventType: "auth.verify-email", status: "success" });
    return res.json({ ok: true, user: user ? publicUser(user) : null });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await findUserByEmail(payload.email);
    const genericError = { error: "Login fehlgeschlagen." };

    if (!user?.password_hash) {
      await audit(req, { eventType: "auth.login", status: "failed", metadata: { email: payload.email, reason: "unknown_or_passwordless" } });
      return res.status(401).json(genericError);
    }

    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      await audit(req, { userId: user.id, eventType: "auth.login.locked", status: "failed" });
      return res.status(429).json({ error: "Zu viele Fehlversuche. Bitte spaeter erneut versuchen." });
    }

    const valid = await verifyPassword(user.password_hash, payload.password);
    if (!valid) {
      await registerLoginFailure(user.id);
      await audit(req, { userId: user.id, eventType: "auth.login", status: "failed", metadata: { reason: "bad_password" } });
      return res.status(401).json(genericError);
    }

    if (!user.email_verified_at) {
      await issueVerificationEmail(user);
      await audit(req, { userId: user.id, eventType: "auth.login", status: "failed", metadata: { reason: "email_unverified" } });
      return res.status(403).json({ error: "Bitte bestaetige zuerst deine E-Mail. Wir haben dir einen neuen Link geschickt." });
    }

    const factors = await query(
      "select id from mfa_totp_factors where user_id = $1 and verified_at is not null and disabled_at is null",
      [user.id],
    );

    if (factors.rows.length > 0) {
      req.session.pendingMfa = {
        userId: user.id,
        issuedAt: Date.now(),
        rememberMe: payload.rememberMe,
      };
      await audit(req, { userId: user.id, eventType: "auth.login", status: "mfa_required" });
      return res.status(202).json({ ok: true, requiresMfa: true, methods: ["totp", "backup_code"] });
    }

    await rotateSession(req, serializeSessionUser(user));
    if (payload.rememberMe) req.session.cookie.maxAge = config.rememberMeDurationMs;
    await resetLoginFailures(user.id);
    await audit(req, { userId: user.id, eventType: "auth.login", status: "success" });
    return res.json({ ok: true, user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", loadCurrentUser, async (req, res) => {
  const currentUserId = req.currentUser?.id ?? null;
  req.session.destroy(async () => {
    res.clearCookie(config.sessionCookieName, {
      path: "/",
      sameSite: "lax",
      secure: config.cookieSecure,
      domain: config.COOKIE_DOMAIN || undefined,
    });
    if (currentUserId) {
      await audit(req, { userId: currentUserId, eventType: "auth.logout", status: "success" });
    }
    res.json({ ok: true });
  });
});

router.post("/forgot-password", highRiskLimiter, async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await findUserByEmail(email);
    if (user) {
      await issuePasswordResetEmail(user, req);
      await audit(req, { userId: user.id, eventType: "auth.password-reset.requested", status: "accepted" });
    }
    return res.status(202).json({ ok: true, message: "Wenn die E-Mail existiert, wurde ein Reset-Link versendet." });
  } catch (error) {
    return next(error);
  }
});

router.post("/reset-password", highRiskLimiter, async (req, res, next) => {
  try {
    const payload = resetSchema.parse(req.body);
    const tokenRow = await consumeSingleUseToken("password_reset", payload.token);
    if (!tokenRow) {
      return res.status(400).json({ error: "Reset-Link ungueltig oder abgelaufen." });
    }
    const passwordHash = await hashPassword(payload.password);
    const user = await updatePassword(tokenRow.user_id, passwordHash);
    await revokeRefreshTokensForUser(tokenRow.user_id);
    await audit(req, { userId: tokenRow.user_id, eventType: "auth.password-reset.completed", status: "success" });
    return res.json({ ok: true, user: user ? publicUser(user) : null });
  } catch (error) {
    return next(error);
  }
});

router.post("/account-recovery/request", highRiskLimiter, async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await findUserByEmail(email);
    if (user) {
      await issuePasswordResetEmail(user, req);
      await audit(req, { userId: user.id, eventType: "auth.account-recovery.requested", status: "accepted" });
    }
    return res.status(202).json({ ok: true, message: "Wenn die E-Mail existiert, wurde ein Recovery-Link versendet." });
  } catch (error) {
    return next(error);
  }
});

router.post("/request-magic-link", highRiskLimiter, async (req, res, next) => {
  try {
    const { email } = emailOnlySchema.parse(req.body);
    const user = await findUserByEmail(email);
    if (user) {
      await issueMagicLinkEmail(user, req);
      await audit(req, { userId: user.id, eventType: "auth.magic-link.requested", status: "accepted" });
    }
    return res.status(202).json({ ok: true, message: "Wenn die E-Mail existiert, wurde ein Magic Link versendet." });
  } catch (error) {
    return next(error);
  }
});

router.post("/consume-magic-link", highRiskLimiter, async (req, res, next) => {
  try {
    const { token } = tokenSchema.parse(req.body);
    const tokenRow = await consumeSingleUseToken("magic_link", token);
    if (!tokenRow) {
      await audit(req, { eventType: "auth.magic-link.consume", status: "failed", metadata: { reason: "invalid_or_expired" } });
      return res.status(400).json({ error: "Magic Link ungueltig oder abgelaufen." });
    }
    const user = await findUserById(tokenRow.user_id);
    if (!user) return res.status(400).json({ error: "Nutzer nicht gefunden." });
    await rotateSession(req, serializeSessionUser(user));
    await audit(req, { userId: user.id, eventType: "auth.magic-link.consume", status: "success" });
    return res.json({ ok: true, user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/mfa/enroll", requireAuth, loadCurrentUser, requireCurrentUser, requireRecentAuth, async (req, res, next) => {
  try {
    const secret = authenticator.generateSecret();
    const label = `Your Voice (${req.currentUser.email})`;
    const otpauth = authenticator.keyuri(req.currentUser.email, "Your Voice", secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    req.session.pendingTotp = {
      secretCiphertext: encryptSecret(secret),
      label,
      issuedAt: Date.now(),
    };

    await audit(req, { userId: req.currentUser.id, eventType: "auth.mfa.enroll.started", status: "success" });
    return res.json({ ok: true, otpauth, qrCodeDataUrl, label });
  } catch (error) {
    return next(error);
  }
});

router.post("/mfa/verify", highRiskLimiter, loadCurrentUser, async (req, res, next) => {
  try {
    const { code } = mfaSchema.parse(req.body);

    if (req.session?.pendingMfa?.userId) {
      const user = await findUserById(req.session.pendingMfa.userId);
      if (!user) return res.status(400).json({ error: "MFA-Session ungueltig." });

      const factors = await query(
        "select * from mfa_totp_factors where user_id = $1 and verified_at is not null and disabled_at is null order by created_at desc",
        [user.id],
      );

      for (const factor of factors.rows) {
        const secret = decryptSecret(factor.secret_ciphertext);
        if (authenticator.verify({ token: code, secret })) {
          await rotateSession(req, serializeSessionUser(user));
          delete req.session.pendingMfa;
          await audit(req, { userId: user.id, eventType: "auth.mfa.login", status: "success" });
          return res.json({ ok: true, user: publicUser(user) });
        }
      }

      const backupCodes = await query(
        "select * from mfa_backup_codes where user_id = $1 and used_at is null",
        [user.id],
      );

      for (const backup of backupCodes.rows) {
        if (await verifyOpaqueToken(backup.code_hash, code.toUpperCase())) {
          await query("update mfa_backup_codes set used_at = now() where id = $1", [backup.id]);
          await rotateSession(req, serializeSessionUser(user));
          delete req.session.pendingMfa;
          await audit(req, { userId: user.id, eventType: "auth.mfa.login.backup-code", status: "success" });
          return res.json({ ok: true, user: publicUser(user), usedBackupCode: true });
        }
      }

      await audit(req, { userId: user.id, eventType: "auth.mfa.login", status: "failed" });
      return res.status(401).json({ error: "MFA-Code ungueltig." });
    }

    if (!req.currentUser || !req.session?.pendingTotp) {
      return res.status(400).json({ error: "Keine MFA-Aktivierung offen." });
    }

    if (Date.now() - req.session.pendingTotp.issuedAt > config.mfaEnrollmentTimeoutMs) {
      delete req.session.pendingTotp;
      return res.status(400).json({ error: "MFA-Aktivierung abgelaufen. Bitte neu starten." });
    }

    const secret = decryptSecret(req.session.pendingTotp.secretCiphertext);
    const valid = authenticator.verify({ token: code, secret });
    if (!valid) {
      await audit(req, { userId: req.currentUser.id, eventType: "auth.mfa.enroll.verify", status: "failed" });
      return res.status(400).json({ error: "Code ungueltig." });
    }

    await query(
      `insert into mfa_totp_factors (user_id, secret_ciphertext, label, verified_at)
       values ($1, $2, $3, now())`,
      [req.currentUser.id, req.session.pendingTotp.secretCiphertext, req.session.pendingTotp.label],
    );

    const backupCodes = [];
    for (let index = 0; index < 8; index += 1) {
      const codeValue = createBackupCode();
      backupCodes.push(codeValue);
      const codeHash = await hashOpaqueToken(codeValue);
      await query("insert into mfa_backup_codes (user_id, code_hash) values ($1, $2)", [req.currentUser.id, codeHash]);
    }

    delete req.session.pendingTotp;
    markRecentAuth(req);
    await audit(req, { userId: req.currentUser.id, eventType: "auth.mfa.enroll.completed", status: "success" });
    return res.json({ ok: true, backupCodes });
  } catch (error) {
    return next(error);
  }
});

router.post("/mfa/disable", highRiskLimiter, requireAuth, loadCurrentUser, requireCurrentUser, requireRecentAuth, async (req, res, next) => {
  try {
    const { code } = mfaSchema.parse(req.body);
    const factors = await query(
      "select * from mfa_totp_factors where user_id = $1 and verified_at is not null and disabled_at is null",
      [req.currentUser.id],
    );

    let verified = false;
    for (const factor of factors.rows) {
      const secret = decryptSecret(factor.secret_ciphertext);
      if (authenticator.verify({ token: code, secret })) verified = true;
    }

    if (!verified) {
      const backupCodes = await query("select * from mfa_backup_codes where user_id = $1 and used_at is null", [req.currentUser.id]);
      for (const backup of backupCodes.rows) {
        if (await verifyOpaqueToken(backup.code_hash, code.toUpperCase())) {
          verified = true;
          await query("update mfa_backup_codes set used_at = now() where id = $1", [backup.id]);
          break;
        }
      }
    }

    if (!verified) {
      await audit(req, { userId: req.currentUser.id, eventType: "auth.mfa.disable", status: "failed" });
      return res.status(400).json({ error: "Bestaetigung fehlgeschlagen." });
    }

    await query("update mfa_totp_factors set disabled_at = now() where user_id = $1 and disabled_at is null", [req.currentUser.id]);
    await query("delete from mfa_backup_codes where user_id = $1", [req.currentUser.id]);
    await bumpSessionVersion(req.currentUser.id);
    await audit(req, { userId: req.currentUser.id, eventType: "auth.mfa.disable", status: "success" });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.post("/mfa/recovery", highRiskLimiter, async (req, res, next) => {
  try {
    const { code } = mfaSchema.parse(req.body);
    if (!req.session?.pendingMfa?.userId) {
      return res.status(400).json({ error: "Keine MFA-Recovery offen." });
    }
    const user = await findUserById(req.session.pendingMfa.userId);
    if (!user) return res.status(400).json({ error: "Recovery ungueltig." });
    const backupCodes = await query("select * from mfa_backup_codes where user_id = $1 and used_at is null", [user.id]);
    for (const backup of backupCodes.rows) {
      if (await verifyOpaqueToken(backup.code_hash, code.toUpperCase())) {
        await query("update mfa_backup_codes set used_at = now() where id = $1", [backup.id]);
        await rotateSession(req, serializeSessionUser(user));
        delete req.session.pendingMfa;
        await audit(req, { userId: user.id, eventType: "auth.mfa.recovery", status: "success" });
        return res.json({ ok: true, user: publicUser(user), requiresReEnrollment: true });
      }
    }
    await audit(req, { userId: user.id, eventType: "auth.mfa.recovery", status: "failed" });
    return res.status(400).json({ error: "Recovery-Code ungueltig." });
  } catch (error) {
    return next(error);
  }
});

router.post("/passkey/register", requireAuth, loadCurrentUser, requireCurrentUser, requireRecentAuth, async (req, res, next) => {
  try {
    const options = await createRegistrationOptions(req.currentUser);
    req.session.passkeyRegistration = {
      challenge: options.challenge,
      userId: req.currentUser.id,
      issuedAt: Date.now(),
    };
    return res.json(options);
  } catch (error) {
    return next(error);
  }
});

router.post("/passkey/register/verify", requireAuth, loadCurrentUser, requireCurrentUser, requireRecentAuth, async (req, res, next) => {
  try {
    if (!req.session.passkeyRegistration || req.session.passkeyRegistration.userId !== req.currentUser.id) {
      return res.status(400).json({ error: "Keine Passkey-Registrierung offen." });
    }
    const verification = await verifyRegistration({
      response: req.body,
      expectedChallenge: req.session.passkeyRegistration.challenge,
      user: req.currentUser,
    });
    delete req.session.passkeyRegistration;
    await audit(req, { userId: req.currentUser.id, eventType: "auth.passkey.register", status: verification.verified ? "success" : "failed" });
    return res.json({ ok: verification.verified });
  } catch (error) {
    return next(error);
  }
});

router.post("/passkey/login", highRiskLimiter, async (req, res, next) => {
  try {
    const { email } = emailOnlySchema.parse(req.body);
    const user = await findUserByEmail(email);
    if (!user) return res.status(202).json({ ok: true, message: "Wenn die Identitaet existiert, wurde eine Challenge erstellt." });
    const options = await createAuthenticationOptionsForUser(user);
    req.session.passkeyLogin = {
      challenge: options.challenge,
      userId: user.id,
      issuedAt: Date.now(),
    };
    return res.json(options);
  } catch (error) {
    return next(error);
  }
});

router.post("/passkey/login/verify", highRiskLimiter, async (req, res, next) => {
  try {
    if (!req.session.passkeyLogin?.userId) return res.status(400).json({ error: "Keine Passkey-Challenge offen." });
    const user = await findUserById(req.session.passkeyLogin.userId);
    if (!user) return res.status(400).json({ error: "Nutzer nicht gefunden." });
    const verification = await verifyAuthentication({
      response: req.body,
      expectedChallenge: req.session.passkeyLogin.challenge,
      user,
    });
    if (!verification.verified) {
      await audit(req, { userId: user.id, eventType: "auth.passkey.login", status: "failed" });
      return res.status(401).json({ error: "Passkey-Verifikation fehlgeschlagen." });
    }
    await rotateSession(req, serializeSessionUser(user));
    delete req.session.passkeyLogin;
    await audit(req, { userId: user.id, eventType: "auth.passkey.login", status: "success" });
    return res.json({ ok: true, user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/reauth", authLimiter, loadCurrentUser, requireCurrentUser, async (req, res, next) => {
  try {
    const payload = z.object({ password: z.string().min(1) }).parse(req.body);
    if (!req.currentUser.password_hash) return res.status(400).json({ error: "Fuer diesen Account ist keine Passwort-Re-Auth verfuegbar." });
    const valid = await verifyPassword(req.currentUser.password_hash, payload.password);
    if (!valid) return res.status(401).json({ error: "Re-Authentifizierung fehlgeschlagen." });
    markRecentAuth(req);
    await audit(req, { userId: req.currentUser.id, eventType: "auth.reauth", status: "success" });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.post("/token", highRiskLimiter, async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await findUserByEmail(payload.email);
    if (!user?.password_hash || !(await verifyPassword(user.password_hash, payload.password))) {
      return res.status(401).json({ error: "Token-Ausgabe fehlgeschlagen." });
    }
    const tokens = await issueApiTokens(user);
    await audit(req, { userId: user.id, eventType: "auth.api-token.issue", status: "success" });
    return res.json(tokens);
  } catch (error) {
    return next(error);
  }
});

router.post("/refresh", highRiskLimiter, async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokenCandidates = await query(
      `select u.*
         from refresh_tokens rt
         join app_users u on u.id = rt.user_id
        where rt.revoked_at is null and rt.expires_at > now()`,
    );

    for (const user of tokenCandidates.rows) {
      const rotated = await rotateRefreshToken(user, refreshToken);
      if (!rotated) continue;
      await audit(req, { userId: user.id, eventType: "auth.api-token.refresh", status: "success" });
      return res.json(rotated);
    }

    return res.status(401).json({ error: "Refresh Token ungueltig." });
  } catch (error) {
    return next(error);
  }
});

router.post("/revoke", highRiskLimiter, loadCurrentUser, async (req, res, next) => {
  try {
    if (!req.currentUser) return res.status(401).json({ error: "Nicht authentifiziert." });
    await revokeRefreshTokensForUser(req.currentUser.id);
    await audit(req, { userId: req.currentUser.id, eventType: "auth.api-token.revoke", status: "success" });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.delete("/identities/:provider", requireAuth, loadCurrentUser, requireCurrentUser, requireRecentAuth, async (req, res, next) => {
  try {
    await query(
      "delete from oauth_identities where user_id = $1 and provider = $2",
      [req.currentUser.id, req.params.provider],
    );
    await audit(req, { userId: req.currentUser.id, eventType: "auth.identity.unlink", status: "success", metadata: { provider: req.params.provider } });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

router.use((error, req, res, _next) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: "Ungueltige Eingabedaten.",
      fields: error.flatten(),
    });
  }

  req.log?.error({ err: error }, "Auth-Router Fehler");
  return res.status(500).json({ error: "Interner Fehler im Auth-Flow." });
});

export { router as authRouter, loadCurrentUser, requireAuth, requireCurrentUser, requireRecentAuth, publicUser };
