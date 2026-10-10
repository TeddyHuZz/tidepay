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

const DASHBOARD_URL = (
  process.env.NEXT_PUBLIC_DASHBOARD_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { planAddress, planId, clientReferenceId, successUrl, cancelUrl } = body;

    const targetPlan = planAddress || planId;
    if (!targetPlan || typeof targetPlan !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: planAddress (or planId)" }),
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

    const plan = await client.getMerchantPlan(planPubkey);
    if (!plan) {
      return new Response(
        JSON.stringify({ error: "Plan not found on Solana Devnet" }),
        { status: 404, headers: CORS_HEADERS }
      );
    }

    if (!plan.isActive) {
      return new Response(
        JSON.stringify({ error: "This subscription plan is currently inactive" }),
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const sessionId = `cs_tide_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const queryParams = new URLSearchParams();
    if (clientReferenceId) queryParams.set("client_ref", String(clientReferenceId));
    if (successUrl) queryParams.set("success_url", String(successUrl));
    if (cancelUrl) queryParams.set("cancel_url", String(cancelUrl));

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
    const checkoutUrl = `${DASHBOARD_URL}/checkout/${planPubkey.toBase58()}${queryString}`;
    const actionUrl = `${API_URL}/api/actions/subscribe/${planPubkey.toBase58()}`;
    const blinkUrl = `https://dial.to/?action=solana-action:${encodeURIComponent(actionUrl)}&cluster=devnet`;

    const priceUsdc = (Number(plan.amount) / 1_000_000).toFixed(2);
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour session expiry

    return new Response(
      JSON.stringify({
        id: sessionId,
        object: "checkout.session",
        plan: {
          address: planPubkey.toBase58(),
          planId: plan.planId,
          priceUsdc,
          intervalSeconds: Number(plan.intervalSeconds),
          tokenMint: plan.tokenMint,
          merchant: plan.merchant,
          isActive: plan.isActive,
        },
        clientReferenceId: clientReferenceId || null,
        checkoutUrl,
        blinkUrl,
        expiresAt,
      }),
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("[TidePay API] Create Checkout Session error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error creating checkout session" }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
