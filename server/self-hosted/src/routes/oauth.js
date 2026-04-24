import express from "express";
import { audit } from "../audit.js";
import { passport } from "../passport.js";
import { rotateSession, serializeSessionUser } from "../session.js";
import { config } from "../config.js";

const router = express.Router();

router.get("/:provider", (req, res, next) => {
  const provider = req.params.provider;
  req.session.oauthIntent = req.query.intent === "link" ? "link" : "login";
  passport.authenticate(provider)(req, res, next);
});

router.get("/:provider/callback", (req, res, next) => {
  passport.authenticate(req.params.provider, { session: false }, async (error, user) => {
    if (error) return next(error);
    if (!user) return res.redirect(`${config.WEB_APP_URL}/auth/error?provider=${encodeURIComponent(req.params.provider)}`);

    if (req.session.oauthIntent === "link" && req.session.user?.id) {
      await audit(req, {
        userId: req.session.user.id,
        eventType: "auth.identity.link",
        status: "success",
        metadata: { provider: req.params.provider, linkedToUserId: user.id },
      });
      return res.redirect(`${config.WEB_APP_URL}/settings?linked=${encodeURIComponent(req.params.provider)}`);
    }

    await rotateSession(req, serializeSessionUser(user));
    await audit(req, { userId: user.id, eventType: "auth.oauth.callback", status: "success", metadata: { provider: req.params.provider } });
    return res.redirect(`${config.WEB_APP_URL}/`);
  })(req, res, next);
});

export { router as oauthRouter };
