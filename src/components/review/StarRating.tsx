"use client";

import { useRef, useState, type KeyboardEvent } from "react";

const HINTS = ["Poor", "Not great", "Okay", "Good", "Loved it"];

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-10 transition-transform duration-200">
      <path
        d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"
        strokeLinejoin="round"
        strokeWidth={1.6}
        className={filled ? "fill-brand stroke-brand" : "fill-white/60"}
        style={filled ? undefined : { stroke: "color-mix(in srgb, var(--brand-primary) 45%, transparent)" }}
      />
    </svg>
  );
}

interface StarRatingProps {
  value: number | null;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

/** Five large, accessible star buttons ("1 star" … "5 stars"). Arrow keys move between stars. */
export function StarRating({ value, onChange, disabled }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const [popped, setPopped] = useState<number | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const shown = hover ?? value ?? 0;

  function onKeyDown(event: KeyboardEvent, index: number) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    refs.current[(index + delta + 5) % 5]?.focus();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        role="group"
        aria-label="Rate your experience"
        className="flex gap-1"
        onMouseLeave={() => setHover(null)}
      >
        {[1, 2, 3, 4, 5].map((n, i) => (
          <button
            key={n}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            disabled={disabled}
            aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
            aria-pressed={value === n}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(null)}
            onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => {
              setPopped(n);
              onChange(n);
            }}
            className={`flex h-14 w-[52px] items-center justify-center rounded-2xl transition active:scale-90 disabled:opacity-60 ${
              popped === n ? "animate-star-pop" : ""
            }`}
            onAnimationEnd={() => setPopped(null)}
          >
            <StarIcon filled={n <= shown} />
          </button>
        ))}
      </div>
      <p aria-hidden className="h-5 text-sm font-medium tracking-wide text-muted">
        {shown ? HINTS[shown - 1] : " "}
      </p>
    </div>
  );
}
