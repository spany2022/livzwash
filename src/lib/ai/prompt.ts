export interface ReviewPromptInput {
  /** Free-form business category, e.g. "cafe" or "dental-clinic". */
  category: string;
  rating: number;
  categories: string[];
  customerInput?: string;
  /** Previous draft, so a regeneration reads differently (same facts). */
  previousReview?: string | null;
}

/** "dental-clinic" → "dental clinic" */
export function humanizeCategory(category: string): string {
  return category.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function toneFor(rating: number): string {
  return rating >= 5
    ? "very positive"
    : "positive, in a calm and measured tone (not over the top)";
}

/** Strip our own delimiter so customer text can't break out of its block. */
function fence(value: string): string {
  return value.replace(/"""/g, "\"");
}

/**
 * Builds the user message. Only customer-provided facts are included —
 * nothing about the business beyond its general type.
 */
export function buildReviewPrompt(input: ReviewPromptInput): string {
  const lines = [
    `Type of place: ${humanizeCategory(input.category) || "business"}`,
    `Overall tone: ${toneFor(input.rating)}`,
    `Aspects the customer liked: ${input.categories.join(", ")}`,
  ];

  const own = input.customerInput?.trim();
  lines.push(
    own
      ? `Customer's own words (main source of truth):\n"""\n${fence(own)}\n"""`
      : "Customer's own words: (none — mention only the aspects above, in general terms)",
  );

  if (input.previousReview?.trim()) {
    lines.push(
      `Write a clearly different version from this earlier draft (new wording and sentence structure, same facts only):\n"""\n${fence(input.previousReview.trim())}\n"""`,
    );
  }

  lines.push("Write the review now.");
  return lines.join("\n\n");
}
