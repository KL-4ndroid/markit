'use client';

import { useState } from 'react';
import { Calculator, Eye, Lock, RefreshCw, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/supabase/auth-context';
import { useRoleContext } from '@/lib/role-context';
import {
  repairMarketProjectionsFromEvents,
  type MarketProjectionRepairResult,
} from '@/lib/projections/market-projection-service';

type PanelState = 'idle' | 'checking' | 'preview' | 'executing';

function formatMoney(value: number): string {
  return value.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

export function LocalProjectionRepairPanel() {
  const { user } = useAuth();
  const { isStaff, isLoading: isRoleLoading } = useRoleContext();
  const [state, setState] = useState<PanelState>('idle');
  const [previewResult, setPreviewResult] = useState<MarketProjectionRepairResult | null>(null);

  const assertOwnerCanRun = (): boolean => {
    if (!user) {
      toast.error('請先登入');
      return false;
    }
    if (isRoleLoading) {
      toast.error('角色權限確認中，請稍候');
      return false;
    }
    if (isStaff) {
      toast.error('員工帳號不能執行資料修復');
      return false;
    }
    return true;
  };

  const handleDryRun = async () => {
    if (!assertOwnerCanRun()) return;

    setState('checking');
    setPreviewResult(null);

    try {
      const result = await repairMarketProjectionsFromEvents({
        dryRun: true,
      });
      setPreviewResult(result);
      setState('preview');

      if (result.repaired.length === 0) {
        toast.info('沒有發現需要重建的本機統計投影');
      } else {
        toast.success(`預覽完成，${result.repaired.length} 個市場可修復`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '預覽失敗');
      setState('idle');
    }
  };

  const handleExecute = async () => {
    if (!assertOwnerCanRun()) return;
    if (!previewResult || previewResult.repaired.length === 0) return;

    const marketIds = previewResult.repaired.map(item => item.marketId);
    const confirmed = window.confirm(
      `即將修復 ${marketIds.length} 個市場的本機統計投影。\n\n` +
        '此操作只會重算本機 IndexedDB 的 markets / dailyStats，不會修改雲端，也不會新增或刪除 events。\n\n' +
        '是否繼續？'
    );
    if (!confirmed) return;

    setState('executing');

    try {
      const result = await repairMarketProjectionsFromEvents({
        marketIds,
        dryRun: false,
      });

      setPreviewResult(result);
      setState('preview');
      toast.success(`已修復 ${result.repaired.length} 個市場，請重新整理頁面確認收入`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '修復失敗');
      setState('preview');
    }
  };

  const handleCancel = () => {
    setPreviewResult(null);
    setState('idle');
  };

  if (!user) {
    return (
      <BlockedPanel
        icon={<Lock size={20} />}
        title="本機統計投影修復"
        message="請先登入老闆帳號，才能使用本機統計修復工具。"
      />
    );
  }

  if (isRoleLoading) {
    return (
      <BlockedPanel
        icon={<RefreshCw size={20} className="animate-spin" />}
        title="本機統計投影修復"
        message="正在確認角色權限，請稍候。"
      />
    );
  }

  if (isStaff) {
    return (
      <BlockedPanel
        icon={<Lock size={20} />}
        title="本機統計投影修復"
        message="員工帳號無法執行資料修復。請改用老闆帳號操作。"
        danger
      />
    );
  }

  const isBusy = state === 'checking' || state === 'executing';
  const hasPreview = state === 'preview' && previewResult !== null;
  const hasRepairs = !!previewResult && previewResult.repaired.length > 0;

  return (
    <section className="w-full border border-neutral-stripe bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF4E3] text-[#B8792F]">
            <Calculator size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">本機統計投影修復</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              用於本機已存在 deal_closed events，但 markets 或 dailyStats 被重複累加的情況。工具會用本機 events 重新計算統計，不修改雲端、不刪除 events。
            </p>
          </div>
        </div>

        {hasPreview && previewResult && (
          <div className="space-y-3 rounded-md border border-neutral-stripe bg-background p-3 text-sm">
            {previewResult.repaired.map(item => (
              <div key={item.marketId} className="space-y-1">
                <p className="font-medium text-foreground">{item.marketId}</p>
                <div className="grid gap-1 text-muted-foreground sm:grid-cols-2">
                  <p>市場收入：{formatMoney(item.before.marketTotalRevenue)} → {formatMoney(item.after.marketTotalRevenue)}</p>
                  <p>市場成交：{item.before.marketTotalDeals} → {item.after.marketTotalDeals}</p>
                  <p>每日收入：{formatMoney(item.before.dailyStatsRevenue)} → {formatMoney(item.after.dailyStatsRevenue)}</p>
                  <p>每日成交：{item.before.dailyStatsDealCount} → {item.after.dailyStatsDealCount}</p>
                </div>
              </div>
            ))}

            {previewResult.skipped.length > 0 && (
              <div>
                <p className="font-medium text-muted-foreground">略過 ({previewResult.skipped.length})</p>
                {previewResult.skipped.slice(0, 8).map(item => (
                  <p key={`${item.marketId}-${item.reason}`} className="text-muted-foreground">
                    {item.marketId}: {item.reason}
                  </p>
                ))}
                {previewResult.skipped.length > 8 && (
                  <p className="text-muted-foreground">...還有 {previewResult.skipped.length - 8} 個</p>
                )}
              </div>
            )}

            {previewResult.warnings.map((warning, index) => (
              <p key={index} className="text-amber-700">{warning}</p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {state === 'idle' && (
            <button
              type="button"
              onClick={handleDryRun}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-stripe-dark px-3 text-sm font-medium text-foreground hover:bg-cream-soft"
            >
              <Eye size={16} />
              預覽本機修復
            </button>
          )}

          {isBusy && (
            <button
              type="button"
              disabled
              className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-stripe-dark px-3 text-sm font-medium text-muted-foreground opacity-50"
            >
              <RefreshCw size={16} className="animate-spin" />
              {state === 'checking' ? '掃描中...' : '修復中...'}
            </button>
          )}

          {hasPreview && (
            <>
              {hasRepairs && (
                <button
                  type="button"
                  onClick={handleExecute}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-secondary px-3 text-sm font-medium text-white hover:bg-[#C4935F]"
                >
                  <Wrench size={16} />
                  執行本機修復 ({previewResult.repaired.length})
                </button>
              )}
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-stripe-dark px-3 text-sm font-medium text-foreground hover:bg-cream-soft"
              >
                取消
              </button>
            </>
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
    <section className="w-full border border-neutral-stripe bg-white px-4 py-4 shadow-sm opacity-70">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          danger ? 'bg-soft-pink text-[#B85C5C]' : 'bg-warm-mist text-muted-foreground'
        }`}>
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </section>
  );
}
