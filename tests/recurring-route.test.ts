import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  patch: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUsername: () => "kanavgoyal898" }));
vi.mock("@/lib/recurring-server", () => ({ processRecurringTransaction: vi.fn() }));
vi.mock("@/lib/sanity", () => ({
  sanityClient: { fetch: mocks.fetch },
  sanityWriteClient: { patch: mocks.patch, transaction: mocks.transaction },
}));

import { PATCH } from "@/app/api/recurring/[id]/route";

describe("PATCH /api/recurring/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates past transactions without sending an empty unset mutation", async () => {
    mocks.fetch
      .mockResolvedValueOnce({ _id: "recurring-1", active: false })
      .mockResolvedValueOnce([{ _id: "transaction-1" }]);

    const rulePatch = {
      set: vi.fn().mockReturnThis(),
      unset: vi.fn().mockReturnThis(),
      commit: vi.fn().mockResolvedValue({ _id: "recurring-1", active: false }),
    };
    mocks.patch.mockReturnValue(rulePatch);

    const pastPatch = {
      set: vi.fn().mockReturnThis(),
      unset: vi.fn(() => { throw new Error("empty unset should not be called"); }),
    };
    const transaction = {
      patch: vi.fn((_id: string, build: (patch: typeof pastPatch) => typeof pastPatch) => {
        build(pastPatch);
        return transaction;
      }),
      commit: vi.fn().mockResolvedValue({}),
    };
    mocks.transaction.mockReturnValue(transaction);

    const request = new NextRequest("http://localhost/api/recurring/recurring-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "investment",
        amount: 5000,
        category: "Investments",
        subCategory: "Mutual Funds SIP",
        account: "HDFC Savings Account",
        subAccount: "HDFC UPI",
        heading: "Gold Mutual Funds",
        description: "HDFC Gold ETF FoF Direct Plan Growth",
        frequency: "first_working_day_of_every_month",
        startDate: "2026-09-01",
        updatePastTransactions: true,
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: "recurring-1" }) });

    expect(response.status).toBe(200);
    expect(pastPatch.set).toHaveBeenCalledWith(expect.objectContaining({ type: "investment", amount: 5000 }));
    expect(pastPatch.unset).not.toHaveBeenCalled();
    expect(transaction.commit).toHaveBeenCalled();
  });
});
