import { describe, expect, it } from "vitest";
import { GET, OPTIONS } from "./route";

describe("actions.json", () => {
  it("maps share slugs and API paths", async () => {
    const res = await GET();
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(await res.json()).toEqual({
      rules: [
        { pathPattern: "/subscribe/*", apiPath: "/api/actions/subscribe/*" },
        { pathPattern: "/api/actions/**", apiPath: "/api/actions/**" },
      ],
    });
  });

  it("answers the preflight", () => {
    expect(OPTIONS().status).toBe(204);
  });
});
