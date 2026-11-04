import { describe, expect, it } from "vitest";
import { createNearReader, tryCreateNearReader } from "./chain-ops";

describe("tryCreateNearReader", () => {
  it("returns null instead of throwing when no contract is configured", () => {
    expect(tryCreateNearReader("")).toBeNull();
    expect(() => createNearReader("")).toThrow(/NEXT_PUBLIC_TIDEPAY_NEAR_CONTRACT/);
  });

  it("returns a reader when a contract is configured", () => {
    expect(tryCreateNearReader("tidepay.testnet")).not.toBeNull();
  });
});
