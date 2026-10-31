'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AppDialog } from '@/components/ui/AppDialog';
import { db } from '@/lib/db';
import { FinancialReviewDraftSession } from '@/lib/markets/financial-review-draft-session';
import type { FinancialReviewDraft } from '@/lib/markets/financial-review-drafts';
import type { FinancialReviewMode } from '@/lib/markets/financial-reviews';
import { getLocalDateString } from '@/lib/time-utils';
import type { useFinancialReviews } from '@/hooks/useFinancialReviews';
import type { DailyStats, Market } from '@/types/db';

export function FinancialReviewPanel({ market, finance, initialDate }: {
  market: Market; rawStats: readonly DailyStats[]; finance: ReturnType<typeof useFinancialReviews>; initialDate?: string;
}) {
  const [date, setDate] = useState(initialDate ?? '');
  const [discard, setDiscard] = useState<FinancialReviewDraft | null>(null);
  const editor = useMemo(() => new FinancialReviewDraftSession(finance.repository, market.id ?? ''), [finance.repository, market.id]);
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
  const drafts = useLiveQuery(() => finance.enabled && market.id && market.owner_id === finance.repository.ownerId
    ? db.financialReviewDrafts.where('[ownerId+marketId]').equals([finance.repository.ownerId, market.id]).toArray()
    : [], [finance.enabled, finance.repository.ownerId, market.id, market.owner_id]);

  if (!finance.enabled || !market.id || market.owner_id !== finance.repository.ownerId) return null;
  const source = finance.snapshots.find(item => item.marketId === market.id && item.ownerId === market.owner_id);
  const day = source?.dates.includes(date) ? date : initialDate && source?.dates.includes(initialDate) ? initialDate : source?.dates.filter(d => d <= getLocalDateString()).at(-1) ?? '';
  const record = source?.reviews.find(row => row.review_key === day && row.mode !== 'cleared');
  const feeRecord = source?.reviews.find(row => row.review_key === 'fees' && row.mode !== 'cleared');
  const busy = state.busy || state.pending > 0;
  const disabled = !finance.ready || finance.loading || finance.blocked.has(market.id) || busy;
  const draft = state.draft;
  const title = draft?.editor.base.mode === 'cost' ? '核對當日銷售成本' : draft?.editor.base.mode === 'zero-fee' ? '確認固定費用為零' : draft?.editor.base.mode === 'cleared' ? '撤回核對紀錄' : '確認當日零收入';
  const buttonClass = 'min-h-11 rounded-control border border-atelier-line px-3 text-sm disabled:opacity-50';
  const open = (mode: FinancialReviewMode, key = day) => { if (!disabled) void editor.open(key, mode); };

  return <details className="mb-4 rounded-card border border-atelier-line bg-atelier-paper p-4" open={Boolean(initialDate) || (drafts?.length ?? 0) > 0 || Boolean(state.status || state.error) || undefined}>
    <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">核對成本與零收入</summary>
    {finance.loading && <p role="status" className="text-sm">正在讀取核對紀錄…</p>}
    {finance.error && <p role="status" className="text-sm text-danger">{finance.error}</p>}
    {finance.blocked.has(market.id) && !finance.error && !finance.loading && <p role="status" className="text-sm">還有場次資料待同步，完成同步後再核對。</p>}
    {state.status && <p role="status" className="text-sm text-primary">{state.status}</p>}
    {state.error && !draft && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    {!draft && (drafts ?? []).map(row => <section key={row.id} aria-label={`${row.key === 'fees' ? '固定費用' : row.key}核對草稿`} className="mt-3 rounded-control border border-atelier-line p-3">
      <p className="text-sm font-medium">{row.key === 'fees' ? '固定費用' : row.key}・有未完成草稿</p>
      <p className="mt-1 text-xs leading-6 text-muted-foreground">{row.attempt ? '上次保存結果待確認，繼續時會重新讀取雲端紀錄。' : '只留在這台裝置，繼續時會重新核對雲端來源。'}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={disabled} className={buttonClass} onClick={() => { if (row.key !== 'fees') setDate(row.key); void editor.restore(row); }}>繼續核對草稿</button>
        <button type="button" disabled={busy} className={buttonClass} onClick={() => setDiscard(row)}>捨棄草稿</button>
      </div>
    </section>)}
    <label className="mt-3 block text-sm">核對日期<select aria-label="核對日期" className="mt-1 min-h-11 w-full rounded-control border border-atelier-line bg-atelier-paper px-3 text-base" value={day} disabled={disabled} onChange={event => setDate(event.target.value)}>{source?.dates.map(d => <option key={d} value={d}>{d}</option>)}</select></label>
    {record && <p className="mt-2 text-xs leading-6 text-muted-foreground">{record.valid ? record.mode === 'cost' ? `已核對本日銷售成本 ${record.amount} 元` : '已確認本日零收入' : '原核對的來源已變更，請重新核對。'}</p>}
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" disabled={disabled || !day || !source?.days[day]?.count || day > getLocalDateString()} onClick={() => open('cost')} className={buttonClass}>核對當日銷售成本</button>
      <button type="button" disabled={disabled || !day || source?.days[day]?.count !== 0 || !source?.days[day]?.zeroAllowed} onClick={() => open('zero-income')} className={buttonClass}>確認當日零收入</button>
      {source?.feeTotal === 0 && <button type="button" disabled={disabled} onClick={() => open('zero-fee', 'fees')} className={buttonClass}>{feeRecord?.valid ? '重新確認固定費用為 0' : '確認固定費用為 0'}</button>}
      {feeRecord && <button type="button" disabled={disabled} onClick={() => open('cleared', 'fees')} className={buttonClass}>撤回固定費用確認</button>}
      {record && <button type="button" disabled={disabled} onClick={() => open('cleared')} className={buttonClass}>撤回本日核對</button>}
    </div>
    <button type="button" disabled={busy || finance.loading} onClick={() => void finance.refresh()} className="mt-2 min-h-11 text-sm text-primary underline">重新讀取核對紀錄</button>
    <AppDialog open={!!draft} onClose={() => editor.close()} title={title} dismissible={!busy} presentation="sheet">
      <p className="mb-3 text-sm">{draft?.key === 'fees' ? '整場攤位與自付設備費' : draft?.key}</p>
      {draft?.editor.base.mode === 'cost' ? <>
        <label className="block text-sm">銷售成本總額（元）<input aria-label="銷售成本總額" inputMode="decimal" value={draft.editor.amount} onChange={event => void editor.changeAmount(event.target.value)} disabled={state.busy || !!draft.attempt} className="mt-1 min-h-11 w-full rounded-control border border-atelier-line px-3 text-base" /></label>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">只填當日銷售成本，攤位及設備費另計。確認沒有銷售成本可填 0；個別商品及成交明細保留原內容。</p>
      </> : <p className="text-sm leading-7">{draft?.editor.base.mode === 'zero-fee' ? '確認整場攤位與自付設備費總額為 0；保證金與抽成仍各自計算。' : draft?.editor.base.mode === 'cleared' ? '撤回後回到原紀錄的成本判讀，核對歷程仍會保留。' : '確認這天沒有銷售收入與成交；不會新增零元成交。'}</p>}
      <p role="status" className="mt-2 text-xs text-muted-foreground">{state.pending ? '草稿儲存中…' : state.localError ? '本次輸入尚未保存到裝置' : draft?.attempt ? '雲端保存結果待確認；草稿已留在這台裝置' : '草稿已留在這台裝置；按保存才會送出雲端'}</p>
      {state.status && <p role="status" className="mt-2 text-sm">{state.status}</p>}
      {state.error && <p role="alert" className="mt-3 text-sm text-danger">{state.error}</p>}
      {state.conflict && draft?.editor.base.mode === 'cost' && <p className="mt-2 text-sm leading-6">最新來源金額：{state.latestAmount || '尚未確認'}{state.latestAmount ? ' 元' : ''}；你的草稿：{draft.editor.amount || '尚未填寫'}{draft.editor.amount ? ' 元' : ''}。</p>}
      {state.localError ? <button type="button" disabled={busy} onClick={() => void editor.retryLocal()} className="min-h-11 text-sm text-primary underline">重試保存草稿</button>
        : (state.error || draft?.attempt) && <button type="button" disabled={busy} onClick={() => void editor.recheck()} className="min-h-11 text-sm text-primary underline">重新讀取來源，保留輸入</button>}
      {state.conflict && <button type="button" disabled={busy || state.localError} onClick={() => void editor.acceptLatest()} className={buttonClass}>依最新來源繼續核對</button>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => editor.close()} className={buttonClass}>稍後繼續</button>
        <button type="button" disabled={disabled || state.conflict || !!state.error || state.localError} onClick={() => void editor.save()} className="min-h-11 rounded-control bg-primary px-4 text-white disabled:opacity-50">{state.busy ? '處理中…' : '保存核對紀錄'}</button>
      </div>
    </AppDialog>
    <AppDialog open={!!discard} onClose={() => { if (!busy) setDiscard(null); }} title="捨棄核對草稿" presentation="sheet" dismissible={!busy}>
      <p className="text-sm leading-7">只會移除這台裝置的未完成輸入，雲端核對、收入與成交不會改變。</p>
      <div className="mt-4 flex gap-3">
        <button type="button" disabled={busy} className={buttonClass} onClick={() => setDiscard(null)}>保留草稿</button>
        <button type="button" disabled={busy} className={buttonClass} onClick={() => { if (discard) void editor.discard(discard).then(() => setDiscard(null)); }}>確認捨棄草稿</button>
      </div>
    </AppDialog>
  </details>;
}
