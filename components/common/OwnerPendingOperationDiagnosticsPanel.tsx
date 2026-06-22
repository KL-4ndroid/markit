'use client';

import { useState } from 'react';
import { Activity, AlertTriangle, Clock, Eye, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/lib/supabase/auth-context';
import {
  listOwnerPendingOperationDiagnostics,
  type OwnerPendingOperationDiagnosticsRow,
  type PendingOperationDiagnosticsStateGroup,
} from '@/lib/sync/owner-pending-operation-diagnostics';

type PanelState = 'idle' | 'loading' | 'loaded';

const STALE_PROCESSING_THRESHOLD_MS = 15 * 60 * 1000;

const STATE_LABELS: Record<PendingOperationDiagnosticsStateGroup, string> = {
  healthy: '正常',
  needs_attention: '需留意',
  in_progress: '處理中',
  unknown: '未知',
};

const STATE_STYLES: Record<PendingOperationDiagnosticsStateGroup, string> = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  needs_attention: 'border-amber-200 bg-amber-50 text-amber-700',
  in_progress: 'border-sky-200 bg-sky-50 text-sky-700',
  unknown: 'border-[#E8E3D8] bg-[#F5F3EE] text-muted-foreground',
};

export function OwnerPendingOperationDiagnosticsPanel() {
  const { user } = useAuth();
  const { isStaff, isLoading: isRoleLoading } = useUserRole();
  const [state, setState] = useState<PanelState>('idle');
  const [rows, setRows] = useState<OwnerPendingOperationDiagnosticsRow[]>([]);

  const isBlocked = !user || isRoleLoading || isStaff;

  const handleLoad = async () => {
    if (!user) {
      toast.error('請先登入');
      return;
    }
    if (isRoleLoading) {
      toast.error('角色權限確認中，請稍候');
      return;
    }
    if (isStaff) {
      toast.error('員工帳號不能查看 pending operation diagnostics');
      return;
    }

    setState('loading');

    try {
      const nextRows = await listOwnerPendingOperationDiagnostics(user.id);
      setRows(nextRows);
      setState('loaded');
      toast.success(
        nextRows.length === 0
          ? '沒有 pending operation diagnostics 資料'
          : `已載入 ${nextRows.length} 筆 pending operation diagnostics`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '讀取 diagnostics 失敗');
      setState('idle');
    }
  };

  if (!user) {
    return (
      <BlockedPanel
        icon={<Lock size={20} />}
        message="請先登入老闆帳號，才能查看 pending operation diagnostics。"
      />
    );
  }

  if (isRoleLoading) {
    return (
      <BlockedPanel
        icon={<RefreshCw size={20} className="animate-spin" />}
        message="正在確認角色權限，請稍候。"
      />
    );
  }

  if (isStaff) {
    return (
      <BlockedPanel
        icon={<Lock size={20} />}
        message="員工帳號不能查看 pending operation diagnostics。請改用老闆帳號操作。"
        danger
      />
    );
  }

  const isLoading = state === 'loading';
  const summary = summarizeRows(rows);

  return (
    <section className="w-full border border-[#E8E3D8] bg-white px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <Activity size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                Pending operation diagnostics
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Owner-only read-only diagnostics for queued sync operations.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLoad}
            disabled={isBlocked || isLoading}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-[#D8D0C3] px-3 text-sm font-medium text-foreground hover:bg-[#F5F3EE] disabled:opacity-50"
          >
            {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <Eye size={16} />}
            {isLoading ? '讀取中...' : '讀取 diagnostics'}
          </button>
        </div>

        {state === 'loaded' && (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <SummaryBadge label="正常" value={summary.healthy} tone="healthy" />
              <SummaryBadge label="需留意" value={summary.needsAttention} tone="needs_attention" />
              <SummaryBadge label="處理中" value={summary.inProgress} tone="in_progress" />
            </div>

            {rows.length === 0 ? (
              <div className="border border-[#F0ECE4] bg-background px-3 py-3 text-sm text-muted-foreground">
                目前沒有可顯示的 pending operation diagnostics。
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#F0ECE4]">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-background text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">狀態</th>
                      <th className="px-3 py-2 font-medium">Operation</th>
                      <th className="px-3 py-2 font-medium">Market</th>
                      <th className="px-3 py-2 font-medium">Final event</th>
                      <th className="px-3 py-2 font-medium">更新</th>
                      <th className="px-3 py-2 font-medium">錯誤</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE4]">
                    {rows.map(row => (
                      <DiagnosticsRow key={row.operationId} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function DiagnosticsRow({ row }: { row: OwnerPendingOperationDiagnosticsRow }) {
  return (
    <tr className="align-top">
      <td className="px-3 py-3">
        <span
          className={`inline-flex min-w-[4rem] justify-center rounded-full border px-2 py-1 text-xs font-medium ${STATE_STYLES[row.stateGroup]}`}
        >
          {STATE_LABELS[row.stateGroup]}
        </span>
        {isStaleProcessing(row) && (
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
            <Clock size={13} />
            stale {getStaleProcessingMinutes(row)}m
          </p>
        )}
      </td>
      <td className="px-3 py-3">
        <p className="font-medium text-foreground">{row.operationType}</p>
        <p className="mt-1 break-all text-xs text-muted-foreground">{row.operationId}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.entityType}: {shortId(row.entityId)}
        </p>
      </td>
      <td className="px-3 py-3 text-muted-foreground">
        <p className="break-all">{shortId(row.marketId)}</p>
        <p className="mt-1 text-xs">actor {shortId(row.actorId)}</p>
      </td>
      <td className="px-3 py-3">
        {row.finalEventMismatch ? (
          <span className="inline-flex items-center gap-1 text-amber-700">
            <AlertTriangle size={14} />
            mismatch
          </span>
        ) : row.hasFinalEvent ? (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <ShieldCheck size={14} />
            {row.finalEventType || 'event'}
          </span>
        ) : (
          <span className="text-muted-foreground">none</span>
        )}
      </td>
      <td className="px-3 py-3 text-muted-foreground">
        <p>{formatDateTime(row.updatedAt)}</p>
        <p className="mt-1 text-xs">{row.ageBucket || 'unknown'}</p>
      </td>
      <td className="px-3 py-3 text-muted-foreground">
        {row.lastErrorCode || row.lastErrorMessage ? (
          <>
            {row.lastErrorCode && <p className="font-medium text-amber-700">{row.lastErrorCode}</p>}
            {row.lastErrorMessage && (
              <p className="mt-1 max-w-[16rem] break-words text-xs">{row.lastErrorMessage}</p>
            )}
          </>
        ) : (
          <span>none</span>
        )}
      </td>
    </tr>
  );
}

function BlockedPanel({
  icon,
  message,
  danger = false,
}: {
  icon: React.ReactNode;
  message: string;
  danger?: boolean;
}) {
  return (
    <section className="w-full border border-[#E8E3D8] bg-white px-4 py-4 shadow-sm opacity-70">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            danger ? 'bg-feria-dangerSoft text-[#B85C5C]' : 'bg-[#F0ECE4] text-muted-foreground'
          }`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">
            Pending operation diagnostics
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
    </section>
  );
}

function SummaryBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: PendingOperationDiagnosticsStateGroup;
}) {
  return (
    <div className={`border px-3 py-2 ${STATE_STYLES[tone]}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function summarizeRows(rows: OwnerPendingOperationDiagnosticsRow[]) {
  return rows.reduce(
    (summary, row) => {
      if (row.stateGroup === 'healthy') summary.healthy++;
      if (row.stateGroup === 'needs_attention') summary.needsAttention++;
      if (row.stateGroup === 'in_progress') summary.inProgress++;
      return summary;
    },
    { healthy: 0, needsAttention: 0, inProgress: 0 }
  );
}

function isStaleProcessing(row: OwnerPendingOperationDiagnosticsRow): boolean {
  if (row.status !== 'processing') {
    return false;
  }

  const updatedAtMs = new Date(row.updatedAt).getTime();
  if (!Number.isFinite(updatedAtMs)) {
    return false;
  }

  return Date.now() - updatedAtMs >= STALE_PROCESSING_THRESHOLD_MS;
}

function getStaleProcessingMinutes(row: OwnerPendingOperationDiagnosticsRow): number {
  const updatedAtMs = new Date(row.updatedAt).getTime();
  if (!Number.isFinite(updatedAtMs)) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - updatedAtMs) / 60000));
}

function shortId(value: string): string {
  if (!value) return '-';
  return value.length > 12 ? `${value.slice(0, 8)}...` : value;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
