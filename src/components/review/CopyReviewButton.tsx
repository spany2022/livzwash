"use client";

import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

/**
 * Fallback for browsers/in-app webviews that block the async Clipboard API:
 * select the text in an off-screen textarea and use the older copy command.
 */
function legacyCopy(text: string): boolean {
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    area.style.pointerEvents = "none";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Small icon button that copies the review text. It only copies: it does not
 * open Google and is not tracked as a Google click.
 */
export function CopyReviewButton({ text }: { text: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = legacyCopy(text);
    }
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), ok ? 2000 : 4000);
  }

  const copied = state === "copied";

  return (
    <div className="relative flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Review copied" : "Copy review"}
        title={copied ? "Copied" : "Copy review"}
        className={`inline-flex size-11 items-center justify-center rounded-full transition active:scale-95 ${
          copied
            ? "bg-brand text-on-brand"
            : "bg-brand-soft/70 text-brand ring-1 ring-inset ring-brand/15 hover:bg-brand-soft"
        }`}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" aria-hidden className="size-[18px]">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
            <path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" />
          </svg>
        )}
      </button>
      <span role="status" className="h-4 text-[11px] leading-4 font-semibold text-brand">
        {copied ? "Copied" : ""}
      </span>
      {state === "failed" && (
        <p role="alert" className="absolute top-full right-0 mt-1 w-56 rounded-xl bg-white p-2 text-right text-xs text-muted shadow ring-1 ring-black/5">
          Couldn&apos;t copy — press and hold the text to copy it.
        </p>
      )}
    </div>
  );
}
