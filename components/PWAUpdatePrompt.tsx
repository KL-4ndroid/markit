/**
 * PWA 更新提示組件
 * 當有新版本可用時，顯示友好的更新提示
 */

'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { type CoordinatedOverlayProps } from '@/components/global-overlays/overlay-types';

export function PWAUpdatePrompt({
  isSuppressed = false,
  onVisibilityChange,
}: CoordinatedOverlayProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    onVisibilityChange?.(showPrompt);
  }, [onVisibilityChange, showPrompt]);

  useEffect(() => () => onVisibilityChange?.(false), [onVisibilityChange]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // 監聽更新事件
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // 檢查更新
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 有新版本可用
                setShowPrompt(true);
              }
            });
          }
        });

        // 定期檢查更新（每 30 分鐘）
        const checkInterval = setInterval(() => {
          reg.update();
        }, 30 * 60 * 1000);

        return () => clearInterval(checkInterval);
      });

      // 監聽 SW 控制權變更
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (!registration || !registration.waiting) return;

    setIsUpdating(true);

    // 告訴新的 SW 跳過等待
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // 等待控制權變更後會自動重新載入
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || isSuppressed) {
    return null;
  }

  return (
    <>
      {/* 背景遮罩 */}
      <div className="fixed inset-0 z-overlay bg-black/50" />

      {/* 更新提示卡片 */}
      <div className="fixed inset-x-4 top-1/2 z-dialog mx-auto max-w-sm -translate-y-1/2">
        <div className="bg-white rounded-[2rem] p-6 shadow-2xl shadow-primary/30 animate-in fade-in zoom-in duration-300">
          {/* 圖標 */}
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-white" />
          </div>

          {/* 標題 */}
          <h3 className="text-xl font-bold text-foreground text-center mb-2">
            發現新版本！
          </h3>

          {/* 描述 */}
          <p className="text-sm text-muted-foreground text-center mb-6">
            Féria 有新版本可用，包含功能改進和錯誤修復。
            <br />
            建議立即更新以獲得最佳體驗。
          </p>

          {/* 按鈕組 */}
          <div className="space-y-3">
            {/* 立即更新按鈕 */}
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="w-full bg-gradient-to-r from-primary to-primary/85 text-white px-6 py-4 rounded-2xl font-medium hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUpdating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>更新中...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  <span>立即更新</span>
                </>
              )}
            </button>

            {/* 稍後提醒按鈕 */}
            <button
              onClick={handleDismiss}
              disabled={isUpdating}
              className="w-full bg-neutral-alt text-muted-foreground px-6 py-4 rounded-2xl font-medium hover:bg-border-hairline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              稍後提醒
            </button>
          </div>

          {/* 提示文字 */}
          <p className="text-xs text-muted-foreground text-center mt-4 opacity-60">
            更新過程約需 3-5 秒
          </p>
        </div>
      </div>
    </>
  );
}
