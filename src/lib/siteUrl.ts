import "server-only";
import { headers } from "next/headers";

/** Public base URL: SITE_URL if set (recommended in production), else the request host. */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
