export const DATE_RANGES = ["today", "7d", "30d", "all"] as const;
export type DateRange = (typeof DATE_RANGES)[number];

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: "Today",
  "7d": "7 Days",
  "30d": "30 Days",
  all: "All Time",
};

export function parseDateRange(value: unknown): DateRange {
  return DATE_RANGES.includes(value as DateRange) ? (value as DateRange) : "7d";
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Midnight "today" in the business's time zone, as a UTC Date. */
export function startOfDayInTimeZone(now: Date, timeZone: string): Date {
  const offset = tzOffsetMs(now, timeZone);
  const local = new Date(now.getTime() + offset);
  const midnightLocalAsUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  // Re-evaluate the offset at midnight to handle DST transitions.
  const guess = new Date(midnightLocalAsUtc - offset);
  return new Date(midnightLocalAsUtc - tzOffsetMs(guess, timeZone));
}

/** ISO timestamp for the start of the range, or null for "all". */
export function rangeStart(range: DateRange, timeZone: string, now: Date = new Date()): string | null {
  if (range === "all") return null;
  const today = startOfDayInTimeZone(now, timeZone);
  const days = range === "today" ? 0 : range === "7d" ? 6 : 29;
  return new Date(today.getTime() - days * 86_400_000).toISOString();
}

export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

// ---------------------------------------------------------------------------
// Weeks (Monday–Sunday) in the business's time zone, as "YYYY-MM-DD" strings.
// ---------------------------------------------------------------------------

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toDateString(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10);
}

function parseDateString(value: string): number {
  const [y, m, d] = value.split("-").map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

/** Is this a real calendar date string that falls on a Monday? */
export function isWeekStart(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_ONLY.test(value)) return false;
  const ms = parseDateString(value);
  return toDateString(ms) === value && new Date(ms).getUTCDay() === 1;
}

/** Monday of the week containing `now`, in `timeZone`. */
export function weekStartOf(now: Date, timeZone: string): string {
  const local = new Date(now.getTime() + tzOffsetMs(now, timeZone));
  const dayMs = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const daysSinceMonday = (new Date(dayMs).getUTCDay() + 6) % 7;
  return toDateString(dayMs - daysSinceMonday * 86_400_000);
}

/** Move a week start by `weeks` (negative = earlier). */
export function shiftWeek(weekStart: string, weeks: number): string {
  return toDateString(parseDateString(weekStart) + weeks * 7 * 86_400_000);
}

/** UTC instant of local midnight on `date` in `timeZone`. */
function zonedMidnight(date: string, timeZone: string): Date {
  const asUtc = parseDateString(date);
  const guess = new Date(asUtc - tzOffsetMs(new Date(asUtc), timeZone));
  return new Date(asUtc - tzOffsetMs(guess, timeZone));
}

/** [from, to) of the week as ISO timestamps: Monday 00:00 → next Monday 00:00 local. */
export function weekBounds(weekStart: string, timeZone: string): { from: string; to: string } {
  return {
    from: zonedMidnight(weekStart, timeZone).toISOString(),
    to: zonedMidnight(shiftWeek(weekStart, 1), timeZone).toISOString(),
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "21–27 Sep 2026" or "29 Sep – 5 Oct 2026". */
export function formatWeekLabel(weekStart: string): string {
  const start = new Date(parseDateString(weekStart));
  const end = new Date(parseDateString(weekStart) + 6 * 86_400_000);
  const day = (d: Date) => d.getUTCDate();
  const month = (d: Date) => MONTHS[d.getUTCMonth()]!;
  const year = end.getUTCFullYear();
  if (start.getUTCMonth() === end.getUTCMonth()) return `${day(start)}–${day(end)} ${month(end)} ${year}`;
  const startYear = start.getUTCFullYear() !== year ? ` ${start.getUTCFullYear()}` : "";
  return `${day(start)} ${month(start)}${startYear} – ${day(end)} ${month(end)} ${year}`;
}
