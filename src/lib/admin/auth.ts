import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getBusinessConfigBySlug, getConfiguredBusinesses } from "@/lib/review/business";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Cookie remembering which branch the admin is viewing. Not a security boundary — RLS is. */
export const BRANCH_COOKIE = "admin_branch";

/**
 * Server-side admin guard. Call at the top of every protected page and
 * server action — the proxy redirect alone is not enough.
 *
 * 1. Verifies the signed-in user's JWT (getClaims — checked locally with the
 *    project's signing keys, so no Auth round trip on every page).
 * 2. Loads the configured businesses (branches) through RLS: each is only
 *    visible if this user is listed in admin_users for it.
 * 3. Picks the active branch from the BRANCH_COOKIE (default: the first one).
 */
export const requireAdmin = cache(async () => {
  await connection();
  if (!isSupabaseConfigured()) redirect("/admin/login");
  const supabase = await createSupabaseServerClient();
  const slugs = getConfiguredBusinesses().map((b) => b.slug);
  // Run both at once. RLS returns no rows for an invalid session, and we
  // redirect below before using them.
  const [{ data: auth }, { data: rows }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("businesses").select("id, name, slug").in("slug", slugs),
  ]);
  const claims = auth?.claims;
  if (!claims?.sub) redirect("/admin/login");
  const user = { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };

  // Keep the order of src/config/business.ts.
  const branches = slugs.flatMap((slug) => rows?.filter((r) => r.slug === slug) ?? []);
  if (branches.length === 0) redirect("/admin/login?error=not_authorized");

  const wanted = (await cookies()).get(BRANCH_COOKIE)?.value;
  const business = branches.find((b) => b.slug === wanted) ?? branches[0]!;
  const config = getBusinessConfigBySlug(business.slug)!;

  return { supabase, user, business, config, branches };
});
