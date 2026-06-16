'use client';

import { useState } from 'react';
import { Eye, Lock, RefreshCw, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/supabase/auth-context';
import { useUserRole } from '@/hooks/useUserRole';
import {
  repairOwnerRevenueGaps,
  type OwnerRevenueGapRepairResult,
} from '@/lib/sync/owner-revenue-gap-repair';

type PanelState = 'idle' | 'checking' | 'preview' | 'executing';

function formatMoney(value: number): string {
  return value.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

export function OwnerRevenueGapRepairPanel() {
  const { user } = useAuth();
  const { isStaff, isLoading: isRoleLoading } = useUserRole();
  const [state, setState] = useState<PanelState>('idle');
  const [previewResult, setPreviewResult] = useState<OwnerRevenueGapRepairResult | null>(null);

  const isLoggedIn = !!user;
  const isBlocked = !isLoggedIn || isRoleLoading || isStaff;

  const handleDryRun = async () => {
    if (!user) {
      toast.error('請先登入');
      return;
    }
    if (isRoleLoading) {
      toast.error('角色權限確認中，請稍候');
      return;
    }
    if (isStaff) {
      toast.error('員工帳號不能執行收入修復');
      return;
    }

    setState('checking');
    setPreviewResult(null);

    try {
      const result = await repairOwnerRevenueGaps({
        ownerId: user.id,
        dryRun: true,
      });

      setPreviewResult(result);
      setState('preview');

      if (result.repaired.length === 0 && result.skipped.length === 0) {
        toast.success('掃描完成，沒有需要修復的市場');
      } else if (result.repaired.length === 0) {
        toast.info('掃描完成，沒有符合安全修復條件的市場');
      } else {
        toast.success(`掃描完成，發現 ${result.repaired.length} 個市場可修復，${result.skipped.length} 個略過`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '預覽失敗');
      setState('idle');
    }
  };

  const handleExecute = async () => {
    if (!user) {
      toast.error('請先登入');
      return;
    }
    if (isRoleLoading) {
      toast.error('角色權限確認中，請稍候');
      return;
    }
    if (isStaff) {
      toast.error('員工帳號不能執行收入修復');
      return;
    }
    if (!previewResult) return;

    const confirmed = window.confirm(
      `即將修復 ${previewResult.repaired.length} 個市場的本機收入資料。\n\n` +
        `此操作會從雲端重新下載 ${previewResult.repaired.reduce((s, m) => s + m.replayedEvents, 0)} 個 deal_closed 事件，並只重建本機統計。\n\n` +
        '不會修改雲端資料，也不會刪除事件。是否繼續？'
    );
    if (!confirmed) return;

    setState('executing');

    try {
      const result = await repairOwnerRevenueGaps({
        ownerId: user.id,
        dryRun: false,
        marketIds: previewResult.repaired.map(r => r.marketId),
      });

      const repairedCount = result.repaired.length;

      if (repairedCount > 0) {
        toast.success(`已修復 ${repairedCount} 個市場，請重新整理頁面確認收入`);
      } else {
        toast.info('沒有市場需要修復');
      }

      setPreviewResult(null);
      setState('idle');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '修復失敗');
      setState('idle');
    }
  };

  const handleCancel = () => {
    setPreviewResult(null);
    setState('idle');
  };

  if (!isLoggedIn) {
    return (
      <BlockedPanel
        icon={<Lock size={20} />}
        title="收入差距修復"
        message="請先登入老闆帳號，才能檢查雲端事件與本機收入是否一致。"
      />
    );
  }

  if (isRoleLoading) {
    return (
      <BlockedPanel
        icon={<RefreshCw size={20} className="animate-spin" />}
        title="收入差距修復"
        message="正在確認角色權限，請稍候。"
      />
    );
  }

  if (isStaff) {
    return (
      <BlockedPanel
        icon={<Lock size={20} />}
        title="收入差距修復"
        message="員工帳號無法執行資料修復。請改用老闆帳號操作。"
        danger
      />
    );
  }

  const isBusy = state === 'checking' || state === 'executing';
  const hasPreview = state === 'preview' && previewResult !== null;
  const hasRepairs = previewResult && previewResult.repaired.length > 0;

  return (
    <section className="w-full border border-[#E8E3D8] bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              hasRepairs ? 'bg-soft-green text-[#4D7F87]' : 'bg-[#F0ECE4] text-muted-foreground'
            }`}
          >
            {hasRepairs ? <Zap size={20} /> : <RefreshCw size={20} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">收入差距修復</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              用於新裝置或重新登入後，本機收入低於雲端 deal_closed 事件的情況。工具會先預覽可修復市場，執行時只重建本機資料，不修改雲端。
            </p>
          </div>
        </div>

        {hasPreview && previewResult && (
          <div className="space-y-2 rounded-md border border-[#E8E3D8] bg-background p-3 text-sm">
            {previewResult.repaired.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-[#4D7F87]">可修復 ({previewResult.repaired.length})</p>
                {previewResult.repaired.map(r => (
                  <div key={r.marketId} className="pl-2 text-muted-foreground">
                    {r.marketId.slice(0, 8)}... 收入 {formatMoney(r.localRevenueBefore)} → {formatMoney(r.localRevenueAfter)}，
                    重放 {r.replayedEvents} 筆事件
                  </div>
                ))}
              </div>
            )}
            {previewResult.skipped.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-muted-foreground">略過 ({previewResult.skipped.length})</p>
                {previewResult.skipped.slice(0, 5).map(s => (
                  <div key={s.marketId} className="pl-2 text-[#9B9B9B]">
                    {s.marketId.slice(0, 8)}... — {s.reason}
                  </div>
                ))}
                {previewResult.skipped.length > 5 && (
                  <div className="pl-2 text-[#9B9B9B]">
                    ...還有 {previewResult.skipped.length - 5} 個
                  </div>
                )}
              </div>
            )}
            {previewResult.warnings.length > 0 && (
              <div>
                {previewResult.warnings.map((warning, index) => (
                  <p key={index} className="text-amber-700">{warning}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {state === 'idle' && (
            <button
              type="button"
              onClick={handleDryRun}
              disabled={isBlocked}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#D8D0C3] px-3 text-sm font-medium text-foreground hover:bg-[#F5F3EE] disabled:opacity-50"
            >
              <Eye size={16} />
              預覽修復範圍
            </button>
          )}

          {state === 'checking' && (
            <BusyButton label="掃描中..." />
          )}

          {hasPreview && (
            <>
              {hasRepairs && (
                <button
                  type="button"
                  onClick={handleExecute}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-secondary px-3 text-sm font-medium text-white hover:bg-[#C4935F] disabled:opacity-50"
                >
                  <Zap size={16} />
                  執行修復 ({previewResult.repaired.length})
                </button>
              )}
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-[#D8D0C3] px-3 text-sm font-medium text-foreground hover:bg-[#F5F3EE]"
              >
                取消
              </button>
            </>
          )}

          {state === 'executing' && (
            <BusyButton label="修復中..." filled />
          )}
        </div>
      </div>
    </section>
  );
}

function BlockedPanel({
  icon,
  title,
  message,
  danger = false,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  danger?: boolean;
}) {
  return (
    <section className="w-full border border-[#E8E3D8] bg-white px-4 py-4 shadow-sm opacity-70">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          danger ? 'bg-soft-pink text-[#B85C5C]' : 'bg-[#F0ECE4] text-muted-foreground'
        }`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </section>
  );
}

function BusyButton({ label, filled = false }: { label: string; filled?: boolean }) {
  return (
    <button
      type="button"
      disabled
      className={`inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium opacity-50 ${
        filled
          ? 'bg-secondary text-white'
          : 'border border-[#D8D0C3] text-muted-foreground'
      }`}
    >
      <RefreshCw size={16} className="animate-spin" />
      {label}
    </button>
  );
}
