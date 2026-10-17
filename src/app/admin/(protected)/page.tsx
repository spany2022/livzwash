import { Dashboard } from "@/components/admin/Dashboard";
import { requireAdmin } from "@/lib/admin/auth";
import { getMetrics, listFeedback } from "@/lib/admin/queries";
import { parseDateRange, rangeStart } from "@/lib/time";
import { validateBusinessConfig } from "@/lib/validation/businessConfig";
import { getLatestSummary } from "@/lib/insights/weeklySummary";

export default async function AdminDashboardPage({ searchParams }: PageProps<"/admin">) {
  const { supabase, business, config, user } = await requireAdmin();
  const range = parseDateRange((await searchParams).range);
  const timeZone = config.timezone ?? "UTC";

  const [metrics, recent, latestSummary] = await Promise.all([
    getMetrics(supabase, business.id, rangeStart(range, timeZone)),
    listFeedback(supabase, business.id, { status: "new", page: 1 }),
    // Don't break the dashboard if the weekly-summary migration isn't run yet.
    getLatestSummary(supabase, business.id).catch(() => null),
  ]);
  const report = validateBusinessConfig(config);

  return (
    <Dashboard
      metrics={metrics}
      recentFeedback={recent.items.slice(0, 5)}
      newFeedbackCount={recent.total}
      range={range}
      timeZone={timeZone}
      warnings={[...report.errors, ...report.warnings]}
      userEmail={user.email ?? ""}
      businessName={business.name}
      latestSummary={latestSummary}
    />
  );
}
