import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Keypair, TransactionInstruction, VersionedTransaction } from "@solana/web3.js";
import type { MerchantPlan } from "@tidepay/types";

const mocks = vi.hoisted(() => ({
  getMerchantPlan: vi.fn(),
  buildSubscribeInstruction: vi.fn(),
}));

vi.mock("@tidepay/sdk", () => ({
  TidePayClient: class {
    getMerchantPlan = mocks.getMerchantPlan;
    buildSubscribeInstruction = mocks.buildSubscribeInstruction;
    findProgramAuthorityPda = () => [Keypair.generate().publicKey, 255];
  },
}));

vi.mock("@solana/web3.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@solana/web3.js")>();
  return {
    ...actual,
    Connection: class {
      getLatestBlockhash = async () => ({ blockhash: actual.Keypair.generate().publicKey.toBase58() });
      getBalance = async () => 0;
      getMinimumBalanceForRentExemption = async () => 1_000_000;
    },
  };
});

import { resetRateLimits } from "@/lib/rate-limit";
import { GET, OPTIONS, POST } from "./route";

const planKey = Keypair.generate().publicKey.toBase58();
const account = Keypair.generate().publicKey.toBase58();

const plan: MerchantPlan = {
  merchant: Keypair.generate().publicKey.toBase58(),
  tokenMint: Keypair.generate().publicKey.toBase58(),
  merchantTokenAccount: Keypair.generate().publicKey.toBase58(),
  amount: BigInt(29_000_000),
  intervalSeconds: BigInt(2_592_000),
  planId: "pro",
  protocolFeeBps: 0,
  crankBountyAmount: BigInt(10_000),
  isActive: true,
  bump: 255,
};

const ctx = (value: string) => ({ params: Promise.resolve({ plan: value }) });

function get(value = planKey) {
  return GET(new NextRequest(`http://localhost:3001/api/actions/subscribe/${value}`), ctx(value));
}

let ipCounter = 0;
function post(body: unknown, value = planKey, ip = `10.0.0.${++ipCounter}`) {
  return POST(
    new NextRequest(`http://localhost:3001/api/actions/subscribe/${value}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    ctx(value),
  );
}

beforeEach(() => {
  resetRateLimits();
  vi.unstubAllEnvs();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.getMerchantPlan.mockReset().mockResolvedValue(plan);
  mocks.buildSubscribeInstruction.mockReset().mockResolvedValue({
    instruction: new TransactionInstruction({
      programId: Keypair.generate().publicKey,
      keys: [],
      data: Buffer.from([1]),
    }),
    subscriptionPda: Keypair.generate().publicKey,
  });
});

describe("GET", () => {
  it("returns a spec-shaped action with Devnet headers", async () => {
    const res = await get();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("x-blockchain-ids")).toBe("solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1");
    expect(res.headers.get("x-action-version")).toBeTruthy();
    expect(body).toMatchObject({
      type: "action",
      icon: "http://localhost:3001/blink-icon.svg",
      title: "Subscribe to pro",
      label: "Subscribe (29.00)",
    });
    expect(body.links.actions[0].href).toBe(`/api/actions/subscribe/${planKey}`);
  });

  it("uses NEXT_PUBLIC_API_URL for the icon when set", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com/");
    expect((await (await get()).json()).icon).toBe("https://api.example.com/blink-icon.svg");
  });

  it("rejects an invalid plan address", async () => {
    expect((await get("nope")).status).toBe(400);
  });

  it("returns 404 for a missing or inactive plan", async () => {
    mocks.getMerchantPlan.mockResolvedValueOnce(null);
    expect((await get()).status).toBe(404);
    mocks.getMerchantPlan.mockResolvedValueOnce({ ...plan, isActive: false });
    expect((await get()).status).toBe(404);
  });

  it("returns a generic 502 without leaking the RPC error", async () => {
    mocks.getMerchantPlan.mockRejectedValueOnce(new Error("secret rpc url failure"));
    const res = await get();
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});

describe("OPTIONS", () => {
  it("answers the preflight", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-methods")).toBe("GET,POST,PUT,OPTIONS");
  });
});

describe("POST", () => {
  it("returns a v0 transaction for a valid subscriber", async () => {
    const res = await post({ account });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.type).toBe("transaction");
    expect(body.message).toContain("pro");
    const tx = VersionedTransaction.deserialize(Buffer.from(body.transaction, "base64"));
    expect(tx.version).toBe(0);
    expect(tx.message.staticAccountKeys[0].toBase58()).toBe(account);
  });

  it("rejects a non-JSON body with 400", async () => {
    expect((await post("not json")).status).toBe(400);
  });

  it("rejects a missing or invalid account with 400", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ account: "not-a-key" })).status).toBe(400);
    expect((await post({ account: 42 })).status).toBe(400);
  });

  it("rejects an invalid plan address with 400", async () => {
    expect((await post({ account }, "nope")).status).toBe(400);
  });

  it("returns 404 for a missing or inactive plan", async () => {
    mocks.getMerchantPlan.mockResolvedValueOnce({ ...plan, isActive: false });
    expect((await post({ account })).status).toBe(404);
  });

  it("returns a generic 502 when the transaction cannot be built", async () => {
    mocks.buildSubscribeInstruction.mockRejectedValueOnce(new Error("anchor internals"));
    const res = await post({ account });
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("anchor");
  });

  it("limits repeated requests for the same wallet", async () => {
    for (let i = 0; i < 5; i++) expect((await post({ account })).status).toBe(200);
    const res = await post({ account });
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("limits repeated requests from the same IP", async () => {
    let last = 0;
    for (let i = 0; i < 31; i++) last = (await post({ account: "bad" }, planKey, "9.9.9.9")).status;
    expect(last).toBe(429);
  });
});
