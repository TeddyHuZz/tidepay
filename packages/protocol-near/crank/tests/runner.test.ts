import { describe, it, expect, vi } from "vitest";
import { NearCrankRunner, parseWatchList, type CrankClient } from "../src/runner.js";

const quiet = { log: vi.fn(), error: vi.fn() };
const ok = { status: { SuccessValue: "" }, transaction_outcome: { id: "hash1" } } as never;

describe("NearCrankRunner", () => {
  it("settles only due subscriptions", async () => {
    const client: CrankClient = {
      isSubscriptionDue: vi.fn(async (_p, s) => s === "due.testnet"),
      processEpoch: vi.fn(async () => ok),
    };
    await new NearCrankRunner(client, [
      { planId: "p", subscriberId: "due.testnet" },
      { planId: "p", subscriberId: "later.testnet" },
    ], quiet).tick();

    expect(client.processEpoch).toHaveBeenCalledTimes(1);
    expect(client.processEpoch).toHaveBeenCalledWith({ planId: "p", subscriberId: "due.testnet" });
  });

  it("keeps going after one subscription throws", async () => {
    const client: CrankClient = {
      isSubscriptionDue: vi.fn(async () => true),
      processEpoch: vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(ok),
    };
    await new NearCrankRunner(client, [
      { planId: "p", subscriberId: "a.testnet" },
      { planId: "p", subscriberId: "b.testnet" },
    ], quiet).tick();

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

describe("parseWatchList", () => {
  it("parses entries and rejects malformed ones", () => {
    expect(parseWatchList("a:x.testnet, b:y.testnet")).toEqual([
      { planId: "a", subscriberId: "x.testnet" },
      { planId: "b", subscriberId: "y.testnet" },
    ]);
    expect(() => parseWatchList("nocolon")).toThrow(/Invalid watch entry/);
  });
});
