import Link from "next/link";
import { formatWeekLabel, shiftWeek } from "@/lib/time";
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon } from "../icons";

const STEP = "inline-flex size-10 items-center justify-center rounded-xl transition";

/** ← 21–27 Sep 2026 → (next is disabled past the current week). */
export function WeekPicker({ week, thisWeek }: { week: string; thisWeek: string }) {
  const next = shiftWeek(week, 1);
  const canGoNext = next <= thisWeek;
  return (
    <nav
      aria-label="Choose week"
      className="inline-flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-black/[0.06]"
    >
      <Link
        href={`/admin/insights?week=${shiftWeek(week, -1)}`}
        aria-label="Previous week"
        className={`${STEP} text-ink hover:bg-brand-soft/60`}
      >
        <ArrowLeftIcon className="size-4" />
      </Link>
      <span className="flex min-w-44 items-center justify-center gap-2 px-2 text-sm font-semibold text-ink">
        <CalendarIcon className="size-4 text-muted" />
        {formatWeekLabel(week)}
      </span>
      {canGoNext ? (
        <Link
          href={`/admin/insights?week=${next}`}
          aria-label="Next week"
          className={`${STEP} text-ink hover:bg-brand-soft/60`}
        >
          <ArrowRightIcon className="size-4" />
        </Link>
      ) : (
        <span aria-disabled="true" aria-label="Next week" className={`${STEP} cursor-not-allowed text-black/20`}>
          <ArrowRightIcon className="size-4" />
        </span>
      )}
    </nav>
  );
}
