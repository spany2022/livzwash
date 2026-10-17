"use client";

import { useCallback, useEffect, useRef } from "react";
import { reviewApi } from "./client";

const storageKey = (slug: string) => `review-session:${slug}`;

function readStored(slug: string): string | undefined {
  try {
    return sessionStorage.getItem(storageKey(slug)) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStored(slug: string, id: string | null) {
  try {
    if (id) sessionStorage.setItem(storageKey(slug), id);
    else sessionStorage.removeItem(storageKey(slug));
  } catch {
    // Storage unavailable (private mode) — sessions just won't resume on reload.
  }
}

/**
 * Starts a review session (tracks qr_scan) as soon as the page opens, and
 * lets later steps await it. Failures never block the customer: `ensure()`
 * retries and resolves to null if tracking is unavailable.
 */
export function useReviewSession(slug: string) {
  const pending = useRef<Promise<string | null> | null>(null);

  const ensure = useCallback((): Promise<string | null> => {
    if (!pending.current) {
      pending.current = reviewApi.startSession(slug, readStored(slug)).then((res) => {
        if (res.ok) {
          writeStored(slug, res.data.sessionId);
          return res.data.sessionId;
        }
        pending.current = null; // allow a retry later
        return null;
      });
    }
    return pending.current;
  }, [slug]);

  /** Forget the session after it's finished so a new visit starts fresh. */
  const finish = useCallback(() => writeStored(slug, null), [slug]);

  useEffect(() => {
    void ensure();
  }, [ensure]);

  return { ensure, finish };
}
