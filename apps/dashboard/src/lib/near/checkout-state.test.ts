import { describe, expect, it } from "vitest";
import { nearCheckoutState, prepaidAmount } from "./checkout-state";

const NS = BigInt(1_000_000_000);
const at = (seconds: number) => String(BigInt(seconds) * NS);
const NOW_NS = BigInt(10_000) * NS;
const active = { active: true };
const sub = (over: Partial<{ is_active: boolean; next_epoch_timestamp_ns: string }> = {}) => ({
  is_active: true,
  next_epoch_timestamp_ns: at(10_500),
  ...over,
});
const base = { plan: active, subscription: null, balance: BigInt(60), required: BigInt(30), nowNs: NOW_NS };

describe("nearCheckoutState", () => {
  it("no-plan when the plan does not exist", () => {
    expect(nearCheckoutState({ ...base, plan: null })).toBe("no-plan");
  });

  it("paused for a new subscriber when the plan is inactive", () => {
    expect(nearCheckoutState({ ...base, plan: { active: false } })).toBe("paused");
  });

  it("an existing subscriber can still manage a paused plan", () => {
    expect(nearCheckoutState({ ...base, plan: { active: false }, subscription: sub() })).toBe("subscribed");
  });

  it("needs-funds when the wallet cannot cover the prepaid amount", () => {
    expect(nearCheckoutState({ ...base, balance: BigInt(29) })).toBe("needs-funds");
  });

  it("ready exactly at the required balance", () => {
    expect(nearCheckoutState({ ...base, balance: BigInt(30) })).toBe("ready");
  });

  it("subscribed while the next renewal is in the future", () => {
    expect(nearCheckoutState({ ...base, subscription: sub() })).toBe("subscribed");
  });

  it("past-due once the renewal is more than the grace period late", () => {
    expect(nearCheckoutState({ ...base, subscription: sub({ next_epoch_timestamp_ns: at(10_000 - 500) }) })).toBe("past-due");
  });

  it("a cancelled subscription is treated as no subscription", () => {
    expect(nearCheckoutState({ ...base, subscription: sub({ is_active: false }) })).toBe("ready");
  });

  it("a subscribed wallet never shows needs-funds", () => {
    expect(nearCheckoutState({ ...base, balance: BigInt(0), subscription: sub() })).toBe("subscribed");
  });
});

describe("prepaidAmount", () => {
  it("is price times the chosen number of cycles", () => {
    expect(prepaidAmount("29.00", 3)).toBe(BigInt(87_000_000));
    expect(prepaidAmount("0.50", 12)).toBe(BigInt(6_000_000));
  });

  it("is zero for an unparsable price, so the card never offers a 0-token subscribe", () => {
    expect(prepaidAmount("abc", 3)).toBe(BigInt(0));
  });

  it("rejects cycle counts outside 1 to 12", () => {
    expect(prepaidAmount("1.00", 0)).toBe(BigInt(0));
    expect(prepaidAmount("1.00", 13)).toBe(BigInt(0));
  });
});
