import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedbackList } from "@/components/admin/FeedbackList";
import { Pagination } from "@/components/admin/Pagination";
import { Card, PageHeader, formatNumber } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { FEEDBACK_PAGE_SIZE, listFeedback, parseFeedbackStatus } from "@/lib/admin/queries";
import { FEEDBACK_STATUSES, FEEDBACK_STATUS_LABELS } from "@/types/feedback";

export default async function FeedbackPage({ searchParams }: PageProps<"/admin/feedback">) {
  const { supabase, business, config } = await requireAdmin();
  const params = await searchParams;
  const status = parseFeedbackStatus(params.status);
  const page = Math.max(1, Math.min(10_000, Number.parseInt(String(params.page ?? "1"), 10) || 1));
  const { items, total } = await listFeedback(supabase, business.id, { status, page });
  const pages = Math.max(1, Math.ceil(total / FEEDBACK_PAGE_SIZE));

  const href = (s: string | null, p = 1) => {
    const q = new URLSearchParams();
    if (s) q.set("status", s);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return `/admin/feedback${qs ? `?${qs}` : ""}`;
  };

  // A page past the end (e.g. after items were resolved) → jump to the last page.
  if (page > pages) redirect(href(status, pages));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Private · only admins can see this"
        title="Customer feedback"
        description="1–3 star feedback customers sent privately."
      />

      <Card
        padded={false}
        title={`${formatNumber(total)} ${status ? FEEDBACK_STATUS_LABELS[status].toLowerCase() : "total"}`}
        action={
          <nav
            aria-label="Filter by status"
            className="-mr-1 flex max-w-[65vw] gap-1 overflow-x-auto rounded-2xl bg-brand-soft/40 p-1 sm:max-w-none"
          >
            {[null, ...FEEDBACK_STATUSES].map((s) => (
              <Link
                key={s ?? "all"}
                href={href(s)}
                aria-current={s === status ? "true" : undefined}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                  s === status ? "bg-white text-ink shadow-sm ring-1 ring-black/[0.06]" : "text-muted hover:text-ink"
                }`}
              >
                {s ? FEEDBACK_STATUS_LABELS[s] : "All"}
              </Link>
            ))}
          </nav>
        }
      >
        <FeedbackList items={items} timeZone={config.timezone ?? "UTC"} />
        {total > 0 && (
          <Pagination
            page={page}
            pages={pages}
            total={total}
            pageSize={FEEDBACK_PAGE_SIZE}
            hrefFor={(p) => href(status, p)}
            noun="feedback"
          />
        )}
      </Card>
    </div>
  );
}
