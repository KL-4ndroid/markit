/**
 * Initial Sync Dialog - 初始同步對話框
 * 
 * 在用戶登入後立即顯示，直到首次同步完成
 * 使用 sessionStorage 記錄是否已完成初始同步，避免刷新頁面時重複顯示
 */

'use client';

import { Fragment, useEffect, useState, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Cloud, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';
import { SyncStatus } from '@/hooks/useSync';
import { useSyncContext } from '@/lib/sync-context';
import { useRoleContext } from '@/lib/role-context';
import { resolveRoleMode } from '@/lib/auth/role-mode';
import { type CoordinatedOverlayProps } from '@/components/global-overlays/overlay-types';
import { getSessionStatePort } from '@/lib/platform/session-state-capability';

// 使用 sessionStorage 記錄是否已完成初始同步（會話級別，關閉瀏覽器後重置）
const INITIAL_SYNC_KEY = 'hasCompletedInitialSync';

function getHasCompletedInitialSync(key: string): boolean {
  return getSessionStatePort().read(key) === 'true';
}

function setHasCompletedInitialSync(key: string, value: boolean): void {
  getSessionStatePort().write(key, value.toString());
}

export function InitialSyncDialog({
  isSuppressed = false,
  onVisibilityChange,
}: CoordinatedOverlayProps) {
  const { user, isConfigured } = useAuth();
  const { userRole, roleRefreshState } = useRoleContext();
  const syncContext = useSyncContext(); // ✅ 使用全局同步狀態
  const { status, downloadProgress, sync } = syncContext;
  const isRoleReady = roleRefreshState.stage === 'ready';
  const roleMode = resolveRoleMode(userRole);
  const initialSyncKey = user ? `${INITIAL_SYNC_KEY}:${user.id}:${roleMode}` : INITIAL_SYNC_KEY;
  const shouldOpenInitially = Boolean(
    user
    && isConfigured
    && isRoleReady
    && !getHasCompletedInitialSync(initialSyncKey)
  );

  // This overlay mounts with the protected app after role resolution. Derive
  // its first frame synchronously so the dashboard cannot paint once and then
  // be covered by the initial-sync dialog in a later effect.
  const [isOpen, setIsOpen] = useState(shouldOpenInitially);
  const [, setHasCompletedInitialSyncState] = useState(false);
  const hasSeenSuccessRef = useRef(false); // ✅ 使用 ref 避免觸發重新渲染
  const [isTakingLonger, setIsTakingLonger] = useState(false);

  useEffect(() => {
    onVisibilityChange?.(isOpen);
  }, [isOpen, onVisibilityChange]);

  useEffect(() => () => onVisibilityChange?.(false), [onVisibilityChange]);

  // 監聽用戶登入
  useEffect(() => {
    if (!user || !isConfigured || !isRoleReady) {
      setIsOpen(false);
      setHasCompletedInitialSyncState(false);
      hasSeenSuccessRef.current = false;
      return;
    }

    const completed = getHasCompletedInitialSync(initialSyncKey);
    setHasCompletedInitialSyncState(completed);
    hasSeenSuccessRef.current = false;

    if (!completed) {
      // 用戶剛登入且未完成初始同步，顯示對話框
      setIsOpen(true);
    }
  }, [user, isConfigured, isRoleReady, initialSyncKey]);

  // 監聽同步狀態
  useEffect(() => {
    // ✅ 只在第一次看到 SUCCESS 時關閉，忽略後續的狀態變化
    if (status === SyncStatus.SUCCESS && isOpen && !hasSeenSuccessRef.current) {
      hasSeenSuccessRef.current = true;
      const timeoutId = setTimeout(() => {
        setIsOpen(false);
        setHasCompletedInitialSyncState(true);
        setHasCompletedInitialSync(initialSyncKey, true);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }

    // Slow or failed recovery is never persisted as successful completion.
    if (status === SyncStatus.SYNCING && isOpen && !hasSeenSuccessRef.current) {
      setIsTakingLonger(false);
      const timeoutId = setTimeout(() => {
        setIsTakingLonger(true);
      }, 30000);

      return () => clearTimeout(timeoutId);
    }
  }, [status, isOpen, initialSyncKey]);

  // 獲取當前階段描述
  const getPhaseDescription = () => {
    if (status === SyncStatus.SYNCING && downloadProgress) {
      return downloadProgress.currentItem ?? '正在整理歷史紀錄…';
    }

    if (status === SyncStatus.SUCCESS) {
      return '數據載入完成！';
    }

    if (status === SyncStatus.ERROR) {
      return '資料尚未載入完成，請重試或先查看本機資料。';
    }
    if (status === SyncStatus.OFFLINE) return '目前無法連線，請連線後重新載入。';

    return '正在準備數據...';
  };

  // 獲取進度信息
  const getProgressInfo = () => {
    if (downloadProgress && downloadProgress.total > 0) {
      const percentage = Math.round((downloadProgress.current / downloadProgress.total) * 100);
      return {
        percentage,
        text: `${downloadProgress.current} / ${downloadProgress.total}`,
      };
    }
    return null;
  };

  const progressInfo = getProgressInfo();

  return (
    <Transition appear show={isOpen && !isSuppressed} as={Fragment}>
      <Dialog as="div" className="relative z-dialog" onClose={() => {}}>
        {/* 背景遮罩 */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        {/* 對話框容器 */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-8 shadow-2xl transition-all">
                <div className="flex flex-col items-center">
                  {/* 圖示 */}
                  <div className={`mb-6 p-5 rounded-full ${
                    status === SyncStatus.SUCCESS 
                      ? 'bg-soft-green' 
                      : status === SyncStatus.ERROR
                      ? 'bg-soft-pink'
                      : 'bg-gradient-to-br from-primary/10 to-secondary/10'
                  }`}>
                    {status === SyncStatus.SUCCESS ? (
                      <CheckCircle className="w-12 h-12 text-primary" />
                    ) : status === SyncStatus.ERROR ? (
                      <Cloud className="w-12 h-12 text-danger" />
                    ) : (
                      <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    )}
                  </div>

                  {/* 標題 */}
                  <Dialog.Title className="text-xl font-medium text-foreground mb-3 text-center">
                    {status === SyncStatus.SUCCESS 
                      ? '歡迎回來！' 
                      : status === SyncStatus.ERROR
                      ? '載入失敗'
                      : '載入數據中'
                    }
                  </Dialog.Title>

                  {/* 描述 */}
                  <p className="text-sm text-muted-foreground mb-6 text-center">
                    {getPhaseDescription()}
                  </p>

                  {/* 進度條（僅在同步中顯示） */}
                  {status === SyncStatus.SYNCING && progressInfo && (
                    <div className="w-full mb-6">
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                          style={{ width: `${progressInfo.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        {progressInfo.text}
                      </p>
                    </div>
                  )}

                  {/* 提示文字 */}
                  {status === SyncStatus.SYNCING && (
                    <div className="bg-cat-clothing rounded-xl p-4 w-full">
                      <p className="text-xs text-muted-foreground text-center">
                        {isTakingLonger ? '資料較多或連線較慢，目前仍在處理；請保持此頁開啟。' : '首次登入需要整理歷史紀錄，完成後會自動開啟。'}
                      </p>
                    </div>
                  )}

                  {/* 成功提示 */}
                  {status === SyncStatus.SUCCESS && (
                    <div className="bg-soft-green rounded-xl p-4 w-full">
                      <p className="text-sm text-primary text-center font-medium">
                        ✓ 數據已同步完成
                      </p>
                    </div>
                  )}

                  {/* 錯誤提示 */}
                  {status === SyncStatus.ERROR && (
                    <div className="bg-soft-pink rounded-xl p-4 w-full">
                      <p className="text-sm text-danger text-center">
                        資料尚未載入完整，本機已儲存的資料仍會保留。
                      </p>
                    </div>
                  )}
                  {(status === SyncStatus.ERROR || status === SyncStatus.OFFLINE || isTakingLonger) && (
                    <div className="mt-4 flex w-full flex-col gap-2">
                      {status !== SyncStatus.SYNCING && <button type="button" onClick={() => { hasSeenSuccessRef.current = false; sync(); }} className="min-h-11 rounded-xl bg-primary px-4 text-white">重新載入</button>}
                      <button type="button" onClick={() => setIsOpen(false)} className="min-h-11 rounded-xl border border-border px-4 text-foreground">先查看本機資料</button>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
