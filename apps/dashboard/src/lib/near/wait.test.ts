import { describe, expect, it, vi } from "vitest";
import { waitFor } from "./wait";

describe("waitFor", () => {
  it("returns the first non-null result without sleeping", async () => {
    const sleep = vi.fn(async () => {});
    expect(await waitFor(async () => "plan", { attempts: 5, intervalMs: 100, sleep })).toBe("plan");
    expect(sleep).not.toHaveBeenCalled();
  });

  it("keeps trying through null results until the value appears", async () => {
    const results = [null, null, "plan"];
    const sleep = vi.fn(async () => {});
    expect(await waitFor(async () => results.shift() ?? null, { attempts: 5, intervalMs: 100, sleep })).toBe("plan");
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(100);
  });

  it("gives up with null after the attempts are used, and does not sleep after the last one", async () => {
    const fn = vi.fn(async () => null);
    const sleep = vi.fn(async () => {});
    expect(await waitFor(fn, { attempts: 3, intervalMs: 50, sleep })).toBeNull();
    expect(fn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("lets a failing read propagate instead of hiding it", async () => {
    await expect(waitFor(async () => Promise.reject(new Error("rpc down")), { attempts: 3, intervalMs: 1, sleep: async () => {} })).rejects.toThrow("rpc down");
  });
});
