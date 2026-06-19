'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
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
  const { isStaff, isLoading } = useUserRole();
  const [detail, setDetail] = useState<RoleStatusEventDetail | null>(null);

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

  if (!isStaff && !detail) return null;

  const activeDetail =
    isLoading
      ? {
          kind: 'checking' as const,
          message: '正在確認你的員工權限，寫入操作會暫時鎖住。',
        }
      : detail;

  if (!activeDetail) return null;

  const isWarning =
    activeDetail.kind === 'downgraded' ||
    activeDetail.kind === 'revoked' ||
    activeDetail.kind === 'projection-cleanup-failed';

  return (
    <div className="sticky top-0 z-40 border-b border-primary/15 bg-white/95 px-4 py-2 shadow-sm backdrop-blur">
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
      </div>
    </div>
  );
}
