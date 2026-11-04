import { afterEach, describe, expect, it, vi } from "vitest";
import { NEAR_USDC_ASSET, getStatus, parseQuoteInput, requestQuote } from "./near-intents";

const valid = {
  originAsset: "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near",
  amount: "10000000",
  refundTo: "13QkxhNMrTPxoCkRdYdJ65tFuwXPhL5gLS2Z5Nr6gjRK",
  recipient: "alice.testnet",
};

afterEach(() => vi.unstubAllGlobals());

describe("parseQuoteInput", () => {
  it("accepts a valid body", () => {
    expect(parseQuoteInput(valid)).toMatchObject({ ok: true, value: { amount: "10000000", dry: false } });
  });

  it.each([
    ["bad asset", { originAsset: "sol:usdc" }],
    ["zero amount", { amount: "0" }],
    ["decimal amount", { amount: "1.5" }],
    ["number amount", { amount: 5 }],
    ["missing refundTo", { refundTo: " " }],
    ["bad recipient", { recipient: "Not A Account!" }],
  ])("rejects %s", (_n, patch) => {
    expect(parseQuoteInput({ ...valid, ...patch }).ok).toBe(false);
  });
});

describe("1Click calls", () => {
  it("sends a quote targeting NEAR USDC with a 10 minute deadline", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ depositAddress: "abc" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await requestQuote({ ...valid }, Date.UTC(2026, 10, 3));
    expect(res).toEqual({ status: 200, data: { depositAddress: "abc" } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://1click.chaindefuser.com/v0/quote");
    const sent = JSON.parse(init.body);
    expect(sent).toMatchObject({ destinationAsset: NEAR_USDC_ASSET, recipient: "alice.testnet", recipientType: "DESTINATION_CHAIN", dry: false });
    expect(sent.deadline).toBe("2026-11-03T00:10:00.000Z");
  });

  it("passes upstream error status through", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "bad" }), { status: 400 })));
    expect(await getStatus("addr")).toEqual({ status: 400, data: { message: "bad" } });
  });
});
