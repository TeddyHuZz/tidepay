import { describe, expect, it, vi } from "vitest";
import { MIN_MERCHANT_NEAR_YOCTO } from "./config";
import { NearDerivationMismatchError } from "./derive-key";
import { prepareNearAccount, type ChainOps, type PrepareDeps } from "./prepare";

const SIGNATURE = new Uint8Array(64).map((_, i) => i + 1);

function setup(overrides: { balance?: bigint; registered?: boolean; stored?: string | null } = {}) {
  const calls: string[] = [];
  const store = new Map<string, string>();
  if (overrides.stored) store.set("tidepay:near:pk:SoLaNa", overrides.stored);
  let balance = overrides.balance ?? BigInt(0);

  const ops: ChainOps = {
    getBalance: vi.fn(async () => balance),
    isRegistered: vi.fn(async () => overrides.registered ?? false),
    register: vi.fn(async () => void calls.push("register")),
  };
  const deps: PrepareDeps = {
    solanaAddress: "SoLaNa",
    signDerivationMessage: vi.fn(async () => SIGNATURE),
    storage: { get: (k) => store.get(k) ?? null, set: (k, v) => void store.set(k, v) },
    sponsor: vi.fn(async () => {
      calls.push("sponsor");
      balance = MIN_MERCHANT_NEAR_YOCTO * BigInt(5); // the top-up lands
    }),
    connect: vi.fn(() => ops),
    onStatus: (s) => void calls.push(`status:${s}`),
    sleep: async () => {},
  };
  return { deps, ops, calls, store };
}

describe("prepareNearAccount", () => {
  it("derives, funds, then registers, in that order, and remembers the public key", async () => {
    const { deps, calls, store } = setup();
    const result = await prepareNearAccount(deps);

    expect(calls).toEqual(["status:deriving", "status:funding", "sponsor", "status:registering", "register"]);
    expect(result.accountId).toMatch(/^[0-9a-f]{64}$/);
    expect(store.get("tidepay:near:pk:SoLaNa")).toBe(result.keyPair.getPublicKey().toString());
  });

  it("skips funding and registration when the account is already set up", async () => {
    const { deps, ops } = setup({ balance: MIN_MERCHANT_NEAR_YOCTO, registered: true });
    await prepareNearAccount(deps);

    expect(deps.sponsor).not.toHaveBeenCalled();
    expect(ops.register).not.toHaveBeenCalled();
  });

  it("is stable across runs: the same signature gives the same account", async () => {
    const first = await prepareNearAccount(setup().deps);
    const second = await prepareNearAccount(setup().deps);
    expect(second.accountId).toBe(first.accountId);
  });

  it("refuses a wallet whose derived key changed, before spending anything", async () => {
    const { deps } = setup({ stored: "ed25519:SomeOtherKey" });
    await expect(prepareNearAccount(deps)).rejects.toThrow(NearDerivationMismatchError);
    expect(deps.sponsor).not.toHaveBeenCalled();
    expect(deps.connect).not.toHaveBeenCalled();
  });

  it("fails clearly when the sponsor top-up never arrives", async () => {
    const { deps } = setup();
    deps.sponsor = vi.fn(async () => {}); // request accepted but balance stays 0
    await expect(prepareNearAccount(deps)).rejects.toThrow(/funding/i);
  });

  it("does not report ready when token registration fails", async () => {
    const { deps, ops } = setup({ balance: MIN_MERCHANT_NEAR_YOCTO });
    vi.mocked(ops.register).mockRejectedValueOnce(new Error("storage_deposit failed"));
    await expect(prepareNearAccount(deps)).rejects.toThrow("storage_deposit failed");
  });
});
