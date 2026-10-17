import Link from "next/link";
import { DATE_RANGES, DATE_RANGE_LABELS, type DateRange } from "@/lib/time";
import { CalendarIcon } from "./icons";

export function DateRangeFilter({ basePath, current }: { basePath: string; current: DateRange }) {
  return (
    <nav
      aria-label="Date range"
      className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 ring-1 ring-black/[0.06]"
    >
      <CalendarIcon className="mx-2 size-4 shrink-0 text-muted" />
      {DATE_RANGES.map((range) => (
        <Link
          key={range}
          href={`${basePath}?range=${range}`}
          aria-current={range === current ? "true" : undefined}
          className={`rounded-xl px-3.5 py-2 text-sm font-medium whitespace-nowrap transition ${
            range === current ? "bg-brand text-on-brand" : "text-muted hover:bg-brand-soft/60 hover:text-ink"
          }`}
        >
          {DATE_RANGE_LABELS[range]}
        </Link>
      ))}
    </nav>
  );
}
