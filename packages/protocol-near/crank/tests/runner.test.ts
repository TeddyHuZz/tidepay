import { describe, it, expect, vi } from "vitest";
import {
  NearCrankRunner,
  decodeSubscriptionStorageKey,
  discoverSubscriptionsFromState,
  parseWatchList,
  type CrankClient,
} from "../src/runner.js";

const quiet = { log: vi.fn(), error: vi.fn() };
const ok = { status: { SuccessValue: "" }, transaction_outcome: { id: "hash1" } } as never;

function encodeSubscriptionKey(raw: string): string {
  const strBuf = Buffer.from(raw, "utf8");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(strBuf.length, 0);
  return Buffer.concat([Buffer.from("s"), lenBuf, strBuf]).toString("base64");
}

describe("NearCrankRunner", () => {
  it("settles only due subscriptions", async () => {
    const client: CrankClient = {
      isSubscriptionDue: vi.fn(async (_p, s) => s === "due.testnet"),
      processEpoch: vi.fn(async () => ok),
    };
    await new NearCrankRunner(
      client,
      [
        { planId: "p", subscriberId: "due.testnet" },
        { planId: "p", subscriberId: "later.testnet" },
      ],
      quiet,
    ).tick();

    expect(client.processEpoch).toHaveBeenCalledTimes(1);
    expect(client.processEpoch).toHaveBeenCalledWith({ planId: "p", subscriberId: "due.testnet" });
  });

  it("skips subscriptions with insufficient prepaid balance and registers bounty storage once", async () => {
    const registerStorage = vi.fn(async () => {});
    const client: CrankClient = {
      keeperAccountId: "keeper.testnet",
      getSubscription: vi.fn(async (_p, s) => ({
        plan_id: "p",
        subscriber_id: s,
        start_timestamp_ns: "1",
        last_epoch_timestamp_ns: "1",
        next_epoch_timestamp_ns: "1",
        cycle_count: 1,
        is_active: true,
        deposited_balance: s === "funded.testnet" ? "1000000" : "0",
      })),
      getPlan: vi.fn(async () => ({
        plan_id: "p",
        merchant_id: "m.testnet",
        token_id: "usdc.fakes.testnet",
        amount: "1000000",
        interval_seconds: 60,
        protocol_fee_bps: 50,
        crank_bounty: "50000",
        is_active: true,
        created_at_ns: "1",
      })),
      isStorageRegistered: vi.fn(async () => false),
      registerStorage,
      isSubscriptionDue: vi.fn(async () => true),
      processEpoch: vi.fn(async () => ok),
    };

    const runner = new NearCrankRunner(
      client,
      async () => [
        { planId: "p", subscriberId: "empty.testnet" },
        { planId: "p", subscriberId: "funded.testnet" },
      ],
      quiet,
    );

    await runner.tick();
    await runner.tick();

    expect(client.processEpoch).toHaveBeenCalledTimes(2);
    expect(client.processEpoch).toHaveBeenCalledWith({ planId: "p", subscriberId: "funded.testnet" });
    expect(registerStorage).toHaveBeenCalledTimes(1);
    expect(registerStorage).toHaveBeenCalledWith("usdc.fakes.testnet", "keeper.testnet");
  });

  it("keeps going after one subscription throws", async () => {
    const client: CrankClient = {
      isSubscriptionDue: vi.fn(async () => true),
      processEpoch: vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(ok),
    };
    await new NearCrankRunner(
      client,
      [
        { planId: "p", subscriberId: "a.testnet" },
        { planId: "p", subscriberId: "b.testnet" },
      ],
      quiet,
    ).tick();

    expect(client.processEpoch).toHaveBeenCalledTimes(2);
  });

  it("ignores a tick while the previous one is still running", async () => {
    let release!: () => void;
    const client: CrankClient = {
      isSubscriptionDue: vi.fn(() => new Promise<boolean>((r) => (release = () => r(false)))),
      processEpoch: vi.fn(),
    };
    const runner = new NearCrankRunner(client, [{ planId: "p", subscriberId: "a.testnet" }], quiet);
    const first = runner.tick();
    await runner.tick();
    expect(client.isSubscriptionDue).toHaveBeenCalledTimes(1);
    release();
    await first;
  });
});

describe("decodeSubscriptionStorageKey & discoverSubscriptionsFromState", () => {
  it("decodes Borsh LookupMap keys under prefix 's'", () => {
    const key = encodeSubscriptionKey("subscription-pro:swenfei.testnet");
    expect(decodeSubscriptionStorageKey(key)).toEqual({
      planId: "subscription-pro",
      subscriberId: "swenfei.testnet",
    });
  });

  it("rejects non-subscription or malformed keys", () => {
    const wrongPrefix = Buffer.concat([Buffer.from("p"), Buffer.from([1, 0, 0, 0]), Buffer.from("a")]).toString("base64");
    expect(decodeSubscriptionStorageKey(wrongPrefix)).toBeNull();
    expect(decodeSubscriptionStorageKey(encodeSubscriptionKey("nocolon"))).toBeNull();
  });

  it("discovers subscriptions via view_state", async () => {
    const provider = {
      query: vi.fn(async () => ({
        values: [
          { key: encodeSubscriptionKey("plan-a:alice.testnet"), value: "" },
          { key: encodeSubscriptionKey("plan-b:bob.testnet"), value: "" },
        ],
      })),
    };

    const subs = await discoverSubscriptionsFromState(provider, "contract.testnet");
    expect(subs).toEqual([
      { planId: "plan-a", subscriberId: "alice.testnet" },
      { planId: "plan-b", subscriberId: "bob.testnet" },
    ]);
    expect(provider.query).toHaveBeenCalledWith({
      request_type: "view_state",
      account_id: "contract.testnet",
      prefix_base64: Buffer.from("s").toString("base64"),
      finality: "optimistic",
    });
  });
});

describe("parseWatchList", () => {
  it("parses entries and rejects malformed ones", () => {
    expect(parseWatchList("a:x.testnet, b:y.testnet")).toEqual([
      { planId: "a", subscriberId: "x.testnet" },
      { planId: "b", subscriberId: "y.testnet" },
    ]);
    expect(() => parseWatchList("nocolon")).toThrow(/Invalid watch entry/);
  });
});
