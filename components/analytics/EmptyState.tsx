'use client';

import { useRouter } from 'next/navigation';
import { TrendingUp, Sparkles } from 'lucide-react';

/**
 * 空狀態組件
 * 
 * 當沒有數據時顯示優雅的空狀態插圖和引導
 */
export function EmptyState() {
  const router = useRouter();

  return (
    <div className="bg-white rounded-[1.5rem] p-8 shadow-md shadow-primary/5">
      <div className="flex flex-col items-center justify-center text-center">
        {/* 插圖 */}
        <div className="w-32 h-32 mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <TrendingUp className="w-16 h-16 text-primary/30" />
          </div>
        </div>

        {/* 標題 */}
        <h3 className="text-xl font-medium text-foreground mb-2">
          尚無數據
        </h3>

        {/* 描述 */}
        <p className="text-sm text-muted-foreground mb-6 max-w-xs inline-flex items-start gap-1.5">
          <Sparkles className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.75} />
          <span>開始記錄您的市集活動，系統將自動生成精美的數據分析報表</span>
        </p>

        {/* 引導步驟 */}
        <div className="w-full max-w-sm space-y-3 mb-6">
          <div className="flex items-start gap-3 p-3 bg-background rounded-xl">
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
              1
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">建立市集</p>
              <p className="text-xs text-muted-foreground">新增您即將參加的市集活動</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-background rounded-xl">
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
              2
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">新增商品</p>
              <p className="text-xs text-muted-foreground">建立您的商品清單和價格</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-background rounded-xl">
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
              3
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">開始營業</p>
              <p className="text-xs text-muted-foreground">記錄互動和交易，累積數據</p>
            </div>
          </div>
        </div>

        {/* 行動按鈕 */}
        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={() => router.push('/markets')}
            className="flex-1 px-6 py-3 rounded-2xl bg-primary text-white hover:bg-primary/85 transition-colors font-medium"
          >
            建立市集
          </button>
          <button
            onClick={() => router.push('/products')}
            className="flex-1 px-6 py-3 rounded-2xl bg-soft-pink text-foreground hover:bg-soft-pink/80 transition-colors font-medium"
          >
            新增商品
          </button>
        </div>
      </div>
    </div>
  );
}
