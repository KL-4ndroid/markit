/**
 * 設定頁載入骨架屏
 * - 防止閃爍：200ms 延遲顯示
 * - 流光效果：由左至右的光影流動
 * - 佈局 100% 同步真實頁面
 */

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header Skeleton */}
      <div className="gradient-header pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="h-8 w-16 bg-white/20 rounded-lg skeleton-shimmer-header mb-2"></div>
          <div className="h-4 w-40 bg-white/10 rounded skeleton-shimmer-header"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-lg mx-auto px-6 -mt-4 space-y-4">
        {/* 設定項目骨架 */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-5 w-32 bg-gray-200 rounded skeleton-shimmer-dark mb-2"></div>
                <div className="h-4 w-48 bg-gray-100 rounded skeleton-shimmer"></div>
              </div>
              <div className="h-6 w-12 bg-gray-100 rounded-full skeleton-shimmer"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
