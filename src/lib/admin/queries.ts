import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  FEEDBACK_STATUSES,
  type FeedbackStatus,
  type PrivateFeedback,
  type ReviewAnalytics,
  type ReviewMetrics,
} from "@/types/feedback";

type Client = SupabaseClient<Database>;
type SessionRow = Database["public"]["Tables"]["review_sessions"]["Row"];

const EMPTY_METRICS: ReviewMetrics = {
  qr_scans: 0,
  google_review_clicks: 0,
  total_sessions: 0,
  private_feedback: 0,
  positive_sessions: 0,
  ai_generated_reviews: 0,
  completed_sessions: 0,
};

export async function getMetrics(db: Client, businessId: string, since: string | null) {
  const { data, error } = await db.rpc("review_metrics", { p_business_id: businessId, p_since: since });
  if (error) throw new Error(`review_metrics: ${error.message}`);
  const raw = (data ?? {}) as Partial<Record<keyof ReviewMetrics, number | string>>;
  const metrics = { ...EMPTY_METRICS };
  for (const key of Object.keys(EMPTY_METRICS) as (keyof ReviewMetrics)[]) {
    metrics[key] = Number(raw[key] ?? 0);
  }
  return metrics;
}

export async function getAnalytics(db: Client, businessId: string, since: string | null) {
  const { data, error } = await db.rpc("review_analytics", { p_business_id: businessId, p_since: since });
  if (error) throw new Error(`review_analytics: ${error.message}`);
  const raw = (data ?? {}) as Partial<ReviewAnalytics>;
  const byRating = new Map((raw.ratings ?? []).map((r) => [Number(r.rating), Number(r.count)]));
  return {
    // Always return all five ratings, including zeros.
    ratings: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: byRating.get(rating) ?? 0 })),
    liked: (raw.liked ?? []).map((c) => ({ category: c.category, count: Number(c.count) })),
    improve: (raw.improve ?? []).map((c) => ({ category: c.category, count: Number(c.count) })),
  } satisfies ReviewAnalytics;
}

function toFeedback(row: SessionRow): PrivateFeedback {
  return {
    id: row.id,
    rating: row.rating,
    categories: row.selected_categories ?? [],
    feedback: row.customer_input ?? "",
    status: row.feedback_status ?? "new",
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
  };
}

export const FEEDBACK_PAGE_SIZE = 25;

export function parseFeedbackStatus(value: unknown): FeedbackStatus | null {
  return FEEDBACK_STATUSES.includes(value as FeedbackStatus) ? (value as FeedbackStatus) : null;
}

export async function listFeedback(
  db: Client,
  businessId: string,
  opts: { status: FeedbackStatus | null; page: number },
) {
  const from = (opts.page - 1) * FEEDBACK_PAGE_SIZE;
  let query = db
    .from("review_sessions")
    .select("*", { count: "exact" })
    .eq("business_id", businessId)
    .eq("status", "private_feedback_submitted")
    .order("created_at", { ascending: false })
    .range(from, from + FEEDBACK_PAGE_SIZE - 1);
  if (opts.status) query = query.eq("feedback_status", opts.status);

  const { data, error, count } = await query;
  if (error) throw new Error(`listFeedback: ${error.message}`);
  return { items: (data ?? []).map(toFeedback), total: count ?? 0 };
}

export async function getFeedback(db: Client, businessId: string, id: string) {
  const { data, error } = await db
    .from("review_sessions")
    .select("*")
    .eq("id", id)
    .eq("business_id", businessId)
    .eq("status", "private_feedback_submitted")
    .maybeSingle();
  if (error) throw new Error(`getFeedback: ${error.message}`);
  return data ? toFeedback(data) : null;
}
