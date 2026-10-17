import { describe, expect, it } from "vitest";
import { branches, businessConfig } from "@/config/business";
import { getSafeGoogleReviewUrl } from "@/lib/google";
import { validateBusinessConfig } from "@/lib/validation/businessConfig";
import { brandThemeStyle, contrastRatio, readableOn } from "@/lib/theme";
import type { BusinessConfig } from "@/types/business";

describe("business configuration", () => {
  it("demo café configuration has no errors", () => {
    expect(validateBusinessConfig(businessConfig).errors).toEqual([]);
  });

  it("every branch is valid, with a unique slug and a real Google link", () => {
    for (const branch of branches) expect(validateBusinessConfig(branch)).toEqual({ errors: [], warnings: [] });
    expect(new Set(branches.map((b) => b.slug)).size).toBe(branches.length);
    expect(new Set(branches.map((b) => b.googleReviewUrl)).size).toBe(branches.length);
  });

  it("warns (but works) while the Google URL is a placeholder", () => {
    const config: BusinessConfig = { ...businessConfig, googleReviewUrl: "YOUR_GOOGLE_REVIEW_URL" };
    const report = validateBusinessConfig(config);
    expect(report.errors).toEqual([]);
    expect(report.warnings.join(" ")).toMatch(/googleReviewUrl/);
  });

  it("has no Google URL warning once a real link is set", () => {
    const config: BusinessConfig = {
      ...businessConfig,
      googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
    };
    expect(validateBusinessConfig(config).warnings).toEqual([]);
  });

  it.each(["salon", "spa", "dental-clinic", "gym", "hotel", "car-service", "whatever-business-I-want"])(
    "accepts any category string: %s",
    (category) => {
      const config: BusinessConfig = { ...businessConfig, category };
      expect(validateBusinessConfig(config).errors).toEqual([]);
    },
  );

  it("reports invalid colours, slug and empty categories", () => {
    const config: BusinessConfig = {
      ...businessConfig,
      slug: "Bad Slug",
      primaryColor: "brown",
      positiveCategories: [],
      negativeCategories: ["Food", "Food"],
      timezone: "Mars/Olympus",
    };
    const { errors } = validateBusinessConfig(config);
    expect(errors.some((e) => e.includes("slug"))).toBe(true);
    expect(errors.some((e) => e.includes("primaryColor"))).toBe(true);
    expect(errors.some((e) => e.includes("positiveCategories"))).toBe(true);
    expect(errors.some((e) => e.includes("listed twice"))).toBe(true);
    expect(errors.some((e) => e.includes("timezone"))).toBe(true);
  });
});

describe("Google review URL handling", () => {
  it.each([
    "https://g.page/r/CAbC123/review",
    "https://search.google.com/local/writereview?placeid=ChIJ123",
    "https://maps.app.goo.gl/abc123",
    "https://www.google.com/maps/place/x",
    "https://www.google.co.in/search?q=x",
  ])("accepts %s", (url) => {
    expect(getSafeGoogleReviewUrl(url)).not.toBeNull();
  });

  it.each([
    "YOUR_GOOGLE_REVIEW_URL",
    "",
    "http://g.page/r/abc/review",
    "javascript:alert(1)",
    "https://evil.com/?google.com",
    "https://google.com.evil.com/x",
    "https://user:pass@g.page/r/x",
    "https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID",
    "https://search.google.com/local/writereview?placeid=",
    "https://search.google.com/local/writereview",
  ])("rejects %s", (url) => {
    expect(getSafeGoogleReviewUrl(url)).toBeNull();
  });
});

describe("theme", () => {
  it("picks readable text colours", () => {
    expect(readableOn("#8B5E3C")).toBe("#FFFFFF");
    expect(readableOn("#F5EBDD")).toBe("#1C1917");
    expect(contrastRatio("#8B5E3C", "#FFFFFF")).toBeGreaterThan(4.5);
  });

  it("exposes brand colours as CSS variables", () => {
    const style = brandThemeStyle(businessConfig) as Record<string, string>;
    expect(style["--brand-primary"]).toBe(businessConfig.primaryColor);
    expect(style["--brand-secondary"]).toBe(businessConfig.secondaryColor);
  });
});
