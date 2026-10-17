import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { generateWeeklySummary } from "@/lib/insights/weeklySummary";
import { ensureBusinessRecord, getConfiguredBusinesses } from "@/lib/review/business";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { shiftWeek, weekStartOf } from "@/lib/time";

// AI calls can take a while; allow up to a minute.
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * GET /api/cron/weekly-summary — called by Vercel Cron every Monday
 * (see vercel.json). Creates LAST week's summary for each configured
 * business, if it doesn't exist yet. Requires the CRON_SECRET header.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { slug: string; week: string; status: string }[] = [];
  for (const config of getConfiguredBusinesses()) {
    const week = shiftWeek(weekStartOf(new Date(), config.timezone ?? "UTC"), -1);
    try {
      const businessId = await ensureBusinessRecord(config);
      const outcome = await generateWeeklySummary({
        db: getSupabaseAdmin(),
        businessId,
        config,
        weekStart: week,
        mode: "cron",
      });
      results.push({ slug: config.slug, week, status: outcome.status });
    } catch (err) {
      console.error(`[cron/weekly-summary] ${config.slug}:`, err instanceof Error ? err.message : err);
      results.push({ slug: config.slug, week, status: "error" });
    }
  }
  return NextResponse.json({ results });
}
