import "server-only";
import { branches } from "@/config/business";
import type { BusinessConfig, PublicBusiness } from "@/types/business";
import { getSafeGoogleReviewUrl } from "@/lib/google";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Configured businesses (one per branch). Routing is slug-based, so each
 * branch has its own review page and QR code.
 */
const configuredBusinesses: BusinessConfig[] = branches;

export function getConfiguredBusinesses(): readonly BusinessConfig[] {
  return configuredBusinesses;
}

export function getBusinessConfigBySlug(slug: string): BusinessConfig | null {
  return configuredBusinesses.find((b) => b.slug === slug) ?? null;
}

export function toPublicBusiness(config: BusinessConfig): PublicBusiness {
  return {
    name: config.name,
    slug: config.slug,
    category: config.category,
    branch: config.branch,
    logo: config.logo,
    wordmark: config.wordmark,
    tagline: config.tagline,
    googleReviewUrl: getSafeGoogleReviewUrl(config.googleReviewUrl),
    positiveCategories: [...config.positiveCategories],
    negativeCategories: [...config.negativeCategories],
    offerGoogleReviewAfterPrivateFeedback: Boolean(config.offerGoogleReviewAfterPrivateFeedback),
  };
}

const idCache = new Map<string, string>();

/**
 * Returns the database id for a configured business, creating/updating the
 * `businesses` row from src/config/business.ts. The config file is the source
 * of truth, so there's no manual seeding step.
 */
export async function ensureBusinessRecord(config: BusinessConfig): Promise<string> {
  const cached = idCache.get(config.slug);
  if (cached) return cached;

  const { data, error } = await getSupabaseAdmin()
    .from("businesses")
    .upsert(
      {
        slug: config.slug,
        name: config.name,
        category: config.category,
        logo_url: config.logo,
        google_review_url: getSafeGoogleReviewUrl(config.googleReviewUrl),
        primary_color: config.primaryColor,
        secondary_color: config.secondaryColor,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (error || !data) throw new Error(`Could not sync business record: ${error?.message ?? "no row"}`);
  idCache.set(config.slug, data.id);
  return data.id;
}
