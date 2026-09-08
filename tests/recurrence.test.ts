import { describe, expect, it } from "vitest";
import { formatRecurrenceFrequency, nextOccurrence, occurrenceDates } from "@/lib/recurrence";

describe("recurrence date engine", () => {
  it("backfills daily occurrences through today", () => {
    expect(occurrenceDates("2024-01-01", "daily", "2024-01-04")).toEqual([
      "2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04",
    ]);
  });

  it("keeps weekday and monthly rules on their intended calendar day", () => {
    expect(occurrenceDates("2024-01-01", "every_week", "2024-01-22")).toEqual([
      "2024-01-01", "2024-01-08", "2024-01-15", "2024-01-22",
    ]);
    expect(occurrenceDates("2024-01-31", "every_month", "2024-04-30")).toEqual([
      "2024-01-31", "2024-02-29", "2024-03-31", "2024-04-30",
    ]);
  });

  it("respects future starts and end dates", () => {
    expect(occurrenceDates("2024-02-01", "daily", "2024-01-31")).toEqual([]);
    expect(occurrenceDates("2024-01-01", "daily", "2024-01-10", "2024-01-03")).toEqual([
      "2024-01-01", "2024-01-02", "2024-01-03",
    ]);
  });

  it("finds the next eligible occurrence", () => {
    expect(nextOccurrence("2024-01-01", "first_day_of_every_month", "2024-01-02")).toBe("2024-02-01");
  });

  it("uses human-friendly labels for recurrence frequencies", () => {
    expect(formatRecurrenceFrequency("every_week")).toBe("Every Week");
    expect(formatRecurrenceFrequency("first_day_of_every_month")).toBe("First Day of Every Month");
    expect(formatRecurrenceFrequency("first_working_day_of_every_month")).toBe("First Working Day of Every Month");
  });

  it("moves working-day boundaries off weekends", () => {
    expect(occurrenceDates("2024-06-01", "first_working_day_of_every_month", "2024-07-31")).toEqual([
      "2024-06-03", "2024-07-01",
    ]);
    expect(occurrenceDates("2024-06-01", "last_working_day_of_every_month", "2024-07-31")).toEqual([
      "2024-06-28", "2024-07-31",
    ]);
    expect(occurrenceDates("2024-01-01", "first_working_day_of_every_year", "2025-01-02")).toEqual([
      "2024-01-01", "2025-01-01",
    ]);
  });
});