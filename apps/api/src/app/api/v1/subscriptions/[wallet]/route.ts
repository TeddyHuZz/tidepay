import { NextRequest } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { TidePayClient } from "@tidepay/sdk";
import { TIDEPAY_PROGRAM_ID } from "@tidepay/types";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  process.env.SOLANA_RPC_URL ||
  "https://api.devnet.solana.com";

const connection = new Connection(RPC_URL, "confirmed");
const client = new TidePayClient(connection, undefined, TIDEPAY_PROGRAM_ID);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

type Context = { params: Promise<{ wallet: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { wallet: walletAddress } = await context.params;
    const { searchParams } = new URL(request.url);
    const planAddress = searchParams.get("plan");

    let subscriberPubkey: PublicKey;
    try {
      subscriberPubkey = new PublicKey(walletAddress);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid Solana public key format for wallet" }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!planAddress) {
      return new Response(
        JSON.stringify({
          error: "Missing required query parameter: ?plan=<planAddress>",
        }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let planPubkey: PublicKey;
    try {
      planPubkey = new PublicKey(planAddress);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid Solana public key format for plan" }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Derive deterministic on-chain SubscriptionRecord PDA
    const [subscriptionPda] = client.findSubscriptionRecordPda(planPubkey, subscriberPubkey);
    const record = await client.getSubscriptionRecord(subscriptionPda);

    if (!record) {
      return new Response(
        JSON.stringify({
          isSubscribed: false,
          status: "Inactive",
          subscriber: subscriberPubkey.toBase58(),
          plan: planPubkey.toBase58(),
          subscriptionPda: subscriptionPda.toBase58(),
          cycleCount: 0,
          reason: "no_active_record_found",
        }),
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const currentUnix = BigInt(Math.floor(Date.now() / 1000));
    // 120s grace period for decentralized keeper crank execution
    const graceWindow = 120n;
    const isDue = currentUnix > record.nextEpochTimestamp;
    const isPastDue = currentUnix > record.nextEpochTimestamp + graceWindow;

    let status = "Active";
    if (!record.isActive) {
      status = "Cancelled";
    } else if (isPastDue) {
      status = "PastDue";
    }

    const isSubscribed = record.isActive && !isPastDue;
    const nextBillingDate = new Date(Number(record.nextEpochTimestamp) * 1000).toISOString();

    return new Response(
      JSON.stringify({
        isSubscribed,
        status,
        subscriber: record.subscriber,
        plan: record.plan,
        subscriptionPda: subscriptionPda.toBase58(),
        cycleCount: Number(record.cycleCount),
        startTimestamp: Number(record.startTimestamp),
        lastEpochTimestamp: Number(record.lastEpochTimestamp),
        nextEpochTimestamp: Number(record.nextEpochTimestamp),
        nextBillingDate,
        isRenewalDue: isDue,
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("[TidePay API] Get Subscription error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error fetching subscription record" }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
