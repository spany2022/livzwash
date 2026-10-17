import "server-only";

/** Server-side environment access with friendly, non-leaky errors. */

export function getSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || undefined;
}

export function getSupabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined;
}

export function getServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || undefined;
}

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export class ConfigurationError extends Error {
  constructor(what: string) {
    super(`Missing configuration: ${what}`);
    this.name = "ConfigurationError";
  }
}
