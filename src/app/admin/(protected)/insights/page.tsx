import Link from "next/link";
import { weeklySummaryAIConfig } from "@/config/ai";
import { GenerateSummaryButton } from "@/components/admin/insights/GenerateSummaryButton";
import { WeekPicker } from "@/components/admin/insights/WeekPicker";
import { WeekStats, WeeklySummaryView } from "@/components/admin/insights/WeeklySummaryView";
import { InboxIcon, SparkIcon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { pickDefaultWeek } from "@/lib/insights/defaultWeek";
import { getLatestVisitAt, getStoredSummary, getWeekStats } from "@/lib/insights/weeklySummary";
import { formatWeekLabel, isWeekStart, shiftWeek, weekStartOf } from "@/lib/time";
import type { StoredWeeklySummary, WeeklyStatsSnapshot } from "@/types/insights";

// Generating a summary calls the AI; give the server action time to finish.
export const maxDuration = 60;

export default async function InsightsPage({ searchParams }: PageProps<"/admin/insights">) {
  const { supabase, business, config } = await requireAdmin();
  const timeZone = config.timezone ?? "UTC";
  const thisWeek = weekStartOf(new Date(), timeZone);
  const requested = (await searchParams).week;
  const explicitWeek = isWeekStart(requested) && requested <= thisWeek ? requested : null;

  let week: string;
  let fellBackFrom: string | null = null;
  let stored: StoredWeeklySummary | null;
  let stats: WeeklyStatsSnapshot;

  if (explicitWeek) {
    week = explicitWeek;
    stored = await getStoredSummary(supabase, business.id, week);
    stats = stored?.stats ?? (await getWeekStats(supabase, business.id, week, timeZone));
  } else {
    // Default: the last complete week — unless it had no visits, then the latest week that has some.
    const lastWeek = shiftWeek(thisWeek, -1);
    const [lastStored, lastStats, latestVisitAt] = await Promise.all([
      getStoredSummary(supabase, business.id, lastWeek),
      getWeekStats(supabase, business.id, lastWeek, timeZone),
      getLatestVisitAt(supabase, business.id),
    ]);
    const choice = pickDefaultWeek({
      thisWeek,
      lastWeekHasData: Boolean(lastStored) || lastStats.current.total_sessions > 0,
      latestVisitAt,
      timeZone,
    });
    week = choice.week;
    if (choice.fellBack) {
      fellBackFrom = lastWeek;
      stored = await getStoredSummary(supabase, business.id, week);
      stats = stored?.stats ?? (await getWeekStats(supabase, business.id, week, timeZone));
    } else {
      stored = lastStored;
      stats = lastStored?.stats ?? lastStats;
    }
  }
  const inProgress = week === thisWeek;
  const hasVisits = stats.current.total_sessions > 0;
  const remaining = stored ? Math.max(0, weeklySummaryAIConfig.maxGenerationsPerWeek - stored.generationCount) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={inProgress ? "This week · still in progress" : "Weekly insights"}
        title="Weekly summary"
        description="What customers said this week, in plain words — with exact numbers from your data."
        actions={<WeekPicker week={week} thisWeek={thisWeek} />}
      />

      {fellBackFrom && (
        <p role="note" className="rounded-2xl bg-brand-soft/50 px-4 py-3 text-sm text-on-brand-soft ring-1 ring-brand/10">
          Last week ({formatWeekLabel(fellBackFrom)}) had no customer visits, so we&apos;re showing the most recent week
          that has some.{" "}
          <Link href={`/admin/insights?week=${fellBackFrom}`} className="font-semibold underline underline-offset-2">
            View last week anyway
          </Link>
        </p>
      )}

      <WeekStats stats={stats} />

      {stored ? (
        <>
          <WeeklySummaryView stored={stored} timeZone={timeZone} />
          <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl bg-white p-5 ring-1 ring-black/[0.05]">
            <div>
              <p className="font-semibold text-ink">Numbers changed since this was written?</p>
              <p className="text-sm text-muted">Regenerate to include the latest feedback.</p>
            </div>
            <GenerateSummaryButton week={week} label="Regenerate summary" remaining={remaining} variant="secondary" />
          </div>
        </>
      ) : hasVisits ? (
        <section className="flex flex-col items-start gap-4 rounded-3xl bg-white p-6 ring-1 ring-black/[0.05] sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
            <SparkIcon className="size-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">No summary for this week yet</h2>
            <p className="mt-1 max-w-xl text-muted">
              {inProgress
                ? "The week isn't over, but you can create a summary of what's come in so far."
                : "Summaries are created automatically every Monday morning. You can also create one now."}
            </p>
          </div>
          <GenerateSummaryButton week={week} label="Create summary" remaining={null} />
        </section>
      ) : (
        <section className="flex flex-col items-center gap-3 rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-black/[0.05]">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
            <InboxIcon className="size-6" />
          </span>
          <h2 className="text-lg font-semibold text-ink">No customer visits this week</h2>
          <p className="max-w-md text-muted">
            There&apos;s nothing to summarise yet. Make sure the QR code is on display — see{" "}
            <Link href="/admin/qr" className="font-semibold text-brand hover:underline">
              QR Code
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}
