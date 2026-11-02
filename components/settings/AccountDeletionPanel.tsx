'use client';

import { useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { AccountDeletionClient, DeletionResult } from '@/lib/subscription/account-deletion-client';
import type { AccountDeletionSafeStatus } from '@/lib/subscription/account-deletion-api-contract';
import { ACCOUNT_DELETION_POLICY_REVISION } from '@/lib/subscription/account-deletion-contract';
import { DELETION_STATUS_COPY, type DeletionDeviceCheck } from '@/lib/subscription/account-deletion-experience';

const button = 'min-h-11 rounded-xl border border-primary/20 px-4 py-3 text-sm font-medium disabled:opacity-50';
export function AccountDeletionPanel({ client }: { client: AccountDeletionClient }) {
  const [boundClient, setBoundClient] = useState(client);
  const latestClient = useRef(client);
  latestClient.current = client;
  const [request, setRequest] = useState<AccountDeletionSafeStatus | null>(null);
  const [device, setDevice] = useState<DeletionDeviceCheck | null>(null);
  const [known, setKnown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [password, setPassword] = useState('');
  const [reauthOpen, setReauthOpen] = useState(false);
  const generation = useRef(0);
  const locked = useRef(false);
  const key = useRef('');

  function accept(result: DeletionResult): boolean {
    if (result.ok) {
      if (!result.request || result.request.status === 'cancelled') key.current = '';
      setRequest(result.request); setKnown(true); return true;
    }
    setKnown(false);
    const reauth = result.code === 'recent_reauth_required' || result.code === 'recent_reauth_invalid';
    if (reauth) setReauthOpen(true);
    setError(result.code === 'account_deletion_disabled' ? '此環境尚未啟用刪除申請，目前沒有送出或刪除資料。'
      : reauth ? '請重新驗證本人身分，再讀取申請狀態後繼續。'
        : result.uncertain ? '送出結果尚待確認。請先重新讀取狀態，不要重複送出。'
          : '目前無法確認申請狀態。請重新讀取；不會自動重送。');
    return false;
  }
  useEffect(() => {
    const current = ++generation.current;
    locked.current = true; key.current = '';
    setBoundClient(client); setBusy(true); setKnown(false); setRequest(null); setDevice(null); setAcknowledged(false); setError(''); setPassword(''); setReauthOpen(false); setNotice('');
    void Promise.all([client.read(), client.checkDevice()]).then(([result, check]) => {
      if (generation.current !== current || latestClient.current !== client) return;
      accept(result); setDevice(check);
    }).catch(() => { if (generation.current === current) setError('讀取失敗，請重新讀取。'); })
      .finally(() => { if (generation.current === current) { locked.current = false; setBusy(false); } });
    return () => { generation.current = current + 1; };
    // A different client means a different authenticated session. Old results cannot cross it.
  }, [client]);

  async function perform(action: 'read' | 'create' | 'confirm' | 'cancel' | 'reauth') {
    if (locked.current) return;
    const current = generation.current;
    const active = () => generation.current === current && latestClient.current === client;
    locked.current = true; setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'reauth') {
        const secret = password; setPassword('');
        const ok = await client.reauthenticate(secret);
        if (!active()) return;
        setKnown(false);
        if (ok) { setNotice('身分已重新驗證，請讀取申請狀態後再繼續。'); setReauthOpen(false); }
        else setError('身分驗證未完成，請確認密碼；沒有送出刪除操作。');
        return;
      }
      if (action === 'read') {
        const [result, check] = await Promise.all([client.read(), client.checkDevice()]);
        if (active()) { if (accept(result)) setNotice('申請狀態已更新。'); setDevice(check); }
        return;
      }
      if (!known || boundClient !== client) return;
      if (action !== 'cancel') {
        const check = await client.checkDevice();
        if (!active()) return;
        setDevice(check);
        if (!check.ready || !acknowledged) return;
      }
      if (!active()) return;
      let result: DeletionResult;
      if (action === 'create') {
        key.current ||= uuid();
        result = await client.create({ policyRevision: ACCOUNT_DELETION_POLICY_REVISION, preflightResolution: 'clean',
          idempotencyKey: key.current, acknowledgeStoreBillingContinues: true });
      } else {
        if (!request || !['requested', 'identity_confirmed'].includes(request.status)) return;
        result = await client.act(action, { requestId: request.requestId, expectedStatus: request.status as 'requested' | 'identity_confirmed' });
      }
      if (active() && accept(result)) { setAcknowledged(false); setNotice(action === 'cancel' ? '已撤回申請。' : action === 'confirm' ? '已確認申請，尚未完成刪除。' : '申請已送出，請確認後續步驟。'); }
    } catch { if (active()) { setKnown(false); setError('操作結果無法確認，請先重新讀取狀態；不會自動重送。'); } }
    finally { if (active()) { locked.current = false; setBusy(false); } }
  }
  const canCancel = known && request && ['requested', 'identity_confirmed'].includes(request.status);
  const canCreate = known && (!request || request.status === 'cancelled');
  const canConfirm = known && request?.status === 'requested';
  const copy = known && request ? DELETION_STATUS_COPY[request.status] : null;
  if (boundClient !== client) return <p role="status" className="text-sm">正在確認目前帳號的申請…</p>;
  return <div className="space-y-5" aria-busy={busy}>
    <p className="rounded-xl border border-primary/15 bg-background p-4 text-sm leading-6">隔離測試功能：這一批不執行真實資料清理，也不會自動取消任何訂閱。</p>
    <section className="space-y-3 rounded-2xl border border-primary/15 bg-white p-4" aria-labelledby="deletion-impact">
      <h2 id="deletion-impact" className="font-semibold">刪除前請了解</h2>
      <p className="text-sm leading-6">刪除的是你本人的帳號。若你擁有品牌，會影響品牌資料與員工存取；員工刪除自己的帳號，不會刪除老闆的品牌。</p>
      <p className="text-sm leading-6">刪除帳號不等於取消 Apple／Google 訂閱。若有商店訂閱，請另外管理續訂；不需要先取消才能申請刪除。</p>
      <div className="flex flex-wrap gap-2">{(['apple', 'google'] as const).map(store => <button type="button" className={button} key={store} onClick={() => {
        const current = generation.current;
        void client.openBilling(store).then(ok => { if (!ok && generation.current === current) setError('無法開啟商店，請稍後再試。'); }).catch(() => { if (generation.current === current) setError('無法開啟商店，請稍後再試。'); });
      }}>{store === 'apple' ? 'Apple 訂閱管理' : 'Google Play 訂閱管理'}</button>)}</div>
    </section>
    <section className="space-y-3 rounded-2xl border border-primary/15 bg-white p-4" aria-labelledby="deletion-state">
      <h2 id="deletion-state" className="font-semibold">{copy?.title ?? (known ? '尚未提出申請' : '申請狀態尚待確認')}</h2>
      <p className="text-sm leading-6">{copy?.description ?? (known ? '申請不代表立即刪除，仍需本人確認。' : '請先重新讀取目前狀態，再繼續操作。')}</p>
      {device && <p className="text-sm leading-6">{device.message}</p>}
      <button type="button" disabled={busy} className={button} onClick={() => void perform('read')}>重新讀取狀態與檢查</button>
      {(canCreate || canConfirm) && <>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm leading-6"><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" disabled={busy} checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} />我了解帳號與資料的影響，以及刪除帳號不會取消商店訂閱。</label>
        <button type="button" className={`${button} w-full bg-primary text-white`} disabled={busy || !device?.ready || !acknowledged} onClick={() => void perform(canCreate ? 'create' : 'confirm')}>{canCreate ? '提出刪除申請' : '確認刪除申請'}</button>
      </>}
      {canCancel && <button type="button" disabled={busy} className={`${button} w-full`} onClick={() => void perform('cancel')}>撤回這次申請</button>}
    </section>
    <details open={reauthOpen} onToggle={event => setReauthOpen(event.currentTarget.open)} className="rounded-2xl border border-primary/15 bg-white p-4">
      <summary className="min-h-11 cursor-pointer py-2 font-medium">重新驗證本人身分</summary>
      <form className="space-y-3" onSubmit={event => { event.preventDefault(); void perform('reauth'); }}>
        <label className="block text-sm">目前帳號的密碼<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy} className="mt-2 min-h-11 w-full rounded-xl border border-primary/20 bg-white px-3" /></label>
        <p className="text-xs leading-5 text-muted-foreground">此測試入口適用密碼登入。密碼不會儲存或送到刪除申請 API。</p>
        <button type="submit" className={button} disabled={busy || !password}>驗證身分</button>
      </form>
    </details>
    {busy && <p role="status" className="text-sm">處理中，請稍候…</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {error && <p role="alert" className="text-sm leading-6">{error}</p>}
    <div className="flex flex-wrap gap-4 text-sm"><a className="inline-flex min-h-11 items-center text-primary underline" href="/settings/account">返回帳號與同步</a><a className="inline-flex min-h-11 items-center text-primary underline" href="/markets">回市集處理草稿</a><a className="inline-flex min-h-11 items-center text-primary underline" href="/support">取得協助</a></div>
  </div>;
}
