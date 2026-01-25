/**
 * 市集列表頁載入骨架屏
 */

export default function MarketsLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header Skeleton */}
      <div className="gradient-header pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="h-8 w-32 bg-white/20 rounded-lg animate-pulse mb-2"></div>
          <div className="h-4 w-48 bg-white/10 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-lg mx-auto px-6 -mt-4 space-y-4">
        {/* 搜尋框骨架 */}
        <div className="bg-white rounded-[1.5rem] p-4 shadow-lg shadow-[#7B9FA6]/10">
          <div className="h-10 bg-gray-100 rounded-xl animate-pulse"></div>
        </div>

        {/* 市集卡片骨架 */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-48 bg-gray-100 rounded animate-pulse"></div>
              </div>
              <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 bg-gray-50 rounded-xl animate-pulse"></div>
              <div className="h-16 bg-gray-50 rounded-xl animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
