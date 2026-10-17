import { limits } from "@/config/limits";

/**
 * Clean up model output: remove wrapping quotes, "Here's your review:"
 * preambles, markdown, and cap the length at a sentence boundary.
 */
export function cleanGeneratedReview(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^(here('|’)?s|here is)[^:\n]{0,40}:\s*/i, "");
  text = text.replace(/^(review|customer review)\s*:\s*/i, "");
  text = text.replace(/[*_#`]+/g, "");
  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(/^["“”'‘’]+|["“”'‘’]+$/g, "").trim();

  if (text.length > limits.reviewMaxChars) {
    const cut = text.slice(0, limits.reviewMaxChars);
    const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    text = lastStop > 40 ? cut.slice(0, lastStop + 1) : cut.trim();
  }
  return text;
}

/**
 * Heuristic fabrication guard. We can't prove the model didn't invent
 * something, but we can reject the most common inventions: numbers (prices,
 * wait times, star counts), currency, AI self-references and hashtags —
 * unless the customer used them first.
 */
export function findUnsupportedContent(review: string, customerText: string): string[] {
  const issues: string[] = [];
  const source = customerText.toLowerCase();
  const lower = review.toLowerCase();

  const numbers = review.match(/\d+/g) ?? [];
  if (numbers.some((n) => !source.includes(n))) issues.push("number");

  if (/[₹$€£¥]|\brs\.?\s?\d|\binr\b/i.test(review) && !/[₹$€£¥]|\brs\b|\binr\b/i.test(customerText)) {
    issues.push("currency");
  }
  if (/\b(ai|a\.i\.|artificial intelligence|language model|chatbot|assistant)\b/i.test(review)) {
    issues.push("ai-mention");
  }
  if (/\bstars?\b/.test(lower) && !/\bstars?\b/.test(source)) issues.push("star-rating");
  if (/#\w/.test(review)) issues.push("hashtag");
  if (review.length < limits.reviewMinChars) issues.push("too-short");

  return issues;
}
