import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rateLimit";
import { rangeStart, startOfDayInTimeZone } from "@/lib/time";

describe("rate limiter", () => {
  beforeEach(() => resetRateLimits());

  it("blocks after the limit and resets after the window", () => {
    const opts = { limit: 2, windowMs: 1000 };
    expect(rateLimit("k", opts, 0).allowed).toBe(true);
    expect(rateLimit("k", opts, 10).allowed).toBe(true);
    const blocked = rateLimit("k", opts, 20);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(rateLimit("k", opts, 1001).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(rateLimit("a", opts, 0).allowed).toBe(true);
    expect(rateLimit("b", opts, 0).allowed).toBe(true);
    expect(rateLimit("a", opts, 0).allowed).toBe(false);
  });
});

describe("date ranges", () => {
  it("computes midnight in the business time zone", () => {
    // 2026-09-28 02:00 UTC is 07:30 in India → midnight IST is 2026-09-27 18:30 UTC.
    const start = startOfDayInTimeZone(new Date("2026-09-28T02:00:00Z"), "Asia/Kolkata");
    expect(start.toISOString()).toBe("2026-09-27T18:30:00.000Z");
  });

  it("returns null for all time and 6 days back for 7d", () => {
    const now = new Date("2026-09-28T12:00:00Z");
    expect(rangeStart("all", "UTC", now)).toBeNull();
    expect(rangeStart("today", "UTC", now)).toBe("2026-09-28T00:00:00.000Z");
    expect(rangeStart("7d", "UTC", now)).toBe("2026-09-22T00:00:00.000Z");
  });
});
