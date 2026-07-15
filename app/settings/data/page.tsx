'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronRight, Cloud, Database, HardDrive, ShieldAlert, Wrench } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StateView } from '@/components/ui/StateView';
import { useUserRole } from '@/hooks/useUserRole';
import { clearLocalAppData } from '@/lib/settings/clear-local-app-data';
import { getLocalPendingWriteReport, type LocalPendingWriteReport } from '@/lib/sync/local-pending-write-report';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';

const DataCanonicalizationPanel = dynamic(
  () => import('@/components/settings/DataCanonicalizationPanel').then((module) => module.DataCanonicalizationPanel),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-card border border-primary/10 bg-white p-5 text-sm text-muted-foreground">
        正在載入資料檢查工具...
      </div>
    ),
  },
);

type ConfirmationKind = 'clear-local' | 'clear-online' | null;

export default function DataSettingsPage() {
  const { user } = useAuth();
  const { isStaff, isOwner, isLoading } = useUserRole();
  const [confirmation, setConfirmation] = useState<ConfirmationKind>(null);
  const [localPendingReport, setLocalPendingReport] = useState<LocalPendingWriteReport | null>(null);

  const requestClearLocal = async () => {
    const report = await getLocalPendingWriteReport(user?.id);
    setLocalPendingReport(report);
    setConfirmation('clear-local');
  };

  const confirmClearLocal = async () => {
    try {
      const cleared = await clearLocalAppData(user?.id, localPendingReport?.isClean === false);
      if (!cleared) {
        setConfirmation(null);
        toast.warning('偵測到新的未同步資料，已停止清除。請重新確認目前狀態。');
        return;
      }

      setConfirmation(null);
      toast.success('這台裝置的本機資料已清除');
      window.setTimeout(() => window.location.reload(), 800);
    } catch (clearError) {
      console.error('清除本地資料庫失敗:', clearError);
      toast.error('清除失敗，請稍後再試');
    }
  };

  const confirmClearOnline = async () => {
    if (!user) return;
    setConfirmation(null);
    const toastId = toast.loading('正在清除所有線上資料...');

    try {
      const { error } = await supabase.rpc('delete_current_user_app_data');
      if (error) throw error;

      toast.loading('雲端資料已清除，正在清除本地快取...', { id: toastId });
      await clearLocalAppData(user.id, true);
      toast.success('所有資料已清除，即將返回首頁', { id: toastId });
      window.setTimeout(() => window.location.assign('/'), 1200);
    } catch (clearError) {
      const message = clearError instanceof Error ? clearError.message : '請稍後再試';
      toast.error(`清除失敗：${message}`, { id: toastId });
    }
  };

  return (
    <SettingsPageShell
      title="資料與救援"
      description="先檢查與修復資料；只有確定要重新開始時，才使用頁面最下方的清除操作。"
      icon={Database}
      isStaff={isStaff}
      backHref="/settings"
    >
      {isLoading ? (
        <StateView title="正在確認資料權限" description="修復與清除工具只會提供給老闆帳號。" />
      ) : !isOwner ? (
        <StateView
          icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
          title="資料工具僅限老闆使用"
          description="員工資料由所屬團隊管理，避免從局部資料範圍執行錯誤修復。"
        />
      ) : (
        <div className="space-y-7">
          <section aria-labelledby="repair-tools-title">
            <h2 id="repair-tools-title" className="mb-2 px-1 text-xs font-semibold text-muted-foreground">檢查與修復</h2>
            <Link
              href="/recovery"
              className="flex min-h-[76px] items-center gap-3 rounded-card border border-primary/10 bg-white px-4 py-3 transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soft-green text-primary">
                <Wrench className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">資料修復與救援備份</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">檢查本機完整性、收入差距與統計投影。</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </section>

          <DataCanonicalizationPanel />

          <section className="border-t border-danger/20 pt-6" aria-labelledby="danger-zone-title">
            <div className="mb-4">
              <h2 id="danger-zone-title" className="text-base font-semibold text-danger">清除資料</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">以下操作可能造成資料遺失，系統會在執行前再次確認。</p>
            </div>

            <div className="divide-y divide-danger/10 rounded-card border border-danger/20 bg-white">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground">只清除這台裝置</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">已同步資料可從雲端重新下載；未同步內容會永久遺失。</p>
                    <Button className="mt-3 w-full sm:w-auto" variant="secondary" onClick={() => void requestClearLocal()}>
                      清除本機資料
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start gap-3">
                  <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-danger">永久刪除所有線上資料</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">會影響此帳號的所有裝置，並同時清除這台裝置的本機資料。</p>
                    <Button
                      className="mt-3 w-full sm:w-auto"
                      variant="danger"
                      disabled={!user}
                      onClick={() => setConfirmation('clear-online')}
                    >
                      永久刪除
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirmation === 'clear-local'}
        onClose={() => setConfirmation(null)}
        onConfirm={confirmClearLocal}
        title="清除這台裝置的資料？"
        description={localPendingReport?.isClean === false
          ? `偵測到 ${localPendingReport.pendingEventCount} 筆未同步事件、${localPendingReport.unfinishedSyncQueueCount} 筆同步工作，以及 ${localPendingReport.pendingSalesPhotoEvidenceCreationCount + localPendingReport.pendingSalesPhotoEvidencePayloadCount} 筆待處理照片。清除後，尚未送達雲端的內容將無法復原。`
          : '這會清除這台裝置上的市集、商品、統計與快取。已同步資料可在重新登入後從雲端取回。'}
        confirmLabel="清除本機資料"
        tone="danger"
        confirmationText={localPendingReport?.isClean === false ? '清除本機' : undefined}
      />

      <ConfirmDialog
        open={confirmation === 'clear-online'}
        onClose={() => setConfirmation(null)}
        onConfirm={confirmClearOnline}
        title="永久刪除所有線上資料？"
        description="所有市集、商品、事件、統計與各裝置的本機資料都會被清除，而且無法復原。"
        confirmLabel="永久刪除"
        tone="danger"
        confirmationText="DELETE"
      />
    </SettingsPageShell>
  );
}
