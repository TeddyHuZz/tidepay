// Answers /checkout/<planId> with a real 404 when the plan cannot exist.
// The page streams under Suspense, and a notFound() thrown mid-stream can no
// longer change the 200 status, so the check has to run here, before render.
import { NextResponse, type NextRequest } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { RPC_URL, USE_SAMPLE_DATA } from "@/lib/chain/config";
import { isPlanAccount } from "@/lib/chain/plan-account";

export const config = {
  matcher: "/checkout/:planId",
};

const connection = new Connection(RPC_URL, "confirmed");

export async function proxy(request: NextRequest) {
  if (USE_SAMPLE_DATA) return NextResponse.next();

  let address: PublicKey;
  try {
    address = new PublicKey(decodeURIComponent(request.nextUrl.pathname.split("/")[2] ?? ""));
  } catch {
    return notFoundResponse(request);
  }

  try {
    const account = await connection.getAccountInfo(address);
    if (!isPlanAccount(account)) return notFoundResponse(request);
  } catch {
    // RPC unavailable: let the page render and report the problem itself.
  }
  return NextResponse.next();
}

function notFoundResponse(request: NextRequest) {
  // No route matches this path, so Next renders app/not-found.tsx with a 404.
  return NextResponse.rewrite(new URL("/checkout-not-found", request.url), { status: 404 });
}
