import type { ComponentType, SVGProps } from "react";
import { formatDateTime } from "@/lib/time";
import type { PeriodStats, StoredWeeklySummary, WeeklyStatsSnapshot } from "@/types/insights";
import { CheckCircleIcon, ClickIcon, FeedbackIcon, SparkIcon, StarIcon, UsersIcon } from "../icons";
import { IconBadge, formatNumber } from "../ui";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

/** Change vs previous week, worded plainly. `higherIsBetter` picks the colour. */
function Delta({ now, before, higherIsBetter, decimals = 0 }: { now: number | null; before: number | null; higherIsBetter: boolean; decimals?: number }) {
  if (now === null || before === null) return <span className="text-xs text-muted">No comparison</span>;
  const diff = Number((now - before).toFixed(decimals));
  if (diff === 0) return <span className="text-xs text-muted">Same as previous week</span>;
  const good = diff > 0 === higherIsBetter;
  return (
    <span className={`text-xs font-semibold ${good ? "text-emerald-800" : "text-amber-800"}`}>
      {diff > 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(decimals)} <span className="font-normal text-muted">vs previous week</span>
    </span>
  );
}

function WeekStat({ label, value, children, Icon }: { label: string; value: string; children: React.ReactNode; Icon: Icon }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white p-5 ring-1 ring-black/[0.05]">
      <IconBadge Icon={Icon} />
      <div>
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="text-[1.7rem] leading-tight font-bold tracking-tight text-ink tabular-nums">{value}</p>
        {children}
      </div>
    </div>
  );
}

export function WeekStats({ stats }: { stats: WeeklyStatsSnapshot }) {
  const { current: c, previous: p } = stats;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <WeekStat label="Review sessions" value={formatNumber(c.total_sessions)} Icon={UsersIcon}>
        <Delta now={c.total_sessions} before={p.total_sessions} higherIsBetter />
      </WeekStat>
      <WeekStat label="Average rating" value={c.average_rating !== null ? `${c.average_rating.toFixed(1)} ★` : "—"} Icon={StarIcon}>
        <Delta now={c.average_rating} before={p.average_rating} higherIsBetter decimals={1} />
      </WeekStat>
      <WeekStat label="Google review clicks" value={formatNumber(c.google_review_clicks)} Icon={ClickIcon}>
        <Delta now={c.google_review_clicks} before={p.google_review_clicks} higherIsBetter />
      </WeekStat>
      <WeekStat label="1–3 star feedback" value={formatNumber(c.private_feedback)} Icon={FeedbackIcon}>
        <Delta now={c.private_feedback} before={p.private_feedback} higherIsBetter={false} />
      </WeekStat>
    </div>
  );
}

function CategoryChips({ items, empty }: { items: PeriodStats["liked"]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.slice(0, 6).map((c) => (
        <li key={c.category} className="rounded-full bg-brand-soft px-3 py-1 text-sm text-on-brand-soft">
          {c.category} <span className="font-semibold tabular-nums">{c.count}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, items, empty, Icon, children }: { title: string; items: string[]; empty: string; Icon: Icon; children?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-white p-6 ring-1 ring-black/[0.05]">
      <div className="flex items-center gap-3">
        <IconBadge Icon={Icon} />
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
      </div>
      {children}
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item} className="flex gap-3 leading-relaxed text-ink">
              <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function WeeklySummaryView({ stored, timeZone }: { stored: StoredWeeklySummary; timeZone: string }) {
  const { summary, stats } = stored;
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl bg-brand p-6 text-on-brand shadow-[0_24px_48px_-30px_var(--brand-primary)] sm:p-8">
        <p className="flex items-center gap-2 text-sm font-semibold text-on-brand/80">
          <SparkIcon className="size-4" /> AI summary
        </p>
        <p className="font-display mt-2 text-2xl leading-snug font-semibold sm:text-[1.75rem]">{summary.headline}</p>
        <p className="mt-4 text-xs text-on-brand/75">
          Written by AI from this week&apos;s numbers and customer comments · Updated{" "}
          {formatDateTime(stored.updatedAt, timeZone)}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="What went well" items={summary.wentWell} empty="Nothing stood out this week." Icon={StarIcon}>
          <CategoryChips items={stats.current.liked} empty="No “liked” categories chosen." />
        </Section>
        <Section title="What to improve" items={summary.toImprove} empty="No clear issues this week." Icon={FeedbackIcon}>
          <CategoryChips items={stats.current.improve} empty="No complaint categories chosen." />
        </Section>
        <Section title="Suggestions" items={summary.suggestions} empty="No suggestions this week." Icon={CheckCircleIcon} />
      </div>

      <p className="text-xs text-muted">
        Numbers and category counts are exact. The written parts are AI-generated from customer comments — check the
        original feedback before acting on them.
      </p>
    </div>
  );
}
