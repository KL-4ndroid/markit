/**
 * 訂閱頁面載入骨架屏
 * - 純黑白灰階設計：不受主題色影響，視覺一致
 * - 流光效果：由左至右的光影流動
 */

export default function SubscriptionLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton - 純灰階 */}
      <div className="bg-gradient-to-br from-gray-300 to-gray-400 pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-4xl mx-auto">
          <div className="w-10 h-10 bg-white/30 rounded-full mb-4 skeleton-shimmer-header" />
          <div className="w-48 h-8 bg-white/30 rounded-xl mb-2 skeleton-shimmer-header" />
          <div className="w-64 h-4 bg-white/20 rounded-lg skeleton-shimmer-header" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-4xl mx-auto px-6 -mt-4 pb-12">
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-gray-200/50">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl mb-4 skeleton-shimmer" />
              <div className="w-32 h-6 bg-gray-200 rounded-lg mb-2 skeleton-shimmer-dark" />
              <div className="w-24 h-10 bg-gray-200 rounded-lg mb-6 skeleton-shimmer-dark" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="w-full h-4 bg-gray-100 rounded skeleton-shimmer" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
