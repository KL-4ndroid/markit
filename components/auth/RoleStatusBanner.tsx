'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useRoleContext } from '@/lib/role-context';
import {
  ROLE_STATUS_EVENT,
  type RoleStatusEventDetail,
} from '@/lib/permissions/role-status-events';

function getIcon(kind: RoleStatusEventDetail['kind']) {
  if (kind === 'checking') return <Loader2 className="h-4 w-4 animate-spin" />;
  if (kind === 'projection-cleanup-complete') return <CheckCircle2 className="h-4 w-4" />;
  return <AlertTriangle className="h-4 w-4" />;
}

export function RoleStatusBanner() {
  const { isStaff, roleRefreshState, refreshRole } = useRoleContext();
  const [detail, setDetail] = useState<RoleStatusEventDetail | null>(null);
  const [showRefreshNotice, setShowRefreshNotice] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<RoleStatusEventDetail>;
      setDetail(customEvent.detail);
    };

    window.addEventListener(ROLE_STATUS_EVENT, handler);
    return () => window.removeEventListener(ROLE_STATUS_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!detail) return;
    if (detail.kind === 'checking') return;

    const timeout = window.setTimeout(() => setDetail(null), 9000);
    return () => window.clearTimeout(timeout);
  }, [detail]);

  useEffect(() => {
    if (!roleRefreshState.isRefreshing) {
      setShowRefreshNotice(false);
      return;
    }

    const timeout = window.setTimeout(() => setShowRefreshNotice(true), 400);
    return () => window.clearTimeout(timeout);
  }, [roleRefreshState.isRefreshing]);

  const activeDetail =
    roleRefreshState.stage === 'background_refresh_failed'
      ? {
          kind: 'projection-cleanup-failed' as const,
          message: '暫時無法確認最新權限。敏感操作與同步已暫停，請重試。',
        }
      : showRefreshNotice
      ? {
          kind: 'checking' as const,
          message: '正在確認你的員工權限，寫入操作會暫時鎖住。',
        }
      : detail;

  if (!isStaff && !activeDetail) return null;
  if (!activeDetail) return null;

  const isWarning =
    activeDetail.kind === 'downgraded' ||
    activeDetail.kind === 'revoked' ||
    activeDetail.kind === 'projection-cleanup-failed';

  return (
    <div className="fixed inset-x-0 top-0 z-40 border-b border-primary/15 bg-white/95 px-4 py-2 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-lg items-start gap-2 text-xs text-foreground">
        <div className={isWarning ? 'mt-0.5 text-danger' : 'mt-0.5 text-primary'}>
          {getIcon(activeDetail.kind)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {isWarning ? '權限狀態已更新' : '權限確認中'}
          </p>
          <p className="mt-0.5 leading-relaxed text-muted-foreground">
            {activeDetail.message}
          </p>
        </div>
        {roleRefreshState.needsRetry && (
          <button
            type="button"
            onClick={refreshRole}
            className="min-h-9 shrink-0 rounded-control border border-primary/20 px-3 text-xs font-medium text-primary"
          >
            重試
          </button>
        )}
      </div>
    </div>
  );
}
