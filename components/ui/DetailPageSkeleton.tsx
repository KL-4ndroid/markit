interface DetailPageSkeletonProps {
  stats?: number;
  sections?: number;
}

export function DetailPageSkeleton({ stats = 3, sections = 3 }: DetailPageSkeletonProps) {
  const statsGridClassName = stats === 2 ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-3 gap-3';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-br from-secondary to-secondary/85 pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="h-5 w-20 bg-white/20 rounded-lg mb-5 skeleton-shimmer-header" />
          <div className="h-8 w-44 bg-white/30 rounded-xl mb-3 skeleton-shimmer-header" />
          <div className="h-4 w-32 bg-white/20 rounded-lg skeleton-shimmer-header" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-4 space-y-4">
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 p-5">
          <div className={statsGridClassName}>
            {Array.from({ length: stats }).map((_, index) => (
              <div key={index} className="text-center">
                <div className="h-3 w-12 bg-gray-100 rounded mx-auto mb-2 skeleton-shimmer" />
                <div className="h-7 w-16 bg-gray-200 rounded-lg mx-auto skeleton-shimmer-dark" />
              </div>
            ))}
          </div>
        </div>

        {Array.from({ length: sections }).map((_, index) => (
          <div key={index} className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 p-5">
            <div className="h-5 w-36 bg-gray-200 rounded-lg mb-4 skeleton-shimmer-dark" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-gray-100 rounded skeleton-shimmer" />
              <div className="h-4 w-5/6 bg-gray-100 rounded skeleton-shimmer" />
              <div className="h-12 w-full bg-gray-50 rounded-xl skeleton-shimmer-light" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
