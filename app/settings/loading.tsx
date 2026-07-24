export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="japanese-gradient-header border-b border-white/15 px-5 pb-7 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <div className="mx-auto max-w-3xl">
          <div className="h-7 w-24 rounded bg-white/30 skeleton-shimmer-header" />
          <div className="mt-2 h-4 w-72 max-w-full rounded bg-white/20 skeleton-shimmer-header" />
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-4 pb-10 pt-6 sm:px-6">
        <div className="h-14 rounded bg-gray-100 skeleton-shimmer" />
        {[2, 3].map((rowCount) => (
          <section key={rowCount}>
            <div className="mb-2 h-3 w-20 rounded bg-gray-200 skeleton-shimmer-dark" />
            <div className="divide-y divide-gray-100 overflow-hidden rounded-card border border-gray-200 bg-white">
              {Array.from({ length: rowCount }, (_, index) => (
                <div key={index} className="flex h-[76px] items-center gap-3 px-4">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 skeleton-shimmer" />
                  <div className="flex-1">
                    <div className="h-4 w-28 rounded bg-gray-200 skeleton-shimmer-dark" />
                    <div className="mt-2 h-3 w-48 max-w-full rounded bg-gray-100 skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
