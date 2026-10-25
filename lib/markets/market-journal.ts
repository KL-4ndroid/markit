import type { Market } from '@/types/db';

export const JOURNAL_MAX_LENGTH = 5000;
export const marketJournalsEnabled = () => process.env.NEXT_PUBLIC_MARKET_JOURNALS_ENABLED === 'true';

export function journalDateRangeError(from = '', to = ''): string | null {
  const valid = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day)
    && Number.isFinite(Date.parse(`${day}T00:00:00Z`))
    && new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
  if ((from && !valid(from)) || (to && !valid(to))) return '請選擇有效的日期。';
  if (from && to && from > to) return '起日不能晚於迄日。';
  return null;
}

export interface MarketJournal {
  id: string;
  ownerId: string;
  marketId: string;
  authorId: string;
  businessDate: string | null;
  body: string;
  revision: number;
  mutationId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MarketJournalDraft {
  id: string;
  ownerId: string;
  marketId: string;
  businessDate: string | null;
  body: string;
  baseRevision: number;
  mutationId: string;
  updatedAt: number;
  deleted: boolean;
}

export function journalMarketDates(market: Pick<Market, 'dates' | 'startDate' | 'endDate'>): string[] {
  // An explicit non-contiguous date list takes precedence over the date range.
  if (market.dates?.length) return [...new Set(market.dates)].sort();
  const result: string[] = [];
  let date = market.startDate;
  while (/^\d{4}-\d{2}-\d{2}$/.test(date) && date <= market.endDate && result.length < 3660) {
    const next = new Date(`${date}T00:00:00Z`);
    if (!Number.isFinite(next.getTime()) || next.toISOString().slice(0, 10) !== date) break;
    result.push(date);
    next.setUTCDate(next.getUTCDate() + 1);
    date = next.toISOString().slice(0, 10);
  }
  return result;
}

export function validateJournalInput(body: string, businessDate: string | null, market: Pick<Market, 'dates' | 'startDate' | 'endDate'>) {
  const normalized = body.replace(/\r\n/g, '\n').trim();
  if (!normalized) throw new Error('請先寫下這場市集的心得。');
  if (Array.from(normalized).length > JOURNAL_MAX_LENGTH) throw new Error(`心得最多 ${JOURNAL_MAX_LENGTH} 字。`);
  if (businessDate !== null && !journalMarketDates(market).includes(businessDate)) throw new Error('請選擇這場市集的營業日期，或改為整場總結。');
  return { body: normalized, businessDate };
}

export function isJournalOwner(market: Market | undefined, ownerId: string): market is Market & { id: string } {
  return Boolean(ownerId && market?.id && market.owner_id === ownerId && !market.isDeleted
    && (market as Market & { access_type?: string }).access_type !== 'staff');
}

/** A lost acknowledgement of our own mutation is retryable, not a competing edit. */
export function journalHasConflict(draft: MarketJournalDraft | null, row: MarketJournal | undefined): boolean {
  return Boolean(draft && row && row.revision !== draft.baseRevision && row.mutationId !== draft.mutationId);
}

export function assertJournalRevision(draft: MarketJournalDraft, row: {revision: number; mutationId: string} | null) {
  if (!row && draft.baseRevision !== 0) throw new Error('JOURNAL_SCOPE');
  if (row && row.revision !== draft.baseRevision && row.mutationId !== draft.mutationId) throw new Error('JOURNAL_CONFLICT');
}

export function buildJournalEntries(input: {
  ownerId: string; markets: readonly Market[]; journals: readonly MarketJournal[]; drafts: readonly MarketJournalDraft[];
  marketId?: string; query?: string; regionCode?: string; showRemoved?: boolean; fromDate?: string; toDate?: string;
}) {
  const dateError = journalDateRangeError(input.fromDate, input.toDate);
  if (dateError) throw new Error(dateError);
  const markets = new Map(input.markets.filter(m => isJournalOwner(m, input.ownerId)
    && (!input.marketId || m.id === input.marketId)).map(m => [m.id!, m]));
  const journals = input.journals.filter(j => j.ownerId === input.ownerId && j.authorId === input.ownerId && markets.has(j.marketId));
  const drafts = input.drafts.filter(d => d.ownerId === input.ownerId && markets.has(d.marketId));
  const byDraft = new Map(drafts.map(d => [d.id, d]));
  const byJournal = new Map(journals.map(j => [j.id, j]));
  const query = input.query?.trim().toLocaleLowerCase() ?? '';
  return [...journals.map(j => ({ journal: j, draft: byDraft.get(j.id), id: j.id, marketId: j.marketId })),
    ...drafts.filter(d => !byJournal.has(d.id)).map(d => ({ draft: d, journal: undefined, id: d.id, marketId: d.marketId }))]
    .filter(entry => {
      const market = markets.get(entry.marketId)!;
      // Explicit null on a draft means the user changed a daily note to a whole-market summary.
      const day = entry.draft ? entry.draft.businessDate ?? market.endDate : entry.journal?.businessDate ?? market.endDate;
      return (input.showRemoved || !entry.journal?.deletedAt || Boolean(entry.draft))
        && (!input.fromDate || day >= input.fromDate) && (!input.toDate || day <= input.toDate)
        && (!input.regionCode || (market.regionCode ?? 'unclassified') === input.regionCode)
        && (!query || `${market.name} ${market.location} ${entry.draft?.body ?? ''} ${entry.journal?.body ?? ''}`.toLocaleLowerCase().includes(query));
    }).sort((a, b) => {
      const day = (e: typeof a) => e.draft ? e.draft.businessDate ?? markets.get(e.marketId)!.endDate : e.journal?.businessDate ?? markets.get(e.marketId)!.endDate;
      return day(b).localeCompare(day(a)) || (b.journal?.createdAt ?? '').localeCompare(a.journal?.createdAt ?? '') || a.id.localeCompare(b.id);
    });
}

export function journalErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? '');
  if (message.includes('JOURNAL_CONFLICT')) return '其他裝置已修改這篇心得。你的草稿仍保留，請重新讀取雲端版本後再決定內容。';
  if (message.includes('JOURNAL_DRAFT_CONFLICT')) return '另一個分頁已更新本機草稿。這次文字未覆寫它；請先複製目前文字保留，再重新開啟草稿。';
  if (message.includes('JOURNAL_DRAFT_STORAGE')) return '尚未寫入裝置，也未送出雲端。請勿離開，先複製目前文字保留。';
  if (message.includes('JOURNAL_OFFLINE')) return '目前離線，草稿已保存在這台裝置；恢復連線後請再按儲存到雲端。';
  if (message.includes('JOURNAL_TIMEOUT')) return '雲端尚未及時回應，草稿仍保留。請先重新讀取雲端核對，再決定是否送出。';
  if (message.startsWith('請') || message.startsWith('心得最多')) return message;
  if (message.includes('JOURNAL_DATE')) return '市集日期已變更，請重新選擇心得日期；草稿仍保留。';
  if (message.includes('JOURNAL_SCOPE')) return '目前無法存取這場市集；草稿仍留在原帳號的裝置中。';
  return '尚未確認送達雲端，草稿仍保存在這台裝置。連線後請再按儲存。';
}
