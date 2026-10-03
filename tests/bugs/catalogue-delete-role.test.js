import { beforeEach, describe, expect, it, vi } from "vitest";

const { currentActor, isAdmin, deleteCatalogueRecord } = vi.hoisted(() => ({
  currentActor: vi.fn(),
  isAdmin: vi.fn((actor) => actor?.role === "admin"),
  deleteCatalogueRecord: vi.fn(),
}));

// Stub the actor and delete boundary so this test verifies authorization before database access.
vi.mock("@/auth-guards", () => ({ currentActor, isAdmin }));
vi.mock("@/auth", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({ catalogue: { delete: deleteCatalogueRecord } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { deleteCatalogue } from "@/app/admin/actions";

describe("deleteCatalogue authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentActor.mockResolvedValue({ id: "staff-1", email: "staff@example.test", role: "staff" });
    isAdmin.mockImplementation((actor) => actor?.role === "admin");
    deleteCatalogueRecord.mockResolvedValue({ slug: "sample", name: "Sample catalogue" });
  });

  // Expected: staff receives an error and Prisma is untouched. Actual: staff deletion succeeds.
  it("denies catalogue deletion to staff before calling Prisma", async () => {
    const result = await deleteCatalogue("11111111-1111-4111-8111-111111111111");

    expect(result).toHaveProperty("error");
    expect(deleteCatalogueRecord).not.toHaveBeenCalled();
  });

  // Expected: an admin is allowed through. Actual: this control case passes.
  it("allows an admin to delete a catalogue", async () => {
    currentActor.mockResolvedValue({ id: "admin-1", email: "admin@example.test", role: "admin" });

    const result = await deleteCatalogue("11111111-1111-4111-8111-111111111111");

    expect(result).toMatchObject({ ok: true, name: "Sample catalogue" });
    expect(deleteCatalogueRecord).toHaveBeenCalledOnce();
  });
});