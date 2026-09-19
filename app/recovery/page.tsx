'use client';

import Link from 'next/link';
import { ArrowLeft, Database, ShieldAlert } from 'lucide-react';
import { DatabaseRecoveryPanel } from '@/components/common/DatabaseRecoveryPanel';
import { ImportSafetyStatusPanel } from '@/components/common/ImportSafetyStatusPanel';
import { LocalProjectionRepairPanel } from '@/components/common/LocalProjectionRepairPanel';
import { OwnerRevenueGapRepairPanel } from '@/components/common/OwnerRevenueGapRepairPanel';
import { OwnerPendingOperationDiagnosticsPanel } from '@/components/common/OwnerPendingOperationDiagnosticsPanel';
import { useRoleContext } from '@/lib/role-context';
import { deriveRoleCapabilities, hasCapability } from '@/lib/permissions/role-capabilities';

export default function RecoveryPage() {
  const { userRole, isOwner, isLoading: isRoleLoading } = useRoleContext();
  const roleCapabilities = deriveRoleCapabilities({
    isOwner,
    staffRole: userRole.staffRole,
  });
  const canUseRepairTools =
    !isRoleLoading && hasCapability(roleCapabilities, 'canUseRepairTools');

  if (isRoleLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <Link
            href="/settings/data"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"
          >
            <ArrowLeft size={16} />
            返回資料與救援
          </Link>
          <section className="japanese-surface-card px-4 py-5 text-sm text-muted-foreground">
            正在確認修復工具權限...
          </section>
        </div>
      </div>
    );
  }

  if (!canUseRepairTools) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          <Link
            href="/settings/data"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"
          >
            <ArrowLeft size={16} />
            返回資料與救援
          </Link>
          <section className="japanese-surface-card px-4 py-5 text-sm text-muted-foreground">
            <div className="mb-3 flex items-center gap-3 text-foreground">
              <ShieldAlert className="h-5 w-5 text-danger" />
              <h1 className="text-lg font-semibold">只有工作區擁有者可以使用修復工具</h1>
            </div>
            <p>
              這些操作可能重建裝置上的統計或修補收入資料。為避免使用不完整的資料進行修復，團隊成員不會載入這個頁面。
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className="japanese-surface-card flex items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <Link
              href="/settings/data"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground"
            >
              <ArrowLeft size={16} />
              返回資料與救援
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft-green text-info">
                <Database size={22} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-foreground">資料修復</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  這裡只處理本機資料健康、收入同步落差與統計投影異常。執行修復前會先提供預覽或備份，避免誤改資料。
                </p>
              </div>
            </div>
          </div>
        </header>

        <DatabaseRecoveryPanel />

        <OwnerRevenueGapRepairPanel />

        <details className="japanese-surface-card group px-4 py-4">
          <summary className="cursor-pointer text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35">
            進階診斷
          </summary>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            僅在一般檢查無法排除問題，或依客服指示時使用以下工具。
          </p>
          <div className="mt-4 space-y-4">
            <ImportSafetyStatusPanel />
            <OwnerPendingOperationDiagnosticsPanel />
            <LocalProjectionRepairPanel />
          </div>
        </details>

        <section className="japanese-surface-card px-4 py-4 text-sm text-muted-foreground">
          <h2 className="mb-2 text-base font-semibold text-foreground">使用建議</h2>
          <ol className="list-decimal space-y-2 pl-5">
            <li>先按「檢查」確認這台裝置的資料狀態；只有檢查顯示異常時才執行修復。</li>
            <li>若新裝置或無痕登入後收入為 0 或與雲端不一致，先使用「收入差距修復」。</li>
            <li>若收入數字重複增加，請展開「進階診斷」並依檢查結果修復統計。</li>
            <li>修復完成後重新整理頁面，再檢查市集詳情與分析頁的數字是否一致。</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
