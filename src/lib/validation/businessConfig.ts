import type { BusinessConfig } from "@/types/business";
import { getSafeGoogleReviewUrl } from "@/lib/google";
import { limits } from "@/config/limits";

export interface ConfigReport {
  /** Problems that break the customer experience. */
  errors: string[];
  /** Problems worth fixing before launch, but the app still works. */
  warnings: string[];
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function checkCategories(label: string, list: unknown, errors: string[]) {
  if (!Array.isArray(list) || list.length === 0) {
    errors.push(`${label} must contain at least one category.`);
    return;
  }
  if (list.length > limits.maxCategories) {
    errors.push(`${label} can contain at most ${limits.maxCategories} categories.`);
  }
  const seen = new Set<string>();
  for (const item of list) {
    if (typeof item !== "string" || !item.trim()) {
      errors.push(`${label} contains an empty category.`);
    } else if (item.length > limits.categoryMaxChars) {
      errors.push(`${label}: "${item}" is longer than ${limits.categoryMaxChars} characters.`);
    } else if (seen.has(item)) {
      errors.push(`${label}: "${item}" is listed twice.`);
    }
    if (typeof item === "string") seen.add(item);
  }
}

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function validateBusinessConfig(config: BusinessConfig): ConfigReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.name?.trim()) errors.push("name is required.");
  if (!config.category?.trim()) errors.push("category is required (any text, e.g. \"cafe\").");
  else if (config.category.length > 80) errors.push("category must be 80 characters or fewer.");
  if (!SLUG.test(config.slug ?? "") || config.slug.length > 80) {
    errors.push('slug must be lowercase letters/numbers separated by hyphens, e.g. "goodmorning-cafe".');
  }
  if (!config.logo?.trim()) errors.push("logo is required.");
  else if (!config.logo.startsWith("/") && !config.logo.startsWith("https://")) {
    errors.push('logo must be a path like "/brand/logo.svg" or an https URL.');
  }
  if (!HEX.test(config.primaryColor ?? "")) errors.push("primaryColor must be a hex colour like #8B5E3C.");
  if (!HEX.test(config.secondaryColor ?? "")) errors.push("secondaryColor must be a hex colour like #F5EBDD.");

  checkCategories("positiveCategories", config.positiveCategories, errors);
  checkCategories("negativeCategories", config.negativeCategories, errors);

  if (config.timezone && !isValidTimeZone(config.timezone)) {
    errors.push(`timezone "${config.timezone}" is not a valid IANA time zone.`);
  }

  if (!getSafeGoogleReviewUrl(config.googleReviewUrl)) {
    warnings.push(
      "googleReviewUrl is not a valid https Google link yet — the \"Post on Google\" button is disabled.",
    );
  }

  return { errors, warnings };
}
