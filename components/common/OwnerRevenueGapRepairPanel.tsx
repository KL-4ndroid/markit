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
      toast.error('角色權限確認中，請稍後再試');
      return;
    }
    if (isStaff) {
      toast.error('此功能僅限帳戶擁有者使用，員工無法執行收入修復');
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
        toast.success('掃描完成，沒有需要修復的項目');
      } else if (result.repaired.length === 0) {
        toast.info('掃描完成，沒有符合修復條件的市場');
      } else {
        toast.success(
          `掃描完成，發現 ${result.repaired.length} 個市場可修復，${result.skipped.length} 個跳過`
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '掃描失敗');
      setState('idle');
    }
  };

  const handleExecute = async () => {
    if (!user) {
      toast.error('請先登入');
      return;
    }
    if (isRoleLoading) {
      toast.error('角色權限確認中，請稍後再試');
      return;
    }
    if (isStaff) {
      toast.error('此功能僅限帳戶擁有者使用');
      return;
    }
    if (!previewResult) return;

    const confirmed = window.confirm(
      `即將修復 ${previewResult.repaired.length} 個市場的收入資料。\n\n` +
        `此操作將從雲端重新下載 ${previewResult.repaired.reduce((s, m) => s + m.replayedEvents, 0)} 個 deal_closed 事件。\n\n` +
        '是否繼續？'
    );
    if (!confirmed) return;

    setState('executing');

    try {
      const result = await repairOwnerRevenueGaps({
        ownerId: user.id,
        dryRun: false,
      });

      const repairedCount = result.repaired.length;

      if (repairedCount > 0) {
        toast.success(
          `已修復 ${repairedCount} 個市場，請重新同步或重新整理頁面查看最新資料`
        );
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

  // Not logged in
  if (!isLoggedIn) {
    return (
      <section className="w-full border border-[#E8E3D8] bg-white px-4 py-4 shadow-sm opacity-60">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0ECE4] text-[#6B6B6B]">
            <Lock size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#3A3A3A]">
              收入差距修復
            </h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              請先登入以使用收入差距修復功能。
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Role loading
  if (isRoleLoading) {
    return (
      <section className="w-full border border-[#E8E3D8] bg-white px-4 py-4 shadow-sm opacity-60">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0ECE4] text-[#6B6B6B]">
            <RefreshCw size={20} className="animate-spin" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#3A3A3A]">
              收入差距修復
            </h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              確認角色權限中，請稍候...
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Staff blocked
  if (isStaff) {
    return (
      <section className="w-full border border-[#E8E3D8] bg-white px-4 py-4 shadow-sm opacity-60">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5E6E8] text-[#B85C5C]">
            <Lock size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#3A3A3A]">
              收入差距修復
            </h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              此功能僅限帳戶擁有者使用，員工無法執行。
            </p>
          </div>
        </div>
      </section>
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
              hasRepairs ? 'bg-[#E8F3E8] text-[#4D7F87]' : 'bg-[#F0ECE4] text-[#6B6B6B]'
            }`}
          >
            {hasRepairs ? <Zap size={20} /> : <RefreshCw size={20} />}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#3A3A3A]">
              收入差距修復
            </h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              修復從未同步過的市場（本地收入為零但雲端有收入）。
              僅修復本地從未出現過 deal_closed 事件的市場。
            </p>
          </div>
        </div>

        {hasPreview && previewResult && (
          <div className="space-y-2 rounded-md border border-[#E8E3D8] bg-[#FAFAF8] p-3 text-sm">
            {previewResult.repaired.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-[#4D7F87]">
                  可修復 ({previewResult.repaired.length})
                </p>
                {previewResult.repaired.map(r => (
                  <div key={r.marketId} className="pl-2 text-[#6B6B6B]">
                    {r.marketId.slice(0, 8)}...
                    {' → '}收入 {r.cloudRevenue.toLocaleString()}，
                    重放 {r.replayedEvents} 個事件
                  </div>
                ))}
              </div>
            )}
            {previewResult.skipped.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-[#6B6B6B]">
                  跳過 ({previewResult.skipped.length})
                </p>
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
                {previewResult.warnings.map((w, i) => (
                  <p key={i} className="text-amber-700">
                    ⚠ {w}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {state === 'idle' && (
            <button
              type="button"
              onClick={handleDryRun}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#D8D0C3] px-3 text-sm font-medium text-[#3A3A3A] hover:bg-[#F5F3EE] disabled:opacity-50"
            >
              <Eye size={16} />
              預覽修復範圍
            </button>
          )}

          {state === 'checking' && (
            <button
              type="button"
              disabled
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#D8D0C3] px-3 text-sm font-medium text-[#6B6B6B] opacity-50"
            >
              <RefreshCw size={16} className="animate-spin" />
              掃描中...
            </button>
          )}

          {hasPreview && (
            <>
              {hasRepairs && (
                <button
                  type="button"
                  onClick={handleExecute}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[#D4A574] px-3 text-sm font-medium text-white hover:bg-[#C4935F] disabled:opacity-50"
                >
                  <Zap size={16} />
                  執行修復 ({previewResult.repaired.length})
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

          {state === 'executing' && (
            <button
              type="button"
              disabled
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[#D4A574] px-3 text-sm font-medium text-white opacity-50"
            >
              <RefreshCw size={16} className="animate-spin" />
              修復中...
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
