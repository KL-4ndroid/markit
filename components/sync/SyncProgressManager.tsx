/**
 * Sync Progress Manager - 同步進度管理組件
 * 
 * 監聽同步狀態並顯示進度對話框
 */

'use client';

import { useEffect, useState } from 'react';
import { SyncStatus } from '@/hooks/useSync';
import { useSyncContext } from '@/lib/sync-context';
import { SyncProgressDialog } from '@/components/sync/SyncProgressDialog';

export function SyncProgressManager() {
  const { 
    status, 
    uploadProgress, 
    downloadProgress,
    pendingCount, // ✅ 獲取待同步事件數量
  } = useSyncContext(); // ✅ 使用全局同步狀態

  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);

  // ✅ Debug Log
  useEffect(() => {
    console.log('🔍 [SyncProgressManager] 狀態:', {
      pendingCount,
      uploadProgress,
      downloadProgress,
      showUploadProgress,
      showDownloadProgress,
    });
  }, [pendingCount, uploadProgress, downloadProgress, showUploadProgress, showDownloadProgress]);

  // 監聽上傳進度
  useEffect(() => {
    // ✅ 只有當 pendingCount >= 5 時才顯示大彈窗
    if (uploadProgress && uploadProgress.total > 0 && pendingCount >= 5) {
      console.log('📱 [SyncProgressManager] 顯示上傳彈窗:', { pendingCount, total: uploadProgress.total });
      setShowUploadProgress(true);
      
      // 上傳完成後 1 秒關閉
      if (uploadProgress.current >= uploadProgress.total) {
        setTimeout(() => {
          console.log('✅ [SyncProgressManager] 關閉上傳彈窗');
          setShowUploadProgress(false);
        }, 1000);
      }
    } else if (uploadProgress && uploadProgress.total > 0 && pendingCount < 5) {
      console.log('🟢 [SyncProgressManager] 無聲模式，不顯示上傳彈窗:', { pendingCount });
      setShowUploadProgress(false);
    }
  }, [uploadProgress, pendingCount]);

  // 監聽下載進度
  useEffect(() => {
    // 初次同步由 InitialSyncDialog 顯示；後續下載同步應在背景完成，不打斷使用者。
    // 保留 downloadProgress 資料給狀態列/初始同步視窗使用，但不再開第二個大彈窗。
    setShowDownloadProgress(false);
  }, [downloadProgress]);

  return (
    <>
      {/* 上傳進度對話框 */}
      {uploadProgress && (
        <SyncProgressDialog
          isOpen={showUploadProgress}
          type="upload"
          current={uploadProgress.current}
          total={uploadProgress.total}
          currentItem={uploadProgress.currentItem}
        />
      )}

      {/* 下載進度對話框 */}
      {downloadProgress && (
        <SyncProgressDialog
          isOpen={showDownloadProgress}
          type="download"
          current={downloadProgress.current}
          total={downloadProgress.total}
          currentItem={downloadProgress.currentItem}
          phase={downloadProgress.phase}
        />
      )}
    </>
  );
}
