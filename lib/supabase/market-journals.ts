import { supabase } from './client';
import type { JournalCloudPort } from '@/lib/markets/market-journal-repository';
import { assertJournalRevision, type MarketJournal } from '@/lib/markets/market-journal';
import { runJournalRequest } from '@/lib/markets/market-journal-request';

type JournalRow = {
  id: string; owner_id: string; market_id: string; author_id: string; business_date: string | null;
  body: string; revision: number; mutation_id: string; created_at: string; updated_at: string; deleted_at: string | null;
};
function fromRow(row: JournalRow): MarketJournal {
  return { id: row.id, ownerId: row.owner_id, marketId: row.market_id, authorId: row.author_id,
    businessDate: row.business_date, body: row.body, revision: row.revision, mutationId: row.mutation_id,
    createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at };
}

export const journalCloud: JournalCloudPort = {
  async assertIdentity(ownerId) {
    const { data, error } = await runJournalRequest(() => supabase.auth.getSession());
    if (error || data.session?.user.id !== ownerId) throw new Error('JOURNAL_SCOPE');
  },
  async list(ownerId, marketId) {
    const rows: MarketJournal[] = [];
    let after: string | null = null;
    for (;;) {
      let query = supabase.from('market_journals').select('*').eq('owner_id', ownerId).order('id').limit(200);
      if (marketId) query = query.eq('market_id', marketId);
      if (after) query = query.gt('id', after);
      const { data, error } = await runJournalRequest(signal => query.abortSignal(signal).retry(false));
      if (error) throw error;
      const page = data as JournalRow[];
      rows.push(...page.map(fromRow));
      if (page.length < 200) return rows;
      after = page[page.length - 1].id;
    }
  },
  async save(draft, deleted) {
    // Cheap early conflict detection; the RPC still performs the atomic check
    // after locking, so this read never replaces server authorization/CAS.
    const current = await runJournalRequest(signal => supabase.from('market_journals')
      .select('revision,mutation_id').eq('id',draft.id).eq('owner_id',draft.ownerId)
      .abortSignal(signal).maybeSingle().retry(false));
    if (current.error) throw current.error;
    assertJournalRevision(draft, current.data ? {revision:current.data.revision,mutationId:current.data.mutation_id} : null);
    const { data, error } = await runJournalRequest(signal => supabase.rpc('save_market_journal', {
      p_id: draft.id, p_market_id: draft.marketId, p_business_date: draft.businessDate,
      p_body: draft.body, p_expected_revision: draft.baseRevision, p_mutation_id: draft.mutationId, p_deleted: deleted,
    }).abortSignal(signal).retry(false));
    if (error) throw error;
    return fromRow((Array.isArray(data) ? data[0] : data) as JournalRow);
  },
};
