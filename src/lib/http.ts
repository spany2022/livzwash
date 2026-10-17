import { NextResponse } from "next/server";
import type { ApiErrorBody } from "@/types/review";
import { limits } from "@/config/limits";

/** JSON error with a customer-safe message. Never pass raw internal errors here. */
export function jsonError(status: number, error: string, code: string, headers?: HeadersInit) {
  return NextResponse.json<ApiErrorBody>({ error, code }, { status, headers });
}

export const GENERIC_ERROR = "Something went wrong. Please try again.";

type BodyResult = { ok: true; data: unknown } | { ok: false; response: NextResponse };

/** Reads a JSON body while enforcing a size limit (checked on the real bytes). */
export async function readJsonBody(
  request: Request,
  maxBytes: number = limits.requestBodyMaxBytes,
): Promise<BodyResult> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) {
    return { ok: false, response: jsonError(413, "That's a bit too long.", "payload_too_large") };
  }
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return { ok: false, response: jsonError(415, "Invalid request.", "unsupported_media_type") };
  }
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: jsonError(400, "Invalid request.", "bad_request") };
  }
  if (new TextEncoder().encode(raw).length > maxBytes) {
    return { ok: false, response: jsonError(413, "That's a bit too long.", "payload_too_large") };
  }
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch {
    return { ok: false, response: jsonError(400, "Invalid request.", "bad_request") };
  }
}

/** Best-effort client IP (Vercel sets x-forwarded-for / x-real-ip). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
