import "server-only";
import { reviewAIConfig } from "@/config/ai";
import { AIError, callGemini } from "./gemini";
import { buildReviewPrompt, type ReviewPromptInput } from "./prompt";
import { cleanGeneratedReview, findUnsupportedContent } from "./guard";

/**
 * Generates a review draft. If the output trips the fabrication guard, we
 * retry once with a stricter reminder; if it still fails we give up rather
 * than show the customer something they didn't say.
 */
export async function generateReviewDraft(input: ReviewPromptInput): Promise<string> {
  const basePrompt = buildReviewPrompt(input);
  const sourceText = [input.customerInput ?? "", input.categories.join(" ")].join(" ");

  let prompt = basePrompt;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callGemini({ systemPrompt: reviewAIConfig.systemPrompt, prompt });
    const review = cleanGeneratedReview(raw);
    const issues = findUnsupportedContent(review, sourceText);
    if (issues.length === 0) return review;
    prompt = `${basePrompt}\n\nYour previous attempt included unsupported content (${issues.join(
      ", ",
    )}). Remove it. Use no numbers, prices, star ratings or new details.`;
  }
  throw new AIError("empty", "guard-rejected");
}
