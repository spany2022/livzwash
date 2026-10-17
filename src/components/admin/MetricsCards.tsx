import type { ReviewMetrics } from "@/types/feedback";
import { ClickIcon, ScanIcon, StarIcon, UsersIcon } from "./icons";
import { StatCard } from "./ui";

/**
 * Top-row metrics. Labels are deliberately precise: we record Google button
 * CLICKS, not posted reviews, because we cannot verify what happens on Google.
 */
export function MetricsCards({ metrics }: { metrics: ReviewMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard label="QR Scans" value={metrics.qr_scans} hint="Review page opened" Icon={ScanIcon} />
      <StatCard label="Total Review Sessions" value={metrics.total_sessions} hint="Customer visits started" Icon={UsersIcon} />
      <StatCard label="4–5 Star Sessions" value={metrics.positive_sessions} hint="Chose 4 or 5 stars" Icon={StarIcon} />
      <StatCard
        label="Google Review Clicks"
        value={metrics.google_review_clicks}
        hint="Button clicks — posting isn’t verified"
        Icon={ClickIcon}
        highlight
      />
    </div>
  );
}
