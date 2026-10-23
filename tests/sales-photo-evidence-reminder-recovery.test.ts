import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { recordDeal } from '../lib/db/hooks';
import { normalizeEventForCloud, normalizeEventPayloadForLocal } from '../lib/data-mappers';
import { recordDealWithPhotoEvidenceRequirement } from '../lib/sales/photo-evidence-post-sale';
import { readSalesPhotoEvidenceRequirementSnapshot } from '../lib/sales/photo-evidence-requirement-snapshot';
import { planOwnerSalesPhotoEvidenceReminderRecovery as plan, recoverOwnerSalesPhotoEvidenceReminders as recover, SalesPhotoEvidenceReminderAccessError } from '../lib/sales/photo-evidence-reminder-recovery';
import { listLocalSalesPhotoEvidencePendingTasksForMarket } from '../lib/sales/photo-evidence-pending-creation-read-model';
import { createLocalPendingSalesPhotoEvidenceCreation } from '../lib/sales/photo-evidence-pending-creation';
import { listOwnerSalesPhotoEvidenceReminderRows } from '../lib/supabase/sales-photo-evidence-reminders';
import { supabase } from '../lib/supabase/client';
import type { SalesPhotoEvidenceAlbumSourceRow } from '../lib/sales/photo-evidence-owner-album-read-model';
import type { Event, Market } from '../types/db';

const ownerId = '11111111-1111-4111-8111-111111111111';
const marketId = '22222222-2222-4222-8222-222222222222';
const saleId = '33333333-3333-4333-8333-333333333333';
const staffId = '44444444-4444-4444-8444-444444444444';
const otherId = '55555555-5555-4555-8555-555555555555';
const now = '2026-10-23T03:00:00.000Z';
const snapshot = { version: 1, required: true, ownerId, marketId, capturedByStaffId: null, saleCompletedAt: now };
const sale = (id = saleId, requirement: unknown = snapshot): Event => ({
  id, type: 'deal_closed', actor_id: ownerId, market_id: marketId, timestamp: Date.parse(now), sync_status: 'synced',
  payload: { market_id: marketId, items: [], totalAmount: 50, paymentMethod: 'cash', photoEvidenceRequirement: requirement },
});
const row = (status: SalesPhotoEvidenceAlbumSourceRow['status'], extra = {}): SalesPhotoEvidenceAlbumSourceRow => ({
  id: otherId, owner_id: ownerId, market_id: marketId, sale_id: saleId, captured_by_staff_id: null,
  status, sale_completed_at: now, deleted_at: null, ...extra,
});
const makePlan = (events = [sale()], rows: SalesPhotoEvidenceAlbumSourceRow[] = []) => plan({ ownerId, marketId, events, rows, existing: [], now });
async function clear() {
  await Promise.all([db.events.clear(), db.markets.clear(), db.dailyStats.clear(), db.salesPhotoEvidencePendingCreations.clear(), db.salesPhotoEvidencePendingPayloads.clear()]);
  await db.markets.put({ id: marketId, owner_id: ownerId, name: 'test', totalRevenue: 0, totalProfit: 0, totalDeals: 0 } as Market);
}

