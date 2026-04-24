import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db.js";
import { config } from "./config.js";

const PgSession = connectPgSimple(session);

export const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: config.SESSION_TABLE,
    createTableIfMissing: true,
  }),
  name: config.sessionCookieName,
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    domain: config.COOKIE_DOMAIN || undefined,
    maxAge: config.sessionDurationMs,
    path: "/",
  },
});

export function serializeSessionUser(user) {
  return {
    id: user.id,
    email: user.email,
    sessionVersion: user.session_version,
    authenticatedAt: Date.now(),
    reauthAt: Date.now(),
  };
}

export async function rotateSession(req, payload) {
  await new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  req.session.user = payload;
}
