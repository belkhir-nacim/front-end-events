export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="h-5 w-40 animate-pulse rounded bg-surface" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="h-[360px] animate-pulse rounded-[var(--radius-card)] border border-line bg-surface" />
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-[var(--radius-card)] border border-line bg-surface" />
          <div className="h-64 animate-pulse rounded-[var(--radius-card)] border border-line bg-surface" />
        </div>
      </div>
    </div>
  );
}
