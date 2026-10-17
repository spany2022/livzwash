import "server-only";
import type { NextResponse } from "next/server";
import type { BusinessConfig } from "@/types/business";
import { ConfigurationError } from "@/lib/env";
import { getClientIp, GENERIC_ERROR, jsonError, readJsonBody } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { slugOnlySchema } from "@/lib/validation/schemas";
import { ensureBusinessRecord, getBusinessConfigBySlug } from "./business";

type Limit = { limit: number; windowMs: number };

export interface RouteContext {
  body: unknown;
  config: BusinessConfig;
  businessId: string;
  ip: string;
}

/** Returns a 429 response when the key is over its limit, otherwise null. */
export function checkRateLimit(key: string, limit: Limit): NextResponse | null {
  const rl = rateLimit(key, limit);
  if (rl.allowed) return null;
  return jsonError(429, "Please wait a moment and try again.", "rate_limited", {
    "Retry-After": String(rl.retryAfterSeconds),
  });
}

/**
 * Shared plumbing for the public API routes:
 * rate limit → size-limited JSON body → business lookup → handler,
 * with every unexpected error turned into a generic, customer-safe message.
 */
export async function handlePublicRoute(
  request: Request,
  opts: { name: string; rateLimit: Limit },
  handler: (ctx: RouteContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const ip = getClientIp(request);
    const limited = checkRateLimit(`${opts.name}:${ip}`, opts.rateLimit);
    if (limited) return limited;

    const parsedBody = await readJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;

    const slug = slugOnlySchema.safeParse(parsedBody.data);
    const config = slug.success ? getBusinessConfigBySlug(slug.data.slug) : null;
    if (!config) return jsonError(404, "We couldn't find this business.", "business_not_found");

    const businessId = await ensureBusinessRecord(config);
    return await handler({ body: parsedBody.data, config, businessId, ip });
  } catch (err) {
    // Log for the developer; never send internals to the customer.
    console.error(`[api/${opts.name}]`, err instanceof Error ? err.message : err);
    if (err instanceof ConfigurationError) {
      return jsonError(503, "This service isn't available right now.", "not_configured");
    }
    return jsonError(500, GENERIC_ERROR, "server_error");
  }
}
