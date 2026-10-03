import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  // Expected: health checks return an OK payload and must not be cached. Actual: verified by this route-level assertion.
  it("returns status ok with a no-store cache header", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
