"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-on-brand shadow-[0_10px_24px_-12px_var(--brand-primary)] hover:brightness-110 active:brightness-95",
  secondary:
    "bg-white/70 text-ink ring-1 ring-inset ring-brand/25 hover:bg-white active:bg-brand-soft",
  ghost: "text-brand underline-offset-4 hover:underline",
};

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[0.95rem] font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {loading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  );
}

/**
 * Heading for each step. It takes focus when a new step appears so screen
 * reader and keyboard users land on the new content.
 */
export function StepHeading({
  children,
  autoFocus = true,
  as: Tag = "h2",
  id,
}: {
  children: ReactNode;
  id?: string;
  autoFocus?: boolean;
  as?: "h1" | "h2";
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: false });
  }, [autoFocus]);
  return (
    <Tag
      ref={ref}
      id={id}
      tabIndex={-1}
      className="font-display text-[1.75rem] leading-[1.15] font-medium tracking-[-0.01em] text-ink outline-none [font-variation-settings:'SOFT'_100]"
    >
      {children}
    </Tag>
  );
}

export function Step({ children }: { children: ReactNode }) {
  return <div className="animate-step-in flex flex-col gap-6">{children}</div>;
}
