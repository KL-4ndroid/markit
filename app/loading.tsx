/**
 * 全域載入狀態
 * 用於頁面切換時的載入動畫
 */

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
      <div className="text-center">
        {/* 旋轉載入動畫 */}
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-[#7B9FA6]/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#7B9FA6] border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        {/* 載入文字 */}
        <p className="text-[#6B6B6B] text-sm font-medium">載入中...</p>
      </div>
    </div>
  );
}
