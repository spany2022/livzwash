"use client";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="rounded-2xl bg-white p-8 text-center ring-1 ring-black/5">
      <h1 className="font-display text-2xl text-ink">We couldn&apos;t load this page</h1>
      <p className="mt-2 text-muted">Check your connection and the Supabase configuration, then try again.</p>
      <button onClick={reset} className="mt-5 min-h-11 rounded-full bg-brand px-5 font-semibold text-on-brand">
        Try again
      </button>
    </div>
  );
}
