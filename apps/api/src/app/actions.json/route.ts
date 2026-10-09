import { NextResponse } from "next/server";
import { ACTION_HEADERS, handleOptions } from "../../lib/headers";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET() {
  const payload = {
    rules: [
      {
        pathPattern: "/api/actions/**",
        apiPath: "/api/actions/**",
      },
      {
        pathPattern: "/subscribe/**",
        apiPath: "/api/actions/subscribe/**",
      },
    ],
  };

  return NextResponse.json(payload, {
    headers: ACTION_HEADERS,
  });
}
