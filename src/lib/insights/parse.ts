import { z } from "zod";
import type { WeeklySummaryContent } from "@/types/insights";

const sentence = z.string().trim().min(1).max(300);

export const summarySchema = z.object({
  headline: sentence,
  wentWell: z.array(sentence).max(3),
  toImprove: z.array(sentence).max(3),
  suggestions: z.array(sentence).max(3),
});

/** Pull the JSON object out of the model's reply (tolerates ```json fences). */
function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export type ParseResult = { ok: true; summary: WeeklySummaryContent } | { ok: false; reason: string };

/**
 * Validates the AI output and applies a fabrication guard: every number the
 * AI writes must appear somewhere in the data we gave it.
 */
export function parseSummary(raw: string, promptText: string): ParseResult {
  const parsed = summarySchema.safeParse(extractJson(raw));
  if (!parsed.success) return { ok: false, reason: "invalid-json" };

  const summary = parsed.data;
  const allText = [summary.headline, ...summary.wentWell, ...summary.toImprove, ...summary.suggestions].join(" ");
  const allowed = new Set(promptText.match(/\d+(?:\.\d+)?/g) ?? []);
  const unsupported = (allText.match(/\d+(?:\.\d+)?/g) ?? []).filter((n) => !allowed.has(n));
  if (unsupported.length > 0) return { ok: false, reason: `unsupported-numbers:${unsupported.join(",")}` };
  if (/%/.test(allText) && !/%/.test(promptText)) return { ok: false, reason: "percentages" };

  return { ok: true, summary };
}
