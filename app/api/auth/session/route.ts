import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";

export async function GET() {
  const session = await auth0.getSession();

  return NextResponse.json(
    {
      authenticated: Boolean(session?.user),
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