async function main() {
  try {
    assert.equal(makePlan().additions.length, 1, 'new required sale is recoverable without a cloud metadata row');
    assert.equal(makePlan([sale(saleId, { ...snapshot, required: false })]).additions.length, 0);
    const oldSale = sale(); delete oldSale.payload.photoEvidenceRequirement;
    assert.equal(makePlan([oldSale]).unknownSaleCount, 1);
    for (const unknown of [null, {}, { ...snapshot, version: 2 }, { ...snapshot, required: 'true' }, { ...snapshot, ownerId: otherId }, { ...snapshot, capturedByStaffId: staffId }]) {
      const result = makePlan([sale(saleId, unknown)]);
      assert.equal(result.additions.length, 0);
      assert.equal(result.unknownSaleCount, 1, 'missing, malformed and cross-identity policies remain unknown');
    }
    assert.equal(readSalesPhotoEvidenceRequirementSnapshot({ ...snapshot, saleCompletedAt: 'bad' }), null);
    const deleted = { ...sale(otherId), type: 'deal_deleted', payload: { eventId: saleId, market_id: marketId } } as Event;
    assert.equal(makePlan([sale(), deleted]).additions.length, 0);
    assert.equal(makePlan([sale(), { ...deleted, market_id: otherId }]).additions.length, 1, 'other market deletion cannot hide sale');
    for (const terminal of ['uploaded', 'expired', 'waived_by_owner', 'not_required'] as const) {
      const result = makePlan([sale()], [row(terminal), row('pending_capture', { id: staffId })]);
      assert.equal(result.additions.length, 0);
      assert.ok(result.hiddenSaleIds.has(saleId));
    }
    assert.equal(makePlan([sale()], [row('uploaded', { owner_id: otherId })]).additions.length, 1);
    assert.equal(makePlan([sale()], [row('uploaded', { deleted_at: now })]).additions.length, 1);
    for (const pending of ['pending_capture', 'capture_skipped', 'captured_local', 'uploading', 'upload_failed'] as const) {
      assert.equal(makePlan([sale(saleId, null)], [row(pending)]).additions.length, 1, 'explicit cloud task can restore older sale');
    }
    assert.equal(makePlan([], [row('pending_capture')]).additions.length, 0, 'no invented source sale');

    // Real recordDeal -> recordEvent transaction -> cloud mapper roundtrip. A queue failure must not lose policy or money.
    await clear();
    const recorded = await recordDealWithPhotoEvidenceRequirement({
      deal: { market_id: marketId, items: [], totalAmount: 50, paymentMethod: 'cash', isManualEntry: true, manualRevenue: 50, manualCost: 10, manualDealCount: 1 },
      ownerId, marketId, marketRequiresEvidence: true, saleCompletedAt: now, recordDeal,
      createPendingEvidence: async () => { throw new Error('simulated interruption before queue persistence'); },
    });
    assert.equal(recorded.evidence.status, 'failed');
    const committed = (await db.events.get(recorded.dealEventId))!;
    assert.deepEqual(committed.payload.photoEvidenceRequirement, snapshot);
    assert.equal((await db.markets.get(marketId))!.totalRevenue, 50);
    const cloud = normalizeEventForCloud(committed);
    assert.deepEqual(normalizeEventPayloadForLocal(cloud.payload).photoEvidenceRequirement, snapshot);

    await clear();
    await db.events.put(sale());
    const deps = { getActorId: async () => ownerId, readRows: async () => [] as SalesPhotoEvidenceAlbumSourceRow[] };
    const input = { ownerId, marketId, isCurrent: () => true };
    await Promise.all([recover(input, deps), recover(input, deps)]);
    assert.equal(await db.salesPhotoEvidencePendingCreations.count(), 1, 'simultaneous recovery does not duplicate queue');
    assert.equal(await db.salesPhotoEvidencePendingPayloads.count(), 0, 'a reminder does not fabricate an image');
    const existing = (await db.salesPhotoEvidencePendingCreations.get(saleId))!;
    existing.retryCount = 2; existing.status = 'failed_retryable'; existing.lastErrorCode = 'retained';
    await db.salesPhotoEvidencePendingCreations.put(existing);
    await db.salesPhotoEvidencePendingPayloads.put({ queueId: saleId, ownerId, marketId, image: { blob: new Blob(['original']) } } as any);
    const fulfilled = await recover(input, { ...deps, readRows: async () => [row('uploaded')] });
    assert.ok(fulfilled.hiddenSaleIds.has(saleId));
    assert.deepEqual(await db.salesPhotoEvidencePendingCreations.get(saleId), existing, 'cloud completion does not rewrite queue or retry state');
    assert.equal((await db.salesPhotoEvidencePendingPayloads.get(saleId))!.image.blob.size, 8, 'original image preserved');
    await assert.rejects(recover(input, { ...deps, getActorId: async () => staffId }), SalesPhotoEvidenceReminderAccessError);
    let actorReads = 0;
    await assert.rejects(recover(input, { ...deps, getActorId: async () => ++actorReads === 1 ? ownerId : staffId }), SalesPhotoEvidenceReminderAccessError);
    await clear(); await db.events.put(sale());
    let current = true;
    await assert.rejects(recover({ ...input, isCurrent: () => current }, { ...deps, readRows: async () => { current = false; return []; } }), /scope changed/);
    assert.equal(await db.salesPhotoEvidencePendingCreations.count(), 0, 'account/navigation change does not write stale tasks');
    await assert.rejects(recover(input, { ...deps, readRows: async () => { throw new Error('offline'); } }), /offline/);
    assert.equal(await db.salesPhotoEvidencePendingCreations.count(), 0, 'failed cloud read does not infer missing metadata');
    let currentChecks = 0;
    await assert.rejects(recover({ ...input, isCurrent: () => ++currentChecks <= 5 }, deps), /scope changed/);
    assert.equal(await db.salesPhotoEvidencePendingCreations.count(), 0, 'identity change after a queue write rolls back the whole transaction');
    await recover(input, { ...deps, readRows: async () => { await db.events.put(deleted); return []; } });
    assert.equal(await db.salesPhotoEvidencePendingCreations.count(), 0, 'deletion during cloud read is respected');
    await db.events.delete(otherId);
    await recover(input, { ...deps, readRows: async () => { await db.events.put(sale(otherId)); return []; } });
    assert.equal(await db.salesPhotoEvidencePendingCreations.count(), 1, 'new sale is not compared with an older metadata response');
    await db.events.put(deleted);
    assert.equal((await listLocalSalesPhotoEvidencePendingTasksForMarket(marketId)).length, 0, 'deleted local sale is not actionable even offline');
    await clear(); await db.events.put(sale());
    await db.salesPhotoEvidencePendingCreations.put(createLocalPendingSalesPhotoEvidenceCreation({ saleEventId: saleId, ownerId: otherId, marketId, saleCompletedAt: now }));
    await assert.rejects(recover(input, deps), /identity conflict/);
    assert.equal((await db.salesPhotoEvidencePendingCreations.get(saleId))!.ownerId, otherId, 'never overwrite conflicting queue identity');

    // More than an album page: full metadata pagination, strict filters and second-page failure.
    const originalFrom = supabase.from;
    try {
      let calls = 0; let failSecond = false;
      (supabase as any).from = (table: string) => {
        assert.equal(table, 'sale_photo_evidence');
        const filters: any[] = []; let cursor: string | null = null;
        const query: any = {
          select: (columns: string) => { assert.ok(!columns.includes('r2_')); return query; },
          eq: (column: string, value: string) => { filters.push([column, value]); return query; },
          is: (column: string, value: null) => { filters.push([column, value]); return query; },
          order: () => query, limit: () => query,
          gt: (_column: string, value: string) => { cursor = value; return query; },
          then: (resolve: (result: any) => void) => {
            calls++; assert.deepEqual(filters, [['owner_id', ownerId], ['market_id', marketId], ['deleted_at', null]]);
            if (cursor) { assert.equal(cursor, 'id-0499'); resolve(failSecond ? { error: new Error('page failed') } : { data: [row('uploaded')], error: null }); }
            else resolve({ data: Array.from({ length: 500 }, (_, i) => row('uploaded', { id: `id-${String(i).padStart(4, '0')}` })), error: null });
          },
        }; return query;
      };
      assert.equal((await listOwnerSalesPhotoEvidenceReminderRows(ownerId, marketId, () => true)).length, 501);
      assert.equal(calls, 2);
      failSecond = true;
      await assert.rejects(listOwnerSalesPhotoEvidenceReminderRows(ownerId, marketId, () => true), /page failed/);
    } finally { supabase.from = originalFrom; }
    console.log('PASS sale-time snapshot, real commit/mapper, recovery, permissions, interruption, image preservation and complete pagination');
  } finally { await db.delete(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
