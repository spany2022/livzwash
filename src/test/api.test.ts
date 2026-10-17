import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/rateLimit";
import type { SessionRow } from "@/lib/review/sessions";
import { businessConfig } from "@/config/business";

vi.mock("@/lib/review/business", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/review/business")>();
  return { ...actual, ensureBusinessRecord: vi.fn(async () => "biz-1") };
});
vi.mock("@/lib/review/sessions", () => ({
  isTerminal: (s: string) => ["google_clicked", "private_feedback_submitted", "completed"].includes(s),
  loadSession: vi.fn(),
  updateOpenSession: vi.fn(async () => true),
  recordEvents: vi.fn(async () => undefined),
  claimGeneration: vi.fn(async () => 1),
  createSession: vi.fn(async () => "new-session"),
  findResumableSession: vi.fn(async () => null),
}));
vi.mock("@/lib/ai/generateReview", () => ({ generateReviewDraft: vi.fn() }));

const sessions = await import("@/lib/review/sessions");
const ai = await import("@/lib/ai/generateReview");
const { AIError } = await import("@/lib/ai/gemini");
const generateRoute = await import("@/app/api/generate-review/route");
const feedbackRoute = await import("@/app/api/feedback/route");
const reviewRoute = await import("@/app/api/review/route");

const SESSION = "4f6c2a8e-1b3d-4c5e-9f7a-0b1c2d3e4f5a";
const SLUG = businessConfig.slug;

function session(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    id: SESSION,
    business_id: "biz-1",
    rating: 5,
    selected_categories: [],
    customer_input: null,
    ai_generated_review: null,
    final_review: null,
    status: "rating_selected",
    generation_count: 0,
    feedback_status: null,
    admin_notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function post(body: unknown) {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  vi.mocked(sessions.loadSession).mockResolvedValue(session());
  vi.mocked(sessions.updateOpenSession).mockResolvedValue(true);
  vi.mocked(sessions.claimGeneration).mockResolvedValue(1);
});

describe("POST /api/generate-review", () => {
  const valid = { slug: SLUG, sessionId: SESSION, rating: 5, categories: businessConfig.positiveCategories.slice(0, 2) };

  it("returns the review and remaining generations", async () => {
    vi.mocked(ai.generateReviewDraft).mockResolvedValue("Lovely food and friendly staff.");
    const res = await generateRoute.POST(post(valid));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ review: "Lovely food and friendly staff.", remaining: 4 });
    expect(sessions.recordEvents).toHaveBeenCalledWith("biz-1", SESSION, ["categories_selected", "ai_requested"]);
    expect(sessions.recordEvents).toHaveBeenCalledWith("biz-1", SESSION, ["ai_generated"]);
  });

  it("passes the previous draft when regenerating, keeping the same inputs", async () => {
    vi.mocked(sessions.loadSession).mockResolvedValue(session({ ai_generated_review: "Old draft." }));
    vi.mocked(ai.generateReviewDraft).mockResolvedValue("New draft.");
    await generateRoute.POST(post({ ...valid, customerInput: "Great coffee" }));
    expect(ai.generateReviewDraft).toHaveBeenCalledWith(
      expect.objectContaining({ categories: businessConfig.positiveCategories.slice(0, 2), customerInput: "Great coffee", previousReview: "Old draft." }),
    );
  });

  it("rejects an invalid rating", async () => {
    expect((await generateRoute.POST(post({ ...valid, rating: 9 }))).status).toBe(400);
    expect((await generateRoute.POST(post({ ...valid, rating: 2 }))).status).toBe(400);
  });

  it("rejects missing or unknown categories", async () => {
    expect((await generateRoute.POST(post({ ...valid, categories: [] }))).status).toBe(400);
    expect((await generateRoute.POST(post({ ...valid, categories: ["Unicorns"] }))).status).toBe(400);
  });

  it("returns 404 for an unknown business slug", async () => {
    expect((await generateRoute.POST(post({ ...valid, slug: "nope" }))).status).toBe(404);
  });

  it("enforces the per-session regeneration limit", async () => {
    vi.mocked(sessions.claimGeneration).mockResolvedValue(null);
    const res = await generateRoute.POST(post(valid));
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("limit_reached");
  });

  it("hides AI failures behind a friendly message", async () => {
    vi.mocked(ai.generateReviewDraft).mockRejectedValue(new AIError("http", "500 secret detail"));
    const res = await generateRoute.POST(post(valid));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("We couldn't create your review right now.");
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("rejects oversized requests", async () => {
    const res = await generateRoute.POST(post({ ...valid, customerInput: "x".repeat(20_000) }));
    expect(res.status).toBe(413);
  });

  it("hides database errors", async () => {
    vi.mocked(sessions.loadSession).mockRejectedValue(new Error("relation review_sessions does not exist"));
    const res = await generateRoute.POST(post(valid));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("relation");
  });
});

