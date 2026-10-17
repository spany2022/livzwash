/**
 * Input limits and lightweight abuse protection. Tune per client if needed.
 * Rate limits are in-memory per server instance — see README → Security.
 */
export const limits = {
  customerInputMaxChars: 500,
  feedbackMinChars: 3,
  feedbackMaxChars: 2000,
  reviewMinChars: 5,
  reviewMaxChars: 600,
  categoryMaxChars: 40,
  maxCategories: 12,
  adminNotesMaxChars: 2000,
  /** Largest JSON body any public API route will accept. */
  requestBodyMaxBytes: 16 * 1024,
  /** A reloaded page re-uses its session if it is younger than this. */
  sessionResumeMaxAgeMinutes: 120,

  rateLimits: {
    sessionStart: { limit: 30, windowMs: 10 * 60_000 },
    sessionUpdate: { limit: 60, windowMs: 10 * 60_000 },
    generateReview: { limit: 15, windowMs: 10 * 60_000 },
    feedback: { limit: 5, windowMs: 10 * 60_000 },
  },
} as const;
