import { createActionHeaders } from "@solana/actions";

export const ACTION_HEADERS = {
  ...createActionHeaders({
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
