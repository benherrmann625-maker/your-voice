import { cookies } from "next/headers";
import crypto from "node:crypto";

const CSRF_COOKIE = "__Host-your-voice-csrf";
const MAX_AGE_SECONDS = 60 * 30;

export async function issueCsrfToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return token;
}

export async function readCsrfCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE)?.value ?? null;
}

export const csrfCookieName = CSRF_COOKIE;
