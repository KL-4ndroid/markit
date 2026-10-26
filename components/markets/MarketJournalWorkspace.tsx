"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, generateUUID } from "@/lib/db";
import { useAuth } from "@/lib/supabase/auth-context";
import { useRoleContext } from "@/lib/role-context";
import { journalCloud } from "@/lib/supabase/market-journals";
import { MarketJournalRepository } from "@/lib/markets/market-journal-repository";
import {
  buildJournalEntries,
  isJournalOwner,
  journalErrorMessage,
  journalHasConflict,
  journalMarketDates,
  marketJournalsEnabled,
  JOURNAL_MAX_LENGTH,
  journalDateRangeError,
  type MarketJournal,
  type MarketJournalDraft,
} from "@/lib/markets/market-journal";
import { marketRegionLabel } from "@/lib/markets/market-region";
import { buildMarketDetailHref, buildMarketJournalsHref } from "@/lib/navigation/market-detail-route";
import { JournalChecklistDialog } from "@/components/markets/JournalChecklistDialog";
import { journalTasksEnabled } from "@/lib/markets/owner-followup";
import { JournalReadingBody } from "@/components/markets/JournalReadingBody";
import { Lock, SlidersHorizontal } from "lucide-react";
import { ContextHelp } from "@/components/ui/ContextHelp";

const actionClass =
  "min-h-11 rounded-xl border border-primary/20 px-4 py-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50";

export function MarketJournalWorkspace({ marketId, returnTo }: { marketId?: string; returnTo?: string | null }) {
  const { user } = useAuth();
  const { userRole, roleRefreshState } = useRoleContext();
  if (!marketJournalsEnabled()) return null;
  if (!user || roleRefreshState.stage !== "ready" || userRole.isStaff)
    return null;
  return (
    <OwnerJournalWorkspace
      key={`${user.id}:${marketId ?? "all"}`}
      ownerId={user.id}
      marketId={marketId}
      returnTo={returnTo}
    />
  );
}

