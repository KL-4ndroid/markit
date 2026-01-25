/**
 * 全局載入狀態組件
 * 用於首次載入和數據同步時的友好提示
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { useSync } from '@/hooks/useSync';

export function GlobalLoadingState() {
  const { isConfigured, user } = useAuth();
  const { status, lastSyncAt } = useSync();
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    // 檢查是否為首次載入
    const hasLoadedBefore = localStorage.getItem('app_loaded_before');
    
    if (!hasLoadedBefore && isConfigured && user) {
      setShowLoading(true);
      setIsFirstLoad(true);
    } else {
      setIsFirstLoad(false);
    }
  }, [isConfigured, user]);

  useEffect(() => {
    // 首次同步完成後隱藏載入畫面
    if (isFirstLoad && lastSyncAt) {
      setTimeout(() => {
        setShowLoading(false);
        localStorage.setItem('app_loaded_before', 'true');
      }, 500); // 延遲 500ms 讓動畫更流暢
    }
  }, [isFirstLoad, lastSyncAt]);

  // 不顯示載入畫面的情況
  if (!showLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-[#FAFAF8] z-[9999] flex items-center justify-center">
      <div className="text-center px-6">
        {/* Logo 或品牌圖示 */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#7B9FA6]/30">
            <span className="text-4xl">🎪</span>
          </div>
        </div>

        {/* 載入動畫 */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-[#7B9FA6]/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#7B9FA6] border-t-transparent rounded-full animate-spin"></div>
        </div>

        {/* 載入文字 */}
        <h2 className="text-xl font-medium text-[#3A3A3A] mb-2">
          正在載入資料
        </h2>
        <p className="text-sm text-[#6B6B6B]">
          {status === 'syncing' ? '正在從雲端同步資料...' : '準備中...'}
        </p>

        {/* 進度提示 */}
        <div className="mt-8 max-w-xs mx-auto">
          <div className="h-1 bg-[#7B9FA6]/20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#7B9FA6] to-[#D4A574] rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* 提示文字 */}
        <p className="text-xs text-[#6B6B6B] mt-6 opacity-60">
          首次載入可能需要幾秒鐘
        </p>
      </div>
    </div>
  );
}
