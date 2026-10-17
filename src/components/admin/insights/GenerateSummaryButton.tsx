"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { generateWeeklySummaryAction, type FormState } from "@/app/admin/actions";
import { SparkIcon } from "../icons";

export function GenerateSummaryButton({
  week,
  label,
  remaining,
  variant = "primary",
}: {
  week: string;
  label: string;
  /** Regenerations left; null when not relevant yet. */
  remaining: number | null;
  variant?: "primary" | "secondary";
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(generateWeeklySummaryAction, {});
  const disabled = pending || remaining === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(() => action(new FormData(event.currentTarget)));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-start gap-2">
      <input type="hidden" name="week" value={week} />
      <button
        type="submit"
        disabled={disabled}
        aria-busy={pending || undefined}
        className={`inline-flex min-h-12 items-center gap-2 rounded-2xl px-5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          variant === "primary"
            ? "bg-brand text-on-brand hover:brightness-110"
            : "bg-white text-ink ring-1 ring-black/10 hover:ring-brand/40"
        }`}
      >
        {pending ? (
          <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        ) : (
          <SparkIcon className="size-5" />
        )}
        {pending ? "Writing summary…" : label}
      </button>
      <p role="status" className={`text-sm ${state.error ? "text-red-800" : "text-muted"}`}>
        {state.error ??
          (remaining !== null
            ? remaining > 0
              ? `${remaining} ${remaining === 1 ? "regeneration" : "regenerations"} left this week`
              : "No regenerations left for this week"
            : "")}
      </p>
    </form>
  );
}
