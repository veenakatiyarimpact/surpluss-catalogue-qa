import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, findMany } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
}));

// Mock Prisma so the test can assert whether private product rows are queried or returned.
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    catalogue: { findUnique },
    catalogueListing: { findMany },
  }),
}));

import { GET } from "@/app/api/catalogues/[slug]/search/route";

describe("GET /api/catalogues/[slug]/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([
      {
        productId: "product-secret",
        product: { name: "Confidential item", sku: "SECRET-1", offerPrice: "10.00" },
      },
    ]);
  });

  it.each([
    ["draft", null],
    ["published", new Date("2026-09-01T00:00:00.000Z")],
  ])("does not return product data for %s catalogues", async (status, expiresAt) => {
    findUnique.mockResolvedValue({ id: "catalogue-1", status, expiresAt });

    const response = await GET(
      new Request("http://localhost/api/catalogues/private/search?q=secret"),
      { params: Promise.resolve({ slug: "private" }) },
    );

    // Expected: non-public catalogues return no product data. Actual: both cases currently return 200 with the private match.
    expect(response.status).toBe(404);
    expect(await response.json()).not.toHaveProperty("matches");
    expect(findMany).not.toHaveBeenCalled();
  });

  // Expected: live catalogues remain searchable. Actual: this control case passes.
  it("returns matches for a published catalogue without an expired date", async () => {
    findUnique.mockResolvedValue({ id: "catalogue-1", status: "published", expiresAt: null });

    const response = await GET(
      new Request("http://localhost/api/catalogues/live/search?q=secret"),
      { params: Promise.resolve({ slug: "live" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ids: ["product-secret"] });
    expect(findMany).toHaveBeenCalledOnce();
  });
});