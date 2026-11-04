import { describe, expect, it } from "vitest";
import { describeNearError } from "./errors";

describe("describeNearError", () => {
  it.each([
    ["ERR_PLAN_EXISTS: Plan ID already exists", "A plan with this ID already exists on NEAR. Choose another ID."],
    ["ERR_INVALID_INTERVAL: Interval must be at least 60 seconds", "The billing interval must be at least 60 seconds."],
    ["ERR_INVALID_BOUNTY: Protocol fee plus crank bounty exceeds plan amount", "The price is too low to cover the protocol fee and renewal fee."],
    ["ERR_INVALID_FEE: Fee cannot exceed 500 bps (5%)", "The protocol fee is above the 5% maximum."],
    ["ERR_PLAN_NOT_FOUND: Plan does not exist", "This plan does not exist on NEAR."],
    ["ERR_UNAUTHORIZED: Caller is not authorized", "Only the plan's merchant can do this."],
  ])("maps %s", (raw, friendly) => {
    expect(describeNearError(new Error(`Smart contract panicked: ${raw}`))).toBe(friendly);
  });

  it("falls back to the message, and to a generic text for unknown values", () => {
    expect(describeNearError(new Error("rpc timeout"))).toBe("rpc timeout");
    expect(describeNearError(42)).toBe("Something went wrong on NEAR. Please try again.");
  });
});