function OwnerJournalWorkspace({
  ownerId,
  marketId,
  returnTo,
}: {
  ownerId: string;
  marketId?: string;
  returnTo?: string | null;
}) {
  const repository = useMemo(
    () => new MarketJournalRepository(ownerId, journalCloud),
    [ownerId],
  );
  const [loading, setLoading] = useState(true);
  const [cloudError, setCloudError] = useState("");
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<MarketJournalDraft | null>(null);
  const [followup, setFollowup] = useState<MarketJournal | null>(null);
  const [draftStatus, setDraftStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showRemoved, setShowRemoved] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const writes = useRef(Promise.resolve());
  const alive = useRef(true);
  const data = useLiveQuery(async () => {
    const allMarkets = await db.markets
      .where("owner_id")
      .equals(ownerId)
      .toArray();
    const markets = allMarkets.filter(
      (m) => isJournalOwner(m, ownerId) && (!marketId || m.id === marketId),
    );
    const ids = new Set(markets.map((m) => m.id));
    const allDrafts = await db.marketJournalDrafts
      .where("ownerId")
      .equals(ownerId)
      .toArray();
    return {
      markets,
      followupMarkets: allMarkets.filter((m) => isJournalOwner(m, ownerId)),
      journals: (
        await db.marketJournals.where("ownerId").equals(ownerId).toArray()
      ).filter((j) => ids.has(j.marketId)),
      drafts: allDrafts.filter((j) => ids.has(j.marketId)),
      unavailableDrafts: !marketId
        ? allDrafts
            .filter((d) =>
              allMarkets.some((m) => m.id === d.marketId && m.isDeleted),
            )
            .map((d) => ({ id: d.id, mutationId: d.mutationId }))
        : [],
    };
  }, [ownerId, marketId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setCloudError("");
    try {
      await repository.refresh(marketId);
    } catch {
      if (alive.current)
        setCloudError("暫時無法確認雲端，以下可能是這台裝置先前保存的內容。");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [repository, marketId]);
  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
    };
  }, [refresh]);

  const markets = data?.markets ?? [];
  const journals = data?.journals ?? [];
  const drafts = data?.drafts ?? [];
  const byMarket = new Map(markets.map((m) => [m.id!, m]));
  const byJournal = new Map(journals.map((j) => [j.id, j]));
  const dateError = journalDateRangeError(fromDate, toDate);
  const entries = dateError
    ? []
    : buildJournalEntries({
        ownerId,
        markets,
        journals,
        drafts,
        marketId,
        query,
        regionCode: region,
        showRemoved,
        fromDate,
        toDate,
      });
  const editedMarket = editor ? byMarket.get(editor.marketId) : undefined;
  const cloudVersion = editor ? byJournal.get(editor.id) : undefined;
  const conflict = journalHasConflict(editor, cloudVersion);

  function persist(next: MarketJournalDraft) {
    const previousMutationId = editor?.mutationId;
    setEditor(next);
    setDraftStatus("正在保存草稿…");
    setError("");
    writes.current = writes.current.then(async () => {
      try {
        await repository.stage(next, previousMutationId);
        if (alive.current) setDraftStatus("草稿已保存在這台裝置，尚未送出。");
      } catch {
        if (alive.current)
          setDraftStatus("草稿尚未寫入裝置，請勿離開；可複製文字保留。");
      }
    });
  }
  function edit(journal?: MarketJournal, draft?: MarketJournalDraft) {
    if (saving || loading) return;
    const selectedMarket = journal?.marketId ?? draft?.marketId ?? marketId;
    if (!selectedMarket || !byMarket.has(selectedMarket)) return;
    setEditor(
      draft ?? {
        id: journal?.id ?? generateUUID(),
        ownerId,
        marketId: selectedMarket,
        body: journal?.body ?? "",
        businessDate: journal?.businessDate ?? null,
        baseRevision: journal?.revision ?? 0,
        mutationId: generateUUID(),
        updatedAt: Date.now(),
        deleted: false,
      },
    );
    setDraftStatus(
      draft
        ? "草稿已保存在這台裝置，尚未送出。"
        : "填寫後會保留本機草稿；按儲存才送到雲端。",
    );
    setError("");
  }
  async function submit(draft: MarketJournalDraft) {
    setSaving(true);
    setError("");
    try {
      await writes.current;
      await repository.save(draft);
      if (alive.current) {
        setEditor(null);
        setDraftStatus("");
      }
    } catch (e) {
      if (alive.current) setError(journalErrorMessage(e));
      // Only a competing revision requires an immediate read. Offline/network
      // failures must release the editor without waiting for another request.
      if (
        String((e as { message?: string })?.message ?? "").includes(
          "JOURNAL_CONFLICT",
        )
      )
        await refresh();
    } finally {
      if (alive.current) setSaving(false);
    }
  }

  return (
    <section
      className={marketId ? "my-5 space-y-4 rounded-3xl bg-white p-4 shadow-sm sm:p-6" : "my-5 space-y-4"}
      aria-label={marketId ? "市集出攤心得" : "搜尋與閱讀出攤心得"}
    >
      {marketId && <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="market-journal-heading" className="text-lg font-semibold">
            出攤心得
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Lock className="h-4 w-4" aria-hidden="true" />僅自己可見</p>
        </div>
          <button
            className={actionClass}
            disabled={saving || loading || !byMarket.has(marketId)}
            onClick={() => edit()}
          >
            寫心得
          </button>
      </div>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!marketId && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4 shrink-0" aria-hidden="true" />私人紀錄，只有你能閱讀。</p>}
        <button type="button" className="min-h-11 rounded-xl px-2 text-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50" disabled={loading || saving} onClick={() => void refresh()}>重新整理</button>
      </div>
      {marketId && (
        <Link
          href={buildMarketJournalsHref(marketId, returnTo)}
          className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
        >
          查看全部出攤心得
        </Link>
      )}
      {loading && (
        <p role="status" className="text-sm text-muted-foreground">
          正在讀取心得…
        </p>
      )}
      {cloudError && (
        <p role="status" className="text-sm text-danger">
          {cloudError}
        </p>
      )}
      {!marketId && (
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-sm font-medium">
              搜尋心得
              <input type="search" className="mt-1 min-h-12 w-full rounded-2xl border border-primary/20 bg-white px-3 text-base" value={query} onChange={e => setQuery(e.target.value)} placeholder="市集、地點或心得關鍵字" />
            </label>
            <button type="button" disabled={Boolean(dateError)} aria-expanded={filtersOpen || Boolean(dateError)} aria-controls="journal-collection-filters" onClick={() => setFiltersOpen(value => !value)} className={`${actionClass} inline-flex min-h-12 shrink-0 items-center gap-2 bg-white`}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />{dateError ? '請修正日期' : filtersOpen ? '收起篩選' : '篩選'}
            </button>
          </div>
          <div id="journal-collection-filters" hidden={!filtersOpen && !dateError} className="rounded-2xl border border-border bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            縣市
            <select
              className="mt-1 min-h-11 w-full rounded-xl border border-primary/20 px-3 text-base sm:text-sm"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="">全部縣市</option>
              {[...new Set(markets.map((m) => m.regionCode ?? "unclassified"))]
                .sort()
                .map((code) => (
                  <option key={code} value={code}>
                    {code === "unclassified"
                      ? "未分類"
                      : marketRegionLabel(code)}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm">
            心得起日
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setFiltersOpen(true); }}
              className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-primary/20 px-3 text-base sm:text-sm"
              aria-invalid={Boolean(dateError)}
            />
          </label>
          <label className="text-sm">
            心得迄日
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setFiltersOpen(true); }}
              className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-primary/20 px-3 text-base sm:text-sm"
              aria-invalid={Boolean(dateError)}
            />
          </label>
          <div className="sm:col-span-2"><ContextHelp label="日期篩選方式">
            <p>依心得所屬營業日篩選，包含起日與迄日。整場總結以市集結束日計算，不依心得修改時間篩選。</p>
          </ContextHelp></div>
            </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showRemoved}
          onChange={(e) => setShowRemoved(e.target.checked)}
        />
        顯示已移除心得（可復原）
      </label>
            {dateError && <p role="alert" className="mt-2 text-sm text-danger">{dateError}</p>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
            <p role="status" aria-live="polite">{dateError ? '請調整日期區間' : `共 ${entries.length} 篇`}</p>
            {(query || region || fromDate || toDate || showRemoved) && <button type="button" className="min-h-11 rounded-xl px-2 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => { setQuery(''); setRegion(''); setFromDate(''); setToDate(''); setShowRemoved(false); }}>清除搜尋與篩選</button>}
          </div>
          {(query || region || fromDate || toDate || showRemoved) && <p className="break-words rounded-xl bg-primary/5 px-3 py-2 text-sm leading-6 text-foreground" aria-label="目前搜尋與篩選條件">
            條件：{[query && `搜尋「${query}」`, region && (region === 'unclassified' ? '未分類' : marketRegionLabel(region)), (fromDate || toDate) && `${fromDate || '不限起日'} ～ ${toDate || '不限迄日'}`, showRemoved && '包含已移除'].filter(Boolean).join('・')}
          </p>}
        </div>
      )}
      {marketId && (
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showRemoved}
          onChange={(e) => setShowRemoved(e.target.checked)}
        />
        顯示已移除心得（可復原）
      </label>
      )}
      {(data?.unavailableDrafts.length ?? 0) > 0 && (
        <div className="space-y-2 rounded-xl bg-background p-3 text-sm">
          <p>
            有 {data?.unavailableDrafts.length}{" "}
            份草稿所屬市集目前無法讀取，文字不會顯示。可等市集同步完成再處理；若已刪除市集，可明確捨棄這些本機草稿。
          </p>
          <button
            className={actionClass}
            disabled={loading || saving}
            onClick={async () => {
              try {
                for (const draft of data?.unavailableDrafts ?? [])
                  await repository.discard(draft.id, draft.mutationId);
              } catch (e) {
                setError(journalErrorMessage(e));
              }
            }}
          >
            捨棄無法讀取市集的草稿
          </button>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-background p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      {editor && editedMarket && (
        <div className="space-y-3 rounded-2xl border border-primary/20 bg-background p-4">
          <h3 className="font-semibold">{editedMarket.name}</h3>
          <label className="block text-sm">
            心得範圍
            <select
              className="mt-1 min-h-11 w-full rounded-xl border border-primary/20 bg-white px-3"
              disabled={saving}
              value={editor.businessDate ?? ""}
              onChange={(e) =>
                persist({
                  ...editor,
                  businessDate: e.target.value || null,
                  mutationId: generateUUID(),
                  updatedAt: Date.now(),
                })
              }
            >
              <option value="">整場總結</option>
              {[
                ...new Set([
                  ...journalMarketDates(editedMarket),
                  ...(cloudVersion?.businessDate
                    ? [cloudVersion.businessDate]
                    : []),
                ]),
              ]
                .sort()
                .map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-x-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Lock className="h-4 w-4" aria-hidden="true" />私人心得</span>
            <ContextHelp label="填寫靈感">
              <p>可以記錄人潮集中的時段、停車與卸貨、天氣、主辦安排，以及下次想調整的事。</p>
              <p>例如：下午四點後人潮最多；停車要提早到，下次帶推車。</p>
              <p>心得只有你能閱讀；若另建出攤待辦，只有你明確選擇的待辦文字會依既有團隊權限分享。</p>
            </ContextHelp>
          </div>
          <label className="block text-sm">
            這場出攤的心得
            <textarea
              rows={7}
              maxLength={JOURNAL_MAX_LENGTH * 2}
              disabled={saving || editor.deleted}
              className="mt-1 w-full resize-y rounded-xl border border-primary/20 bg-white p-3 leading-6"
              value={editor.body}
              onChange={(e) =>
                persist({
                  ...editor,
                  body: e.target.value,
                  mutationId: generateUUID(),
                  updatedAt: Date.now(),
                })
              }
            />
          </label>
          <p className="text-xs text-muted-foreground">
            {Array.from(editor.body).length} / {JOURNAL_MAX_LENGTH} 字・
            {editor.deleted ? "待移除" : draftStatus}
          </p>
          {conflict && cloudVersion && (
            <div className="space-y-2 rounded-xl bg-white p-3 text-sm">
              <p>
                雲端已有第 {cloudVersion.revision}{" "}
                版。請先比較下方的雲端內容，再決定是否合併。
              </p>
              <p className="whitespace-pre-wrap break-words">
                {cloudVersion.body}
              </p>
              <button
                className={actionClass}
                disabled={saving}
                onClick={() =>
                  persist({
                    ...editor,
                    baseRevision: cloudVersion.revision,
                    mutationId: generateUUID(),
                    updatedAt: Date.now(),
                  })
                }
              >
                已比較，以目前草稿繼續編輯
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              className={`${actionClass} bg-primary text-white`}
              disabled={
                saving ||
                loading ||
                conflict ||
                !editor.body.trim() ||
                Array.from(editor.body.trim()).length > JOURNAL_MAX_LENGTH
              }
              onClick={() => void submit(editor)}
            >
              {saving ? "儲存中…" : editor.deleted ? "重試移除" : "儲存到雲端"}
            </button>
            <button
              className={actionClass}
              disabled={saving}
              onClick={() => setEditor(null)}
            >
              收起，保留草稿
            </button>
            <button
              className={actionClass}
              disabled={saving}
              onClick={async () => {
                try {
                  await writes.current;
                  await repository.discard(editor.id, editor.mutationId);
                  setEditor(null);
                } catch (e) {
                  setError(journalErrorMessage(e));
                }
              }}
            >
              捨棄這份草稿
            </button>
          </div>
        </div>
      )}
      {!loading && !dateError && entries.length === 0 && (
        <p className="rounded-xl bg-background p-4 text-sm text-muted-foreground">
          {query || region || fromDate || toDate
            ? "沒有符合條件的心得。"
            : "目前沒有心得。可到已結束市集，留下第一篇出攤心得；也能稍後再寫。"}
        </p>
      )}
      <div className="space-y-3">
        {entries.filter(({ id }) => id !== editor?.id).map(({ id, marketId: entryMarketId, journal, draft }) => {
          const m = byMarket.get(entryMarketId)!;
          return (
            <article
              key={id}
              className="space-y-3 rounded-3xl border border-primary/10 bg-white p-4 sm:p-5"
            >
              <h3 className="break-words text-lg font-semibold leading-7">{m.name}</h3>
              <p className="text-xs text-muted-foreground">
                {(journal ? journal.businessDate : draft?.businessDate) ??
                  `${m.endDate}・整場總結`}{" "}
                · {marketRegionLabel(m.regionCode)} {m.location}
              </p>
              {draft && (
                <p className="text-sm text-primary">
                  {draft.deleted
                    ? "移除尚未送達雲端，可重試或捨棄操作。"
                    : "有本機草稿，尚未送出。"}
                </p>
              )}
              {journal?.deletedAt && (
                <p className="text-sm text-muted-foreground">
                  已移除，可復原。
                </p>
              )}
              {draft && journal && <p className="rounded-xl bg-background px-3 py-2 text-sm leading-6">以下顯示已保存版本；本機草稿請從「續寫／處理草稿」開啟。</p>}
              <JournalReadingBody key={`${id}:${query}`} body={journal?.body ?? draft?.body ?? ''} query={query} />
              {journal && (journal.deletedAt || draft) && (
                <details className="text-sm text-muted-foreground">
                  <summary className="min-h-11 cursor-pointer rounded-xl py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">保存資訊</summary>
                  <p className="pb-2 leading-6">本人記錄 · 建立 {journal.createdAt.slice(0, 10)} · 修改 {journal.updatedAt.slice(0, 10)} · 第 {journal.revision} 版</p>
                </details>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  className={actionClass}
                  disabled={saving || loading}
                  onClick={() => edit(journal, draft)}
                >
                  {draft
                    ? "續寫／處理草稿"
                    : journal?.deletedAt
                      ? "編輯並復原"
                      : "編輯心得"}
                </button>
                {!marketId && (
                  <Link
                    href={buildMarketDetailHref(entryMarketId, { task: 'journal', returnTo: 'journals' })}
                    className={`${actionClass} inline-flex items-center`}
                  >
                    回到原市集
                  </Link>
                )}
              </div>
              {journal && !journal.deletedAt && !draft && (
                <details className="rounded-xl border border-primary/10">
                  <summary className="min-h-11 cursor-pointer rounded-xl px-4 py-3 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                    更多資訊與操作
                  </summary>
                  <div className="space-y-3 border-t border-primary/10 p-3">
                    <p className="text-sm leading-6 text-muted-foreground">本人記錄 · 建立 {journal.createdAt.slice(0, 10)} · 修改 {journal.updatedAt.slice(0, 10)} · 第 {journal.revision} 版</p>
                    {journalTasksEnabled() && (
                      <div>
                        <button
                          className={actionClass}
                          disabled={saving || loading || Boolean(editor)}
                          onClick={() => setFollowup(journal)}
                        >
                          另建出攤待辦
                        </button>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          選用。需要提醒自己時，再整理成適用場次的待辦；原心得會保留。
                        </p>
                      </div>
                    )}
                    <button
                      className={actionClass}
                      disabled={saving || loading}
                      onClick={() =>
                        void submit({
                          id,
                          ownerId,
                          marketId: entryMarketId,
                          body: journal.body,
                          businessDate: journal.businessDate,
                          baseRevision: journal.revision,
                          mutationId: generateUUID(),
                          updatedAt: Date.now(),
                          deleted: true,
                        })
                      }
                    >
                      移除心得
                    </button>
                  </div>
                </details>
              )}
            </article>
          );
        })}
      </div>
      {followup && (
        <JournalChecklistDialog
          key={followup.id}
          journal={followup}
          markets={data?.followupMarkets ?? []}
          ownerId={ownerId}
          onClose={() => setFollowup(null)}
        />
      )}
    </section>
  );
}
