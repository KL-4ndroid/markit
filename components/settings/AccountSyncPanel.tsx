'use client';

import Link from 'next/link';
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Crown,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  User,
  WifiOff,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SyncStatus } from '@/hooks/useSync';
import { useUserRole } from '@/hooks/useUserRole';
import { isSignOutBlockedByLocalChanges } from '@/lib/auth/signout-confirmation';
import { useSyncContext } from '@/lib/sync-context';
import { useAuth } from '@/lib/supabase/auth-context';
import type { LocalPendingWriteReport } from '@/lib/sync/local-pending-write-report';

function formatLastSync(lastSyncAt: number | null): string {
  if (!lastSyncAt) return '尚未同步';
  const diff = Math.max(0, Date.now() - lastSyncAt);
  if (diff < 60_000) return '剛剛';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分鐘前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小時前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}

function getSyncPresentation(status: SyncStatus, isOnline: boolean) {
  if (!isOnline || status === SyncStatus.OFFLINE) {
    return { label: '離線使用中', Icon: CloudOff, tone: 'text-muted-foreground bg-muted/60' };
  }
  if (status === SyncStatus.SYNCING) {
    return { label: '同步中', Icon: Loader2, tone: 'text-primary bg-primary/10' };
  }
  if (status === SyncStatus.ERROR) {
    return { label: '同步需要重試', Icon: WifiOff, tone: 'text-danger bg-status-danger-bg' };
  }
  if (status === SyncStatus.SUCCESS) {
    return { label: '已同步', Icon: CheckCircle2, tone: 'text-primary bg-soft-green' };
  }
  return { label: '等待同步', Icon: Cloud, tone: 'text-muted-foreground bg-muted/60' };
}

export function AccountSyncPanel() {
  const { user, signOut, isConfigured } = useAuth();
  const { userRole, isStaff } = useUserRole();
  const { status, lastSyncAt, pendingCount, error, sync, isOnline } = useSyncContext();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [blockedReport, setBlockedReport] = useState<LocalPendingWriteReport | null>(null);
  const syncPresentation = getSyncPresentation(status, isOnline);
  const StatusIcon = syncPresentation.Icon;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      toast.success('已登出');
    } catch (signOutError) {
      if (isSignOutBlockedByLocalChanges(signOutError)) {
        setBlockedReport(signOutError.result.finalReport);
      } else {
        const message = signOutError instanceof Error ? signOutError.message : '請稍後再試';
        toast.error(`登出失敗：${message}`);
      }
    } finally {
      setIsSigningOut(false);
    }
  };

  const confirmForceSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({ forceDiscardLocalChanges: true });
      setBlockedReport(null);
      toast.success('已登出');
    } catch (signOutError) {
      const message = signOutError instanceof Error ? signOutError.message : '請稍後再試';
      toast.error(`登出失敗：${message}`);
    } finally {
      setIsSigningOut(false);
    }
  };

  const openLogin = () => {
    window.dispatchEvent(new CustomEvent('auth:open-login', { detail: { mode: 'login' } }));
  };

  if (!isConfigured || !user) {
    return (
      <section className="rounded-card border border-primary/10 bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">尚未登入</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">登入後可在不同裝置同步市集與商品資料。</p>
          </div>
        </div>
        {isConfigured && (
          <Button className="mt-4 w-full sm:w-auto" leadingIcon={<LogIn className="h-4 w-4" />} onClick={openLogin}>
            登入或註冊
          </Button>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-primary/10 bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">登入帳號</h2>
            <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {isStaff ? `團隊身分：${userRole.staffRole ?? 'viewer'}` : '帳號身分：老闆'}
            </p>
          </div>
        </div>
        {!isStaff && (
          <Link
            href="/subscription"
            className="mt-4 flex min-h-11 items-center justify-between rounded-control border border-primary/15 px-4 text-sm font-medium text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex items-center gap-2"><Crown className="h-4 w-4 text-primary" />查看方案</span>
            <span className="text-xs text-muted-foreground">免費版</span>
          </Link>
        )}
      </section>

      <section className="rounded-card border border-primary/10 bg-white p-5" aria-labelledby="sync-status-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="sync-status-title" className="text-base font-semibold text-foreground">雲端同步</h2>
            <p className="mt-1 text-sm text-muted-foreground">本機操作會先保存，再於連線時送往雲端。</p>
          </div>
          <span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${syncPresentation.tone}`}>
            <StatusIcon className={`h-4 w-4 ${status === SyncStatus.SYNCING ? 'animate-spin' : ''}`} aria-hidden="true" />
            {syncPresentation.label}
          </span>
        </div>

        <dl className="mt-5 divide-y divide-primary/10 border-y border-primary/10 text-sm">
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-muted-foreground">最後同步</dt>
            <dd className="font-medium text-foreground">{formatLastSync(lastSyncAt)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-muted-foreground">待同步項目</dt>
            <dd className="font-medium text-foreground">{pendingCount} 筆</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-muted-foreground">網路</dt>
            <dd className="font-medium text-foreground">{isOnline ? '已連線' : '離線'}</dd>
          </div>
        </dl>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <Button
          className="mt-4 w-full sm:w-auto"
          variant="secondary"
          isLoading={status === SyncStatus.SYNCING}
          disabled={!isOnline}
          leadingIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          onClick={() => void sync()}
        >
          立即同步
        </Button>
      </section>

      <section className="border-t border-primary/10 pt-5">
        <h2 className="text-base font-semibold text-foreground">結束這次使用</h2>
        <p className="mt-1 text-sm text-muted-foreground">登出前會先檢查尚未送達雲端的資料。</p>
        <Button
          className="mt-4 w-full sm:w-auto"
          variant="secondary"
          isLoading={isSigningOut}
          leadingIcon={<LogOut className="h-4 w-4 text-danger" aria-hidden="true" />}
          onClick={() => void handleSignOut()}
        >
          登出
        </Button>
      </section>

      <ConfirmDialog
        open={blockedReport !== null}
        onClose={() => setBlockedReport(null)}
        onConfirm={() => void confirmForceSignOut()}
        title="仍有資料尚未同步"
        description={blockedReport
          ? `目前有 ${blockedReport.pendingEventCount} 筆事件、${blockedReport.unfinishedSyncQueueCount} 筆同步工作，以及 ${blockedReport.pendingSalesPhotoEvidenceCreationCount + blockedReport.pendingSalesPhotoEvidencePayloadCount} 筆照片資料尚未送達雲端。強制登出會捨棄這些本機內容。`
          : ''}
        confirmLabel="捨棄並登出"
        tone="danger"
        confirmationText="登出"
      />
    </div>
  );
}
