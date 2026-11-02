const TZ = "Asia/Jerusalem";

function getJerusalemYMD(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * Jerusalem's UTC offset (in minutes) at the given instant. Computed by
 * formatting the instant in Jerusalem, re-parsing those wall-clock numbers
 * as if they were UTC, and diffing — independent of the host's own system
 * timezone (unlike the common toLocaleString round-trip trick, which breaks
 * when the host's local zone happens to equal the target zone).
 */
function tzOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - date.getTime()) / 60000;
}

/** Converts a Jerusalem-local wall-clock time to the correct UTC instant (DST-safe). */
function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, second: number): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = tzOffsetMinutes(utcGuess);
  return new Date(utcGuess.getTime() - offset * 60000);
}

function startOfJerusalemDay(date: Date): Date {
  const { year, month, day } = getJerusalemYMD(date);
  return zonedTimeToUtc(year, month, day, 0, 0, 0);
}

function endOfJerusalemDay(date: Date): Date {
  const { year, month, day } = getJerusalemYMD(date);
  return zonedTimeToUtc(year, month, day, 23, 59, 59);
}

function addJerusalemDays(date: Date, days: number): Date {
  const { year, month, day } = getJerusalemYMD(date);
  const utcCalendarDate = new Date(Date.UTC(year, month - 1, day));
  utcCalendarDate.setUTCDate(utcCalendarDate.getUTCDate() + days);
  return zonedTimeToUtc(utcCalendarDate.getUTCFullYear(), utcCalendarDate.getUTCMonth() + 1, utcCalendarDate.getUTCDate(), 0, 0, 0);
}

function jerusalemWeekday(date: Date): number {
  const { year, month, day } = getJerusalemYMD(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function daysAgo(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export type DateRange = { start: Date; end: Date };

export function getTodayRange(now: Date = new Date()): DateRange {
  return { start: startOfJerusalemDay(now), end: endOfJerusalemDay(now) };
}

export function getTomorrowRange(now: Date = new Date()): DateRange {
  const tomorrow = addJerusalemDays(now, 1);
  return { start: startOfJerusalemDay(tomorrow), end: endOfJerusalemDay(tomorrow) };
}

/** Thursday 00:00 to Saturday 23:59 Asia/Jerusalem — the nearest one (current if today is Thu/Fri/Sat). */
export function getWeekendRange(now: Date = new Date()): DateRange {
  const dow = jerusalemWeekday(now);
  const offsetToThursday = dow >= 4 ? -(dow - 4) : 4 - dow;
  const thursday = addJerusalemDays(now, offsetToThursday);
  const saturday = addJerusalemDays(thursday, 2);
  return { start: startOfJerusalemDay(thursday), end: endOfJerusalemDay(saturday) };
}

/** Today through Saturday 23:59 Asia/Jerusalem. */
export function getThisWeekRange(now: Date = new Date()): DateRange {
  const dow = jerusalemWeekday(now);
  const daysUntilSaturday = (6 - dow + 7) % 7;
  const saturday = addJerusalemDays(now, daysUntilSaturday);
  return { start: startOfJerusalemDay(now), end: endOfJerusalemDay(saturday) };
}

export function getThisMonthRange(now: Date = new Date()): DateRange {
  const { year, month } = getJerusalemYMD(now);
  const start = zonedTimeToUtc(year, month, 1, 0, 0, 0);
  const nextMonthFirst = new Date(Date.UTC(year, month, 1));
  const end = zonedTimeToUtc(nextMonthFirst.getUTCFullYear(), nextMonthFirst.getUTCMonth() + 1, 1, 0, 0, 0);
  return { start, end: new Date(end.getTime() - 1000) };
}

export function getDateRangeForDay(year: number, month: number, day: number): DateRange {
  return { start: zonedTimeToUtc(year, month, day, 0, 0, 0), end: zonedTimeToUtc(year, month, day, 23, 59, 59) };
}

export function formatHebrewDayDate(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatHebrewShortDate(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", { timeZone: TZ, day: "numeric", month: "numeric" }).format(date);
}

export function formatHebrewTime(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(amount);
}

export function formatPriceFrom(minPrice: number | string | null): string | null {
  if (minPrice === null) return null;
  return `מ-${formatPrice(Number(minPrice))}`;
}

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat("he", { numeric: "auto" });

/** "עודכן לפני X" — used on event pages to show data freshness. */
export function formatUpdatedAgo(lastSeenAt: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - lastSeenAt.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 60) return `עודכן ${RELATIVE_TIME_FORMATTER.format(-diffMinutes, "minute")}`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `עודכן ${RELATIVE_TIME_FORMATTER.format(-diffHours, "hour")}`;
  const diffDays = Math.round(diffHours / 24);
  return `עודכן ${RELATIVE_TIME_FORMATTER.format(-diffDays, "day")}`;
}
