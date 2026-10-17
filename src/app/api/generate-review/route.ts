import { NextResponse } from "next/server";
import { reviewAIConfig } from "@/config/ai";
import { limits } from "@/config/limits";
import { generateReviewDraft } from "@/lib/ai/generateReview";
import { AIError } from "@/lib/ai/gemini";
import { jsonError } from "@/lib/http";
import { handlePublicRoute } from "@/lib/review/route";
import {
  claimGeneration,
  isTerminal,
  loadSession,
  recordEvents,
  updateOpenSession,
} from "@/lib/review/sessions";
import { firstIssueMessage, generateReviewSchema } from "@/lib/validation/schemas";
import type { GenerateReviewResponse } from "@/types/review";

const AI_FAILURE_MESSAGE = "We couldn't create your review right now.";

/**
 * POST /api/generate-review
 * Browser → this route → Gemini → this route → browser. The API key never
 * leaves the server.
 */
export async function POST(request: Request) {
  return handlePublicRoute(
    request,
    { name: "generate-review", rateLimit: limits.rateLimits.generateReview },
    async ({ body, config, businessId }) => {
      const parsed = generateReviewSchema(config.positiveCategories).safeParse(body);
      if (!parsed.success) return jsonError(400, firstIssueMessage(parsed.error), "invalid_request");
      const { sessionId, rating, categories, customerInput } = parsed.data;

      const session = await loadSession(businessId, sessionId);
      if (!session) return jsonError(404, "Please refresh the page and try again.", "session_not_found");
      if (isTerminal(session.status)) {
        return jsonError(409, "This visit has already been completed.", "session_closed");
      }

      // Atomic, durable per-session limit (survives serverless cold starts).
      const used = await claimGeneration(sessionId, reviewAIConfig.maxGenerationsPerSession);
      if (used === null) {
        return jsonError(429, "You've reached the limit for new versions.", "limit_reached");
      }

      const isFirstGeneration = session.ai_generated_review === null;
      await updateOpenSession(businessId, sessionId, {
        rating,
        selected_categories: categories,
        customer_input: customerInput || null,
        status: "categories_selected",
      });
      await recordEvents(
        businessId,
        sessionId,
        isFirstGeneration ? ["categories_selected", "ai_requested"] : ["ai_requested"],
      );

      let review: string;
      try {
        review = await generateReviewDraft({
          category: config.category,
          rating,
          categories,
          customerInput,
          previousReview: session.ai_generated_review,
        });
      } catch (err) {
        console.error("[api/generate-review] AI failure:", err instanceof AIError ? err.message : err);
        return jsonError(502, AI_FAILURE_MESSAGE, "ai_failed");
      }

      await updateOpenSession(businessId, sessionId, {
        ai_generated_review: review,
        final_review: review,
        status: "ai_generated",
      });
      await recordEvents(businessId, sessionId, ["ai_generated"]);

      return NextResponse.json<GenerateReviewResponse>({
        review,
        remaining: Math.max(0, reviewAIConfig.maxGenerationsPerSession - used),
      });
    },
  );
}
