"use client";

import { useId, useState, type FormEvent } from "react";
import { limits } from "@/config/limits";
import { CategorySelector } from "./CategorySelector";
import { Button, StepHeading } from "./ui";

export interface PrivateFeedbackInput {
  categories: string[];
  feedback: string;
  website: string;
}

interface PrivateFeedbackFormProps {
  categories: readonly string[];
  /** Resolves to null on success, or a customer-safe error message. */
  onSubmit: (input: PrivateFeedbackInput) => Promise<string | null>;
  onBack: () => void;
}

/** 1–3 star flow: private feedback that goes only to the business. No Google link here. */
export function PrivateFeedbackForm({ categories, onSubmit, onBack }: PrivateFeedbackFormProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const groupLabelId = useId();
  const textareaId = useId();
  const errorId = useId();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (feedback.trim().length < limits.feedbackMinChars) {
      setError("Please tell us a little about what happened.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await onSubmit({ categories: selected, feedback: feedback.trim(), website });
    setSubmitting(false);
    if (result) setError(result);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <StepHeading>We’re sorry your experience wasn’t what you expected.</StepHeading>
        <p className="text-muted">Your feedback goes privately to the team.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h3 id={groupLabelId} className="font-semibold text-ink">
          What could have been better?
        </h3>
        <CategorySelector
          options={categories}
          selected={selected}
          labelledBy={groupLabelId}
          disabled={submitting}
          onToggle={(c) =>
            setSelected((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
          }
        />
      </section>

      <section className="flex flex-col gap-3">
        <label htmlFor={textareaId} className="font-semibold text-ink">
          Tell us what happened
        </label>
        <textarea
          id={textareaId}
          value={feedback}
          onChange={(e) => {
            setFeedback(e.target.value);
            if (error) setError(null);
          }}
          required
          maxLength={limits.feedbackMaxChars}
          rows={5}
          disabled={submitting}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          placeholder="Your feedback helps us understand what we can improve."
          className="w-full resize-none rounded-3xl bg-white p-5 text-[1.02rem] leading-relaxed text-ink ring-1 ring-black/10 outline-none placeholder:text-muted/80 focus:ring-2 focus:ring-brand aria-invalid:ring-2 aria-invalid:ring-red-700"
        />
        {error && (
          <p id={errorId} role="alert" className="text-sm font-medium text-red-800">
            {error}
          </p>
        )}
      </section>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <Button type="submit" loading={submitting}>
          Send Feedback
        </Button>
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          Change rating
        </Button>
      </div>
    </form>
  );
}
