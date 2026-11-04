import { NextRequest } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { parseQuoteInput, requestQuote } from "@/lib/near-intents";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const IP_LIMIT = 20;
const WINDOW_MS = 60_000;

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...CORS, ...extra } });

export const OPTIONS = () => new Response(null, { status: 200, headers: CORS });

/** Quote a cross-chain deposit that delivers USDC to a NEAR account (which then subscribes via ft_transfer_call). */
export async function POST(request: NextRequest) {
  const limit = checkRateLimit(`near-quote:${clientIp(request)}`, IP_LIMIT, WINDOW_MS);
  if (!limit.ok) return json({ error: "Too many requests" }, 429, { "Retry-After": String(limit.retryAfterSeconds) });

  const body = await request.json().catch(() => null);
  const input = parseQuoteInput(body);
  if (!input.ok) return json({ error: input.error }, 400);

  try {
    const { status, data } = await requestQuote(input.value);
    return json(data, status);
  } catch {
    return json({ error: "1Click API unreachable" }, 502);
  }
}
