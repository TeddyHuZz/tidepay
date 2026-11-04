import { NextRequest } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { getStatus, submitDeposit } from "@/lib/near-intents";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const IP_LIMIT = 60;
const WINDOW_MS = 60_000;

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...CORS, ...extra } });

export const OPTIONS = () => new Response(null, { status: 200, headers: CORS });

function limited(request: NextRequest) {
  const r = checkRateLimit(`near-deposit:${clientIp(request)}`, IP_LIMIT, WINDOW_MS);
  return r.ok ? null : json({ error: "Too many requests" }, 429, { "Retry-After": String(r.retryAfterSeconds) });
}

/** Tell 1Click about the origin-chain deposit tx so it can settle faster. Body: { txHash, depositAddress }. */
export async function POST(request: NextRequest) {
  const blocked = limited(request);
  if (blocked) return blocked;

  const body = (await request.json().catch(() => null)) as { txHash?: unknown; depositAddress?: unknown } | null;
  if (typeof body?.txHash !== "string" || typeof body?.depositAddress !== "string" || !body.txHash || !body.depositAddress) {
    return json({ error: "txHash and depositAddress are required" }, 400);
  }
  try {
    const { status, data } = await submitDeposit(body.txHash, body.depositAddress);
    return json(data, status);
  } catch {
    return json({ error: "1Click API unreachable" }, 502);
  }
}

/** Poll swap progress: GET ?depositAddress=... (PENDING_DEPOSIT, PROCESSING, SUCCESS, REFUNDED, FAILED, ...). */
export async function GET(request: NextRequest) {
  const blocked = limited(request);
  if (blocked) return blocked;

  const depositAddress = request.nextUrl.searchParams.get("depositAddress");
  if (!depositAddress) return json({ error: "depositAddress is required" }, 400);
  try {
    const { status, data } = await getStatus(depositAddress);
    return json(data, status);
  } catch {
    return json({ error: "1Click API unreachable" }, 502);
  }
}
