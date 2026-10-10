import { NextRequest } from "next/server";
import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
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
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { planAddress, planId, subscriber } = body;

    const targetPlan = planAddress || planId;
    if (!targetPlan || typeof targetPlan !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: planAddress (or planId)" }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!subscriber || typeof subscriber !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: subscriber (wallet public key)" }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let planPubkey: PublicKey;
    try {
      planPubkey = new PublicKey(targetPlan);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid Solana public key format for planAddress" }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let subscriberPubkey: PublicKey;
    try {
      subscriberPubkey = new PublicKey(subscriber);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid Solana public key format for subscriber" }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Derive and verify subscription record
    const [subscriptionPda] = client.findSubscriptionRecordPda(planPubkey, subscriberPubkey);
    const record = await client.getSubscriptionRecord(subscriptionPda);

    if (!record) {
      return new Response(
        JSON.stringify({
          error: "No active subscription record found for this subscriber and plan",
          plan: planPubkey.toBase58(),
          subscriber: subscriberPubkey.toBase58(),
          subscriptionPda: subscriptionPda.toBase58(),
        }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Build the cancel instruction
    const { instruction } = await client.buildCancelSubscriptionInstruction({
      subscriber: subscriberPubkey,
      plan: planPubkey,
    });

    // Build serialized versioned transaction
    const { blockhash } = await connection.getLatestBlockhash("confirmed");
    const message = new TransactionMessage({
      payerKey: subscriberPubkey,
      recentBlockhash: blockhash,
      instructions: [instruction],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    const base64Tx = Buffer.from(tx.serialize()).toString("base64");

    // Standard rent for SubscriptionRecord account (~138 bytes on Solana)
    const rentRefundLamports = 1497960;

    return new Response(
      JSON.stringify({
        status: "prepared",
        plan: planPubkey.toBase58(),
        subscriber: subscriberPubkey.toBase58(),
        subscriptionPda: subscriptionPda.toBase58(),
        rentRefundLamports,
        rentRefundSol: "0.00149796",
        transaction: base64Tx,
        message: "Cancellation transaction prepared. Have subscriber sign to revoke billing and receive rent refund.",
        instructions: [
          {
            programId: TIDEPAY_PROGRAM_ID,
            keys: [
              { pubkey: subscriberPubkey.toBase58(), isSigner: true, isWritable: true },
              { pubkey: planPubkey.toBase58(), isSigner: false, isWritable: false },
              { pubkey: subscriptionPda.toBase58(), isSigner: false, isWritable: true },
            ],
            data: Buffer.from(instruction.data).toString("base64"),
          },
        ],
      }),
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("[TidePay API] Cancel subscription error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error preparing cancellation transaction" }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
