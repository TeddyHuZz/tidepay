import { describe, expect, it } from "vitest";
import { nearBannerMessage } from "./status-banner";

describe("nearBannerMessage", () => {
  it("is silent when NEAR loaded fine or was never set up", () => {
    expect(nearBannerMessage(null)).toBeNull();
  });

  it("explains that only NEAR plans are missing, and that Solana data is shown", () => {
    const message = nearBannerMessage("rpc timeout");
    expect(message).toContain("NEAR");
    expect(message).toContain("Solana");
    expect(message).toContain("rpc timeout");
  });

  it("does not repeat an empty reason", () => {
    expect(nearBannerMessage("")).not.toMatch(/\(\s*\)/);
    expect(nearBannerMessage("")).toContain("NEAR");
  });
});
