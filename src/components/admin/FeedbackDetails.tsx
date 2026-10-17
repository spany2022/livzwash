import type { PrivateFeedback } from "@/types/feedback";
import { formatDateTime } from "@/lib/time";
import { RatingBadge, Stars, StatusBadge } from "./FeedbackBits";
import { FeedbackStatusForm } from "./FeedbackStatusForm";
import { Card } from "./ui";

export function FeedbackDetails({ feedback, timeZone }: { feedback: PrivateFeedback; timeZone: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <RatingBadge rating={feedback.rating} />
          <div>
            <Stars rating={feedback.rating} />
            <p className="text-sm text-muted">
              <time dateTime={feedback.createdAt}>{formatDateTime(feedback.createdAt, timeZone)}</time>
            </p>
          </div>
          <span className="sm:ml-auto">
            <StatusBadge status={feedback.status} />
          </span>
        </div>

        {feedback.categories.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">What could have been better</h2>
            <ul aria-label="Categories" className="mt-2 flex flex-wrap gap-2">
              {feedback.categories.map((c) => (
                <li key={c} className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-on-brand-soft">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-brand-soft/35 p-5">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Customer feedback</h2>
          <p className="mt-2 text-lg leading-relaxed whitespace-pre-wrap text-ink">{feedback.feedback}</p>
        </div>
      </Card>

      <Card title="Manage" description="Track follow-up for this feedback">
        <FeedbackStatusForm id={feedback.id} status={feedback.status} notes={feedback.adminNotes} />
      </Card>
    </div>
  );
}
