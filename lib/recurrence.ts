import {
  addDays,
  addYears,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  parseISO,
} from "date-fns";
import type { RecurrenceFrequency } from "@/lib/types";

const recurrenceFrequencyLabels: Record<RecurrenceFrequency, string> = {
  daily: "Daily",
  every_week: "Every Week",
  every_month: "Every Month",
  every_year: "Every Year",
  first_day_of_every_week: "First Day of Every Week",
  last_day_of_every_week: "Last Day of Every Week",
  first_working_day_of_every_week: "First Working Day of Every Week",
  last_working_day_of_every_week: "Last Working Day of Every Week",
  first_day_of_every_month: "First Day of Every Month",
  last_day_of_every_month: "Last Day of Every Month",
  first_working_day_of_every_month: "First Working Day of Every Month",
  last_working_day_of_every_month: "Last Working Day of Every Month",
  first_day_of_every_year: "First Day of Every Year",
  last_day_of_every_year: "Last Day of Every Year",
  first_working_day_of_every_year: "First Working Day of Every Year",
  last_working_day_of_every_year: "Last Working Day of Every Year",
};

export function formatRecurrenceFrequency(frequency: RecurrenceFrequency): string {
  return recurrenceFrequencyLabels[frequency];
}

export function dateKey(value: string | Date): string {
  return typeof value === "string" ? value.slice(0, 10) : format(value, "yyyy-MM-dd");
}

function parseDateKey(value: string): Date {
  return parseISO(dateKey(value));
}

function isWorkingDay(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function firstWorkingDayOfMonth(date: Date): number {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  while (!isWorkingDay(first)) first.setDate(first.getDate() + 1);
  return first.getDate();
}

function lastWorkingDayOfMonth(date: Date): number {
  const last = endOfMonth(date);
  while (!isWorkingDay(last)) last.setDate(last.getDate() - 1);
  return last.getDate();
}

function isOnFrequency(date: Date, start: Date, frequency: RecurrenceFrequency): boolean {
  if (frequency === "daily") return true;
  if (frequency === "every_week") return date.getDay() === start.getDay();
  if (frequency === "first_day_of_every_week") return date.getDay() === 1;
  if (frequency === "last_day_of_every_week") return date.getDay() === 0;
  if (frequency === "first_working_day_of_every_week") return date.getDay() === 1;
  if (frequency === "last_working_day_of_every_week") return date.getDay() === 5;
  if (frequency === "first_day_of_every_month") return date.getDate() === 1;
  if (frequency === "last_day_of_every_month") return date.getDate() === endOfMonth(date).getDate();
  if (frequency === "first_working_day_of_every_month") return date.getDate() === firstWorkingDayOfMonth(date);
  if (frequency === "last_working_day_of_every_month") return date.getDate() === lastWorkingDayOfMonth(date);
  if (frequency === "first_day_of_every_year") return format(date, "MM-dd") === "01-01";
  if (frequency === "last_day_of_every_year") return format(date, "MM-dd") === "12-31";
  if (frequency === "first_working_day_of_every_year") {
    return format(date, "yyyy-MM-dd") === format(new Date(date.getFullYear(), 0, firstWorkingDayOfMonth(new Date(date.getFullYear(), 0, 1))), "yyyy-MM-dd");
  }
  if (frequency === "last_working_day_of_every_year") {
    const lastWorkingDay = new Date(date.getFullYear(), 11, 31);
    while (!isWorkingDay(lastWorkingDay)) lastWorkingDay.setDate(lastWorkingDay.getDate() - 1);
    return format(date, "yyyy-MM-dd") === format(lastWorkingDay, "yyyy-MM-dd");
  }
  if (frequency === "every_month") {
    return date.getDate() === Math.min(start.getDate(), endOfMonth(date).getDate());
  }
  if (frequency === "every_year") {
    return format(date, "MM-dd") === format(start, "MM-dd") ||
      (format(start, "MM-dd") === "02-29" && format(date, "MM-dd") === "02-28");
  }
  return false;
}

function nextCandidate(date: Date, frequency: RecurrenceFrequency): Date {
  if (frequency === "daily") return addDays(date, 1);
  if (frequency === "every_week") return addDays(date, 7);
  if (frequency === "every_month") return addDays(date, 1);
  if (frequency === "every_year") return addYears(date, 1);
  return addDays(date, 1);
}

export function occurrenceDates(
  startDate: string,
  frequency: RecurrenceFrequency,
  throughDate: string,
  endDate?: string,
): string[] {
  const start = parseDateKey(startDate);
  const through = parseDateKey(throughDate);
  const end = endDate ? parseDateKey(endDate) : through;
  const dates: string[] = [];
  let cursor = start;
  let guard = 0;

  while (!isAfter(cursor, through) && !isAfter(cursor, end) && guard < 20000) {
    if (isOnFrequency(cursor, start, frequency)) dates.push(format(cursor, "yyyy-MM-dd"));
    cursor = nextCandidate(cursor, frequency);
    guard += 1;
  }

  return dates;
}

export function nextOccurrence(
  startDate: string,
  frequency: RecurrenceFrequency,
  fromDate: string,
  endDate?: string,
): string | undefined {
  const from = parseDateKey(fromDate);
  const end = endDate ? parseDateKey(endDate) : addYears(from, 100);
  const candidates = occurrenceDates(startDate, frequency, format(end, "yyyy-MM-dd"), endDate);
  return candidates.find((date) => !isBefore(parseDateKey(date), from));
}