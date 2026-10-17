/**
 * Shown instantly while an admin page loads its data, so switching tabs
 * gives immediate feedback instead of looking frozen.
 */
export default function AdminLoading() {
  return (
    <div role="status" aria-label="Loading" className="flex animate-pulse flex-col gap-6">
      <div>
        <div className="h-9 w-48 rounded-xl bg-black/[0.07]" />
        <div className="mt-3 h-4 w-72 max-w-full rounded-lg bg-black/[0.05]" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-white ring-1 ring-black/5" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-white ring-1 ring-black/5" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
