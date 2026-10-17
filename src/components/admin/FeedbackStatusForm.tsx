"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { updateFeedback, type FormState } from "@/app/admin/actions";
import { limits } from "@/config/limits";
import { FEEDBACK_STATUSES, FEEDBACK_STATUS_LABELS, type FeedbackStatus } from "@/types/feedback";

export function FeedbackStatusForm({
  id,
  status,
  notes,
}: {
  id: string;
  status: FeedbackStatus;
  notes: string | null;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateFeedback, {});
  const [selectedStatus, setSelectedStatus] = useState<FeedbackStatus>(status);
  const [notesText, setNotesText] = useState(notes ?? "");

  // Submit via onSubmit instead of <form action>: a form action makes React
  // reset the form afterwards, which snaps the <select> back to its first
  // option even though the new status was saved.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="status" className="text-sm font-semibold text-ink">Status</label>
        <select
          id="status"
          name="status"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as FeedbackStatus)}
          className="min-h-12 rounded-2xl bg-white px-4 ring-1 ring-black/10 focus:ring-2 focus:ring-brand focus:outline-none"
        >
          {FEEDBACK_STATUSES.map((s) => (
            <option key={s} value={s}>{FEEDBACK_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-semibold text-ink">
          Internal notes <span className="font-normal text-muted">(only visible to admins)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          maxLength={limits.adminNotesMaxChars}
          rows={4}
          className="rounded-2xl bg-white p-4 ring-1 ring-black/10 focus:ring-2 focus:ring-brand focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-2xl bg-brand px-6 font-semibold text-on-brand transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <p role="status" className={`text-sm ${state.error ? "text-red-800" : "text-emerald-800"}`}>
          {state.error ?? state.success}
        </p>
      </div>
    </form>
  );
}
