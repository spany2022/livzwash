import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { reviewAIConfig, weeklySummaryAIConfig } from "@/config/ai";
import { AIError, callGemini } from "@/lib/ai/gemini";
import { formatWeekLabel, shiftWeek, weekBounds, weekStartOf } from "@/lib/time";
import type { BusinessConfig } from "@/types/business";
import type { Database } from "@/types/database";
import type { PeriodStats, StoredWeeklySummary, WeeklyStatsSnapshot, WeeklySummaryContent } from "@/types/insights";
import { buildSummaryPrompt, type FeedbackItem } from "./prompt";
import { parseSummary } from "./parse";

type Client = SupabaseClient<Database>;

function normalizeStats(raw: unknown): PeriodStats {
  const r = (raw ?? {}) as Partial<Record<keyof PeriodStats, unknown>>;
  const num = (v: unknown) => Number(v ?? 0) || 0;
  const list = <T,>(v: unknown, map: (x: Record<string, unknown>) => T): T[] =>
    Array.isArray(v) ? v.map((x) => map(x as Record<string, unknown>)) : [];
  return {
    qr_scans: num(r.qr_scans),
    google_review_clicks: num(r.google_review_clicks),
    total_sessions: num(r.total_sessions),
    rated_sessions: num(r.rated_sessions),
    average_rating: r.average_rating === null || r.average_rating === undefined ? null : Number(r.average_rating),
    positive_sessions: num(r.positive_sessions),
    private_feedback: num(r.private_feedback),
    ai_generated_reviews: num(r.ai_generated_reviews),
    completed_sessions: num(r.completed_sessions),
    ratings: list(r.ratings, (x) => ({ rating: num(x.rating), count: num(x.count) })),
    liked: list(r.liked, (x) => ({ category: String(x.category), count: num(x.count) })),
    improve: list(r.improve, (x) => ({ category: String(x.category), count: num(x.count) })),
  };
}

export async function getPeriodStats(db: Client, businessId: string, from: string, to: string) {
  const { data, error } = await db.rpc("review_period_stats", { p_business_id: businessId, p_from: from, p_to: to });
  if (error) throw new Error(`review_period_stats: ${error.message}`);
  return normalizeStats(data);
}

/** Exact numbers for a week and the week before it. */
export async function getWeekStats(db: Client, businessId: string, weekStart: string, timeZone: string) {
  const cur = weekBounds(weekStart, timeZone);
  const prev = weekBounds(shiftWeek(weekStart, -1), timeZone);
  const [current, previous] = await Promise.all([
    getPeriodStats(db, businessId, cur.from, cur.to),
    getPeriodStats(db, businessId, prev.from, prev.to),
  ]);
  return { current, previous } satisfies WeeklyStatsSnapshot;
}

async function getWeekComments(db: Client, businessId: string, weekStart: string, timeZone: string) {
  const { from, to } = weekBounds(weekStart, timeZone);
  const max = weeklySummaryAIConfig.maxFeedbackItems;
  const base = () =>
    db
      .from("review_sessions")
      .select("rating, selected_categories, customer_input")
      .eq("business_id", businessId)
      .gte("created_at", from)
      .lt("created_at", to)
      .not("customer_input", "is", null)
      .order("created_at", { ascending: false })
      .limit(max);

  const [complaints, praise] = await Promise.all([
    base().eq("status", "private_feedback_submitted"),
    base().gte("rating", 4),
  ]);
  if (complaints.error) throw new Error(`week complaints: ${complaints.error.message}`);
  if (praise.error) throw new Error(`week praise: ${praise.error.message}`);

  const toItem = (row: { rating: number | null; selected_categories: string[]; customer_input: string | null }): FeedbackItem => ({
    rating: row.rating,
    categories: row.selected_categories ?? [],
    text: row.customer_input ?? "",
  });
  return {
    complaints: (complaints.data ?? []).map(toItem).filter((f) => f.text.trim()),
    praise: (praise.data ?? []).map(toItem).filter((f) => f.text.trim()),
  };
}

