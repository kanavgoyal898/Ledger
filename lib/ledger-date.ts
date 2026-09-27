import { format } from "date-fns";

type DatedLedgerItem = { date: string; _updatedAt: string };

const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

/** Returns the stored calendar date without converting it through UTC. */
export function ledgerDateKey(value: string): string {
  const match = DATE_PREFIX.exec(value);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return format(new Date(value), "yyyy-MM-dd");
}

/** Parses a ledger calendar date at local midnight, avoiding UTC date shifts. */
export function parseLedgerDate(value: string): Date {
  const [year, month, day] = ledgerDateKey(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Orders by calendar date, then by most recently modified within that date. */
export function compareLedgerDateThenModified<T extends DatedLedgerItem>(
  a: T,
  b: T,
  direction: "asc" | "desc" = "desc",
): number {
  const dateComparison = ledgerDateKey(a.date).localeCompare(ledgerDateKey(b.date));
  if (dateComparison !== 0) return direction === "asc" ? dateComparison : -dateComparison;
  return new Date(b._updatedAt).getTime() - new Date(a._updatedAt).getTime();
}
