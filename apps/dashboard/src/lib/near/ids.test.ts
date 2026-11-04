import { describe, expect, it } from "vitest";
import { fromNearPlanId, isNearPlanId, toNearPlanId } from "./ids";

describe("near plan ids", () => {
  it("round-trips a plan id", () => {
    expect(toNearPlanId("pro-monthly")).toBe("near:pro-monthly");
    expect(fromNearPlanId("near:pro-monthly")).toBe("pro-monthly");
  });

  it("recognises NEAR ids and not Solana addresses", () => {
    expect(isNearPlanId("near:pro")).toBe(true);
    expect(isNearPlanId("DfAycPzXuSu4EzqfAprZ11S8oQZ6nucuRniFNrNaK5CQ")).toBe(false);
    expect(isNearPlanId("near:")).toBe(false);
    expect(isNearPlanId("")).toBe(false);
  });

  it("leaves a non-NEAR id unchanged", () => {
    expect(fromNearPlanId("abc")).toBe("abc");
  });
});
