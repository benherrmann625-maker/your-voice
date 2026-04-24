import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0, authEnabled } from "./lib/auth0";

export async function middleware(request: NextRequest) {
  const response = authEnabled && auth0 ? await auth0.middleware(request) : NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://cdn.jsdelivr.net https://*.auth0.com https://*.supabase.co",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.auth0.com",
    ].join("; "),
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|icon.svg|manifest.webmanifest|sw.js).*)"],
};
