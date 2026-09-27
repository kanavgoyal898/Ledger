import { describe, expect, it } from "vitest";

import { compareLedgerDateThenModified, ledgerDateKey, parseLedgerDate } from "@/lib/ledger-date";

describe("ledger date handling", () => {
  it("preserves the calendar date from date-only and ISO values", () => {
    expect(ledgerDateKey("2026-09-27")).toBe("2026-09-27");
    expect(ledgerDateKey("2026-09-27T23:30:00.000Z")).toBe("2026-09-27");
  });

  it("parses a stored date at local midnight", () => {
    const date = parseLedgerDate("2026-09-27T00:00:00.000Z");
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 8, 27, 0]);
  });

  it("orders by date descending and then last modified descending", () => {
    const items = [
      { date: "2026-09-26", _updatedAt: "2026-09-27T12:00:00Z", id: "older-date" },
      { date: "2026-09-27", _updatedAt: "2026-09-27T08:00:00Z", id: "older-edit" },
      { date: "2026-09-27", _updatedAt: "2026-09-27T10:00:00Z", id: "newer-edit" },
    ];

    expect(items.sort(compareLedgerDateThenModified).map((item) => item.id)).toEqual([
      "newer-edit", "older-edit", "older-date",
    ]);
  });

  it("keeps last modified descending when dates are ascending", () => {
    const items = [
      { date: "2026-09-27", _updatedAt: "2026-09-27T08:00:00Z", id: "older-edit" },
      { date: "2026-09-26", _updatedAt: "2026-09-27T12:00:00Z", id: "older-date" },
      { date: "2026-09-27", _updatedAt: "2026-09-27T10:00:00Z", id: "newer-edit" },
    ];

    expect(items.sort((a, b) => compareLedgerDateThenModified(a, b, "asc")).map((item) => item.id)).toEqual([
      "older-date", "newer-edit", "older-edit",
    ]);
  });
});
