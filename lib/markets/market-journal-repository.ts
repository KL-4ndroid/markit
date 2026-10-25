import { db } from '@/lib/db';
import { getNetworkPort } from '@/lib/platform/network-capability';
import { journalCacheEpoch } from './market-journal-cache-scope';
import { isJournalOwner, marketJournalsEnabled, validateJournalInput, type MarketJournal, type MarketJournalDraft } from './market-journal';

export interface JournalCloudPort {
  assertIdentity(ownerId: string): Promise<void>;
  list(ownerId: string, marketId?: string): Promise<MarketJournal[]>;
  save(draft: MarketJournalDraft, deleted: boolean): Promise<MarketJournal>;
}

/** Owner-scoped cache/drafts; private text never enters the shared event/sync queue. */
export class MarketJournalRepository {
  private readonly epoch = journalCacheEpoch();
  constructor(readonly ownerId: string, private readonly cloud: JournalCloudPort) {}
  private assertScope() {
    if (!this.ownerId || this.epoch !== journalCacheEpoch()) throw new Error('JOURNAL_SCOPE');
  }
  async stage(draft: MarketJournalDraft, previousMutationId?: string) {
    if (!marketJournalsEnabled()) throw new Error('出攤心得尚未開放。');
    this.assertScope();
    if (draft.ownerId !== this.ownerId) throw new Error('JOURNAL_SCOPE');
    await db.transaction('rw', [db.markets, db.marketJournals, db.marketJournalDrafts], async () => {
      this.assertScope();
      if (!isJournalOwner(await db.markets.get(draft.marketId), this.ownerId)) throw new Error('JOURNAL_SCOPE');
      const existing = await db.marketJournalDrafts.get(draft.id);
      const cached = await db.marketJournals.get(draft.id);
      if ((existing && (existing.ownerId !== this.ownerId || existing.marketId !== draft.marketId))
        || (cached && (cached.ownerId !== this.ownerId || cached.marketId !== draft.marketId))) throw new Error('JOURNAL_SCOPE');
      if (existing && existing.mutationId !== draft.mutationId && existing.mutationId !== previousMutationId) throw new Error('JOURNAL_DRAFT_CONFLICT');
      await db.marketJournalDrafts.put(draft);
    }).catch(error => {
      if (error instanceof Error && error.message.startsWith('JOURNAL_')) throw error;
      throw new Error('JOURNAL_DRAFT_STORAGE');
    });
  }
  async discard(id: string, expectedMutationId: string) {
    this.assertScope();
    await db.transaction('rw', db.marketJournalDrafts, async () => {
      const draft = await db.marketJournalDrafts.get(id);
      if (draft?.ownerId === this.ownerId) {
        if (draft.mutationId !== expectedMutationId) throw new Error('JOURNAL_DRAFT_CONFLICT');
        await db.marketJournalDrafts.delete(id);
      }
    });
  }
  async refresh(marketId?: string) {
    this.assertScope();
    if (!getNetworkPort().getCurrentStatus().connected) throw new Error('JOURNAL_OFFLINE');
    await this.cloud.assertIdentity(this.ownerId);
    const rows = await this.cloud.list(this.ownerId, marketId);
    await this.cloud.assertIdentity(this.ownerId);
    this.assertScope();
    await db.transaction('rw', [db.markets, db.marketJournals], async () => {
      this.assertScope();
      for (const row of rows) {
        if (row.ownerId !== this.ownerId || row.authorId !== this.ownerId) throw new Error('JOURNAL_SCOPE');
        const previous = await db.marketJournals.get(row.id);
        if (!previous || previous.revision <= row.revision) await db.marketJournals.put(row);
      }
    });
  }
  async save(draft: MarketJournalDraft) {
    this.assertScope();
    const market = await db.markets.get(draft.marketId);
    if (!isJournalOwner(market, this.ownerId) || draft.ownerId !== this.ownerId) throw new Error('JOURNAL_SCOPE');
    const previous = await db.marketJournals.get(draft.id);
    // A preserved historical day is valid even if market dates were later corrected.
    const dateMarket = previous?.businessDate === draft.businessDate && draft.businessDate
      ? { ...market, dates: [...(market.dates ?? []), draft.businessDate] } : market;
    const valid = validateJournalInput(draft.body, draft.businessDate, dateMarket);
    const normalized = { ...draft, ...valid };
    await this.stage(normalized);
    if (!getNetworkPort().getCurrentStatus().connected) throw new Error('JOURNAL_OFFLINE');
    await this.cloud.assertIdentity(this.ownerId);
    const row = await this.cloud.save(normalized, draft.deleted);
    await this.cloud.assertIdentity(this.ownerId);
    this.assertScope();
    if (row.id !== draft.id || row.marketId !== draft.marketId || row.ownerId !== this.ownerId || row.authorId !== this.ownerId) throw new Error('JOURNAL_SCOPE');
    await db.transaction('rw', [db.marketJournals, db.marketJournalDrafts], async () => {
      this.assertScope();
      const previousRow = await db.marketJournals.get(row.id);
      if (!previousRow || previousRow.revision <= row.revision) await db.marketJournals.put(row);
      const pending = await db.marketJournalDrafts.get(row.id);
      if (pending?.mutationId === normalized.mutationId) await db.marketJournalDrafts.delete(row.id);
    });
    return row;
  }
}
