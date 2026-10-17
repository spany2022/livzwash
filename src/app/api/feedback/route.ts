import { NextResponse } from "next/server";
import { limits } from "@/config/limits";
import { jsonError } from "@/lib/http";
import { handlePublicRoute } from "@/lib/review/route";
import { loadSession, recordEvents, updateOpenSession } from "@/lib/review/sessions";
import { looksLikeSpam } from "@/lib/validation/text";
import { feedbackSchema, firstIssueMessage } from "@/lib/validation/schemas";

/**
 * POST /api/feedback — private 1–3 star feedback. Stored privately and only
 * readable by the business's admins (RLS). No Google link is offered here
 * unless the business explicitly enables it in the configuration.
 */
export async function POST(request: Request) {
  return handlePublicRoute(
    request,
    { name: "feedback", rateLimit: limits.rateLimits.feedback },
    async ({ body, config, businessId }) => {
      const parsed = feedbackSchema(config.negativeCategories).safeParse(body);
      if (!parsed.success) return jsonError(400, firstIssueMessage(parsed.error), "invalid_request");
      const { sessionId, rating, categories, feedback, website } = parsed.data;

      // Honeypot or obvious spam: pretend success so bots learn nothing.
      if (website || looksLikeSpam(feedback)) return NextResponse.json({ ok: true });

      const session = await loadSession(businessId, sessionId);
      if (!session) return jsonError(404, "Please refresh the page and try again.", "session_not_found");
      if (session.status === "private_feedback_submitted") {
        return NextResponse.json({ ok: true, duplicate: true });
      }

      const updated = await updateOpenSession(businessId, sessionId, {
        rating,
        selected_categories: categories,
        customer_input: feedback,
        status: "private_feedback_submitted",
        feedback_status: "new",
      });
      if (!updated) return jsonError(409, "This visit has already been completed.", "session_closed");

      await recordEvents(businessId, sessionId, [
        ...(categories.length > 0 ? (["categories_selected"] as const) : []),
        "private_feedback_submitted",
      ]);
      return NextResponse.json({ ok: true });
    },
  );
}
