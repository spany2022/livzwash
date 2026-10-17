import { z } from "zod";
import { limits } from "@/config/limits";
import { normalizeText } from "./text";

/**
 * Server-side request validation. Client-side checks are only for UX —
 * every API route re-validates with these schemas.
 */

const text = (max: number) =>
  z
    .string()
    .max(max * 2) // hard cap before normalisation
    .transform(normalizeText)
    .pipe(z.string().max(max));

export const sessionIdSchema = z.uuid({ message: "Invalid session." });

export const ratingSchema = z
  .number({ message: "Invalid rating." })
  .int({ message: "Invalid rating." })
  .min(1, { message: "Invalid rating." })
  .max(5, { message: "Invalid rating." });

export const slugSchema = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, { message: "Invalid business." });

/** Categories must be unique and every one must exist in the allowed list. */
export function categoriesSchema(allowed: readonly string[], { min }: { min: number }) {
  const allowedSet = new Set(allowed);
  return z
    .array(z.string().max(limits.categoryMaxChars), { message: "Invalid categories." })
    .max(limits.maxCategories, { message: "Too many categories." })
    .transform((list) => Array.from(new Set(list)))
    .refine((list) => list.every((c) => allowedSet.has(c)), {
      message: "Unknown category.",
    })
    .refine((list) => list.length >= min, {
      message: "Please choose at least one option.",
    });
}

export const sessionRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    slug: slugSchema,
    resumeSessionId: sessionIdSchema.optional(),
  }),
  z.object({
    action: z.literal("rating"),
    slug: slugSchema,
    sessionId: sessionIdSchema,
    rating: ratingSchema,
  }),
]);

export function generateReviewSchema(positiveCategories: readonly string[]) {
  return z.object({
    slug: slugSchema,
    sessionId: sessionIdSchema,
    rating: ratingSchema.refine((r) => r >= 4, {
      message: "Review drafts are only available for 4 or 5 stars.",
    }),
    categories: categoriesSchema(positiveCategories, { min: 1 }),
    customerInput: text(limits.customerInputMaxChars).optional().default(""),
  });
}

export const reviewTextSchema = text(limits.reviewMaxChars).pipe(
  z.string().min(limits.reviewMinChars, { message: "Your review is too short." }),
);

export const reviewActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("edit"), slug: slugSchema, sessionId: sessionIdSchema, review: reviewTextSchema }),
  z.object({ action: z.literal("approve"), slug: slugSchema, sessionId: sessionIdSchema, review: reviewTextSchema }),
  z.object({ action: z.literal("google_click"), slug: slugSchema, sessionId: sessionIdSchema }),
]);

export function feedbackSchema(negativeCategories: readonly string[]) {
  return z.object({
    slug: slugSchema,
    sessionId: sessionIdSchema,
    rating: ratingSchema.refine((r) => r <= 3, { message: "Invalid rating." }),
    categories: categoriesSchema(negativeCategories, { min: 0 }),
    feedback: text(limits.feedbackMaxChars).pipe(
      z.string().min(limits.feedbackMinChars, {
        message: "Please tell us a little about what happened.",
      }),
    ),
    /** Honeypot: real customers never see or fill this field. */
    website: z.string().max(200).optional(),
  });
}

/** First human-readable message from a Zod error — safe to show customers. */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request.";
}

/** Pull just the slug out of an untrusted body, to pick the business config. */
export const slugOnlySchema = z.object({ slug: slugSchema }).loose();
