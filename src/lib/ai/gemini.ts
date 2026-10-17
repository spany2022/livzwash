import "server-only";
import { reviewAIConfig } from "@/config/ai";
import { getGeminiApiKey } from "@/lib/env";

export type AIErrorKind = "not_configured" | "timeout" | "http" | "blocked" | "empty";

export class AIError extends Error {
  constructor(
    public kind: AIErrorKind,
    detail?: string,
  ) {
    super(detail ? `${kind}: ${detail}` : kind);
    this.name = "AIError";
  }
}

interface GeminiPart {
  text?: string;
  thought?: boolean;
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

/** Extracts visible text from a generateContent response (skips "thought" parts). */
export function extractGeminiText(body: GeminiResponse): string {
  if (body.promptFeedback?.blockReason) throw new AIError("blocked", body.promptFeedback.blockReason);
  const candidate = body.candidates?.[0];
  if (!candidate) throw new AIError("empty");
  if (candidate.finishReason && ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"].includes(candidate.finishReason)) {
    throw new AIError("blocked", candidate.finishReason);
  }
  const text = (candidate.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("")
    .trim();
  if (!text) throw new AIError("empty", candidate.finishReason);
  return text;
}

/**
 * Calls the Gemini REST API directly (no SDK needed). Runs only on the
 * server; the key is sent in a header, never in the URL or to the browser.
 */
export async function callGemini(opts: {
  systemPrompt: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  /** "application/json" asks the model for JSON output. */
  responseMimeType?: string;
}): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new AIError("not_configured");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? reviewAIConfig.timeoutMs);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    reviewAIConfig.model,
  )}:generateContent`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: controller.signal,
      cache: "no-store",
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? reviewAIConfig.temperature,
          maxOutputTokens: opts.maxOutputTokens ?? reviewAIConfig.maxOutputTokens,
          ...(opts.responseMimeType ? { responseMimeType: opts.responseMimeType } : {}),
        },
      }),
    });
    if (!res.ok) throw new AIError("http", String(res.status));
    return extractGeminiText((await res.json()) as GeminiResponse);
  } catch (err) {
    if (err instanceof AIError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw new AIError("timeout");
    throw new AIError("http", "network");
  } finally {
    clearTimeout(timer);
  }
}
