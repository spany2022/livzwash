import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { ConfigurationError, getServiceRoleKey, getSupabaseUrl } from "@/lib/env";

let client: SupabaseClient<Database> | null = null;

/**
 * Service-role client. Bypasses RLS — use ONLY in server code (API routes)
 * after validating input. Never import this from a client component.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (client) return client;
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) throw new ConfigurationError("Supabase URL / service role key");
  client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
