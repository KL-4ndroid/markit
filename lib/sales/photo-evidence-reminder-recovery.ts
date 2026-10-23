import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase/client';
import { listOwnerSalesPhotoEvidenceReminderRows } from '@/lib/supabase/sales-photo-evidence-reminders';
import { getEventMarketId, getTombstoneTargetEventId } from '@/lib/events/event-read-model';
import { readSalesPhotoEvidenceRequirementSnapshot } from './photo-evidence-requirement-snapshot';
import { createLocalPendingSalesPhotoEvidenceCreation, type LocalPendingSalesPhotoEvidenceCreation } from './photo-evidence-pending-creation';
import type { SalesPhotoEvidenceAlbumSourceRow } from './photo-evidence-owner-album-read-model';
import type { Event } from '@/types/db';

export type SalesPhotoEvidenceReminderRecoveryPlan = {
  additions: LocalPendingSalesPhotoEvidenceCreation[];
  hiddenSaleIds: Set<string>;
  unknownSaleCount: number;
};

const TERMINAL_STATUSES = new Set(['uploaded', 'expired', 'waived_by_owner', 'not_required']);
const PENDING_STATUSES = new Set(['pending_capture', 'capture_skipped', 'captured_local', 'uploading', 'upload_failed']);

export class SalesPhotoEvidenceReminderAccessError extends Error {}

/** No current market flag, missing-row inference, image reconstruction or cloud writes. */
export function planOwnerSalesPhotoEvidenceReminderRecovery(input: {
  ownerId: string;
  marketId: string;
  events: readonly Event[];
  existing: readonly LocalPendingSalesPhotoEvidenceCreation[];
  rows: readonly SalesPhotoEvidenceAlbumSourceRow[];
  now?: string;
}): SalesPhotoEvidenceReminderRecoveryPlan {
  const { ownerId, marketId } = input;
  const scopedEvents = input.events.filter(event => getEventMarketId(event) === marketId);
  const hiddenSaleIds = new Set(scopedEvents.filter(event => event.type === 'deal_deleted')
    .map(getTombstoneTargetEventId).filter((id): id is string => Boolean(id)));
  const rowsBySale = new Map<string, SalesPhotoEvidenceAlbumSourceRow[]>();
  for (const row of input.rows) {
    if (row.owner_id !== ownerId || row.market_id !== marketId || row.deleted_at != null || !row.sale_id) continue;
    rowsBySale.set(row.sale_id, [...(rowsBySale.get(row.sale_id) ?? []), row]);
  }
  const existingBySale = new Map(input.existing.filter(item => item.ownerId === ownerId && item.marketId === marketId)
    .map(item => [item.saleEventId, item]));
  const additions: LocalPendingSalesPhotoEvidenceCreation[] = [];
  let unknownSaleCount = 0;
  for (const event of scopedEvents) {
    if (event.type !== 'deal_closed' || !event.id || hiddenSaleIds.has(event.id)) continue;
    const rows = rowsBySale.get(event.id) ?? [];
    // A fulfilled cloud row wins over stale pending metadata. Never erase the local image.
    if (rows.some(row => TERMINAL_STATUSES.has(row.status))) {
      hiddenSaleIds.add(event.id);
      continue;
    }
    const snapshot = readSalesPhotoEvidenceRequirementSnapshot(event.payload?.photoEvidenceRequirement);
    const boundSnapshot = snapshot?.ownerId === ownerId && snapshot.marketId === marketId
      && event.actor_id === (snapshot.capturedByStaffId ?? ownerId) ? snapshot : null;
    const pendingRow = rows.find(row => PENDING_STATUSES.has(row.status));
    if (!boundSnapshot && !pendingRow && !existingBySale.has(event.id)) unknownSaleCount++;
    if (!pendingRow && boundSnapshot?.required !== true) continue;
    if (existingBySale.has(event.id)) continue;
    try {
      additions.push(createLocalPendingSalesPhotoEvidenceCreation({
        ownerId, marketId, saleEventId: event.id,
        capturedByStaffId: pendingRow ? pendingRow.captured_by_staff_id : boundSnapshot!.capturedByStaffId,
        saleCompletedAt: pendingRow?.sale_completed_at ?? boundSnapshot?.saleCompletedAt ?? '',
        now: input.now,
      }));
    } catch {
      // Invalid identity/time is not a recoverable task and must not become a guessed reminder.
      unknownSaleCount++;
    }
  }
  return { additions, hiddenSaleIds, unknownSaleCount };
}

export async function recoverOwnerSalesPhotoEvidenceReminders(input: {
  ownerId: string;
  marketId: string;
  isCurrent: () => boolean;
}, deps: {
  readRows?: typeof listOwnerSalesPhotoEvidenceReminderRows;
  getActorId?: () => Promise<string | null>;
} = {}): Promise<SalesPhotoEvidenceReminderRecoveryPlan> {
  const getActorId = deps.getActorId ?? (async () => (await supabase.auth.getSession()).data.session?.user.id ?? null);
  const assertCurrent = () => {
    if (!input.isCurrent()) throw new Error('Photo reminder scope changed');
  };
  assertCurrent();
  if (await getActorId() !== input.ownerId) throw new SalesPhotoEvidenceReminderAccessError('Owner photo reminder scope required');
  assertCurrent();
  // Read before the cloud request: newly committed sales must not be reconciled against an older response.
  const initialEvents = await db.events.where('market_id').equals(input.marketId).toArray();
  const initialIds = new Set(initialEvents.map(event => event.id));
  const rows = await (deps.readRows ?? listOwnerSalesPhotoEvidenceReminderRows)(input.ownerId, input.marketId, input.isCurrent);
  if (await getActorId() !== input.ownerId) throw new SalesPhotoEvidenceReminderAccessError('Photo reminder identity changed');
  assertCurrent();
  return db.transaction('rw', db.markets, db.events, db.salesPhotoEvidencePendingCreations, async () => {
    const market = await db.markets.get(input.marketId);
    if (!market || market.owner_id !== input.ownerId || market.isDeleted) throw new SalesPhotoEvidenceReminderAccessError('Owner market scope required');
    const events = await db.events.where('market_id').equals(input.marketId).toArray();
    const existing = await db.salesPhotoEvidencePendingCreations.where('marketId').equals(input.marketId).toArray();
    const plan = planOwnerSalesPhotoEvidenceReminderRecovery({ ...input, rows, existing,
      events: events.filter(event => initialIds.has(event.id) || event.type === 'deal_deleted'),
    });
    assertCurrent();
    for (const item of plan.additions) {
      // Include all owners in the key check: never overwrite another queue or its image binding.
      const existingItem = await db.salesPhotoEvidencePendingCreations.get(item.queueId);
      if (existingItem && (existingItem.ownerId !== input.ownerId || existingItem.marketId !== input.marketId)) {
        throw new Error('Photo reminder queue identity conflict');
      }
      if (!existingItem) {
        assertCurrent();
        await db.salesPhotoEvidencePendingCreations.add(item);
      }
    }
    assertCurrent();
    return plan;
  });
}
