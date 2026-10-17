/**
 * Per-client business configuration.
 *
 * `category` is intentionally a plain `string` — NOT a union of known
 * industries — so any business type ("cafe", "gym", "dental-clinic",
 * "whatever-business-I-want") works without touching this type.
 */
export interface BusinessConfig {
  name: string;
  /** URL-safe identifier used in the QR link: /review/[slug]. Lowercase, hyphen-separated. */
  slug: string;
  category: string;

  /** Short branch/location label shown under the logo, e.g. "Chandrasekharpur". */
  branch?: string;

  /** Path under /public (e.g. "/brand/logo.svg") or an absolute https URL. */
  logo: string;
  /** Optional wide text logo. When set, the review page shows it instead of the round logo + name. */
  wordmark?: string;
  googleReviewUrl: string;

  /** 6-digit hex colours, e.g. "#8B5E3C". */
  primaryColor: string;
  secondaryColor: string;

  positiveCategories: string[];
  negativeCategories: string[];

  tagline?: string;

  /** IANA time zone used for "Today" in analytics and admin dates. Defaults to "UTC". */
  timezone?: string;

  /**
   * When true, customers who leave 1–3 star private feedback are ALSO offered
   * an optional link to review publicly on Google. Off by default.
   * See docs/configuration.md → "Google review policy" before launch.
   */
  offerGoogleReviewAfterPrivateFeedback?: boolean;
}

/** The subset of configuration that is safe and necessary to send to the browser. */
export interface PublicBusiness {
  name: string;
  slug: string;
  category: string;
  branch?: string;
  logo: string;
  wordmark?: string;
  tagline?: string;
  /** Validated Google review URL, or null when not configured / invalid. */
  googleReviewUrl: string | null;
  positiveCategories: string[];
  negativeCategories: string[];
  offerGoogleReviewAfterPrivateFeedback: boolean;
}
