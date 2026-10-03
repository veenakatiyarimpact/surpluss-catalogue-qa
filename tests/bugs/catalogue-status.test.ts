import { describe, expect, it, vi } from "vitest";
import { effectiveStatus } from "@/lib/catalogue-status";

describe("effectiveStatus", () => {
  // A fixed clock makes the expiry comparison deterministic. Expected: future expiry stays published; actual: it is reported expired.
  it("keeps a published catalogue live before its expiry", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T12:00:00.000Z"));

    try {
      expect(effectiveStatus("published", new Date("2026-10-02T12:00:00.000Z"))).toBe("published");
    } finally {
      vi.useRealTimers();
    }
  });

  // Expected: a past expiry is expired; actual: the helper reports published.
  it("marks a published catalogue expired after its expiry", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T12:00:00.000Z"));

    try {
      expect(effectiveStatus("published", new Date("2026-09-30T12:00:00.000Z"))).toBe("expired");
    } finally {
      vi.useRealTimers();
    }
  });

  // Expected: legacy terminal states display as draft. Actual: both mappings pass.
  it.each(["inactive", "expired"])('maps legacy status "%s" to draft', (status) => {
    expect(effectiveStatus(status, null)).toBe("draft");
  });
});