import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { ConfigurationError, getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

/**
 * Cookie-based client acting as the signed-in admin. All queries go through
 * Row Level Security, so an admin can only see their own business's data.
 */
export async function createSupabaseServerClient() {
  // Read cookies first: this marks the route as dynamic (never prerendered).
  const cookieStore = await cookies();
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) throw new ConfigurationError("Supabase URL / anon key");

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The proxy refreshes sessions, so this is safe to ignore.
        }
      },
    },
  });
}
