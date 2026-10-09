import { NextRequest } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { TidePayClient } from "@tidepay/sdk";
import { TIDEPAY_PROGRAM_ID } from "@tidepay/types";
import { buildSubscribeTransaction } from "@/lib/build-subscribe-tx";
import { actionError, actionResponse, getBaseUrl, handleOptions } from "@/lib/headers";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { getRelayerKeypair } from "@/lib/relayer";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  process.env.SOLANA_RPC_URL ||
  "https://api.devnet.solana.com";

const connection = new Connection(RPC_URL, "confirmed");
const client = new TidePayClient(connection, undefined, TIDEPAY_PROGRAM_ID);

const WINDOW_MS = 60_000;
const IP_LIMIT = 30;
const ACCOUNT_LIMIT = 5;

type Context = { params: Promise<{ plan: string }> };

function formatInterval(seconds: bigint): string {
  const s = Number(seconds);
  if (s >= 86400 * 30) return `${Math.round(s / (86400 * 30))} month(s)`;
  if (s >= 86400 * 7) return `${Math.round(s / (86400 * 7))} week(s)`;
  if (s >= 86400) return `${Math.round(s / 86400)} day(s)`;
  if (s >= 3600) return `${Math.round(s / 3600)} hour(s)`;
  if (s >= 60) return `${Math.round(s / 60)} minute(s)`;
  return `${s} second(s)`;
}

function parsePublicKey(value: string | undefined): PublicKey | null {
  if (!value) return null;
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

function tooManyRequests(retryAfterSeconds: number) {
  return actionError("Too many requests. Please wait a moment and try again.", 429, {
    "Retry-After": String(retryAfterSeconds),
  });
}

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest, context: Context) {
  const { plan: planAddress } = await context.params;

  const planPubkey = parsePublicKey(planAddress);
  if (!planPubkey) return actionError("Invalid plan public key", 400);

  try {
    const plan = await client.getMerchantPlan(planPubkey);
    if (!plan || !plan.isActive) return actionError("Plan not found or inactive", 404);

    const intervalText = formatInterval(plan.intervalSeconds);
    const amountFormatted = (Number(plan.amount) / 1_000_000).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });

    return actionResponse({
      type: "action",
      icon: `${getBaseUrl(request)}/blink-icon.svg`,
      title: `Subscribe to ${plan.planId}`,
      description: `Non-custodial recurring subscription. Charges ${amountFormatted} tokens every ${intervalText}. Zero lockups; cancel or revoke anytime with 1-click.`,
      label: `Subscribe (${amountFormatted})`,
      links: {
        actions: [
          {
            type: "transaction",
            label: `Subscribe (${amountFormatted})`,
            href: `/api/actions/subscribe/${planAddress}`,
          },
        ],
      },
    });
  } catch (error) {
    console.error("[TidePay Blinks] GET failed:", error);
    return actionError("Could not load this plan. Please try again.", 502);
  }
}

export async function POST(request: NextRequest, context: Context) {
  const ip = checkRateLimit(`ip:${clientIp(request)}`, IP_LIMIT, WINDOW_MS);
  if (!ip.ok) return tooManyRequests(ip.retryAfterSeconds);

  const { plan: planAddress } = await context.params;
  const planPubkey = parsePublicKey(planAddress);
  if (!planPubkey) return actionError("Invalid plan public key", 400);

  let body: { account?: unknown };
  try {
    body = (await request.json()) as { account?: unknown };
  } catch {
    return actionError("Request body must be JSON with an `account` field.", 400);
  }
  if (!body?.account) return actionError("Missing 'account' field in request body", 400);

  const subscriber = parsePublicKey(typeof body.account === "string" ? body.account : undefined);
  if (!subscriber) return actionError("Invalid subscriber account address", 400);

  const wallet = checkRateLimit(`account:${subscriber.toBase58()}`, ACCOUNT_LIMIT, WINDOW_MS);
  if (!wallet.ok) return tooManyRequests(wallet.retryAfterSeconds);

  try {
    const plan = await client.getMerchantPlan(planPubkey);
    if (!plan || !plan.isActive) return actionError("Subscription plan not active or not found", 404);

    const { transaction, sponsored } = await buildSubscribeTransaction({
      connection,
      client,
      planPubkey,
      plan,
      subscriber,
      relayer: getRelayerKeypair(),
    });

    return actionResponse({
      type: "transaction",
      transaction,
      message: `Authorized 1-click subscription for ${plan.planId}!${sponsored ? " Network fee sponsored." : ""}`,
    });
  } catch (error) {
    console.error("[TidePay Blinks] POST failed:", error);
    return actionError("Could not build the transaction. Please try again.", 502);
  }
}
