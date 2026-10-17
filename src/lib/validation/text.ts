/**
 * Normalise free text from customers: strip control characters (keeping
 * newlines/tabs), unify line endings, collapse runs of blank lines and trim.
 */
export function normalizeText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const URL_PATTERN = /(https?:\/\/|www\.)\S+/gi;

/** Very light spam heuristic: link-stuffed text or one character repeated. */
export function looksLikeSpam(value: string): boolean {
  const links = value.match(URL_PATTERN)?.length ?? 0;
  if (links > 2) return true;
  if (/(.)\1{29,}/.test(value)) return true;
  return false;
}
