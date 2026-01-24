'use client';

import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';

/**
 * 空狀態組件
 * 
 * 當沒有數據時顯示優雅的空狀態插圖和引導
 */
export function EmptyState() {
  const router = useRouter();

  return (
    <div className="bg-white rounded-[1.5rem] p-8 shadow-md shadow-[#7B9FA6]/5">
      <div className="flex flex-col items-center justify-center text-center">
        {/* 插圖 */}
        <div className="w-32 h-32 mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7B9FA6]/10 to-[#D4A574]/10 rounded-full"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <TrendingUp className="w-16 h-16 text-[#7B9FA6]/30" />
          </div>
        </div>

        {/* 標題 */}
        <h3 className="text-xl font-medium text-[#3A3A3A] mb-2">
          尚無數據
        </h3>

        {/* 描述 */}
        <p className="text-sm text-[#6B6B6B] mb-6 max-w-xs">
          開始記錄您的市集活動，系統將自動生成精美的數據分析報表 ✨
        </p>

        {/* 引導步驟 */}
        <div className="w-full max-w-sm space-y-3 mb-6">
          <div className="flex items-start gap-3 p-3 bg-[#FAFAF8] rounded-xl">
            <div className="w-6 h-6 rounded-full bg-[#7B9FA6] text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
              1
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#3A3A3A]">建立市集</p>
              <p className="text-xs text-[#6B6B6B]">新增您即將參加的市集活動</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[#FAFAF8] rounded-xl">
            <div className="w-6 h-6 rounded-full bg-[#7B9FA6] text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
              2
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#3A3A3A]">新增商品</p>
              <p className="text-xs text-[#6B6B6B]">建立您的商品清單和價格</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-[#FAFAF8] rounded-xl">
            <div className="w-6 h-6 rounded-full bg-[#7B9FA6] text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
              3
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#3A3A3A]">開始營業</p>
              <p className="text-xs text-[#6B6B6B]">記錄互動和交易，累積數據</p>
            </div>
          </div>
        </div>

        {/* 行動按鈕 */}
        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={() => router.push('/markets')}
            className="flex-1 px-6 py-3 rounded-2xl bg-[#7B9FA6] text-white hover:bg-[#6A8E95] transition-colors font-medium"
          >
            建立市集
          </button>
          <button
            onClick={() => router.push('/products')}
            className="flex-1 px-6 py-3 rounded-2xl bg-[#F5E6E8] text-[#3A3A3A] hover:bg-[#E5D6D8] transition-colors font-medium"
          >
            新增商品
          </button>
        </div>
      </div>
    </div>
  );
}
