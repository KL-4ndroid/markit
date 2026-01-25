/**
 * 市集列表頁載入骨架屏
 */

export default function MarketsLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header Skeleton */}
      <div className="gradient-header pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="h-8 w-24 bg-white/20 rounded-lg skeleton-shimmer"></div>
            <div className="w-12 h-12 bg-white/20 rounded-full skeleton-shimmer"></div>
          </div>
          <div className="h-4 w-32 bg-white/10 rounded skeleton-shimmer"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* Tabs 骨架 */}
        <div className="bg-white rounded-[1.5rem] p-2 shadow-lg shadow-[#7B9FA6]/10 mb-6">
          <div className="grid grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-100 rounded-xl skeleton-shimmer"
              ></div>
            ))}
          </div>
        </div>

        {/* 市集卡片骨架 */}
        <div className="space-y-4 pb-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="h-6 w-32 bg-gray-200 rounded mb-2 skeleton-shimmer"></div>
                  <div className="h-4 w-48 bg-gray-100 rounded skeleton-shimmer"></div>
                </div>
                <div className="h-6 w-16 bg-gray-100 rounded-full skeleton-shimmer"></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 bg-gray-50 rounded-xl skeleton-shimmer"></div>
                <div className="h-16 bg-gray-50 rounded-xl skeleton-shimmer"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
