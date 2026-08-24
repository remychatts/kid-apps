/** Handles local calendar dates without UTC rollover surprises. */
import type { DateKey } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateKey(date: Date): DateKey {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

export function parseDateKey(dateKey: DateKey): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateKey: DateKey, days: number): DateKey {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function daysBetween(start: DateKey, end: DateKey): number {
  const startDate = parseDateKey(start);
  const endDate = parseDateKey(end);
  return Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS);
}

export function compareDateKeys(left: DateKey, right: DateKey): number {
  return left.localeCompare(right);
}

export function eachDate(start: DateKey, end: DateKey): DateKey[] {
  const count = daysBetween(start, end);
  return Array.from({ length: count + 1 }, (_, index) => addDays(start, index));
}

export function mostRecentMondayBeforeYesterday(now = new Date()): DateKey {
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );
  const mondayBasedDay = (yesterday.getDay() + 6) % 7;
  yesterday.setDate(yesterday.getDate() - mondayBasedDay);
  return toDateKey(yesterday);
}

export function weekdayIndex(dateKey: DateKey): number {
  return (parseDateKey(dateKey).getDay() + 6) % 7;
}

export function monthName(dateKey: DateKey): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, { month: "long" });
}
