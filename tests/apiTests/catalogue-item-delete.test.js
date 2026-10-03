// Test that staff users cannot delete a catalogue item.

import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findCatalogue, deleteListing, revalidateCatalogue } = vi.hoisted(() => ({
  auth: vi.fn(),
  findCatalogue: vi.fn(),
  deleteListing: vi.fn(),
  revalidateCatalogue: vi.fn(),
}));

// Stub session, persistence, and cache revalidation so this tests the route contract without a database.
vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    catalogue: { findUnique: findCatalogue },
    catalogueListing: { deleteMany: deleteListing },
  }),
}));
vi.mock("@/app/api/admin/catalogues/[id]/listings/helpers", () => ({ revalidateCatalogue }));

import { DELETE } from "@/app/api/admin/catalogues/[id]/listings/[listingId]/route";

const catalogueId = "11111111-1111-4111-8111-111111111111";
const listingId = "22222222-2222-4222-8222-222222222222";

describe("DELETE /api/admin/catalogues/[id]/listings/[listingId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ user: { id: "staff-1", role: "staff" } });
    findCatalogue.mockResolvedValue({ slug: "sample-catalogue" });
    deleteListing.mockResolvedValue({ count: 1 });
  });

  // Expected: staff is forbidden and no delete runs. Actual: the current route allows staff deletion, so this regression test should fail.
  it("denies staff from deleting a catalogue item", async () => {
    const response = await DELETE(
      new Request(`http://localhost/api/admin/catalogues/${catalogueId}/listings/${listingId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: catalogueId, listingId }) },
    );

    // I expect the response status to be exactly 403(Forbidden)
    expect(response.status).toBe(403);
    expect(deleteListing).not.toHaveBeenCalled();
    expect(revalidateCatalogue).not.toHaveBeenCalled();
  });
});