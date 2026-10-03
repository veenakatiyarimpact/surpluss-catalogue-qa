import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));

// Only authentication is relevant here; rejected requests must stop before AWS configuration/client setup.
vi.mock("@/auth", () => ({ auth }));

import { POST } from "@/app/api/uploads/presign/route";

describe("POST /api/uploads/presign authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue(null);
  });

  // Expected: anonymous users receive 401 before storage is touched. Actual: this check passes.
  it("rejects anonymous upload-signing requests before accessing storage", async () => {
    const response = await POST(new Request("http://localhost/api/uploads/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileName: "product.jpg", contentType: "image/jpeg" }),
    }));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "Unauthorized" });
  });

  // Expected: unsupported MIME types receive 400 before signing. Actual: this check passes.
  it("rejects unsupported image types for authenticated users", async () => {
    auth.mockResolvedValue({ user: { id: "staff-1", role: "staff" } });

    const response = await POST(new Request("http://localhost/api/uploads/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileName: "vector.svg", contentType: "image/svg+xml" }),
    }));

    expect(response.status).toBe(400);
  });
});