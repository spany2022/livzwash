import type { ReviewAnalytics } from "@/types/feedback";
import { AnalyticsIcon, FeedbackIcon, StarIcon } from "./icons";
import { BarList, IconBadge, formatNumber } from "./ui";
import type { ComponentType, SVGProps } from "react";

interface BarRow {
  label: string;
  count: number;
}

/** A titled card with a single-series bar list. */
function BarTable({
  caption,
  subtitle,
  rows,
  emptyText,
  Icon,
}: {
  caption: string;
  subtitle: string;
  rows: BarRow[];
  emptyText: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return (
    <section className="rounded-3xl bg-white p-6 ring-1 ring-black/[0.05]">
      <div className="flex items-center gap-4">
        <IconBadge Icon={Icon} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-ink">{caption}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        {total > 0 && (
          <p className="text-right">
            <span className="block text-2xl font-bold text-ink tabular-nums">{formatNumber(total)}</span>
            <span className="text-xs text-muted">total</span>
          </p>
        )}
      </div>
      {total === 0 ? (
        <p className="mt-6 rounded-2xl bg-brand-soft/35 p-5 text-center text-sm text-muted">{emptyText}</p>
      ) : (
        <div className="mt-6">
          <BarList
            label={caption}
            items={rows.map((row) => ({
              label: row.label,
              value: row.count,
              suffix: `${Math.round((row.count / total) * 100)}%`,
            }))}
          />
        </div>
      )}
    </section>
  );
}

export function RatingAnalytics({ analytics }: { analytics: ReviewAnalytics }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <BarTable
          caption="Rating distribution"
          subtitle="Stars chosen by customers"
          Icon={AnalyticsIcon}
          emptyText="No ratings in this period."
          rows={[...analytics.ratings].reverse().map((r) => ({
            label: `${r.rating} ${r.rating === 1 ? "Star" : "Stars"}`,
            count: r.count,
          }))}
        />
      </div>
      <BarTable
        caption="What customers liked"
        subtitle="Categories picked with 4–5 stars"
        Icon={StarIcon}
        emptyText="No categories selected yet."
        rows={analytics.liked.map((c) => ({ label: c.category, count: c.count }))}
      />
      <BarTable
        caption="What could be better"
        subtitle="Categories picked with 1–3 stars"
        Icon={FeedbackIcon}
        emptyText="No categories selected yet."
        rows={analytics.improve.map((c) => ({ label: c.category, count: c.count }))}
      />
    </div>
  );
}
