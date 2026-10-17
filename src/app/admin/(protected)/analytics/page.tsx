import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { RatingAnalytics } from "@/components/admin/RatingAnalytics";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getAnalytics } from "@/lib/admin/queries";
import { parseDateRange, rangeStart } from "@/lib/time";

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  const { supabase, business, config } = await requireAdmin();
  const range = parseDateRange((await searchParams).range);
  const analytics = await getAnalytics(supabase, business.id, rangeStart(range, config.timezone ?? "UTC"));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analytics"
        description="Ratings and the categories customers chose."
        actions={<DateRangeFilter basePath="/admin/analytics" current={range} />}
      />
      <RatingAnalytics analytics={analytics} />
    </div>
  );
}
