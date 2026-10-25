import { db } from '@/lib/db';
import { getNetworkPort } from '@/lib/platform/network-capability';
import { getEventMarketId } from '@/lib/events/event-read-model';
import { preparationTemplatesEnabled, validatePreparationTemplate, type PreparationTemplate, type PreparationTemplateDraft } from './preparation-template';
import type { Event } from '@/types/db';
import { preparationTemplateScopeEpoch } from './preparation-template-scope';
export interface TemplateApplication {
  id: string; marketId: string; templateId: string; revision: number; itemIds: string[];
}
export interface TemplateApplicationResult { appliedCount: number; skippedCount: number; events: Event<Record<string, unknown>>[] }
export interface PreparationTemplateCloudPort {
  assertIdentity(actorId: string): Promise<void>;
  list(ownerId: string): Promise<PreparationTemplate[]>;
  save(draft: PreparationTemplateDraft): Promise<PreparationTemplate>;
  apply(application: TemplateApplication): Promise<TemplateApplicationResult>;
}
/** Online-only authoring/apply. No automatic retry, new pending-operation route or local-only success. */
export class PreparationTemplateRepository {
  private readonly epoch = preparationTemplateScopeEpoch();
  constructor(readonly actorId: string, readonly ownerId: string, private cloud: PreparationTemplateCloudPort) {}
  private assertScope() {
    if (!preparationTemplatesEnabled() || this.epoch !== preparationTemplateScopeEpoch() || !this.actorId || !this.ownerId) throw new Error('TEMPLATE_SCOPE');
    if (!getNetworkPort().getCurrentStatus().connected) throw new Error('TEMPLATE_OFFLINE');
  }
  async list() {
    this.assertScope(); await this.cloud.assertIdentity(this.actorId);
    const rows = await this.cloud.list(this.ownerId);
    await this.cloud.assertIdentity(this.actorId); this.assertScope();
    if (rows.some(row => row.ownerId !== this.ownerId)) throw new Error('TEMPLATE_SCOPE');
    return rows;
  }
  async save(draft: PreparationTemplateDraft) {
    this.assertScope();
    if (draft.ownerId !== this.ownerId) throw new Error('TEMPLATE_SCOPE');
    const valid = validatePreparationTemplate(draft.name, draft.items);
    await this.cloud.assertIdentity(this.actorId);
    const row = await this.cloud.save({...draft, ...valid});
    await this.cloud.assertIdentity(this.actorId); this.assertScope();
    if (row.ownerId !== this.ownerId || row.id !== draft.id) throw new Error('TEMPLATE_SCOPE');
    return row;
  }
  async apply(application: TemplateApplication) {
    this.assertScope(); await this.cloud.assertIdentity(this.actorId);
    // Prevent a cloud-only duplicate check from missing this device's unsynced checklist edits.
    const pending = await db.events.filter(event => getEventMarketId(event) === application.marketId
      && event.type.startsWith('checklist_item_') && event.sync_status !== 'synced').count();
    if (pending) throw new Error('TEMPLATE_PENDING');
    const result = await this.cloud.apply(application);
    await this.cloud.assertIdentity(this.actorId); this.assertScope();
    if (result.events.some(event => event.market_id !== application.marketId || event.actor_id !== this.actorId
      || event.type !== 'checklist_item_created' || !event.id || event.payload.completed !== false)) throw new Error('TEMPLATE_SCOPE');
    await db.transaction('rw', db.events, async () => {
      this.assertScope();
      // Creation events only; later local toggles/edits remain separate and untouched.
      await db.events.bulkPut(result.events.map(event => ({...event, sync_status: 'synced' as const})));
    });
    return result;
  }
}
