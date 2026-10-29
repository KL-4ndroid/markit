'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { AlertTriangle, LogIn, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/supabase/auth-context';
import {
  AUTH_CACHE_BLOCKED_EVENT,
  canResumeBlockedAuth,
  type AuthCacheBlockedEventDetail,
} from '@/lib/auth/auth-cache-blocked-events';

function getTitle(action: AuthCacheBlockedEventDetail['action']): string {
  if (action === 'staff_status_reset') return '本機資料已保留';
  if (action === 'identity_switch') return '暫時無法切換帳號';
  return '登入已過期，資料已保留';
}

export function AuthCacheBlockedDialog() {
  const { signOut, user } = useAuth();
  const [detail, setDetail] = useState<AuthCacheBlockedEventDetail | null>(null);
  const [isDiscarding, setIsDiscarding] = useState(false);

  useEffect(() => {
    if (canResumeBlockedAuth(detail, user?.id)) setDetail(null);
  }, [detail, user?.id]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<AuthCacheBlockedEventDetail>;
      setDetail(customEvent.detail);
    };

    window.addEventListener(AUTH_CACHE_BLOCKED_EVENT, handler);
    return () => window.removeEventListener(AUTH_CACHE_BLOCKED_EVENT, handler);
  }, []);

  const handleLogin = () => {
    window.dispatchEvent(new CustomEvent('auth:open-login', { detail: { mode: 'login' } }));
  };

  const handleDiscard = async () => {
    setIsDiscarding(true);
    try {
      await signOut({ forceDiscardLocalChanges: true });
      setDetail(null);
      toast.success('已捨棄本機變更');
    } catch (error: any) {
      toast.error(error?.message || '無法捨棄本機變更');
    } finally {
      setIsDiscarding(false);
    }
  };

  return (
    <Dialog open={!!detail} onClose={() => {}} className="relative z-[70]">
      <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-soft-pink">
              <AlertTriangle className="h-6 w-6 text-danger" />
            </div>
          </div>

          <DialogTitle className="text-center text-lg font-semibold text-foreground">
            {detail ? getTitle(detail.action) : '本機資料已保留'}
          </DialogTitle>

          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>這台裝置仍有尚未送達雲端的資料。請使用原帳號繼續處理。</p>
            <div className="rounded-xl bg-background p-3 text-foreground">
              <p>待同步紀錄：{detail?.pendingEventCount ?? 0} 筆</p>
              <p>未完成同步工作：{detail?.unfinishedSyncQueueCount ?? 0} 筆</p>
              <p>待補成交照片：{detail?.pendingSalesPhotoEvidenceCreationCount ?? 0} 筆</p>
              <p>留在本機的原圖：{detail?.pendingSalesPhotoEvidencePayloadCount ?? 0} 張</p>
              {(detail?.pendingMarketJournalDraftCount ?? 0) > 0 && <p>{detail?.pendingMarketJournalDraftCount} 篇私人心得草稿。請回到出攤心得儲存；一般同步不會送出草稿。</p>}
              {(detail?.pendingMarketCashDraftCount ?? 0) > 0 && <p>{detail?.pendingMarketCashDraftCount} 份現金草稿。請回市集的開／收攤現金儲存，或到帳號同步設定處理；一般同步不會送出草稿。</p>}
            </div>
            <p>
              重新登入不會刪除這些資料。只有確定不再需要時，才選擇捨棄本機變更。
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={handleLogin}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/85"
            >
              <LogIn className="h-4 w-4" />
              使用原帳號登入
            </button>

            <button
              type="button"
              onClick={handleDiscard}
              disabled={isDiscarding}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/25 px-4 py-3 text-sm font-medium text-danger transition-colors hover:bg-soft-pink disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {isDiscarding ? '正在捨棄…' : '捨棄本機變更'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
