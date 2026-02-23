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
    downloadProgress 
  } = useSyncContext(); // ✅ 使用全局同步狀態

  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [showDownloadProgress, setShowDownloadProgress] = useState(false);

  // 監聽上傳進度
  useEffect(() => {
    if (uploadProgress && uploadProgress.total > 0) {
      setShowUploadProgress(true);
      
      // 上傳完成後 1 秒關閉
      if (uploadProgress.current >= uploadProgress.total) {
        setTimeout(() => {
          setShowUploadProgress(false);
        }, 1000);
      }
    }
  }, [uploadProgress]);

  // 監聽下載進度
  useEffect(() => {
    if (downloadProgress && downloadProgress.total > 0) {
      setShowDownloadProgress(true);
      
      // 下載完成後 1 秒關閉
      if (downloadProgress.current >= downloadProgress.total) {
        setTimeout(() => {
          setShowDownloadProgress(false);
        }, 1000);
      }
    }
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
