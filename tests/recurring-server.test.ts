import { beforeEach, describe, expect, it, vi } from "vitest";

const sanityMocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/lib/sanity", () => ({
  sanityClient: { fetch: sanityMocks.fetch },
  sanityWriteClient: { patch: sanityMocks.patch },
}));

import { processRecurringTransaction } from "@/lib/recurring-server";
import type { RecurringTransaction } from "@/lib/types";

describe("processRecurringTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sanityMocks.fetch.mockResolvedValue([]);
  });

  it("never passes undefined values to Sanity while updating a rule", async () => {
    const patchBuilder = {
      set: vi.fn().mockReturnThis(),
      unset: vi.fn().mockReturnThis(),
      commit: vi.fn().mockResolvedValue({ _id: "recurring-1" }),
    };
    sanityMocks.patch.mockReturnValue(patchBuilder);
    const rule = {
      _id: "recurring-1",
      _type: "recurringTransaction",
      username: "kanavgoyal898",
      _createdAt: "2026-01-01T00:00:00.000Z",
      _updatedAt: "2026-01-01T00:00:00.000Z",
      type: "investment",
      amount: 5000,
      category: "Investments",
      account: "HDFC",
      frequency: "every_month",
      startDate: "2099-01-01",
      active: true,
    } satisfies RecurringTransaction;

    await processRecurringTransaction(rule, new Date("2026-09-30T00:00:00.000Z"));

    expect(patchBuilder.set).toHaveBeenCalledWith({ nextOccurrence: "2099-01-01" });
    expect(patchBuilder.unset).toHaveBeenCalledWith(["resumeFrom"]);
  });
});
