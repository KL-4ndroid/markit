/**
 * 分析頁載入骨架屏
 */

export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header Skeleton */}
      <div className="gradient-header pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="h-8 w-24 bg-white/20 rounded-lg animate-pulse mb-2"></div>
          <div className="h-4 w-40 bg-white/10 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-lg mx-auto px-6 -mt-4 space-y-4">
        {/* 統計卡片骨架 */}
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-[1.5rem] p-4 shadow-lg shadow-[#7B9FA6]/10"
            >
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-16 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* 圖表骨架 */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-48 bg-gray-50 rounded-xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
