/**
 * Browser-side API helpers for the customer flow. Every call resolves to a
 * result object instead of throwing, so the UI never loses the customer's
 * input on network errors.
 */
import type { ApiErrorBody, GenerateReviewResponse } from "@/types/review";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; code: string };

const NETWORK_ERROR = "You seem to be offline. Please check your connection and try again.";

async function post<T>(url: string, body: unknown, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      ...init,
    });
    const json = (await res.json().catch(() => null)) as (T & Partial<ApiErrorBody>) | null;
    if (!res.ok || !json) {
      return {
        ok: false,
        error: json?.error ?? "Something went wrong. Please try again.",
        code: json?.code ?? "unknown",
      };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: NETWORK_ERROR, code: "network" };
  }
}

export const reviewApi = {
  startSession(slug: string, resumeSessionId?: string) {
    return post<{ sessionId: string; resumed: boolean }>("/api/session", {
      action: "start",
      slug,
      ...(resumeSessionId ? { resumeSessionId } : {}),
    });
  },
  selectRating(slug: string, sessionId: string, rating: number) {
    return post<{ ok: true }>("/api/session", { action: "rating", slug, sessionId, rating });
  },
  generateReview(input: {
    slug: string;
    sessionId: string;
    rating: number;
    categories: string[];
    customerInput: string;
  }) {
    return post<GenerateReviewResponse>("/api/generate-review", input);
  },
  saveEdit(slug: string, sessionId: string, review: string) {
    return post<{ ok: true }>("/api/review", { action: "edit", slug, sessionId, review });
  },
  approve(slug: string, sessionId: string, review: string) {
    return post<{ ok: true }>("/api/review", { action: "approve", slug, sessionId, review });
  },
  /** keepalive lets the request finish even as the Google page opens. */
  trackGoogleClick(slug: string, sessionId: string) {
    return post<{ ok: true }>(
      "/api/review",
      { action: "google_click", slug, sessionId },
      { keepalive: true },
    );
  },
  submitFeedback(input: {
    slug: string;
    sessionId: string;
    rating: number;
    categories: string[];
    feedback: string;
    website?: string;
  }) {
    return post<{ ok: true }>("/api/feedback", input);
  },
};
