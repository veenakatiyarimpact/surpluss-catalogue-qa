import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findUnique, updateMany, deleteMany } = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
}));

// Mock Prisma's mutation boundary to emulate a listing found by its ID, regardless of its parent catalogue.
vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    catalogue: { findUnique },
    catalogueListing: { updateMany, deleteMany },
  }),
}));
vi.mock("@/app/api/admin/catalogues/[id]/listings/helpers", () => ({
  revalidateCatalogue: vi.fn(),
}));

import { DELETE, PATCH } from "@/app/api/admin/catalogues/[id]/listings/[listingId]/route";

const catalogueA = "11111111-1111-4111-8111-111111111111";
const catalogueBListing = "22222222-2222-4222-8222-222222222222";
const params = { params: Promise.resolve({ id: catalogueA, listingId: catalogueBListing }) };

describe("catalogue listing parent scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ user: { id: "staff-1", role: "staff" } });
    findUnique.mockResolvedValue({ slug: "catalogue-a" });
    updateMany.mockResolvedValue({ count: 1 });
    deleteMany.mockResolvedValue({ count: 1 });
  });

  // Expected: mismatched parent/listing IDs return 404. Actual: the unscoped update finds the listing and returns 200.
  it("does not update a listing that belongs to another catalogue", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/admin/catalogues/a/listings/b", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isVisible: false }),
      }),
      params,
    );

    expect(response.status).toBe(404);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: catalogueBListing, catalogueId: catalogueA },
      data: { isVisible: false },
    });
  });

  // Expected: mismatched parent/listing IDs return 404. Actual: the unscoped delete finds the listing and returns 200.
  it("does not delete a listing that belongs to another catalogue", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/admin/catalogues/a/listings/b", { method: "DELETE" }),
      params,
    );

    expect(response.status).toBe(404);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: catalogueBListing, catalogueId: catalogueA },
    });
  });
});