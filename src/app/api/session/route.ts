import { NextResponse } from "next/server";
import { limits } from "@/config/limits";
import { jsonError } from "@/lib/http";
import { checkRateLimit, handlePublicRoute } from "@/lib/review/route";
import {
  createSession,
  findResumableSession,
  loadSession,
  recordEvents,
  updateOpenSession,
} from "@/lib/review/sessions";
import { firstIssueMessage, sessionRequestSchema } from "@/lib/validation/schemas";

/**
 * POST /api/session
 *   { action: "start",  slug, resumeSessionId? } → { sessionId }   (tracks qr_scan)
 *   { action: "rating", slug, sessionId, rating } → { ok: true }    (tracks rating_selected)
 */
export async function POST(request: Request) {
  return handlePublicRoute(
    request,
    { name: "session", rateLimit: limits.rateLimits.sessionUpdate },
    async ({ body, businessId, ip }) => {
      const parsed = sessionRequestSchema.safeParse(body);
      if (!parsed.success) return jsonError(400, firstIssueMessage(parsed.error), "invalid_request");
      const input = parsed.data;

      if (input.action === "start") {
        // Stricter limit on creating sessions (each one counts as a QR scan).
        const limited = checkRateLimit(`session-start:${ip}`, limits.rateLimits.sessionStart);
        if (limited) return limited;
        const resumed = input.resumeSessionId
          ? await findResumableSession(businessId, input.resumeSessionId)
          : null;
        const sessionId = resumed ?? (await createSession(businessId));
        return NextResponse.json({ sessionId, resumed: Boolean(resumed) });
      }

      const session = await loadSession(businessId, input.sessionId);
      if (!session) return jsonError(404, "Please refresh the page and try again.", "session_not_found");
      // Never move the status backwards if a later step already happened.
      const earlyStage = session.status === "started" || session.status === "rating_selected";
      const updated = await updateOpenSession(businessId, input.sessionId, {
        rating: input.rating,
        ...(earlyStage ? { status: "rating_selected" as const } : {}),
      });
      if (!updated) return jsonError(409, "This visit has already been completed.", "session_closed");
      await recordEvents(businessId, input.sessionId, ["rating_selected"]);
      return NextResponse.json({ ok: true });
    },
  );
}
