import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createApproveInstruction,
} from "@solana/spl-token";
import { TidePayClient } from "@tidepay/sdk";
import { TIDEPAY_PROGRAM_ID } from "@tidepay/types";
import { ACTION_HEADERS, handleOptions } from "../../../../../lib/headers";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  process.env.SOLANA_RPC_URL ||
  "https://api.devnet.solana.com";

const connection = new Connection(RPC_URL, "confirmed");
const client = new TidePayClient(connection, undefined, TIDEPAY_PROGRAM_ID);

function formatInterval(seconds: bigint): string {
  const s = Number(seconds);
  if (s >= 86400 * 30) return `${Math.round(s / (86400 * 30))} month(s)`;
  if (s >= 86400 * 7) return `${Math.round(s / (86400 * 7))} week(s)`;
  if (s >= 86400) return `${Math.round(s / 86400)} day(s)`;
  if (s >= 3600) return `${Math.round(s / 3600)} hour(s)`;
  if (s >= 60) return `${Math.round(s / 60)} minute(s)`;
  return `${s} second(s)`;
}

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ plan: string }> }
) {
  try {
    const { plan: planAddress } = await context.params;

    let planPubkey: PublicKey;

    try {
      planPubkey = new PublicKey(planAddress);
    } catch {
      return NextResponse.json(
        { message: "Invalid plan public key" },
        { status: 400, headers: ACTION_HEADERS }
      );
    }

    const plan = await client.getMerchantPlan(planPubkey);
    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { message: "Plan not found or inactive" },
        { status: 404, headers: ACTION_HEADERS }
      );
    }

    const intervalText = formatInterval(plan.intervalSeconds);
    const amountFormatted = (Number(plan.amount) / 1_000_000).toLocaleString(
      undefined,
      { minimumFractionDigits: 2, maximumFractionDigits: 6 }
    );

    const payload = {
      type: "action",
      icon: "https://raw.githubusercontent.com/TeddyHuZz/tidepay/master/assets/banner.png",
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
    };

    return NextResponse.json(payload, { headers: ACTION_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Internal server error" },
      { status: 500, headers: ACTION_HEADERS }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ plan: string }> }
) {
  try {
    const { plan: planAddress } = await context.params;

    let planPubkey: PublicKey;

    try {
      planPubkey = new PublicKey(planAddress);
    } catch {
      return NextResponse.json(
        { message: "Invalid plan public key" },
        { status: 400, headers: ACTION_HEADERS }
      );
    }

    const body = await request.json();
    if (!body?.account) {
      return NextResponse.json(
        { message: "Missing 'account' field in request body" },
        { status: 400, headers: ACTION_HEADERS }
      );
    }

    let subscriber: PublicKey;
    try {
      subscriber = new PublicKey(body.account);
    } catch {
      return NextResponse.json(
        { message: "Invalid subscriber account address" },
        { status: 400, headers: ACTION_HEADERS }
      );
    }

    // 1. Fetch Plan data
    const plan = await client.getMerchantPlan(planPubkey);
    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { message: "Subscription plan not active or not found" },
        { status: 404, headers: ACTION_HEADERS }
      );
    }

    const tokenMint = new PublicKey(plan.tokenMint);
    const merchantTokenAccount = new PublicKey(plan.merchantTokenAccount);
    const [programAuthority] = client.findProgramAuthorityPda();

    // Derive subscriber's ATA
    const subscriberAta = getAssociatedTokenAddressSync(tokenMint, subscriber);

    // 2. Build instructions
    const instructions = [];

    // Ensure subscriber ATA exists
    instructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        subscriber,
        subscriberAta,
        subscriber,
        tokenMint
      )
    );

    // Approve recurring delegated pull allowance to TidePay Program Authority PDA
    // Sets a 12-cycle allowance ceiling
    const approvalCeiling = plan.amount * BigInt(12);
    instructions.push(
      createApproveInstruction(
        subscriberAta,
        programAuthority,
        subscriber,
        approvalCeiling
      )
    );

    // Build the Subscribe instruction (Epoch 0 pull & SubscriptionRecord init)
    const { instruction: subscribeIx } = await client.buildSubscribeInstruction({
      subscriber,
      plan: planPubkey,
      tokenMint,
      subscriberTokenAccount: subscriberAta,
      merchantTokenAccount,
    });
    instructions.push(subscribeIx);

    // 3. Compile VersionedTransaction (v0 message)
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    const messageV0 = new TransactionMessage({
      payerKey: subscriber,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    const serializedTx = Buffer.from(transaction.serialize()).toString("base64");

    const responsePayload = {
      transaction: serializedTx,
      message: `Authorized 1-click subscription for ${plan.planId}!`,
    };

    return NextResponse.json(responsePayload, { headers: ACTION_HEADERS });
  } catch (error: any) {
    console.error("[TidePay Blinks Action Error]:", error);
    return NextResponse.json(
      { message: error?.message || "Failed to construct Action transaction" },
      { status: 500, headers: ACTION_HEADERS }
    );
  }
}
