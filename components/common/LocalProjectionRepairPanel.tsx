'use client';

import { useState } from 'react';
import { Calculator, Eye, Lock, RefreshCw, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/supabase/auth-context';
import { useUserRole } from '@/hooks/useUserRole';
import {
  repairLocalMarketProjections,
  type LocalProjectionRepairResult,
} from '@/lib/sync/local-projection-repair';

type PanelState = 'idle' | 'checking' | 'preview' | 'executing';

function formatMoney(value: number): string {
  return value.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

export function LocalProjectionRepairPanel() {
  const { user } = useAuth();
  const { isStaff, isLoading: isRoleLoading } = useUserRole();
  const [state, setState] = useState<PanelState>('idle');
  const [previewResult, setPreviewResult] = useState<LocalProjectionRepairResult | null>(null);

  const assertOwnerCanRun = (): boolean => {
    if (!user) {
      toast.error('請先登入');
      return false;
    }
    if (isRoleLoading) {
      toast.error('角色權限確認中，請稍後再試');
      return false;
    }
    if (isStaff) {
      toast.error('此功能僅限帳戶擁有者使用');
      return false;
    }
    return true;
  };

  const handleDryRun = async () => {
    if (!assertOwnerCanRun()) return;

    setState('checking');
    setPreviewResult(null);

    try {
      const result = await repairLocalMarketProjections({
        dryRun: true,
      });
      setPreviewResult(result);
      setState('preview');

      if (result.repaired.length === 0) {
        toast.info('沒有找到可修復的本機統計投影');
      } else {
        toast.success(`預覽完成：${result.repaired.length} 個市場可修復`);
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
        '此操作只會重算本機 IndexedDB 的 markets / dailyStats，不會修改雲端，也不會刪除 events。\n\n' +
        '是否繼續？'
    );
    if (!confirmed) return;

    setState('executing');

    try {
      const result = await repairLocalMarketProjections({
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
      <section className="w-full border border-[#E8E3D8] bg-white px-4 py-4 shadow-sm opacity-60">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0ECE4] text-[#6B6B6B]">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#3A3A3A]">本機統計投影修復</h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">請先登入以使用此修復工具。</p>
          </div>
        </div>
      </section>
    );
  }

  if (isRoleLoading) {
    return (
      <section className="w-full border border-[#E8E3D8] bg-white px-4 py-4 shadow-sm opacity-60">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0ECE4] text-[#6B6B6B]">
            <RefreshCw size={20} className="animate-spin" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#3A3A3A]">本機統計投影修復</h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">確認角色權限中，請稍候...</p>
          </div>
        </div>
      </section>
    );
  }

  if (isStaff) {
    return (
      <section className="w-full border border-[#E8E3D8] bg-white px-4 py-4 shadow-sm opacity-60">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5E6E8] text-[#B85C5C]">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#3A3A3A]">本機統計投影修復</h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">此功能僅限帳戶擁有者使用。</p>
          </div>
        </div>
      </section>
    );
  }

  const isBusy = state === 'checking' || state === 'executing';
  const hasPreview = state === 'preview' && previewResult !== null;
  const hasRepairs = !!previewResult && previewResult.repaired.length > 0;

  return (
    <section className="w-full border border-[#E8E3D8] bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF4E3] text-[#B8792F]">
            <Calculator size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#3A3A3A]">本機統計投影修復</h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              掃描所有本機市場，找出 dailyStats 或市場總收入高於本機 deal_closed events 的場次。此工具只重算本機 projection，不修改雲端、不刪除 events。
            </p>
          </div>
        </div>

        {hasPreview && previewResult && (
          <div className="space-y-3 rounded-md border border-[#E8E3D8] bg-[#FAFAF8] p-3 text-sm">
            {previewResult.repaired.map(item => (
              <div key={item.marketId} className="space-y-1">
                <p className="font-medium text-[#3A3A3A]">{item.marketId}</p>
                <div className="grid gap-1 text-[#6B6B6B] sm:grid-cols-2">
                  <p>市場收入：{formatMoney(item.before.marketTotalRevenue)} → {formatMoney(item.after.marketTotalRevenue)}</p>
                  <p>市場成交：{item.before.marketTotalDeals} → {item.after.marketTotalDeals}</p>
                  <p>日統計收入：{formatMoney(item.before.dailyStatsRevenue)} → {formatMoney(item.after.dailyStatsRevenue)}</p>
                  <p>日統計成交：{item.before.dailyStatsDealCount} → {item.after.dailyStatsDealCount}</p>
                </div>
              </div>
            ))}

            {previewResult.skipped.length > 0 && (
              <div>
                <p className="font-medium text-[#6B6B6B]">略過 ({previewResult.skipped.length})</p>
                {previewResult.skipped.slice(0, 8).map(item => (
                  <p key={`${item.marketId}-${item.reason}`} className="text-[#9B9B9B]">
                    {item.marketId}: {item.reason}
                  </p>
                ))}
                {previewResult.skipped.length > 8 && (
                  <p className="text-[#9B9B9B]">...還有 {previewResult.skipped.length - 8} 個</p>
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
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#D8D0C3] px-3 text-sm font-medium text-[#3A3A3A] hover:bg-[#F5F3EE]"
            >
              <Eye size={16} />
              掃描所有市場
            </button>
          )}

          {isBusy && (
            <button
              type="button"
              disabled
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#D8D0C3] px-3 text-sm font-medium text-[#6B6B6B] opacity-50"
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
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[#D4A574] px-3 text-sm font-medium text-white hover:bg-[#C4935F]"
                >
                  <Wrench size={16} />
                  執行本機修復 ({previewResult.repaired.length})
                </button>
              )}
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-[#D8D0C3] px-3 text-sm font-medium text-[#3A3A3A] hover:bg-[#F5F3EE]"
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
