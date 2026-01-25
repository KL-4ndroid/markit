/**
 * 首頁載入骨架屏
 * - 防止閃爍：200ms 延遲顯示
 * - 流光效果：由左至右的光影流動
 * - 佈局 100% 同步真實頁面
 */

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header Skeleton */}
      <div className="gradient-header pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="h-8 w-32 bg-white/20 rounded-lg skeleton-shimmer-header"></div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/20 rounded-full skeleton-shimmer-header"></div>
              <div className="w-10 h-10 bg-white/20 rounded-full skeleton-shimmer-header"></div>
            </div>
          </div>
          <div className="h-4 w-48 bg-white/10 rounded skeleton-shimmer-header"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-lg mx-auto px-6 -mt-4 space-y-6">
        {/* 本月概覽骨架 */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-md shadow-[#7B9FA6]/5">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="h-3 w-16 bg-gray-200 rounded mx-auto mb-2 skeleton-shimmer-dark"></div>
                <div className="h-8 w-12 bg-gray-200 rounded mx-auto skeleton-shimmer-dark"></div>
              </div>
            ))}
          </div>
        </div>

        {/* 市集卡片骨架 */}
        <div>
          <div className="h-6 w-32 bg-gray-200 rounded mb-4 skeleton-shimmer-dark"></div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-[1.5rem] p-6 shadow-md shadow-[#7B9FA6]/5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="h-6 w-32 bg-gray-200 rounded mb-2 skeleton-shimmer-dark"></div>
                    <div className="h-4 w-48 bg-gray-100 rounded skeleton-shimmer"></div>
                  </div>
                  <div className="h-6 w-16 bg-gray-100 rounded-full skeleton-shimmer"></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-16 bg-gray-50 rounded-xl skeleton-shimmer-light"></div>
                  <div className="h-16 bg-gray-50 rounded-xl skeleton-shimmer-light"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
