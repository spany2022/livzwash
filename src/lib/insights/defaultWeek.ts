import { shiftWeek, weekStartOf } from "@/lib/time";

export interface DefaultWeekChoice {
  week: string;
  /** True when last week had no visits and we jumped to a more recent/older week that has some. */
  fellBack: boolean;
}

/**
 * Which week the Insights page opens on when none is chosen:
 * 1. The last complete week, if it had any visits (or a saved summary).
 * 2. Otherwise the week of the most recent visit (e.g. a café that started this week).
 * 3. Otherwise (no visits ever) the last complete week, which shows the empty state.
 */
export function pickDefaultWeek(opts: {
  thisWeek: string;
  lastWeekHasData: boolean;
  latestVisitAt: string | null;
  timeZone: string;
}): DefaultWeekChoice {
  const lastWeek = shiftWeek(opts.thisWeek, -1);
  if (opts.lastWeekHasData || !opts.latestVisitAt) return { week: lastWeek, fellBack: false };

  const latestWeek = weekStartOf(new Date(opts.latestVisitAt), opts.timeZone);
  // Never pick a future week (e.g. clock skew).
  const week = latestWeek > opts.thisWeek ? opts.thisWeek : latestWeek;
  return week === lastWeek ? { week, fellBack: false } : { week, fellBack: true };
}
