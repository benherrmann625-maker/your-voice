import { NextResponse } from "next/server";
import { auth0, authEnabled } from "../../../../lib/auth0";

export async function GET() {
  if (!authEnabled || !auth0) {
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        authEnabled: false,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const session = await auth0.getSession();

  return NextResponse.json(
    {
      authenticated: Boolean(session?.user),
      authEnabled: true,
      user: session?.user
        ? {
            sub: session.user.sub,
            email: session.user.email ?? null,
            name: session.user.name ?? null,
            picture: session.user.picture ?? null,
          }
        : null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
