/**
 * 分析頁載入骨架屏
 * - 防止閃爍：200ms 延遲顯示
 * - 流光效果：由左至右的光影流動
 * - 佈局 100% 同步真實頁面
 */

export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header Skeleton */}
      <div className="gradient-header pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="h-8 w-24 bg-white/20 rounded-lg skeleton-shimmer-header"></div>
            <div className="h-8 w-24 bg-white/20 rounded-full skeleton-shimmer-header"></div>
          </div>
          <div className="h-4 w-48 bg-white/10 rounded skeleton-shimmer-header"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-lg mx-auto px-6 -mt-4 space-y-6">
        {/* 日期篩選骨架 */}
        <div className="bg-white rounded-[1.5rem] p-2 shadow-lg shadow-[#7B9FA6]/10">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex-1 h-10 bg-gray-100 rounded-xl skeleton-shimmer"
              ></div>
            ))}
          </div>
        </div>

        {/* 統計卡片骨架 */}
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-[1.5rem] p-4 shadow-lg shadow-[#7B9FA6]/10"
            >
              <div className="h-8 w-20 bg-gray-200 rounded mb-2 skeleton-shimmer-dark"></div>
              <div className="h-4 w-16 bg-gray-100 rounded skeleton-shimmer"></div>
            </div>
          ))}
        </div>

        {/* 圖表骨架 */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4 skeleton-shimmer-dark"></div>
          <div className="h-48 bg-gray-50 rounded-xl skeleton-shimmer-light"></div>
        </div>

        {/* 圖表骨架 2 */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4 skeleton-shimmer-dark"></div>
          <div className="h-48 bg-gray-50 rounded-xl skeleton-shimmer-light"></div>
        </div>
      </div>
    </div>
  );
}
