import { createActionHeaders } from "@solana/actions";

// chainId and actionVersion matter: without X-Blockchain-Ids, Blink clients
// assume mainnet and may reject the Devnet transactions this API returns.
export const ACTION_HEADERS = {
  ...createActionHeaders({
    chainId: "devnet",
    actionVersion: "2.1.3",
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids",
      "Content-Type": "application/json",
    },
  }),
};

export function handleOptions() {
  return new Response(null, {
    status: 200,
    headers: ACTION_HEADERS,
  });
}

export function actionResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...ACTION_HEADERS, ...extraHeaders },
  });
}

export function actionError(message: string, status: number, extraHeaders: Record<string, string> = {}) {
  return actionResponse({ message }, status, extraHeaders);
}

/** Public origin used to build absolute URLs such as the Blink icon. */
export function getBaseUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  return (configured || new URL(request.url).origin).replace(/\/$/, "");
}
