import type { ActionError } from "./types";

// Solana devnet genesis-hash id, per the Actions spec (CAIP-2).
const DEVNET_BLOCKCHAIN_ID = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

export const ACTIONS_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids",
  "Content-Type": "application/json",
  "X-Action-Version": "2.1.3",
  "X-Blockchain-Ids": DEVNET_BLOCKCHAIN_ID,
};

export function actionResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: ACTIONS_CORS_HEADERS });
}

export function actionError(message: string, status: number) {
  const body: ActionError = { message };
  return actionResponse(body, status);
}

/** Preflight response shared by every Action route. */
export function actionsOptions() {
  return new Response(null, { status: 204, headers: ACTIONS_CORS_HEADERS });
}

/** Public origin used to build absolute URLs (icon, action hrefs). */
export function getBaseUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  return (configured ?? new URL(request.url).origin).replace(/\/$/, "");
}
