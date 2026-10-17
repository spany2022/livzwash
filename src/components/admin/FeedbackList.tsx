import Link from "next/link";
import type { PrivateFeedback } from "@/types/feedback";
import { formatDateTime } from "@/lib/time";
import { RatingBadge, StatusBadge } from "./FeedbackBits";
import { InboxIcon } from "./icons";

export function FeedbackList({
  items,
  timeZone,
  emptyText = "No private feedback here yet.",
}: {
  items: PrivateFeedback[];
  timeZone: string;
  emptyText?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
          <InboxIcon className="size-6" />
        </span>
        <p className="text-muted">{emptyText}</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-black/[0.05]">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/admin/feedback/${item.id}`}
            className="flex items-start gap-4 px-6 py-4 transition hover:bg-brand-soft/30 focus-visible:bg-brand-soft/30"
          >
            <RatingBadge rating={item.rating} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-medium text-ink">{item.feedback}</p>
              <p className="mt-1 text-xs text-muted">
                <time dateTime={item.createdAt}>{formatDateTime(item.createdAt, timeZone)}</time>
                {item.categories.length > 0 && <> · {item.categories.join(", ")}</>}
              </p>
            </div>
            <StatusBadge status={item.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
