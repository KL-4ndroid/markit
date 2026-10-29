import { parseSubscriptionWriteDecision, type SubscriptionWriteDecision } from './write-access';
import type { EventType } from '@/types/db';
export type SubscriptionReadFeature = 'sales' | 'products' | 'cash' | 'product_photo' | 'sales_photo' | 'advanced';
type ReadRpcClient = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
};
/** The service authenticates the actor first; SQL resolves the current tier and scope. */
export async function checkSubscriptionRead(
  client: ReadRpcClient, actorId: string, ownerId: string, feature: SubscriptionReadFeature,
): Promise<SubscriptionWriteDecision> {
  try {
    const result = await client.rpc('check_subscription_read_for_actor', {
      p_actor: actorId, p_owner: ownerId, p_feature: feature,
    });
    if (!result.error) {
      const decision = parseSubscriptionWriteDecision(result.data);
      if (decision) return decision;
    }
  } catch { /* Missing or failed authority must not grant access. */ }
  return { enabled: true, allowed: false, reason: 'entitlement_unavailable' };
}
export type SubscriptionReadScope = { ownerId: string; enforced: boolean; scope: 'legacy' | 'foundation' | 'paid' };
export function parseSubscriptionReadScope(value: unknown, ownerId: string): SubscriptionReadScope | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.ownerId !== ownerId || typeof row.enforced !== 'boolean'
    || !['legacy','foundation','paid'].includes(String(row.scope))) return null;
  if (row.enforced === (row.scope === 'legacy')) return null;
  return row as SubscriptionReadScope;
}

/** Free foundation writes can continue while paid drafts wait for restored access. */
export function canSyncEventInScope(type: EventType, scope: SubscriptionReadScope['scope']): boolean {
 if (scope !== 'foundation') return true;
 return ['market_created','market_updated','market_status_changed','market_started','market_ended','market_deleted',
  'venue_created','venue_updated','venue_archived','operation_schedule_created','operation_schedule_updated',
  'operation_schedule_paused','operation_schedule_resumed','operation_schedule_archived',
  'checklist_item_created','checklist_item_updated','checklist_item_toggled','checklist_item_deleted','settings_updated'].includes(type);
}
