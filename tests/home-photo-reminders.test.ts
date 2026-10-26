import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { reconcileHomePhotoReminders } from '../lib/sales/home-photo-reminders';
import { recoverOwnerSalesPhotoEvidenceReminders, SalesPhotoEvidenceReminderAccessError } from '../lib/sales/photo-evidence-reminder-recovery';
import { listLocalSalesPhotoEvidencePendingTasksForMarket } from '../lib/sales/photo-evidence-pending-creation-read-model';
import type { Market, Event } from '../types/db';

async function main() {
  const ownerId = '11111111-1111-4111-8111-111111111111';
  const marketId = '22222222-2222-4222-8222-222222222222';
  const saleId = '33333333-3333-4333-8333-333333333333';
  const now = '2026-10-26T01:00:00Z';
  const input = { ownerId, marketIds: [marketId, marketId], isCurrent: () => true };
  const recover: typeof recoverOwnerSalesPhotoEvidenceReminders = scope => recoverOwnerSalesPhotoEvidenceReminders(scope, {
    getActorId: async () => ownerId, readRows: async () => [],
  });
  try {
    await db.markets.put({ id: marketId, owner_id: ownerId, name: 'test' } as Market);
    assert.equal((await reconcileHomePhotoReminders(input, recover))?.failedMarkets, 0);
    assert.equal((await listLocalSalesPhotoEvidencePendingTasksForMarket(marketId)).length, 0);
    // Markets can hydrate before sales. A later source refresh must recover the reminder.
    await db.events.put({ id: saleId, type: 'deal_closed', market_id: marketId, actor_id: ownerId,
      timestamp: Date.parse(now), sync_status: 'synced', payload: { market_id: marketId, totalAmount: 300,
        photoEvidenceRequirement: { version: 1, required: true, ownerId, marketId, capturedByStaffId: null, saleCompletedAt: now } },
    } as Event);
    await reconcileHomePhotoReminders(input, recover);
    const items = await listLocalSalesPhotoEvidencePendingTasksForMarket(marketId);
    assert.equal(items.length, 1, 'first home visit needs no market-detail mount');
    assert.equal(await db.salesPhotoEvidencePendingPayloads.count(), 0, 'reminder recovery cannot invent an original photo');
    await reconcileHomePhotoReminders(input, recover);
    assert.equal(await db.salesPhotoEvidencePendingCreations.count(), 1, 'repeat checks are idempotent');
    const result = await reconcileHomePhotoReminders(input, scope => recoverOwnerSalesPhotoEvidenceReminders(scope, {
      getActorId: async () => ownerId,
      readRows: async () => [{ id: saleId, owner_id: ownerId, market_id: marketId, sale_id: saleId,
        captured_by_staff_id: null, status: 'uploaded', sale_completed_at: now, deleted_at: null }],
    }));
    assert.ok(result?.hiddenSaleIds.has(saleId), 'uploaded metadata removes stale home reminders without deleting images');
    assert.equal(await db.events.count(), 1, 'no new sale or rewritten source event');
    assert.equal(await reconcileHomePhotoReminders({ ...input, isCurrent: () => false }, recover), null);
    const partial = await reconcileHomePhotoReminders(input, async () => { throw new Error('offline'); });
    assert.equal(partial?.failedMarkets, 1, 'offline is unconfirmed, not a fabricated all-clear');
    await assert.rejects(reconcileHomePhotoReminders(input, async () => { throw new SalesPhotoEvidenceReminderAccessError('identity changed'); }), SalesPhotoEvidenceReminderAccessError);
    let active = 0, peak = 0, calls = 0;
    await reconcileHomePhotoReminders({ ...input, marketIds: Array.from({ length: 10 }, (_, i) => `m${i}`) }, async () => {
      calls++; active++; peak = Math.max(peak, active); await Promise.resolve(); active--;
      return { additions: [], hiddenSaleIds: new Set(), unknownSaleCount: 0 };
    });
    assert.equal(calls, 10); assert.ok(peak <= 3, 'cloud reads have bounded concurrency');
    console.log('PASS first-home recovery, delayed hydration, idempotency, uploaded reconciliation, identity rejection and bounded reads');
  } finally { await db.delete(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
