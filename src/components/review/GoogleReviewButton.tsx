"use client";

import { useState } from "react";

interface GoogleReviewButtonProps {
  /** Validated Google review URL from the business configuration (or null). */
  url: string | null;
  /** Review text to copy so the customer can paste it on Google. */
  review?: string;
  onClick: () => void;
  label?: string;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens the business's Google review page in a new tab. The customer posts
 * the review themselves — we never submit anything to Google and never
 * claim the review was posted.
 */
export function GoogleReviewButton({ url, review, onClick, label = "Post on Google" }: GoogleReviewButtonProps) {
  const [clicked, setClicked] = useState(false);
  const [copied, setCopied] = useState<boolean | null>(null);

  if (!url) {
    return (
      <div className="flex flex-col gap-3">
        <p role="status" className="rounded-2xl bg-white/70 p-4 text-sm text-muted ring-1 ring-black/5">
          Google reviews aren&apos;t available for this business yet.
        </p>
        {review && (
          <button
            type="button"
            onClick={async () => setCopied(await copyText(review))}
            className="min-h-12 rounded-full bg-white/70 px-6 font-semibold text-ink ring-1 ring-brand/25"
          >
            {copied ? "Copied" : "Copy my review"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          if (review) void copyText(review).then(setCopied);
          setClicked(true);
          onClick();
        }}
        className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-brand px-6 text-base font-semibold text-on-brand shadow-[0_12px_28px_-12px_var(--brand-primary)] transition hover:brightness-110 active:scale-[0.98]"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="size-5">
          <path
            fill="currentColor"
            d="M21.35 11.1H12v2.98h5.35c-.23 1.5-1.72 4.4-5.35 4.4-3.22 0-5.85-2.67-5.85-5.96S8.78 6.56 12 6.56c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.68 4 14.55 3 12 3 6.98 3 2.9 7.03 2.9 12s4.08 9 9.1 9c5.25 0 8.73-3.69 8.73-8.89 0-.6-.07-1.05-.15-1.51z"
          />
        </svg>
        {label}
        <span className="sr-only">(opens Google in a new tab)</span>
      </a>
      <p className="text-center text-sm text-muted" aria-live="polite">
        {clicked
          ? copied === false
            ? "Google is open in a new tab. Copy your review above and paste it there."
            : "Your review is copied. Paste it on Google and tap Post."
          : "We’ll copy your review so you can paste it on Google."}
      </p>
    </div>
  );
}
