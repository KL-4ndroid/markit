'use client';

import { useEffect, useRef, useState } from 'react';
import { useRoleContext } from '@/lib/role-context';
import { useAuth } from '@/lib/supabase/auth-context';
import { readSubscriptionSimulation, updateSubscriptionSimulation, type SubscriptionSimulationClientState } from '@/lib/subscription/subscription-simulation-client';
import { notifySubscriptionExperienceChanged } from '@/lib/subscription/experience';
import { getSubscriptionPlanDefinition, type AccountPlanCode } from '@/lib/subscription/subscription-plans';

const plans: readonly AccountPlanCode[] = ['free', 'pro', 'team'];

export function SubscriptionSimulationPanel() {
  const { session } = useAuth();
  const { isOwner, roleRefreshState } = useRoleContext();
  const token = session?.access_token ?? '';
  const currentToken = useRef(token);
  currentToken.current = token;
  const [snapshot, setSnapshot] = useState<{ token: string; state: SubscriptionSimulationClientState } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canUse = isOwner && roleRefreshState.isAuthorizationFresh && Boolean(token);

  useEffect(() => {
    if (!canUse) return;
    let active = true;
    void readSubscriptionSimulation({ accessToken: token }).then(result => {
      if (active && result.ok) setSnapshot({ token, state: result.state });
    });
    return () => { active = false; };
  }, [canUse, token]);

  // Only the server can make this tool available; deployment requests remain denied.
  if (!canUse || snapshot?.token !== token) return null;
  const state = snapshot.state;
  async function change(planCode?: AccountPlanCode) {
    setBusy(true); setError(null);
    const result = await updateSubscriptionSimulation({ accessToken: token, enabled: Boolean(planCode), planCode });
    if (currentToken.current !== token) return;
    setBusy(false);
    if (!result.ok) {
      if (state.cloudBacked) notifySubscriptionExperienceChanged();
      setError(state.cloudBacked
        ? `無法確認切換結果（${result.code}），請重新整理確認目前方案。`
        : `方案切換未完成（${result.code}），請再試一次；目前身分保持不變。`);
      return;
    }
    setSnapshot({ token, state: result.state });
    notifySubscriptionExperienceChanged();
  }
  return <section className="rounded-card border border-amber-300 bg-amber-50 p-4" aria-label="訂閱身分測試" data-testid="subscription-simulation-panel">
    <h2 className="font-semibold">訂閱身分測試</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{state.cloudBacked ? '僅限指定測試帳號，不會扣款或更動正式訂閱。切換同時影響此帳號的雲端寫入權限，最長保留 4 小時；已有紀錄不會刪除。' : '僅本機畫面測試，不會扣款或更動正式訂閱。測試身分最長保留 4 小時，伺服器重啟也會還原；雲端權限維持原方案。'}</p>
    <p className="my-3 text-sm" role="status">{error && state.cloudBacked ? '切換結果尚待確認' : state.enabled && state.planCode ? `目前測試：${getSubscriptionPlanDefinition(state.planCode).displayName}` : '目前使用帳號原有方案'}</p>
    <div className="grid grid-cols-3 gap-2" aria-label="選擇測試方案">
      {plans.map(plan => <button key={plan} type="button" aria-pressed={state.enabled && state.planCode === plan} disabled={busy} onClick={() => void change(plan)}
        className={`min-h-12 rounded-xl border px-2 text-sm font-semibold disabled:opacity-50 ${state.enabled && state.planCode === plan ? 'bg-primary text-white' : 'bg-white'}`}>{getSubscriptionPlanDefinition(plan).displayName}</button>)}
    </div>
    <button type="button" disabled={busy || !state.enabled} onClick={() => void change()} className="mt-3 min-h-11 rounded-xl border bg-white px-4 disabled:opacity-50">還原帳號原有方案</button>
    {busy && <p role="status" className="mt-2 text-sm">正在套用方案…</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </section>;
}
