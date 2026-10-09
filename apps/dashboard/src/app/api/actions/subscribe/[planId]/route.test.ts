import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/actions/rate-limit";
import { GET, OPTIONS, POST } from "./route";

const URL_BASE = "http://localhost:3000/api/actions/subscribe";
const VALID_ACCOUNT = "11111111111111111111111111111112";

type Ctx = Parameters<typeof GET>[1];
const ctx = (planId: string) => ({ params: Promise.resolve({ planId }) }) as unknown as Ctx;

let ipCounter = 0;
function post(planId: string, body: unknown, ip = `10.0.0.${++ipCounter}`) {
  return POST(
    new Request(`${URL_BASE}/${planId}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    ctx(planId),
  );
}

beforeEach(() => {
  resetRateLimits();
  vi.stubEnv("TIDEPAY_ACTIONS_MOCK_TX", "");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
});

describe("GET", () => {
  it("returns a spec-shaped action with absolute URLs and CORS headers", async () => {
    const res = await GET(new Request(`${URL_BASE}/promptpilot-pro`), ctx("promptpilot-pro"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toBe("GET,POST,PUT,OPTIONS");
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(body).toMatchObject({
      type: "action",
      icon: "http://localhost:3000/blink-icon.svg",
      title: "PromptPilot Pro",
      label: "Subscribe",
    });
    expect(body.links.actions[0]).toEqual({
      type: "transaction",
      label: "Subscribe · 29.00 USDC",
      href: "http://localhost:3000/api/actions/subscribe/promptpilot-pro",
    });
  });

  it("returns 404 with CORS headers for an unknown plan", async () => {
    const res = await GET(new Request(`${URL_BASE}/nope`), ctx("nope"));
    expect(res.status).toBe(404);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(await res.json()).toEqual({ message: "Plan not found." });
  });
});

describe("OPTIONS", () => {
  it("answers the preflight", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-headers")).toContain("Content-Type");
  });
});

describe("POST", () => {
  it("rejects a non-JSON body", async () => {
    const res = await post("promptpilot-pro", "not json");
    expect(res.status).toBe(400);
  });

  it("rejects a missing or invalid account", async () => {
    expect((await post("promptpilot-pro", {})).status).toBe(400);
    expect((await post("promptpilot-pro", { account: "not-a-key" })).status).toBe(400);
  });

  it("returns 404 for an unknown plan", async () => {
    expect((await post("nope", { account: VALID_ACCOUNT })).status).toBe(404);
  });

  it("returns 501 until the on-chain builder is integrated", async () => {
    const res = await post("promptpilot-pro", { account: VALID_ACCOUNT });
    expect(res.status).toBe(501);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("limits repeated requests for the same account", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await post("promptpilot-pro", { account: VALID_ACCOUNT })).status).toBe(501);
    }
    const res = await post("promptpilot-pro", { account: VALID_ACCOUNT });
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("limits repeated requests from the same IP", async () => {
    let last = 0;
    for (let i = 0; i < 31; i++) {
      // Invalid accounts avoid the per-account limit but still count against the IP.
      last = (await post("promptpilot-pro", { account: "bad" }, "9.9.9.9")).status;
    }
    expect(last).toBe(429);
  });
});
