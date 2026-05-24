/**
 * Sync Status Indicator - 輕量化同步狀態指示器
 * 
 * 設計理念：
 * - 直徑 8px 的圓點，搭配微弱的擴散動畫（呼吸燈）
 * - 僅當 pendingEvents >= 5 時才顯示大彈窗
 * - 否則僅顯示小指示器
 * 
 * 顏色邏輯：
 * - 同步中且事件 < 5：#E8F3E8 (柔綠色) 呼吸閃爍
 * - 離線狀態：#D4A574 (溫暖木色) 靜態
 * - 同步失敗：#F5E6E8 (柔粉色) 警告圖示
 */

'use client';

import { useSync, SyncStatus as SyncStatusEnum } from '@/hooks/useSync';
import { useAuth } from '@/lib/supabase/auth-context';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

export function SyncStatusIndicator() {
  const { user, isConfigured } = useAuth();
  const { status, pendingCount, error, sync, isOnline, uploadProgress, downloadProgress } = useSync({
    enabled: !!user && isConfigured,
  });
  const [showLargeDialog, setShowLargeDialog] = useState(false);
  const [hasShownOfflineToast, setHasShownOfflineToast] = useState(false);
  
  // ✅ 本地防抖鎖：防止快速連續點擊
  const [isClickLocked, setIsClickLocked] = useState(false);
  const clickLockTimeoutRef = useRef<NodeJS.Timeout>();
  const shouldShowLargeDialog = pendingCount >= 5 && status === SyncStatusEnum.SYNCING;

  // ✅ 清理防抖鎖的 timeout
  useEffect(() => {
    return () => {
      if (clickLockTimeoutRef.current) {
        clearTimeout(clickLockTimeoutRef.current);
      }
    };
  }, []);

  // ✅ 當同步完成時，解除點擊鎖
  useEffect(() => {
    if (status !== SyncStatusEnum.SYNCING && isClickLocked) {
      // 延遲 500ms 解鎖，避免同步完成瞬間再次點擊
      clickLockTimeoutRef.current = setTimeout(() => {
        setIsClickLocked(false);
      }, 500);
    }
  }, [status, isClickLocked]);

  // ✅ Debug Log：追蹤彈窗顯示邏輯
  useEffect(() => {
    console.log('🔍 [SyncStatusIndicator] 狀態檢查:', {
      pendingCount,
      status,
      shouldShowLargeDialog,
      isOnline,
    });
  }, [pendingCount, status, shouldShowLargeDialog, isOnline]);

  // 當 pendingCount >= 5 且正在同步時，顯示大彈窗
  useEffect(() => {
    if (shouldShowLargeDialog) {
      console.log('📱 [SyncStatusIndicator] 顯示大彈窗:', { pendingCount, status });
      setShowLargeDialog(true);
    } else {
      if (showLargeDialog) {
        console.log('✅ [SyncStatusIndicator] 關閉大彈窗:', { pendingCount, status });
      }
      setShowLargeDialog(false);
    }
  }, [pendingCount, status, shouldShowLargeDialog, showLargeDialog]);

  // 當同步失敗且有待同步事件時，顯示 Toast
  useEffect(() => {
    if (status === SyncStatusEnum.ERROR && pendingCount > 0 && !hasShownOfflineToast) {
      toast.info('部分數據暫存於本地，將在連網後更新', {
        duration: 3000,
        icon: '💾',
      });
      setHasShownOfflineToast(true);
    }

    // 重置標記（當成功同步後）
    if (status === SyncStatusEnum.SUCCESS) {
      setHasShownOfflineToast(false);
    }
  }, [status, pendingCount, hasShownOfflineToast]);

  // 獲取指示器顏色和動畫
  if (!isConfigured || !user) {
    return null;
  }

  const getIndicatorStyle = () => {
    // ✅ 同步中：柔綠色呼吸閃爍（不論 pendingCount，員工模式也會顯示）
    if (status === SyncStatusEnum.SYNCING) {
      console.log('🟢 [SyncStatusIndicator] 同步中:', { pendingCount, status });
      return {
        bg: 'bg-[#E8F3E8]',
        ring: 'ring-[#E8F3E8]',
        animate: 'animate-pulse',
      };
    }

    if (status === SyncStatusEnum.OFFLINE || !isOnline) {
      // 離線狀態：溫暖木色靜態
      console.log('🟠 [SyncStatusIndicator] 離線模式:', { isOnline });
      return {
        bg: 'bg-[#D4A574]',
        ring: 'ring-[#D4A574]',
        animate: '',
      };
    }

    if (status === SyncStatusEnum.ERROR) {
      // 同步失敗：柔粉色
      console.log('🔴 [SyncStatusIndicator] 錯誤模式:', { error });
      return {
        bg: 'bg-[#F5E6E8]',
        ring: 'ring-[#F5E6E8]',
        animate: '',
      };
    }

    // 成功或閒置：柔綠色靜態
    return {
      bg: 'bg-[#E8F3E8]',
      ring: 'ring-[#E8F3E8]',
      animate: '',
    };
  };

  const indicatorStyle = getIndicatorStyle();

  return (
    <>
      {/* 小指示器（始終顯示，可點擊手動同步） */}
      <button
        onClick={() => {
          // ✅ 多重防護：防止連續點擊
          if (status === SyncStatusEnum.SYNCING || isClickLocked) {
            console.log('⏸️ 同步進行中或點擊鎖定，忽略點擊');
            return;
          }

          // ✅ 立即設置點擊鎖，防止快速連續點擊
          setIsClickLocked(true);

          console.log('🔄 [SyncStatusIndicator] 手動觸發同步');
          sync();
          toast.info('開始同步資料...', {
            duration: 2000,
            icon: '🔄',
          });
        }}
        disabled={status === SyncStatusEnum.SYNCING || isClickLocked}
        className={`relative flex items-center justify-center group p-2 transition-transform ${
          status !== SyncStatusEnum.SYNCING && !isClickLocked 
            ? 'hover:scale-110 cursor-pointer' 
            : 'cursor-wait opacity-75'
        }`}
        aria-label="同步狀態"
      >
        {/* 圓點 - 12px 呼吸燈 */}
        <div
          className={`w-3 h-3 rounded-full ${indicatorStyle.bg} ${indicatorStyle.animate} transition-all`}
        />

        {/* 擴散動畫（呼吸燈）- ✅ 同步中時始終顯示，不論 pendingCount */}
        {status === SyncStatusEnum.SYNCING && (
          <div
            className={`absolute inset-0 w-3 h-3 rounded-full ${indicatorStyle.bg} opacity-50 animate-ping`}
          />
        )}

        {/* 待同步數量徽章（僅當 > 0 時顯示） */}
        {pendingCount > 0 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#7B9FA6] rounded-full flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          </div>
        )}

        {/* Hover Tooltip - 增加「點擊同步」提示 */}
        <div className="absolute top-full mt-2 right-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          <div className="bg-[#3A3A3A] text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
            {(status === SyncStatusEnum.SYNCING || isClickLocked) && `同步中 (${pendingCount} 個事件)`}
            {status === SyncStatusEnum.SUCCESS && !isClickLocked && '已同步 · 點擊重新同步'}
            {status === SyncStatusEnum.ERROR && !isClickLocked && '同步失敗 · 點擊重試'}
            {status === SyncStatusEnum.OFFLINE && '離線模式'}
            {status === SyncStatusEnum.IDLE && !isClickLocked && pendingCount > 0 && `${pendingCount} 個待同步事件 · 點擊同步`}
            {status === SyncStatusEnum.IDLE && !isClickLocked && pendingCount === 0 && '無待同步事件 · 點擊檢查更新'}
          </div>
        </div>
      </button>

      {/* 大彈窗（僅當 pendingCount >= 5 時顯示） */}
      {showLargeDialog && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center px-6">
          <div className="bg-white rounded-[1.5rem] p-6 shadow-2xl max-w-sm w-full">
            {/* ✅ Debug 資訊 */}
            <div className="mb-2 p-2 bg-yellow-100 rounded text-xs">
              <div>pendingCount: {pendingCount}</div>
              <div>status: {status}</div>
              <div>uploadProgress: {uploadProgress ? `${uploadProgress.current}/${uploadProgress.total}` : 'null'}</div>
              <div>downloadProgress: {downloadProgress ? `${downloadProgress.current}/${downloadProgress.total}` : 'null'}</div>
            </div>

            {/* 標題 */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-[#3A3A3A]">正在同步資料</h3>
                <p className="text-sm text-[#6B6B6B]">請稍候，資料同步中...</p>
              </div>
            </div>

            {/* 進度條 */}
            <div className="space-y-3">
              {/* 上傳進度 */}
              {uploadProgress && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#6B6B6B]">上傳事件</span>
                    <span className="text-sm font-medium text-[#7B9FA6]">
                      {uploadProgress.current} / {uploadProgress.total}
                    </span>
                  </div>
                  <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#7B9FA6] to-[#D4A574] transition-all duration-300"
                      style={{
                        width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  {uploadProgress.currentItem && (
                    <p className="text-xs text-[#6B6B6B] mt-1 truncate">
                      {uploadProgress.currentItem}
                    </p>
                  )}
                </div>
              )}

              {/* 下載進度 */}
              {downloadProgress && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#6B6B6B]">
                      {downloadProgress.phase === 'snapshot' ? '載入快照' : '下載事件'}
                    </span>
                    <span className="text-sm font-medium text-[#7B9FA6]">
                      {downloadProgress.current} / {downloadProgress.total}
                    </span>
                  </div>
                  <div className="h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#D4A574] to-[#7B9FA6] transition-all duration-300"
                      style={{
                        width: `${(downloadProgress.current / downloadProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  {downloadProgress.currentItem && (
                    <p className="text-xs text-[#6B6B6B] mt-1 truncate">
                      {downloadProgress.currentItem}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 提示文字 */}
            <p className="text-xs text-[#6B6B6B] mt-4 text-center">
              💡 同步完成後會自動關閉
            </p>
          </div>
        </div>
      )}
    </>
  );
}
