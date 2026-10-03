import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { after, listingFindMany, catalogueFindUnique, enquiryCreate, notifyTeam } = vi.hoisted(() => ({
  after: vi.fn(),
  listingFindMany: vi.fn(),
  catalogueFindUnique: vi.fn(),
  enquiryCreate: vi.fn(),
  notifyTeam: vi.fn(),
}));

// Preserve NextResponse while capturing post-response callbacks; mock external data/notification boundaries.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal()),
  after,
}));
vi.mock("@/lib/notifications", () => ({ notifyTeam }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    catalogueListing: { findMany: listingFindMany },
    catalogue: { findUnique: catalogueFindUnique },
    enquiry: { create: enquiryCreate },
  }),
}));

import { POST } from "@/app/api/enquiries/route";

const catalogueId = "11111111-1111-4111-8111-111111111111";
const productId = "22222222-2222-4222-8222-222222222222";

describe("POST /api/enquiries catalogue visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listingFindMany.mockResolvedValue([
      {
        id: "33333333-3333-4333-8333-333333333333",
        productId,
        product: {
          name: "Private catalogue product",
          sku: "PRIVATE-1",
          brand: null,
          offerPrice: "25.00",
          priceOnRequest: false,
          moq: 1,
          quantity: 20,
        },
      },
    ]);
    catalogueFindUnique.mockResolvedValue({ notifyNumber: null });
    enquiryCreate.mockResolvedValue({ id: "enquiry-1" });
  });

  afterEach(() => vi.useRealTimers());

  // Expected: no lead is written for a non-public catalogue. Actual: each request currently returns 201 and stores the lead.
  it.each(["draft", "expired", "inactive"])("rejects an enquiry for a %s catalogue", async (status) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T12:00:00.000Z"));
    catalogueFindUnique.mockImplementation(async ({ select }) => {
      if (select?.status || select?.expiresAt) return { status, expiresAt: new Date("2026-09-01T00:00:00.000Z") };
      return { notifyNumber: null };
    });

    const response = await POST(new Request("http://localhost/api/enquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        catalogueId,
        name: "Buyer Name",
        phone: "9876543210",
        items: [{ productId, quantity: 2 }],
      }),
    }));

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(enquiryCreate).not.toHaveBeenCalled();
  });

  // Freeze the clock and emulate the database unique constraint. Expected: both requests get distinct references; actual: one gets 201 and one 500.
  it("stores two simultaneous enquiries with distinct references", async () => {
    const references = new Set();
    enquiryCreate.mockImplementation(async ({ data }) => {
      if (references.has(data.reference)) {
        throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
      }
      references.add(data.reference);
      return { id: `enquiry-${references.size}` };
    });
    const clock = vi.spyOn(Date, "now").mockReturnValue(1_791_000_000_000);
    const makeRequest = () => new Request("http://localhost/api/enquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        catalogueId,
        name: "Buyer Name",
        phone: "9876543210",
        items: [{ productId, quantity: 2 }],
      }),
    });

    try {
      const responses = await Promise.all([POST(makeRequest()), POST(makeRequest())]);
      const bodies = await Promise.all(responses.map((response) => response.json()));

      expect(responses.map(({ status }) => status)).toEqual([201, 201]);
      expect(new Set(bodies.map(({ reference }) => reference)).size).toBe(2);
    } finally {
      clock.mockRestore();
    }
  });
});