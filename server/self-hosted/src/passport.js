import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as OpenIDConnectStrategy } from "passport-openidconnect";
import { config } from "./config.js";
import { findUserByEmail, findUserById, normalizeEmail, createUser } from "./users.js";
import { verifyPassword } from "./crypto.js";
import { query } from "./db.js";

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    done(null, await findUserById(id));
  } catch (error) {
    done(error);
  }
});

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      session: false,
    },
    async (email, password, done) => {
      try {
        const user = await findUserByEmail(email);
        if (!user?.password_hash) return done(null, false);
        const valid = await verifyPassword(user.password_hash, password);
        if (!valid) return done(null, false);
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

if (config.OIDC_CLIENT_ID && config.OIDC_CLIENT_SECRET && config.OIDC_CALLBACK_URL) {
  passport.use(
    config.OIDC_PROVIDER_NAME,
    new OpenIDConnectStrategy(
      {
        issuer: config.OIDC_ISSUER,
        authorizationURL: config.OIDC_AUTHORIZATION_URL,
        tokenURL: config.OIDC_TOKEN_URL,
        userInfoURL: config.OIDC_USERINFO_URL,
        clientID: config.OIDC_CLIENT_ID,
        clientSecret: config.OIDC_CLIENT_SECRET,
        callbackURL: config.OIDC_CALLBACK_URL,
        scope: config.OIDC_SCOPE,
      },
      async (_issuer, profile, done) => {
        try {
          const provider = config.OIDC_PROVIDER_NAME;
          const subject = profile.id;
          const existing = await query(
            `select u.*
               from oauth_identities oi
               join app_users u on u.id = oi.user_id
              where oi.provider = $1 and oi.provider_subject = $2`,
            [provider, subject],
          );

          if (existing.rows[0]) return done(null, existing.rows[0]);

          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("OIDC-Profil enthaelt keine E-Mail-Adresse."));

          let user = await findUserByEmail(email);
          if (!user) user = await createUser({ email, emailVerified: true });

          await query(
            `insert into oauth_identities (user_id, provider, provider_subject, profile)
             values ($1, $2, $3, $4)
             on conflict (provider, provider_subject) do nothing`,
            [user.id, provider, subject, profile],
          );

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}

export { passport };
