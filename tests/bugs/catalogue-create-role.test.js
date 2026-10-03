import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, transaction } = vi.hoisted(() => ({
  auth: vi.fn(),
  transaction: vi.fn(),
}));

// Keep the action test isolated from NextAuth, Prisma, and Next.js cache work.
vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({ $transaction: transaction }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createCatalogueWithProducts } from "@/app/admin/catalogues/actions";

describe("createCatalogueWithProducts authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ user: { id: "staff-1", role: "staff" } });
    transaction.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      slug: "new-catalogue",
    });
  });

  // Expected: staff cannot publish and no transaction starts. Actual: the action currently creates it as published.
  it("does not let staff create a published catalogue", async () => {
    const result = await createCatalogueWithProducts({
      name: "New Catalogue",
      slug: "new-catalogue",
      description: "",
      category: "",
      validUntil: null,
      banners: [],
      publish: true,
      productIds: [],
    });

    expect(result).toHaveProperty("error");
    expect(transaction).not.toHaveBeenCalled();
  });
});