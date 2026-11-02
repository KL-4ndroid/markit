import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AccountDeletionPanel } from '../../components/settings/AccountDeletionPanel';
import { createAccountDeletionClient } from '../../lib/subscription/account-deletion-client';

function Harness() {
  const [actor, setActor] = useState('owner');
  const [notice, setNotice] = useState('');
  const client = useMemo(() => createAccountDeletionClient({
    accessToken: `fixture-${actor}`,
    apiUrl: { configuredBaseUrl: null, runtimeProtocol: 'http:', buildTarget: 'web' },
    checkDevice: async () => (await fetch('/fixture/device')).json(),
    reauthenticate: async password => {
      if (password !== 'synthetic') return false;
      const response = await fetch('/fixture/control', { method: 'POST', body: JSON.stringify({ scenario: 'fresh' }) });
      return response.ok;
    },
    openBilling: async () => { setNotice('隔離環境只驗證按鈕反饋，沒有開啟商店。'); return true; },
  }), [actor]);
  async function scenario(value: string) {
    await fetch('/fixture/control', { method: 'POST', body: JSON.stringify({ scenario: value, actor }) });
    setNotice(`已套用測試情境：${value}，請在產品面板重新讀取。`);
  }
  return <main className="mx-auto max-w-xl space-y-5 p-4">
    <aside className="space-y-3 rounded-xl border border-primary/20 bg-white p-4" aria-label="隔離驗收控制">
      <h1 className="text-xl font-bold">刪除帳號：隔離驗收</h1>
      <p className="text-sm">無真實帳號、無雲端／R2；驗證用密碼為 synthetic。</p>
      <label className="block text-sm">測試身分<select aria-label="測試身分" className="ml-3 min-h-11 rounded border px-2" value={actor} onChange={e => setActor(e.target.value)}><option value="owner">合成老闆</option><option value="staff">合成員工</option></select></label>
      <div className="flex flex-wrap gap-2">{[['pending', '有待送資料'], ['clean', '沒有待送資料'], ['stale', '重新驗證過期'], ['fresh', '身分有效'], ['drop', '下次送出遺失回應'], ['delay', '下次查詢延遲'], ['processing', '模擬已開始處理']].map(([value, text]) => <button type="button" className="min-h-11 rounded border px-3 text-sm" key={value} onClick={() => void scenario(value)}>{text}</button>)}</div>
      {notice && <p role="status" className="text-sm">{notice}</p>}
    </aside>
    <AccountDeletionPanel client={client} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
