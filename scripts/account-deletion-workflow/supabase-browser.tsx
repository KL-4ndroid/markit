import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient, type Session } from '@supabase/supabase-js';
import { AccountDeletionPanel } from '../../components/settings/AccountDeletionPanel';
import { createAccountDeletionClient } from '../../lib/subscription/account-deletion-client';
import { evaluateDeletionDeviceCheck } from '../../lib/subscription/account-deletion-experience';
import { getLocalPendingWriteReport } from '../../lib/sync/local-pending-write-report';
import { db } from '../../lib/db';

type Config = { url: string; publicKey: string; password: string; owner: string; staff: string };
function LocalIntegration({ config }: { config: Config }) {
  const auth = useMemo(() => createClient(config.url, config.publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }), [config]);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function login(kind: 'owner' | 'staff') {
    if (busy) return;
    setBusy(true); setSession(null); setMessage('正在向本機 Auth 登入…');
    try {
      const result = await auth.auth.signInWithPassword({ email: config[kind], password: config.password });
      if (result.error || !result.data.session) throw new Error('Local sign-in failed');
      setSession(result.data.session); setRole(kind); setMessage('真實本機 Auth 登入成功。');
    } catch { setMessage('本機 Auth 登入失敗。'); }
    finally { setBusy(false); }
  }
  const client = useMemo(() => session ? createAccountDeletionClient({
    accessToken: session.access_token, apiUrl: { configuredBaseUrl: null, runtimeProtocol: 'http:', buildTarget: 'web' },
    async checkDevice() {
      try {
        const [report, drafts] = await Promise.all([getLocalPendingWriteReport(session.user.id), db.financialReviewDrafts.count()]);
        return evaluateDeletionDeviceCheck(report, session.user.id, drafts);
      } catch { return { ready: false, message: '本機待送資料檢查失敗，原資料保持不變。' }; }
    },
    async reauthenticate(password) {
      const result = await auth.auth.signInWithPassword({ email: session.user.email!, password });
      if (result.error || !result.data.session || result.data.user?.id !== session.user.id) return false;
      setSession(result.data.session); setMessage('同一帳號已透過本機 Auth 重新驗證。'); return true;
    },
    openBilling: async () => { setMessage('此驗收不操作商店或訂閱。'); return false; },
  }) : null, [session, auth]);
  async function expireProof() {
    if (!session || busy) return;
    setBusy(true);
    try {
      const r = await fetch('/integration/age-session', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!r.ok) throw new Error('Local ageing failed');
      const result = await auth.auth.refreshSession({ refresh_token: session.refresh_token });
      if (result.error || !result.data.session) throw new Error('Local refresh failed');
      setSession(result.data.session); setMessage('已取得真實更新 token；其原登入證據已超過五分鐘。');
    } catch { setMessage('過期邊界測試未完成。'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-xl space-y-5 p-4">
    <aside className="space-y-3 rounded-xl border border-primary/20 bg-white p-4" aria-label="真實本機整合驗收">
      <h1 className="text-xl font-bold">帳號刪除：本機 Supabase</h1>
      <p className="text-sm">真實 Auth、API、PostgREST 與私人資料表；僅合成帳號，清理引擎關閉。</p>
      <div className="flex flex-wrap gap-2">{(['owner', 'staff'] as const).map(kind => <button type="button" disabled={busy} className="min-h-11 rounded border px-3 text-sm" key={kind} onClick={() => void login(kind)}>{kind === 'owner' ? '登入合成老闆' : '登入合成員工'}</button>)}</div>
      {session && <><p className="text-sm">目前身分：{role === 'owner' ? '合成老闆' : '合成員工'}</p><button type="button" disabled={busy} className="min-h-11 rounded border px-3 text-sm" onClick={() => void expireProof()}>使本機登入證據過期並更新 token</button></>}
      <p role="status" className="text-sm">{message || '請先登入一個合成帳號。'}</p>
    </aside>
    {client && <AccountDeletionPanel client={client} />}
  </main>;
}
void fetch('/integration/config').then(r => r.json()).then((config: Config) => {
  if (config.url !== 'http://127.0.0.1:55381' || !config.publicKey.startsWith('sb_publishable_')) throw new Error('Not local Supabase');
  createRoot(document.getElementById('root')!).render(<LocalIntegration config={config} />);
});
