import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import { TERMINAL_STATUSES, type ReviewEventType, type SessionStatus } from "@/types/review";
import { limits } from "@/config/limits";

export type SessionRow = Database["public"]["Tables"]["review_sessions"]["Row"];

export function isTerminal(status: SessionStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export async function createSession(businessId: string): Promise<string> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("review_sessions")
    .insert({ business_id: businessId, status: "started" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`createSession: ${error?.message}`);
  await recordEvents(businessId, data.id, ["qr_scan"]);
  return data.id;
}

/** Re-use a recent, unfinished session (e.g. after a page reload) instead of counting a new scan. */
export async function findResumableSession(businessId: string, sessionId: string): Promise<string | null> {
  const session = await loadSession(businessId, sessionId);
  if (!session || isTerminal(session.status)) return null;
  const ageMinutes = (Date.now() - new Date(session.created_at).getTime()) / 60_000;
  return ageMinutes <= limits.sessionResumeMaxAgeMinutes ? session.id : null;
}

/** Loads a session and checks it belongs to the business. */
export async function loadSession(businessId: string, sessionId: string): Promise<SessionRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("review_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw new Error(`loadSession: ${error.message}`);
  return data;
}

/**
 * Update an unfinished session. The `status not in terminal` filter makes
 * this safe against double submits and races. Returns false if nothing was
 * updated (session finished or missing).
 */
export async function updateOpenSession(
  businessId: string,
  sessionId: string,
  patch: Database["public"]["Tables"]["review_sessions"]["Update"],
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("review_sessions")
    .update(patch)
    .eq("id", sessionId)
    .eq("business_id", businessId)
    .not("status", "in", `(${TERMINAL_STATUSES.join(",")})`)
    .select("id");
  if (error) throw new Error(`updateOpenSession: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/**
 * Inserts funnel events. Events that are unique per session (qr_scan,
 * google_clicked, private_feedback_submitted) are silently de-duplicated.
 */
export async function recordEvents(
  businessId: string,
  sessionId: string,
  types: ReviewEventType[],
): Promise<void> {
  if (types.length === 0) return;
  const db = getSupabaseAdmin();
  for (const event_type of types) {
    const { error } = await db
      .from("review_events")
      .insert({ business_id: businessId, session_id: sessionId, event_type });
    if (error && error.code !== "23505") throw new Error(`recordEvents: ${error.message}`);
  }
}

export async function claimGeneration(sessionId: string, max: number): Promise<number | null> {
  const { data, error } = await getSupabaseAdmin().rpc("claim_generation", {
    p_session_id: sessionId,
    p_max: max,
  });
  if (error) throw new Error(`claimGeneration: ${error.message}`);
  return typeof data === "number" ? data : null;
}