describe("POST /api/feedback", () => {
  const valid = { slug: SLUG, sessionId: SESSION, rating: 2, categories: businessConfig.negativeCategories.slice(0, 1), feedback: "Took too long." };

  it("stores private feedback", async () => {
    const res = await feedbackRoute.POST(post(valid));
    expect(res.status).toBe(200);
    expect(sessions.updateOpenSession).toHaveBeenCalledWith(
      "biz-1",
      SESSION,
      expect.objectContaining({
        customer_input: "Took too long.",
        status: "private_feedback_submitted",
        feedback_status: "new",
      }),
    );
    expect(sessions.recordEvents).toHaveBeenCalledWith("biz-1", SESSION, ["categories_selected", "private_feedback_submitted"]);
  });

  it("rejects empty feedback", async () => {
    const res = await feedbackRoute.POST(post({ ...valid, feedback: "   " }));
    expect(res.status).toBe(400);
  });

  it("rejects positive ratings", async () => {
    expect((await feedbackRoute.POST(post({ ...valid, rating: 5 }))).status).toBe(400);
  });

  it("treats a duplicate submission as success without storing twice", async () => {
    vi.mocked(sessions.loadSession).mockResolvedValue(session({ status: "private_feedback_submitted" }));
    const res = await feedbackRoute.POST(post(valid));
    expect(await res.json()).toMatchObject({ duplicate: true });
    expect(sessions.updateOpenSession).not.toHaveBeenCalled();
  });

  it("silently drops honeypot submissions", async () => {
    const res = await feedbackRoute.POST(post({ ...valid, website: "spam.example" }));
    expect(res.status).toBe(200);
    expect(sessions.updateOpenSession).not.toHaveBeenCalled();
  });
});

describe("POST /api/review", () => {
  it("records an edit", async () => {
    const res = await reviewRoute.POST(post({ action: "edit", slug: SLUG, sessionId: SESSION, review: "My own words here." }));
    expect(res.status).toBe(200);
    expect(sessions.recordEvents).toHaveBeenCalledWith("biz-1", SESSION, ["review_edited"]);
  });

  it("only tracks a Google click after approval", async () => {
    let res = await reviewRoute.POST(post({ action: "google_click", slug: SLUG, sessionId: SESSION }));
    expect(res.status).toBe(409);

    vi.mocked(sessions.loadSession).mockResolvedValue(session({ status: "approved" }));
    res = await reviewRoute.POST(post({ action: "google_click", slug: SLUG, sessionId: SESSION }));
    expect(res.status).toBe(200);
    expect(sessions.recordEvents).toHaveBeenCalledWith("biz-1", SESSION, ["google_clicked"]);
  });

  it("tracks a Google click after private feedback only when offerGoogleReviewAfterPrivateFeedback is on", async () => {
    vi.mocked(sessions.loadSession).mockResolvedValue(session({ rating: 2, status: "private_feedback_submitted" }));
    const res = await reviewRoute.POST(post({ action: "google_click", slug: SLUG, sessionId: SESSION }));
    expect(res.status).toBe(businessConfig.offerGoogleReviewAfterPrivateFeedback ? 200 : 409);
  });
});
