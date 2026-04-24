import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const authEnabled = Boolean(
  process.env.AUTH0_SECRET &&
    process.env.AUTH0_BASE_URL &&
    process.env.AUTH0_DOMAIN &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_SECRET,
);

export const auth0 = authEnabled
  ? new Auth0Client({
      authorizationParameters: {
        audience: process.env.AUTH0_AUDIENCE,
        scope: process.env.AUTH0_SCOPE ?? "openid profile email offline_access",
      },
      logoutStrategy: "oidc",
      secret: process.env.AUTH0_SECRET,
      appBaseUrl: process.env.AUTH0_BASE_URL,
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      signInReturnToPath: "/auth",
    })
  : null;
