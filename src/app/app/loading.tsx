export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-64 rounded-lg bg-navy-100" />
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-navy-100/70" />)}
      </div>
      <div className="h-80 rounded-xl bg-navy-100/60" />
    </div>
  );
}
