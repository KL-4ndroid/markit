'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  BarChart3,
  FileText,
  FlaskConical,
  Loader2,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { useRoleContext } from '@/lib/role-context';
import { useAuth } from '@/lib/supabase/auth-context';
import {
  readSubscriptionSimulation,
  updateSubscriptionSimulation,
  type SubscriptionSimulationClientState,
} from '@/lib/subscription/subscription-simulation-client';
import { runSubscriptionPriceFoundationSmoke } from '@/lib/subscription/subscription-price-foundation-smoke-client';
import type { AccountPlanCode } from '@/lib/subscription/subscription-plans';

const PLAN_OPTIONS: ReadonlyArray<{
  code: AccountPlanCode;
  label: string;
}> = [
  { code: 'free', label: 'Free' },
  { code: 'pro', label: 'Pro' },
  { code: 'team', label: 'Team' },
];

const VERIFY_LINKS = [
  { href: '/analytics', label: '分析', icon: BarChart3 },
  { href: '/reports/settlement', label: '報表與 PDF', icon: FileText },
  { href: '/settings/team', label: '團隊', icon: Users },
] as const;

export function SubscriptionSimulationPanel() {
  const { session, loading: authLoading } = useAuth();
  const { isOwner, isLoading: roleLoading } = useRoleContext();
  const [state, setState] = useState<SubscriptionSimulationClientState | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<AccountPlanCode>('free');
  const [isBusy, setIsBusy] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPermissionSmokeBusy, setIsPermissionSmokeBusy] = useState(false);
  const [permissionSmokeMessage, setPermissionSmokeMessage] = useState<string | null>(null);
  const [permissionSmokePassed, setPermissionSmokePassed] = useState<boolean | null>(null);
  const accessToken = session?.access_token ?? '';

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!isOwner || !accessToken) {
      setIsUnavailable(true);
      return;
    }

    let active = true;
    void readSubscriptionSimulation({ accessToken }).then(result => {
      if (!active) return;
      if (!result.ok) {
        setIsUnavailable(true);
        return;
      }
      setState(result.state);
      if (result.state.planCode) setSelectedPlan(result.state.planCode);
    });
    return () => {
      active = false;
    };
  }, [accessToken, authLoading, isOwner, roleLoading]);

  if (isUnavailable || (!state && !authLoading && !roleLoading && !accessToken)) return null;
  if (!state) return null;

  const applySimulation = async (enabled: boolean, planCode: AccountPlanCode) => {
    setIsBusy(true);
    setErrorMessage(null);
    const result = await updateSubscriptionSimulation({
      accessToken,
      enabled,
      ...(enabled ? { planCode } : {}),
    });
    setIsBusy(false);

    if (!result.ok) {
      setErrorMessage('無法更新模擬方案，請重新整理後再試。');
      return;
    }
    setState(result.state);
    if (result.state.planCode) setSelectedPlan(result.state.planCode);
  };

  const handleToggle = () => {
    void applySimulation(!state.enabled, selectedPlan);
  };

  const handlePlanChange = (planCode: AccountPlanCode) => {
    setSelectedPlan(planCode);
    if (state.enabled) void applySimulation(true, planCode);
  };

  const handlePermissionSmoke = async () => {
    setIsPermissionSmokeBusy(true);
    setPermissionSmokeMessage(null);
    setPermissionSmokePassed(null);
    const result = await runSubscriptionPriceFoundationSmoke({ accessToken });
    setIsPermissionSmokeBusy(false);

    if (!result.ok) {
      setPermissionSmokePassed(false);
      setPermissionSmokeMessage('資料庫權限驗證無法完成。');
      return;
    }
    setPermissionSmokePassed(result.passed);
    setPermissionSmokeMessage(
      result.passed
        ? `資料庫權限驗證通過 ${result.passedChecks}/${result.totalChecks}`
        : `資料庫權限驗證失敗 ${result.passedChecks}/${result.totalChecks}`,
    );
  };

  return (
    <section
      className="mb-6 overflow-hidden rounded-card border border-amber-300 bg-amber-50 shadow-atelier"
      aria-labelledby="subscription-simulation-title"
      data-testid="subscription-simulation-panel"
    >
      <div className="flex flex-col gap-4 border-b border-amber-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
            <FlaskConical className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="subscription-simulation-title" className="text-sm font-semibold text-foreground">
                本機訂閱身分模擬
              </h2>
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-950">
                僅限測試
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              不修改付款與訂閱資料，也不授權雲端上傳或角色權限。
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={state.enabled}
          aria-label="切換訂閱身分模擬"
          disabled={isBusy}
          onClick={handleToggle}
          className="inline-flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-control border border-amber-300 bg-white px-3 text-sm font-semibold text-foreground transition-colors hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"
        >
          <span>{state.enabled ? '已開啟' : '已關閉'}</span>
          <span
            aria-hidden="true"
            className={`relative h-6 w-11 rounded-full transition-colors ${state.enabled ? 'bg-primary' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${state.enabled ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </span>
        </button>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">模擬方案</p>
          <div className="grid h-11 grid-cols-3 overflow-hidden rounded-control border border-amber-300 bg-white">
            {PLAN_OPTIONS.map(option => {
              const selected = selectedPlan === option.code;
              return (
                <button
                  key={option.code}
                  type="button"
                  disabled={!state.enabled || isBusy}
                  aria-pressed={selected}
                  onClick={() => handlePlanChange(option.code)}
                  className={`border-r border-amber-200 px-3 text-sm font-semibold transition-colors last:border-r-0 disabled:cursor-not-allowed disabled:opacity-45 ${selected && state.enabled ? 'bg-primary text-white' : 'bg-white text-foreground hover:bg-amber-100'}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-amber-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
            <span>
              {isBusy
                ? '正在切換...'
                : state.enabled && state.planCode
                  ? `目前模擬：${state.planCode.toUpperCase()}`
                  : '使用正式 capability 來源'}
            </span>
          </div>

          <nav className="flex flex-wrap gap-2" aria-label="訂閱阻擋驗證入口">
            <button
              type="button"
              data-testid="subscription-price-foundation-smoke"
              disabled={isPermissionSmokeBusy}
              onClick={() => void handlePermissionSmoke()}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-control border border-amber-300 bg-white px-3 text-xs font-semibold text-foreground transition-colors hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"
            >
              {isPermissionSmokeBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              )}
              驗證資料庫權限
            </button>
            {VERIFY_LINKS.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-control border border-amber-300 bg-white px-3 text-xs font-semibold text-foreground transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {errorMessage && (
          <p role="alert" className="text-xs font-medium text-red-700">{errorMessage}</p>
        )}
        {permissionSmokeMessage && (
          <p
            role={permissionSmokePassed ? 'status' : 'alert'}
            data-testid="subscription-price-foundation-smoke-result"
            className={`text-xs font-medium ${permissionSmokePassed ? 'text-emerald-700' : 'text-red-700'}`}
          >
            {permissionSmokeMessage}
          </p>
        )}
      </div>
    </section>
  );
}
