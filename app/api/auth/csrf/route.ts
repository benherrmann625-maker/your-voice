import { NextResponse } from "next/server";
import { issueCsrfToken, csrfCookieName } from "../../../../lib/csrf";

export async function GET() {
  const csrfToken = await issueCsrfToken();

  return NextResponse.json(
    {
      csrfToken,
      headerName: "x-csrf-token",
      cookieName: csrfCookieName,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
