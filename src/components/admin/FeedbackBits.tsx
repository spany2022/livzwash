import { FEEDBACK_STATUS_LABELS, type FeedbackStatus } from "@/types/feedback";

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  new: "bg-amber-50 text-amber-900 ring-amber-200",
  in_progress: "bg-sky-50 text-sky-900 ring-sky-200",
  resolved: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  closed: "bg-stone-100 text-stone-700 ring-stone-200",
};

const STATUS_DOTS: Record<FeedbackStatus, string> = {
  new: "bg-amber-500",
  in_progress: "bg-sky-500",
  resolved: "bg-emerald-500",
  closed: "bg-stone-400",
};

export function StatusBadge({ status }: { status: FeedbackStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${STATUS_DOTS[status]}`} />
      {FEEDBACK_STATUS_LABELS[status]}
    </span>
  );
}

export function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-muted">—</span>;
  return (
    <span className="whitespace-nowrap" aria-label={`${rating} ${rating === 1 ? "star" : "stars"}`}>
      <span aria-hidden className="text-brand">{"★".repeat(rating)}</span>
      <span aria-hidden className="text-black/15">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

/** Round rating chip used as the leading "avatar" of a feedback row. */
export function RatingBadge({ rating }: { rating: number | null }) {
  return (
    <span
      aria-label={rating ? `${rating} ${rating === 1 ? "star" : "stars"}` : "No rating"}
      className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-sm font-bold text-brand"
    >
      <span aria-hidden>{rating ? `${rating}★` : "—"}</span>
    </span>
  );
}
