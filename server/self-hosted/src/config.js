import crypto from "node:crypto";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4100),
  APP_BASE_URL: z.string().url(),
  WEB_APP_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  SESSION_TABLE: z.string().default("user_sessions"),
  SESSION_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(32),
  AUTH_ENCRYPTION_KEY_BASE64: z.string().min(16),
  PASSWORD_PEPPER: z.string().optional().default(""),
  COOKIE_DOMAIN: z.string().optional().default(""),
  COOKIE_SECURE: z.union([z.literal("true"), z.literal("false")]).default("false"),
  CORS_ALLOWLIST: z.string().default("http://localhost:3000,http://localhost:4100"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().email(),
  JWT_ISSUER: z.string().default("https://auth.your-voice.local"),
  JWT_AUDIENCE: z.string().default("your-voice-api"),
  JWT_PRIVATE_KEY_PEM: z.string().optional().default(""),
  JWT_PUBLIC_KEY_PEM: z.string().optional().default(""),
  OIDC_PROVIDER_NAME: z.string().default("google"),
  OIDC_ISSUER: z.string().url().optional().default(""),
  OIDC_AUTHORIZATION_URL: z.string().url().optional().default(""),
  OIDC_TOKEN_URL: z.string().url().optional().default(""),
  OIDC_USERINFO_URL: z.string().url().optional().default(""),
  OIDC_CLIENT_ID: z.string().optional().default(""),
  OIDC_CLIENT_SECRET: z.string().optional().default(""),
  OIDC_CALLBACK_URL: z.string().url().optional().default(""),
  OIDC_SCOPE: z.string().default("openid profile email"),
});

const parsed = envSchema.parse(process.env);

export const config = {
  ...parsed,
  isProduction: parsed.NODE_ENV === "production",
  cookieSecure: parsed.COOKIE_SECURE === "true" || parsed.NODE_ENV === "production",
  corsAllowlist: parsed.CORS_ALLOWLIST.split(",").map((entry) => entry.trim()).filter(Boolean),
  encryptionKey: Buffer.from(parsed.AUTH_ENCRYPTION_KEY_BASE64, "base64"),
  sessionCookieName: parsed.NODE_ENV === "production" ? "__Host-your-voice.sid" : "your-voice.sid",
  csrfCookieName: parsed.NODE_ENV === "production" ? "__Host-your-voice.csrf" : "your-voice.csrf",
  rememberMeDurationMs: 1000 * 60 * 60 * 24 * 14,
  sessionDurationMs: 1000 * 60 * 60 * 24,
  verificationDurationMs: 1000 * 60 * 30,
  resetDurationMs: 1000 * 60 * 20,
  magicLinkDurationMs: 1000 * 60 * 15,
  accessTokenDurationSeconds: 60 * 5,
  refreshTokenDurationMs: 1000 * 60 * 60 * 24 * 14,
  mfaEnrollmentTimeoutMs: 1000 * 60 * 10,
  stepUpWindowMs: 1000 * 60 * 10,
};

if (config.encryptionKey.length !== 32) {
  throw new Error("AUTH_ENCRYPTION_KEY_BASE64 muss nach base64-Decoding genau 32 Bytes ergeben.");
}

export function randomId(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}
