import cookieParser from "cookie-parser";
import cors from "cors";
import crypto from "node:crypto";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { config } from "./config.js";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", config.WEB_APP_URL],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
    },
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
});

export const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (config.corsAllowlist.includes(origin)) return callback(null, true);
    return callback(new Error("Origin nicht erlaubt"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "DELETE", "PATCH", "PUT"],
  allowedHeaders: ["content-type", "x-csrf-token", "authorization"],
});

export const requestThrottling = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 20,
  delayMs: () => 250,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zu viele Versuche. Bitte kurz warten." },
});

export const highRiskLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Temporär gesperrt. Bitte spaeter erneut versuchen." },
});

export const parsingMiddleware = [
  cookieParser(config.CSRF_SECRET),
];

export function issueCsrfCookie(req, res) {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(config.csrfCookieName, token, {
    httpOnly: false,
    secure: config.cookieSecure,
    sameSite: "lax",
    domain: config.COOKIE_DOMAIN || undefined,
    path: "/",
    maxAge: 30 * 60 * 1000,
  });
  req.csrfTokenValue = token;
  return token;
}

export function validateCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const cookieToken = req.cookies?.[config.csrfCookieName];
  const submittedToken = req.get("x-csrf-token") || req.body?._csrf;
  if (!cookieToken || !submittedToken || cookieToken !== submittedToken) {
    return res.status(403).json({ error: "CSRF-Pruefung fehlgeschlagen." });
  }
  return next();
}
