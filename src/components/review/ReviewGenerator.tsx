"use client";

import { Button, StepHeading } from "./ui";

interface ReviewGeneratorProps {
  error: string | null;
  onRetry: () => void;
  onWriteOwn: () => void;
}

/** Loading state while the AI drafts a review, and the friendly error fallback. */
export function ReviewGenerator({ error, onRetry, onWriteOwn }: ReviewGeneratorProps) {
  if (error) {
    return (
      <div className="flex flex-col gap-5" role="alert">
        <StepHeading>We couldn&apos;t create your review right now.</StepHeading>
        <p className="text-muted">Your choices are saved. You can try again, or write it yourself.</p>
        <div className="flex flex-col gap-3">
          <Button onClick={onRetry}>Try Again</Button>
          <Button variant="secondary" onClick={onWriteOwn}>
            Write it myself
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <StepHeading>Creating your review...</StepHeading>
      <div aria-hidden className="rounded-3xl bg-white/80 p-6 ring-1 ring-black/5">
        {[92, 100, 64].map((w, i) => (
          <div
            key={i}
            className="animate-shimmer mb-3 h-3.5 rounded-full last:mb-0"
            style={{
              width: `${w}%`,
              animationDelay: `${i * 120}ms`,
              backgroundImage:
                "linear-gradient(90deg, color-mix(in srgb, var(--brand-primary) 10%, transparent) 0%, color-mix(in srgb, var(--brand-primary) 28%, transparent) 50%, color-mix(in srgb, var(--brand-primary) 10%, transparent) 100%)",
              backgroundSize: "200% 100%",
            }}
          />
        ))}
      </div>
      <p className="text-sm text-muted">Just a moment — using only what you told us.</p>
    </div>
  );
}
