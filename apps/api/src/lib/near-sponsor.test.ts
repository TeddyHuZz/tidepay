import { describe, expect, it, vi } from "vitest";
import {
  MIN_MERCHANT_NEAR_YOCTO,
  SPONSOR_AMOUNT_YOCTO,
  handleSponsor,
  isImplicitAccountId,
  sponsorAmount,
  type SponsorDeps,
} from "./near-sponsor";

const ID = "a".repeat(64);
const cfg = { networkId: "testnet" };

const deps = (balance: bigint): SponsorDeps & { transfer: ReturnType<typeof vi.fn> } => ({
  getBalance: vi.fn(async () => balance),
  transfer: vi.fn(async () => "tx-hash"),
});

describe("isImplicitAccountId", () => {
  it("accepts 64 lowercase hex characters", () => {
    expect(isImplicitAccountId(ID)).toBe(true);
    expect(isImplicitAccountId("0123456789abcdef".repeat(4))).toBe(true);
  });

  it.each([
    ["uppercase", "A".repeat(64)],
    ["63 chars", "a".repeat(63)],
    ["65 chars", "a".repeat(65)],
    ["named account", "alice.testnet"],
    ["empty", ""],
    ["non-hex", "g".repeat(64)],
  ])("rejects %s", (_n, value) => {
    expect(isImplicitAccountId(value)).toBe(false);
  });
});

describe("sponsorAmount", () => {
  it("tops up only below the minimum balance", () => {
    expect(sponsorAmount(0n)).toBe(SPONSOR_AMOUNT_YOCTO);
    expect(sponsorAmount(MIN_MERCHANT_NEAR_YOCTO - 1n)).toBe(SPONSOR_AMOUNT_YOCTO);
    expect(sponsorAmount(MIN_MERCHANT_NEAR_YOCTO)).toBe(0n);
  });
});

describe("handleSponsor", () => {
  it("rejects a non-implicit account id with 400", async () => {
    const d = deps(0n);
    expect((await handleSponsor({ accountId: "alice.testnet" }, cfg, d)).status).toBe(400);
    expect(d.transfer).not.toHaveBeenCalled();
  });

  it("rejects a missing body field with 400", async () => {
    expect((await handleSponsor({}, cfg, deps(0n))).status).toBe(400);
  });

  it("is unavailable (503) when not configured or on mainnet", async () => {
    expect((await handleSponsor({ accountId: ID }, null, deps(0n))).status).toBe(503);
    const d = deps(0n);
    expect((await handleSponsor({ accountId: ID }, { networkId: "mainnet" }, d)).status).toBe(503);
    expect(d.transfer).not.toHaveBeenCalled();
  });

  it("does not transfer to an account that already has enough NEAR", async () => {
    const d = deps(MIN_MERCHANT_NEAR_YOCTO);
    const res = await handleSponsor({ accountId: ID }, cfg, d);
    expect(res).toEqual({ status: 200, body: { funded: false, balanceYocto: MIN_MERCHANT_NEAR_YOCTO.toString() } });
    expect(d.transfer).not.toHaveBeenCalled();
  });

  it("sends exactly the sponsor amount to an empty account", async () => {
    const d = deps(0n);
    const res = await handleSponsor({ accountId: ID }, cfg, d);
    expect(res).toEqual({ status: 200, body: { funded: true, balanceYocto: "0", txHash: "tx-hash" } });
    expect(d.transfer).toHaveBeenCalledTimes(1);
    expect(d.transfer).toHaveBeenCalledWith(ID, SPONSOR_AMOUNT_YOCTO);
  });

  it("reports an RPC failure as 502 without transferring", async () => {
    const d: SponsorDeps = { getBalance: vi.fn().mockRejectedValue(new Error("rpc down")), transfer: vi.fn() };
    expect((await handleSponsor({ accountId: ID }, cfg, d)).status).toBe(502);
    expect(d.transfer).not.toHaveBeenCalled();
  });
});
