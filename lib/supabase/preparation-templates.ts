import { supabase } from './client';
import { runJournalRequest } from '@/lib/markets/market-journal-request';
import type { PreparationTemplateCloudPort } from '@/lib/markets/preparation-template-repository';
import type { PreparationTemplate } from '@/lib/markets/preparation-template';

type TemplateRow = { id: string; owner_id: string; name: string; items: PreparationTemplate['items']; revision: number; mutation_id: string; archived: boolean; updated_at: string };
const fromRow = (row: TemplateRow): PreparationTemplate => ({id:row.id,ownerId:row.owner_id,name:row.name,items:row.items,revision:row.revision,mutationId:row.mutation_id,archived:row.archived,updatedAt:row.updated_at});
// Bounded requests; a lost acknowledgement is retried only by the user with the same mutation/application id.
export const preparationTemplateCloud: PreparationTemplateCloudPort = {
  async assertIdentity(actorId) {
    const {data,error} = await runJournalRequest(() => supabase.auth.getSession());
    if (error || data.session?.user.id !== actorId) throw new Error('TEMPLATE_SCOPE');
  },
  async list(ownerId) {
    const rows: PreparationTemplate[] = []; let after: string | null = null;
    for (;;) {
      let query = supabase.from('preparation_templates').select('*').eq('owner_id',ownerId).order('id').limit(200);
      if (after) query = query.gt('id',after);
      const {data,error} = await runJournalRequest(signal => query.abortSignal(signal).retry(false));
      if (error) throw error;
      const page = data as TemplateRow[]; rows.push(...page.map(fromRow));
      if (page.length < 200) return rows;
      after = page[page.length-1].id;
    }
  },
  async save(draft) {
    const {data,error} = await runJournalRequest(signal => supabase.rpc('save_preparation_template', {
      p_id:draft.id,p_owner_id:draft.ownerId,p_name:draft.name,p_items:draft.items,
      p_expected_revision:draft.baseRevision,p_mutation_id:draft.mutationId,p_archived:draft.archived,
    }).abortSignal(signal).retry(false));
    if (error) throw error;
    return fromRow((Array.isArray(data) ? data[0] : data) as TemplateRow);
  },
  async apply(application) {
    const {data,error} = await runJournalRequest(signal => supabase.rpc('apply_preparation_template', {
      p_application_id:application.id,p_market_id:application.marketId,p_template_id:application.templateId,
      p_revision:application.revision,p_item_ids:application.itemIds,
    }).abortSignal(signal).retry(false));
    if (error) throw error;
    return {...data,events:data.events.map((event: {timestamp:string}) => ({...event,timestamp:Date.parse(event.timestamp)}))};
  },
};
