/**
 * 首頁載入骨架屏
 * - 純黑白灰階設計：不受主題色影響，視覺一致
 * - 流光效果：由左至右的光影流動
 * - 佈局 100% 同步真實頁面
 */

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton - 純灰階 */}
      <div className="japanese-gradient-header rounded-b-[2rem] px-6 pb-8 pt-12">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="h-8 w-32 bg-white/30 rounded-lg skeleton-shimmer-header"></div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/30 rounded-full skeleton-shimmer-header"></div>
              <div className="w-10 h-10 bg-white/30 rounded-full skeleton-shimmer-header"></div>
            </div>
          </div>
          <div className="h-4 w-48 bg-white/20 rounded skeleton-shimmer-header"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-lg mx-auto px-6 -mt-4 space-y-6">
        {/* 本月概覽骨架 - 純灰階陰影 */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-md shadow-gray-200/50">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="h-3 w-16 bg-gray-200 rounded mx-auto mb-2 skeleton-shimmer-dark"></div>
                <div className="h-8 w-12 bg-gray-200 rounded mx-auto skeleton-shimmer-dark"></div>
              </div>
            ))}
          </div>
        </div>

        {/* 市集卡片骨架 - 純灰階陰影 */}
        <div>
          <div className="h-6 w-32 bg-gray-200 rounded mb-4 skeleton-shimmer-dark"></div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-[1.5rem] p-6 shadow-md shadow-gray-200/50"
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