function toStored(row: Database["public"]["Tables"]["weekly_summaries"]["Row"]): StoredWeeklySummary {
  return {
    weekStart: row.week_start,
    stats: row.stats as WeeklyStatsSnapshot,
    summary: row.summary as WeeklySummaryContent,
    generationCount: row.generation_count,
    updatedAt: row.updated_at,
  };
}

export async function getStoredSummary(db: Client, businessId: string, weekStart: string) {
  const { data, error } = await db
    .from("weekly_summaries")
    .select("*")
    .eq("business_id", businessId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw new Error(`getStoredSummary: ${error.message}`);
  return data ? toStored(data) : null;
}

/** Time of the most recent customer visit, or null if there are none yet. */
export async function getLatestVisitAt(db: Client, businessId: string): Promise<string | null> {
  const { data, error } = await db
    .from("review_sessions")
    .select("created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestVisitAt: ${error.message}`);
  return data?.created_at ?? null;
}

export async function getLatestSummary(db: Client, businessId: string) {
  const { data, error } = await db
    .from("weekly_summaries")
    .select("*")
    .eq("business_id", businessId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestSummary: ${error.message}`);
  return data ? toStored(data) : null;
}

/** Ask the AI for the written summary; retry once if the output fails the checks. */
async function writeSummary(prompt: string): Promise<WeeklySummaryContent> {
  let current = prompt;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callGemini({
      systemPrompt: weeklySummaryAIConfig.systemPrompt,
      prompt: current,
      temperature: weeklySummaryAIConfig.temperature,
      maxOutputTokens: weeklySummaryAIConfig.maxOutputTokens,
      timeoutMs: weeklySummaryAIConfig.timeoutMs,
      responseMimeType: "application/json",
    });
    const result = parseSummary(raw, prompt);
    if (result.ok) return result.summary;
    current = `${prompt}\n\nYour previous answer was rejected (${result.reason}). Return valid JSON only, and use only numbers that appear in the data above.`;
  }
  throw new AIError("empty", "summary-rejected");
}

export type GenerateOutcome =
  | { status: "saved"; summary: StoredWeeklySummary }
  | { status: "no_data" }
  | { status: "future_week" }
  | { status: "limit_reached" }
  | { status: "already_exists" };

/**
 * Creates (or regenerates) the summary for one week.
 * `mode: "cron"` never overwrites an existing summary.
 */
export async function generateWeeklySummary(opts: {
  db: Client;
  businessId: string;
  config: BusinessConfig;
  weekStart: string;
  mode: "manual" | "cron";
  now?: Date;
}): Promise<GenerateOutcome> {
  const { db, businessId, config, weekStart, mode } = opts;
  const timeZone = config.timezone ?? "UTC";
  const thisWeek = weekStartOf(opts.now ?? new Date(), timeZone);
  if (weekStart > thisWeek) return { status: "future_week" };

  const existing = await getStoredSummary(db, businessId, weekStart);
  if (existing && mode === "cron") return { status: "already_exists" };
  if (existing && existing.generationCount >= weeklySummaryAIConfig.maxGenerationsPerWeek) {
    return { status: "limit_reached" };
  }

  const stats = await getWeekStats(db, businessId, weekStart, timeZone);
  if (stats.current.total_sessions === 0) return { status: "no_data" };

  const comments = await getWeekComments(db, businessId, weekStart, timeZone);
  const prompt = buildSummaryPrompt(
    {
      category: config.category,
      weekLabel: formatWeekLabel(weekStart),
      inProgress: weekStart === thisWeek,
      current: stats.current,
      previous: stats.previous,
      ...comments,
    },
    weeklySummaryAIConfig.maxFeedbackChars,
  );
  const summary = await writeSummary(prompt);

  const payload = {
    business_id: businessId,
    week_start: weekStart,
    stats,
    summary,
    model: reviewAIConfig.model,
    generation_count: (existing?.generationCount ?? 0) + 1,
  };
  const { data, error } = await db
    .from("weekly_summaries")
    .upsert(payload, { onConflict: "business_id,week_start" })
    .select("*")
    .single();
  if (error || !data) throw new Error(`save summary: ${error?.message ?? "no row"}`);
  return { status: "saved", summary: toStored(data) };
}
