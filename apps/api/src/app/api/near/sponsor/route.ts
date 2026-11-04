import { NextRequest } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { handleSponsor, sponsorFromEnv } from "@/lib/near-sponsor";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const IP_LIMIT = 5;
const WINDOW_MS = 60_000;

export const OPTIONS = () => new Response(null, { status: 200, headers: CORS });

/** Funds a new embedded NEAR account on testnet. Body: { accountId } (64-hex implicit account). */
export async function POST(request: NextRequest) {
  const limit = checkRateLimit(`near-sponsor:${clientIp(request)}`, IP_LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return Response.json({ error: "Too many requests" }, { status: 429, headers: { ...CORS, "Retry-After": String(limit.retryAfterSeconds) } });
  }

  const sponsor = sponsorFromEnv();
  const body = await request.json().catch(() => null);
  const { status, body: payload } = await handleSponsor(
    body,
    sponsor?.config ?? null,
    sponsor?.deps ?? { getBalance: async () => 0n, transfer: async () => "" },
  );
  return Response.json(payload, { status, headers: CORS });
}
