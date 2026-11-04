import { describe, expect, it } from "vitest";
import { APP_URL, blinkUrl, checkoutUrl, explorerUrl, planLinks } from "./config";

const SOL_PLAN = "DfAycPzXuSu4EzqfAprZ11S8oQZ6nucuRniFNrNaK5CQ";

describe("planLinks", () => {
  it("leaves Solana plan links exactly as before", () => {
    const links = planLinks(SOL_PLAN);
    expect(links.checkout).toBe(checkoutUrl(SOL_PLAN));
    expect(links.blink).toBe(blinkUrl(SOL_PLAN));
    expect(links.explorerTx("sig")).toBe(explorerUrl("tx", "sig"));
    expect(links.explorerAddress("addr")).toBe(explorerUrl("address", "addr"));
    expect(links.checkoutPath).toBe(`/checkout/${SOL_PLAN}`);
    expect(links.detailPath("sol-plan")).toBe("/plans/sol-plan");
  });

  it("gives NEAR plans a NEAR checkout, no Blink, and nearblocks links", () => {
    const links = planLinks("near:pro-1");
    expect(links.checkout).toBe(`${APP_URL}/checkout/near/pro-1`);
    expect(links.blink).toBeNull();
    expect(links.checkoutPath).toBe("/checkout/near/pro-1");
    expect(links.detailPath("pro-1")).toBe("/plans/near%3Apro-1"); // by id, so a Solana plan with the same name cannot shadow it
    expect(links.explorerTx("HASH")).toBe("https://testnet.nearblocks.io/txns/HASH");
    expect(links.explorerAddress("acct")).toBe("https://testnet.nearblocks.io/address/acct");
  });
});
