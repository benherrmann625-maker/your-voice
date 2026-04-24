import express from "express";
import { httpLogger } from "./logger.js";
import { corsMiddleware, parsingMiddleware, requestThrottling, securityHeaders, validateCsrf } from "./security.js";
import { sessionMiddleware } from "./session.js";
import { authRouter, loadCurrentUser } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { oauthRouter } from "./routes/oauth.js";
import { passport } from "./passport.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(httpLogger);
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(...parsingMiddleware);
  app.use(express.json({ limit: "1mb" }));
  app.use(requestThrottling);
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(loadCurrentUser);

  app.use("/api", healthRouter);
  app.use("/api/auth/oauth", oauthRouter);
  app.use("/api/auth", validateCsrf, authRouter);

  app.use((error, _req, res, _next) => {
    res.status(500).json({ error: error.message || "Interner Serverfehler." });
  });

  return app;
}
