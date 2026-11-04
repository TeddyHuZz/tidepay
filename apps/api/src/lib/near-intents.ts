// Thin server-side proxy for the NEAR Intents 1Click API. The optional JWT stays on the server.

const ONECLICK_BASE_URL = process.env.ONECLICK_API_URL ?? "https://1click.chaindefuser.com";
const QUOTE_DEADLINE_MS = 10 * 60_000;
const DEFAULT_SLIPPAGE_BPS = 100; // 1%

/** Native USDC on NEAR, the token TidePay plans are priced in. */
export const NEAR_USDC_ASSET = "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";

const NEAR_ACCOUNT_RE = /^(?=.{2,64}$)([a-z\d]+[-_])*[a-z\d]+(\.([a-z\d]+[-_])*[a-z\d]+)*$/;
const ASSET_RE = /^nep141:[a-zA-Z0-9._-]+$/;
const AMOUNT_RE = /^[1-9]\d{0,38}$/;

export interface QuoteInput {
  originAsset: string; // 1Click asset id, e.g. nep141:sol-5ce3...omft.near
  amount: string; // smallest units of originAsset
  refundTo: string; // address on the origin chain
  recipient: string; // NEAR account that receives USDC
  dry?: boolean;
}

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseQuoteInput(body: unknown): Validated<QuoteInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const { originAsset, amount, refundTo, recipient } = b;
  if (typeof originAsset !== "string" || !ASSET_RE.test(originAsset)) return { ok: false, error: "originAsset must be a 1Click asset id (nep141:...)" };
  if (typeof amount !== "string" || !AMOUNT_RE.test(amount)) return { ok: false, error: "amount must be a positive integer string in smallest units" };
  if (typeof refundTo !== "string" || !refundTo.trim()) return { ok: false, error: "refundTo (origin-chain address) is required" };
  if (typeof recipient !== "string" || !NEAR_ACCOUNT_RE.test(recipient)) return { ok: false, error: "recipient must be a valid NEAR account id" };
  return { ok: true, value: { originAsset, amount, refundTo: refundTo.trim(), recipient, dry: b.dry === true } };
}

async function oneClick(path: string, init: RequestInit & { query?: Record<string, string> } = {}) {
  const { query, ...rest } = init;
  const url = new URL(path, ONECLICK_BASE_URL);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
  const jwt = process.env.ONECLICK_JWT;
  const res = await fetch(url, {
    ...rest,
    headers: { "Content-Type": "application/json", ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
  });
  const data: unknown = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

export function requestQuote(q: QuoteInput, now = Date.now()) {
  return oneClick("/v0/quote", {
    method: "POST",
    body: JSON.stringify({
      dry: q.dry ?? false,
      swapType: "EXACT_INPUT",
      slippageTolerance: DEFAULT_SLIPPAGE_BPS,
      originAsset: q.originAsset,
      depositType: "ORIGIN_CHAIN",
      destinationAsset: NEAR_USDC_ASSET,
      amount: q.amount,
      refundTo: q.refundTo,
      refundType: "ORIGIN_CHAIN",
      recipient: q.recipient,
      recipientType: "DESTINATION_CHAIN",
      deadline: new Date(now + QUOTE_DEADLINE_MS).toISOString(),
    }),
  });
}

export const submitDeposit = (txHash: string, depositAddress: string) =>
  oneClick("/v0/deposit/submit", { method: "POST", body: JSON.stringify({ txHash, depositAddress }) });

export const getStatus = (depositAddress: string) => oneClick("/v0/status", { query: { depositAddress } });
