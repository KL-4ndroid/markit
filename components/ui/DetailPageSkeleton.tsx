interface DetailPageSkeletonProps {
  stats?: number;
  sections?: number;
}

export function DetailPageSkeleton({ stats = 3, sections = 3 }: DetailPageSkeletonProps) {
  const statsGridClassName = stats === 2 ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-3 gap-3';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="japanese-gradient-header rounded-b-[2rem] px-6 pb-8 pt-12">
        <div className="max-w-lg mx-auto">
          <div className="h-5 w-20 bg-white/20 rounded-lg mb-5 skeleton-shimmer-header" />
          <div className="h-8 w-44 bg-white/30 rounded-xl mb-3 skeleton-shimmer-header" />
          <div className="h-4 w-32 bg-white/20 rounded-lg skeleton-shimmer-header" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-4 space-y-4">
        <div className="japanese-surface-card p-5">
          <div className={statsGridClassName}>
            {Array.from({ length: stats }).map((_, index) => (
              <div key={index} className="text-center">
                <div className="mx-auto mb-2 h-3 w-12 rounded bg-muted skeleton-shimmer" />
                <div className="mx-auto h-7 w-16 rounded-lg bg-primary/15 skeleton-shimmer-dark" />
              </div>
            ))}
          </div>
        </div>

        {Array.from({ length: sections }).map((_, index) => (
          <div key={index} className="japanese-surface-card p-5">
            <div className="mb-4 h-5 w-36 rounded-lg bg-primary/15 skeleton-shimmer-dark" />
            <div className="space-y-3">
              <div className="h-4 w-full rounded bg-muted skeleton-shimmer" />
              <div className="h-4 w-5/6 rounded bg-muted skeleton-shimmer" />
              <div className="h-12 w-full rounded-xl bg-soft-yellow/55 skeleton-shimmer-light" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
