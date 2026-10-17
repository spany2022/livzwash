import { NextResponse } from "next/server";
import { limits } from "@/config/limits";
import { jsonError } from "@/lib/http";
import { handlePublicRoute } from "@/lib/review/route";
import { loadSession, recordEvents, updateOpenSession } from "@/lib/review/sessions";
import { firstIssueMessage, reviewActionSchema } from "@/lib/validation/schemas";

/**
 * POST /api/review
 *   { action: "edit",    slug, sessionId, review }  → review_edited
 *   { action: "approve", slug, sessionId, review }  → review_approved
 *   { action: "google_click", slug, sessionId }     → google_clicked
 *
 * We only ever record that the Google button was CLICKED — we cannot know
 * whether the customer actually posted a review on Google.
 */
export async function POST(request: Request) {
  return handlePublicRoute(
    request,
    { name: "review", rateLimit: limits.rateLimits.sessionUpdate },
    async ({ body, config, businessId }) => {
      const parsed = reviewActionSchema.safeParse(body);
      if (!parsed.success) return jsonError(400, firstIssueMessage(parsed.error), "invalid_request");
      const input = parsed.data;

      const session = await loadSession(businessId, input.sessionId);
      if (!session) return jsonError(404, "Please refresh the page and try again.", "session_not_found");

      if (input.action === "google_click") {
        const allowedAfterFeedback =
          config.offerGoogleReviewAfterPrivateFeedback && session.status === "private_feedback_submitted";
        if (session.status === "google_clicked") return NextResponse.json({ ok: true });
        if (session.status !== "approved" && !allowedAfterFeedback) {
          return jsonError(409, "Please approve your review first.", "not_approved");
        }
        if (session.status === "approved") {
          await updateOpenSession(businessId, input.sessionId, { status: "google_clicked" });
        }
        await recordEvents(businessId, input.sessionId, ["google_clicked"]);
        return NextResponse.json({ ok: true });
      }

      if ((session.rating ?? 0) < 4) {
        return jsonError(409, "Please choose your rating first.", "invalid_state");
      }

      const isEdit = input.action === "edit";
      const updated = await updateOpenSession(businessId, input.sessionId, {
        final_review: input.review,
        status: isEdit ? "edited" : "approved",
      });
      if (!updated) return jsonError(409, "This visit has already been completed.", "session_closed");
      await recordEvents(businessId, input.sessionId, [isEdit ? "review_edited" : "review_approved"]);
      return NextResponse.json({ ok: true });
    },
  );
}
