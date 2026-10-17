import Link from "next/link";
import { getPageItems, getShowingRange } from "@/lib/pagination";
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";
import { formatNumber } from "./ui";

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  /** Builds the URL for a page number (keeps other filters). */
  hrefFor: (page: number) => string;
  /** What is being counted, e.g. "feedback". */
  noun?: string;
}

const STEP_BASE =
  "inline-flex size-10 items-center justify-center rounded-xl ring-1 ring-inset transition";
const STEP_ENABLED = "bg-white text-ink ring-black/10 hover:bg-brand-soft/50 hover:ring-brand/30";
const STEP_DISABLED = "cursor-not-allowed bg-transparent text-black/25 ring-black/5";

function StepLink({
  page,
  disabled,
  hrefFor,
  direction,
}: {
  page: number;
  disabled: boolean;
  hrefFor: (page: number) => string;
  direction: "prev" | "next";
}) {
  const label = direction === "prev" ? "Previous page" : "Next page";
  const Icon = direction === "prev" ? ArrowLeftIcon : ArrowRightIcon;
  if (disabled) {
    return (
      <span aria-disabled="true" aria-label={label} className={`${STEP_BASE} ${STEP_DISABLED}`}>
        <Icon className="size-4" />
      </span>
    );
  }
  return (
    <Link href={hrefFor(page)} aria-label={label} rel={direction} className={`${STEP_BASE} ${STEP_ENABLED}`}>
      <Icon className="size-4" />
    </Link>
  );
}

/** Numbered pagination bar: "Showing x–y of z", ← 1 … 4 5 6 … 12 →. */
export function Pagination({ page, pages, total, pageSize, hrefFor, noun = "items" }: PaginationProps) {
  const { from, to } = getShowingRange(page, pageSize, total);
  const items = getPageItems(page, pages);

  return (
    <div className="flex flex-col items-center gap-3 border-t border-black/[0.05] px-6 py-4 sm:flex-row sm:justify-between">
      <p className="text-sm text-muted" aria-live="polite">
        Showing <span className="font-semibold text-ink tabular-nums">{formatNumber(from)}–{formatNumber(to)}</span>{" "}
        of <span className="font-semibold text-ink tabular-nums">{formatNumber(total)}</span> {noun}
      </p>

      <nav aria-label="Pagination" className="flex items-center gap-1.5">
        <StepLink page={page - 1} disabled={page <= 1} hrefFor={hrefFor} direction="prev" />

        {/* Phones: compact "3 / 12" */}
        <span className="min-w-16 px-2 text-center text-sm font-semibold text-ink tabular-nums sm:hidden">
          {page} <span className="font-normal text-muted">/ {pages}</span>
        </span>

        {/* Larger screens: numbered pages */}
        <ol className="hidden items-center gap-1.5 sm:flex">
          {items.map((item) =>
            typeof item === "number" ? (
              <li key={item}>
                {item === page ? (
                  <span
                    aria-current="page"
                    aria-label={`Page ${item}`}
                    className="inline-flex size-10 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-on-brand shadow-[0_8px_18px_-10px_var(--brand-primary)] tabular-nums"
                  >
                    {item}
                  </span>
                ) : (
                  <Link
                    href={hrefFor(item)}
                    aria-label={`Page ${item}`}
                    className="inline-flex size-10 items-center justify-center rounded-xl text-sm font-medium text-muted tabular-nums transition hover:bg-brand-soft/50 hover:text-ink"
                  >
                    {item}
                  </Link>
                )}
              </li>
            ) : (
              <li key={item} aria-hidden className="inline-flex size-10 items-center justify-center text-muted">
                …
              </li>
            ),
          )}
        </ol>

        <StepLink page={page + 1} disabled={page >= pages} hrefFor={hrefFor} direction="next" />
      </nav>
    </div>
  );
}
