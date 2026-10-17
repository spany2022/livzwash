import { humanizeCategory } from "@/lib/ai/prompt";
import type { PeriodStats } from "@/types/insights";

export interface FeedbackItem {
  rating: number | null;
  categories: string[];
  text: string;
}

export interface SummaryPromptInput {
  category: string;
  weekLabel: string;
  inProgress: boolean;
  current: PeriodStats;
  previous: PeriodStats;
  /** Private 1–3 star feedback, newest first. */
  complaints: FeedbackItem[];
  /** Optional words 4–5 star customers added. */
  praise: FeedbackItem[];
}

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/g;

/** Remove contact details before customer text is sent to the AI. */
export function redactContactDetails(text: string): string {
  return text.replace(EMAIL, "[contact removed]").replace(PHONE, "[contact removed]");
}

function clip(text: string, max: number): string {
  const clean = redactContactDetails(text).replace(/\s+/g, " ").replace(/"""/g, '"').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function countsLine(items: { category: string; count: number }[]): string {
  return items.length ? items.map((c) => `${c.category} ${c.count}`).join(", ") : "none";
}

function statsBlock(label: string, s: PeriodStats): string {
  const ratings = [5, 4, 3, 2, 1]
    .map((r) => `${r}★ ${s.ratings.find((x) => x.rating === r)?.count ?? 0}`)
    .join(", ");
  return [
    `${label}:`,
    `- QR scans: ${s.qr_scans}`,
    `- Review sessions: ${s.total_sessions}`,
    `- Average rating: ${s.average_rating ?? "no ratings"}`,
    `- Ratings: ${ratings}`,
    `- 4–5 star sessions: ${s.positive_sessions}`,
    `- Private 1–3 star feedback: ${s.private_feedback}`,
    `- Google review button clicks (posting not verified): ${s.google_review_clicks}`,
    `- Liked (chosen with 4–5 stars): ${countsLine(s.liked)}`,
    `- Could be better (chosen with 1–3 stars): ${countsLine(s.improve)}`,
  ].join("\n");
}

function feedbackBlock(title: string, items: FeedbackItem[], maxChars: number): string {
  if (items.length === 0) return `${title}: none`;
  const lines = items.map((f, i) => {
    const meta = [f.rating ? `${f.rating}★` : null, f.categories.join(", ") || null].filter(Boolean).join(" | ");
    return `${i + 1}. [${meta}] """${clip(f.text, maxChars)}"""`;
  });
  return `${title}:\n${lines.join("\n")}`;
}

/** Everything the AI may use — and nothing else. */
export function buildSummaryPrompt(input: SummaryPromptInput, maxChars: number): string {
  return [
    `Type of business: ${humanizeCategory(input.category) || "business"}`,
    `Week: ${input.weekLabel}${input.inProgress ? " (week still in progress — data is partial)" : ""}`,
    statsBlock("This week (exact numbers)", input.current),
    statsBlock("Previous week (exact numbers, for comparison)", input.previous),
    feedbackBlock("Private feedback from 1–3 star customers (their own words)", input.complaints, maxChars),
    feedbackBlock("Comments added by 4–5 star customers (their own words)", input.praise, maxChars),
    "Write the weekly summary JSON now.",
  ].join("\n\n");
}
