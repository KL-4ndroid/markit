'use client';

import { Crown, RefreshCw, ShieldAlert } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/Button';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';
import { useRoleContext } from '@/lib/role-context';
import { useAuth } from '@/lib/supabase/auth-context';
import { buildSubscriptionCenterView } from '@/lib/subscription/subscription-center-view';
import { NativeSubscriptionActions } from './NativeSubscriptionActions';

function formatEntitlementEnd(value: string | null): string {
  if (!value) return '無固定期限';
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function SubscriptionAccountSummary() {
  const { session, loading: authLoading } = useAuth();
  const { isOwner, isStaff, isLoading: roleLoading } = useRoleContext();
  const query = useAccountCapabilities({
    accessToken: session?.access_token,
    enabled: Boolean(session && !roleLoading && isOwner),
  });
  const view = useMemo(() => buildSubscriptionCenterView({
    viewer: isOwner ? 'owner' : isStaff ? 'staff' : 'unknown',
    isAuthenticated: Boolean(session),
    isLoading: authLoading || roleLoading || query.isLoading,
    capabilityResult: query.result,
  }), [authLoading, isOwner, isStaff, query.isLoading, query.result, roleLoading, session]);

  if (view.state === 'loading') {
    return (
      <section className="border-y border-atelier-line bg-atelier-paper px-4 py-5 sm:rounded-card sm:border" aria-busy="true">
        <div className="h-5 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-16 animate-pulse rounded-control bg-muted" />
      </section>
    );
  }

  return (
    <section
      className="border-y border-atelier-line bg-atelier-paper px-4 py-5 sm:rounded-card sm:border sm:px-5"
      aria-labelledby="subscription-account-title"
      data-testid="subscription-account-summary"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-atelier-sage-soft text-primary">
            {view.state === 'unavailable' ? (
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Crown className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">目前方案</p>
            <h2 id="subscription-account-title" className="mt-1 text-lg font-semibold text-foreground">
              {view.planLabel}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{view.sourceDescription}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-atelier-blue-soft px-2.5 py-1 text-xs font-semibold text-atelier-blue">
          {view.sourceLabel}
        </span>
      </div>

      {view.state === 'available' && (
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-atelier-line pt-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">功能狀態</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">{view.entitlementLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">付款狀態</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">{view.billingLabel ?? '不適用'}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">有效期限</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">{formatEntitlementEnd(view.entitlementEndsAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">購買來源</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">{view.billingOriginLabel ?? '非商店訂閱'}</dd>
          </div>
        </dl>
      )}

      {view.lifecycleNotice && (
        <div className="mt-4 rounded-control bg-atelier-sage-soft px-4 py-3" role="status">
          <p className="text-sm font-semibold text-foreground">{view.lifecycleNotice.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{view.lifecycleNotice.description}</p>
        </div>
      )}

      {view.state === 'available' && isOwner && (
        <details className="mt-4 border-t border-atelier-line pt-4 text-sm">
          <summary className="cursor-pointer py-2 font-medium text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            到期或降級後，資料會怎麼處理？
          </summary>
          <div className="space-y-2 pb-1 pt-3 leading-6 text-muted-foreground">
            <p>免費版仍可管理市集安排、報名、錄取、繳費、準備與私人心得。</p>
            <p>降為免費版後，銷售、收入、商品與照片會限制查閱；原有資料與待同步紀錄不因降級刪除。恢復對應方案後可繼續使用，照片原有保存期限仍適用。</p>
            <p>離開高階版後，員工協作會停止，成員關係仍保留。重新使用高階版時，由品牌主逐一確認並恢復成員。</p>
            <p>若已排定停止續訂，功能依已確認的權益期限開放；寬限期依訂閱來源回報處理。</p>
          </div>
        </details>
      )}

      {view.canRetry && (
        <Button
          className="mt-4"
          variant="secondary"
          size="compact"
          leadingIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          onClick={query.refresh}
        >
          重新檢查方案
        </Button>
      )}

      {isOwner && (
        <NativeSubscriptionActions canManageSubscription={view.canDisplayBillingControls} />
      )}
    </section>
  );
}
