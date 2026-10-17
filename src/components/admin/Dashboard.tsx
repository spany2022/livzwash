import Link from "next/link";
import type { PrivateFeedback, ReviewMetrics } from "@/types/feedback";
import { formatWeekLabel, type DateRange } from "@/lib/time";
import type { StoredWeeklySummary } from "@/types/insights";
import { DateRangeFilter } from "./DateRangeFilter";
import { FeedbackList } from "./FeedbackList";
import { MetricsCards } from "./MetricsCards";
import { ArrowRightIcon, CheckCircleIcon, FeedbackIcon, QrIcon, SparkIcon } from "./icons";
import { BarList, Card, IconBadge, PageHeader, formatNumber } from "./ui";

function greetingName(email: string): string {
  const first = email.split("@")[0]?.split(/[._\-+0-9]/)[0] ?? "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "there";
}

/** Each step of the review flow as a bar, scaled to the largest value. */
function JourneyCard({ metrics }: { metrics: ReviewMetrics }) {
  const steps = [
    { label: "QR scans", value: metrics.qr_scans },
    { label: "Review sessions", value: metrics.total_sessions },
    { label: "4–5 star sessions", value: metrics.positive_sessions },
    { label: "AI-generated reviews", value: metrics.ai_generated_reviews },
    { label: "Google review clicks", value: metrics.google_review_clicks },
  ];
  return (
    <Card title="Customer journey" description="How visits moved through the review flow" className="lg:col-span-2">
      <BarList label="Customer journey counts" items={steps} />
    </Card>
  );
}

export function Dashboard({
  metrics,
  recentFeedback,
  newFeedbackCount,
  range,
  timeZone,
  warnings,
  userEmail,
  businessName,
  latestSummary,
}: {
  metrics: ReviewMetrics;
  recentFeedback: PrivateFeedback[];
  newFeedbackCount: number;
  range: DateRange;
  timeZone: string;
  warnings: string[];
  userEmail: string;
  businessName: string;
  latestSummary: StoredWeeklySummary | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`Hi ${greetingName(userEmail)},`}
        title="Welcome back!"
        description={`Here’s how customers are rating ${businessName}.`}
        actions={<DateRangeFilter basePath="/admin" current={range} />}
      />

      {warnings.length > 0 && (
        <div role="note" className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 ring-1 ring-amber-200">
          <p className="font-semibold">Configuration needs attention</p>
          <ul className="mt-1 list-disc pl-5">
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}

      <MetricsCards metrics={metrics} />

      <div className="grid gap-6 lg:grid-cols-3">
        <JourneyCard metrics={metrics} />

        <div className="flex flex-col gap-6">
          <section className="flex flex-1 flex-col rounded-3xl bg-white p-6 ring-1 ring-black/[0.05]">
            <IconBadge Icon={FeedbackIcon} />
            <p className="mt-5 text-sm font-medium text-muted">1–3 Star Feedback</p>
            <p className="text-[2.25rem] leading-tight font-bold tracking-tight text-ink tabular-nums">
              {formatNumber(metrics.private_feedback)}
            </p>
            <p className="text-sm text-muted">
              Private feedback submitted ·{" "}
              <span className="font-semibold text-ink">{formatNumber(newFeedbackCount)} new</span> to review
            </p>
            <Link
              href="/admin/feedback?status=new"
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand px-5 font-semibold text-on-brand transition hover:brightness-110"
            >
              Review feedback
            </Link>
          </section>

          <section className="flex items-center gap-4 rounded-3xl bg-white p-5 ring-1 ring-black/[0.05]">
            <IconBadge Icon={CheckCircleIcon} />
            <div>
              <p className="text-sm font-medium text-muted">Completed Sessions</p>
              <p className="text-[1.7rem] leading-tight font-bold tracking-tight text-ink tabular-nums">
                {formatNumber(metrics.completed_sessions)}
              </p>
              <p className="text-xs text-muted">Clicked Google or sent feedback</p>
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          title="New private feedback"
          description="Latest 1–3 star visits waiting for a response"
          className="lg:col-span-2"
          padded={false}
          action={
            <Link
              href="/admin/feedback"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              View all <ArrowRightIcon className="size-4" />
            </Link>
          }
        >
          <FeedbackList items={recentFeedback} timeZone={timeZone} emptyText="Nothing new — you’re all caught up." />
        </Card>

        <div className="flex flex-col gap-6">
          <section className="flex flex-1 flex-col rounded-3xl bg-brand p-6 text-on-brand shadow-[0_18px_36px_-24px_var(--brand-primary)]">
            <p className="flex items-center gap-2 text-sm font-semibold text-on-brand/80">
              <SparkIcon className="size-4" />
              {latestSummary ? `Weekly summary · ${formatWeekLabel(latestSummary.weekStart)}` : "Weekly AI summary"}
            </p>
            <p className="font-display mt-3 text-lg leading-snug font-semibold">
              {latestSummary
                ? latestSummary.summary.headline
                : "Every Monday you’ll get a short summary of last week’s feedback."}
            </p>
            <Link
              href={latestSummary ? `/admin/insights?week=${latestSummary.weekStart}` : "/admin/insights"}
              className="mt-5 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-on-brand underline-offset-4 hover:underline"
            >
              {latestSummary ? "Read summary" : "Open insights"} <ArrowRightIcon className="size-4" />
            </Link>
          </section>

          <section className="flex items-center gap-4 rounded-3xl bg-white p-5 ring-1 ring-black/[0.05]">
            <IconBadge Icon={QrIcon} />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-ink">Your review QR code</h2>
              <p className="text-sm text-muted">Print for tables, bills and packaging.</p>
            </div>
            <Link
              href="/admin/qr"
              aria-label="Open QR code"
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand transition hover:ring-1 hover:ring-brand/30"
            >
              <ArrowRightIcon className="size-5" />
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
