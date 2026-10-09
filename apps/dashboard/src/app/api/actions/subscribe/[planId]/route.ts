import { PublicKey } from "@solana/web3.js";
import { SubscribeTxUnavailableError, buildSubscribeTransaction } from "@/lib/actions/build-subscribe-tx";
import { actionError, actionResponse, actionsOptions, getBaseUrl } from "@/lib/actions/http";
import type { ActionGetResponse, ActionPostRequest, ActionPostResponse } from "@/lib/actions/types";
import { getInterval, getPlan } from "@/lib/mock-data";

type Context = RouteContext<"/api/actions/subscribe/[planId]">;

export async function GET(request: Request, ctx: Context) {
  const { planId } = await ctx.params;
  const plan = getPlan(planId);
  if (!plan) return actionError("Plan not found.", 404);

  const interval = getInterval(plan.interval);
  const base = getBaseUrl(request);
  const price = `${plan.priceUsdc} USDC`;

  const body: ActionGetResponse = {
    type: "action",
    icon: `${base}/blink-icon.svg`,
    title: plan.name,
    description:
      `${price} every ${interval.unit}, paid in USDC. You approve a recurring allowance once; ` +
      `each renewal is pulled from your wallet and no funds are held in escrow.` +
      (plan.interval === "demo" ? " Demo plan: renews every 60 seconds on Devnet." : ""),
    label: "Subscribe",
    links: {
      actions: [
        {
          type: "transaction",
          label: `Subscribe · ${price}`,
          href: `${base}/api/actions/subscribe/${plan.id}`,
        },
      ],
    },
  };

  return actionResponse(body);
}

export async function POST(request: Request, ctx: Context) {
  const { planId } = await ctx.params;
  const plan = getPlan(planId);
  if (!plan) return actionError("Plan not found.", 404);

  let account: string | undefined;
  try {
    const payload = (await request.json()) as Partial<ActionPostRequest>;
    account = typeof payload.account === "string" ? payload.account : undefined;
  } catch {
    return actionError("Request body must be JSON with an `account` field.", 400);
  }

  let subscriber: PublicKey;
  try {
    if (!account) throw new Error("missing account");
    subscriber = new PublicKey(account);
  } catch {
    return actionError("Invalid `account`: expected a base58 Solana public key.", 400);
  }

  try {
    const { transaction, message } = await buildSubscribeTransaction(plan, subscriber);
    const body: ActionPostResponse = { type: "transaction", transaction, message };
    return actionResponse(body);
  } catch (error) {
    if (error instanceof SubscribeTxUnavailableError) return actionError(error.message, 501);
    return actionError("Could not build the transaction. Please try again.", 502);
  }
}

export const OPTIONS = actionsOptions;
