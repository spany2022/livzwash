import type { BusinessConfig } from "@/types/business";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CLIENT CONFIGURATION — the only file you normally edit for a new client.
 *  Brand assets live in /public/brand/. See docs/configuration.md.
 *
 *  Livzwash has two branches. Each branch is its own business record (own
 *  QR link, Google review link and data); one admin login manages both.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Shared brand settings used by every branch and by the admin/login pages. */
export const brand = {
  name: "Livzwash",

  // Any string works: "salon", "gym", "dental-clinic", "car-service", ...
  category: "laundry-and-dry-cleaning",

  logo: "/brand/logo.png",
  wordmark: "/brand/wordmark.png",

  primaryColor: "#0072C6",
  secondaryColor: "#EEF7FE",

  positiveCategories: [
    "Cleaning Quality",
    "Ironing",
    "Stain Removal",
    "Pickup & Delivery",
    "On-time Service",
    "Staff",
    "Packaging",
    "Pricing",
  ],

  negativeCategories: [
    "Cleaning Quality",
    "Stain Removal",
    "Delivery Time",
    "Pickup",
    "Damage",
    "Staff",
    "Billing",
    "Pricing",
  ],

  tagline: "Laundry & Dry Cleaning",

  timezone: "Asia/Kolkata",

  offerGoogleReviewAfterPrivateFeedback: true,
} satisfies Omit<BusinessConfig, "slug" | "googleReviewUrl">;

export const branches: BusinessConfig[] = [
  {
    ...brand,
    name: "Livzwash Chandrasekharpur",
    branch: "Chandrasekharpur",
    slug: "livzwash-chandrasekharpur",
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJM2HjTwAJGToRfDRBK6LSlEU",
  },
  {
    ...brand,
    name: "Livzwash Bomikhal",
    branch: "Bomikhal",
    slug: "livzwash-bomikhal",
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJV0waeAALGToR-th6enTh67I",
  },
];

/** The first branch — the default for the admin and for tests. */
export const businessConfig: BusinessConfig = branches[0]!;
