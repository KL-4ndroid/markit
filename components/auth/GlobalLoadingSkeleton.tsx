/**
 * Global Loading Skeleton - 全域載入骨架屏
 * 
 * 防止頁面閃爍的關鍵組件
 * 模擬首頁的卡片佈局
 */

'use client';

interface GlobalLoadingSkeletonProps {
  message?: string;
}

export function GlobalLoadingSkeleton({ message }: GlobalLoadingSkeletonProps) {
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 頂部區域骨架 */}
      <div className="japanese-gradient-header px-6 pt-12 pb-8">
        {/* 標題骨架 */}
        <div className="h-8 w-32 bg-white/20 rounded-xl mb-6 animate-pulse" />
        
        {/* 日期選擇器骨架 */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="h-6 w-24 bg-white/20 rounded-lg animate-pulse" />
            <div className="h-6 w-20 bg-white/20 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* 統計卡片骨架 */}
        <div className="grid grid-cols-2 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>

      {/* 快速操作按鈕骨架 */}
      <div className="px-6 -mt-6 mb-6">
        <div className="japanese-surface-card p-4">
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 bg-gray-200 rounded-2xl animate-pulse" />
                <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 市集列表骨架 */}
      <div className="px-6 space-y-4">
        <div className="h-6 w-32 bg-gray-200 rounded-lg animate-pulse mb-4" />
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
        
        <MarketCardSkeleton />
        <MarketCardSkeleton />
        <MarketCardSkeleton />
      </div>
    </div>
  );
}

/**
 * 統計卡片骨架
 */
function StatCardSkeleton() {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
      <div className="h-4 w-16 bg-white/20 rounded animate-pulse mb-3" />
      <div className="h-8 w-24 bg-white/20 rounded-lg animate-pulse mb-2" />
      <div className="h-3 w-20 bg-white/20 rounded animate-pulse" />
    </div>
  );
}

/**
 * 市集卡片骨架
 */
function MarketCardSkeleton() {
  return (
    <div className="japanese-surface-card p-5">
      {/* 標題與日期 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-6 w-40 bg-gray-200 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="w-16 h-8 bg-gray-200 rounded-full animate-pulse" />
      </div>

      {/* 統計數據 */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-3 w-12 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
