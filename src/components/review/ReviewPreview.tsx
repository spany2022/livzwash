"use client";

import { useId, useState } from "react";
import { limits } from "@/config/limits";
import { Button, StepHeading } from "./ui";

interface ReviewPreviewProps {
  review: string;
  /** Regenerations left, or null when unknown. */
  remaining: number | null;
  isRegenerating: boolean;
  isApproving: boolean;
  notice: string | null;
  /** Open straight in edit mode (e.g. "Write it myself"). */
  startEditing?: boolean;
  onSave: (text: string) => void;
  onRegenerate: () => void;
  onApprove: () => void;
}

/** "Here's your review" card with Edit / Regenerate / Looks Good. */
export function ReviewPreview({
  review,
  remaining,
  isRegenerating,
  isApproving,
  notice,
  startEditing = false,
  onSave,
  onRegenerate,
  onApprove,
}: ReviewPreviewProps) {
  const [editing, setEditing] = useState(startEditing);
  const [draft, setDraft] = useState(review);
  const textareaId = useId();
  const busy = isRegenerating || isApproving;
  const canSave = draft.trim().length >= limits.reviewMinChars;
  const canRegenerate = remaining === null || remaining > 0;

  function beginEdit() {
    setDraft(review);
    setEditing(true);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-5">
        <StepHeading>{review ? "Edit your review" : "Write your review"}</StepHeading>
        <label htmlFor={textareaId} className="sr-only">
          Your review
        </label>
        <textarea
          id={textareaId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={limits.reviewMaxChars}
          rows={6}
          autoFocus
          placeholder="Share a few words about your visit."
          className="w-full resize-none rounded-3xl bg-white p-5 text-[1.05rem] leading-relaxed text-ink shadow-inner ring-1 ring-black/10 outline-none focus:ring-2 focus:ring-brand"
        />
        <p className="-mt-3 text-right text-xs text-muted" aria-live="polite">
          {draft.length}/{limits.reviewMaxChars}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setDraft(review);
              setEditing(false);
            }}
            disabled={!review}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(draft.trim());
              setEditing(false);
            }}
            disabled={!canSave}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <StepHeading>Here’s your review</StepHeading>

      <figure
        className={`relative overflow-hidden rounded-3xl bg-white px-6 pt-9 pb-6 shadow-[0_18px_40px_-24px_rgba(35,26,20,0.45)] ring-1 ring-black/5 transition ${
          isRegenerating ? "opacity-60" : ""
        }`}
        aria-busy={isRegenerating}
      >
        <span
          aria-hidden
          className="font-display absolute top-1 left-4 text-6xl leading-none text-brand/25 select-none"
        >
          “
        </span>
        <blockquote className="font-display text-[1.2rem] leading-relaxed text-ink [font-variation-settings:'SOFT'_50]">
          {review}
        </blockquote>
        {isRegenerating && (
          <p role="status" className="mt-4 text-sm text-muted">
            Creating a new version...
          </p>
        )}
      </figure>

      {notice && (
        <p role="alert" className="-mt-2 text-sm text-muted">
          {notice}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Button onClick={onApprove} loading={isApproving} disabled={isRegenerating}>
          Looks Good
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={beginEdit} disabled={busy}>
            Edit
          </Button>
          <Button
            variant="secondary"
            onClick={onRegenerate}
            loading={isRegenerating}
            disabled={busy || !canRegenerate}
          >
            Regenerate
          </Button>
        </div>
        {remaining !== null && (
          <p className="text-center text-xs text-muted">
            {remaining > 0
              ? `${remaining} new ${remaining === 1 ? "version" : "versions"} left`
              : "No new versions left — you can still edit it."}
          </p>
        )}
      </div>
    </div>
  );
}
