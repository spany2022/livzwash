import { describe, expect, it } from "vitest";
import {
  feedbackSchema,
  generateReviewSchema,
  reviewActionSchema,
  sessionRequestSchema,
} from "@/lib/validation/schemas";
import { looksLikeSpam, normalizeText } from "@/lib/validation/text";
import { limits } from "@/config/limits";

const SESSION = "4f6c2a8e-1b3d-4c5e-9f7a-0b1c2d3e4f5a";
const positive = generateReviewSchema(["Food", "Staff", "Ambience"]);
const negative = feedbackSchema(["Food", "Waiting Time"]);

describe("rating validation", () => {
  it.each([0, 6, 3.5, -1, "5", null])("rejects invalid rating %s", (rating) => {
    const r = sessionRequestSchema.safeParse({ action: "rating", slug: "cafe", sessionId: SESSION, rating });
    expect(r.success).toBe(false);
  });

  it("accepts ratings 1–5", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(
        sessionRequestSchema.safeParse({ action: "rating", slug: "cafe", sessionId: SESSION, rating }).success,
      ).toBe(true);
    }
  });

  it("only allows AI drafts for 4–5 stars", () => {
    const base = { slug: "cafe", sessionId: SESSION, categories: ["Food"] };
    expect(positive.safeParse({ ...base, rating: 3 }).success).toBe(false);
    expect(positive.safeParse({ ...base, rating: 4 }).success).toBe(true);
  });

  it("only allows private feedback for 1–3 stars", () => {
    const base = { slug: "cafe", sessionId: SESSION, categories: [], feedback: "Cold coffee" };
    expect(negative.safeParse({ ...base, rating: 5 }).success).toBe(false);
    expect(negative.safeParse({ ...base, rating: 2 }).success).toBe(true);
  });
});

describe("category validation", () => {
  const base = { slug: "cafe", sessionId: SESSION, rating: 5 };

  it("requires at least one category for the positive flow", () => {
    const r = positive.safeParse({ ...base, categories: [] });
    expect(r.success).toBe(false);
  });

  it("rejects categories not in the business configuration", () => {
    expect(positive.safeParse({ ...base, categories: ["Food", "Free Pizza"] }).success).toBe(false);
  });

  it("de-duplicates categories", () => {
    const r = positive.safeParse({ ...base, categories: ["Food", "Food", "Staff"] });
    expect(r.success && r.data.categories).toEqual(["Food", "Staff"]);
  });

  it("allows zero categories for private feedback", () => {
    const r = negative.safeParse({ slug: "cafe", sessionId: SESSION, rating: 1, categories: [], feedback: "Too slow" });
    expect(r.success).toBe(true);
  });
});

describe("text validation", () => {
  it("rejects empty or whitespace-only feedback", () => {
    for (const feedback of ["", "   ", "\n\n"]) {
      const r = negative.safeParse({ slug: "cafe", sessionId: SESSION, rating: 1, categories: [], feedback });
      expect(r.success).toBe(false);
    }
  });

  it("rejects feedback over the maximum length", () => {
    const feedback = "a".repeat(limits.feedbackMaxChars + 1);
    const r = negative.safeParse({ slug: "cafe", sessionId: SESSION, rating: 1, categories: [], feedback });
    expect(r.success).toBe(false);
  });

  it("rejects over-long optional customer input", () => {
    const r = positive.safeParse({
      slug: "cafe",
      sessionId: SESSION,
      rating: 5,
      categories: ["Food"],
      customerInput: "x".repeat(limits.customerInputMaxChars + 1),
    });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid session id", () => {
    const r = reviewActionSchema.safeParse({ action: "google_click", slug: "cafe", sessionId: "123" });
    expect(r.success).toBe(false);
  });

  it("rejects too-short edited reviews", () => {
    const r = reviewActionSchema.safeParse({ action: "edit", slug: "cafe", sessionId: SESSION, review: "ok" });
    expect(r.success).toBe(false);
  });

  it("normalises control characters and blank lines", () => {
    expect(normalizeText("  hi\u0000 there\r\n\n\n\nok  ")).toBe("hi there\n\nok");
  });

  it("flags link-stuffed spam", () => {
    expect(looksLikeSpam("buy http://a.com http://b.com http://c.com")).toBe(true);
    expect(looksLikeSpam("The coffee was cold and the wait was long.")).toBe(false);
  });
});
