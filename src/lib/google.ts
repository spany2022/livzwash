/**
 * Only accept https links on Google-owned hosts, so a typo or placeholder in
 * the configuration can never send customers somewhere unexpected.
 */
const ALLOWED_HOSTS = ["google.com", "g.page", "goo.gl", "g.co"];

export function getSafeGoogleReviewUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  const allowed = ALLOWED_HOSTS.some(
    (h) => host === h || host.endsWith(`.${h}`) || /^(www\.)?google\.[a-z.]{2,6}$/.test(host),
  );
  if (!allowed) return null;

  // Reject unfilled templates such as ".../writereview?placeid=YOUR_PLACE_ID".
  if (/YOUR_|PLACE_ID|<|>/i.test(decodeURIComponent(url.href))) return null;
  // A writereview link is useless without a Place ID.
  if (url.pathname.includes("writereview") && !url.searchParams.get("placeid")?.trim()) return null;

  return url.toString();
}
