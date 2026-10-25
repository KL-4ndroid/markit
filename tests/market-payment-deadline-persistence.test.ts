import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { recordEvent } from '../lib/db/events';
import { replayOwnerEvents } from '../lib/sync/owner-event-replay';
import { normalizeEventForCloud } from '../lib/data-mappers';
import { getMarketPaymentReminder } from '../lib/markets/market-payment-deadline';
import type { Event, MarketCreatedPayload } from '../types/db';

const base: MarketCreatedPayload & { marketId: string } = { marketId: 'payment-market', name: 'Test', location: '台南', dates: ['2026-10-23', '2026-11-01'], startDate: '2026-10-23', endDate: '2026-11-01', registrationFee: 0, boothCost: 100 };
const deadline = { date: '2026-10-24', timeZone: 'Asia/Taipei' as const, reminderEnabled: true };
async function main() {
  await db.open();
  await db.transaction('rw', [db.events, db.markets, db.dailyStats], async () => {
    await db.events.clear(); await db.markets.clear(); await db.dailyStats.clear();
  });
  const originalNow = Date.now;
  let timestamp = Date.parse('2026-10-23T12:00:00+08:00');
  Date.now = () => timestamp++;
  try {
    delete process.env.NEXT_PUBLIC_MARKET_PAYMENT_DEADLINE_ENABLED;
    await recordEvent('market_created', base);
    assert.equal((await db.markets.get(base.marketId))?.paymentDeadline, undefined);
    const eventCount = await db.events.count();
    await assert.rejects(recordEvent('market_updated', { market_id: base.marketId, updates: { paymentDeadline: deadline } }), /尚未開放/);
    assert.equal(await db.events.count(), eventCount, 'not-ready write must not enter the offline queue');
    await recordEvent('market_updated', { market_id: base.marketId, updates: { notes: 'old fields still work' } });
    process.env.NEXT_PUBLIC_MARKET_PAYMENT_DEADLINE_ENABLED = 'true';
    await recordEvent('market_updated', { market_id: base.marketId, updates: { paymentDeadline: deadline } });
    await recordEvent('market_status_changed', { market_id: base.marketId, oldStatus: 'registered', newStatus: 'accepted' });
    assert.equal(getMarketPaymentReminder((await db.markets.get(base.marketId))!, new Date('2026-10-25T00:00:00+08:00'))?.kind, 'overdue');
    await recordEvent('market_status_changed', { market_id: base.marketId, oldStatus: 'accepted', newStatus: 'paid' });
    assert.equal(getMarketPaymentReminder((await db.markets.get(base.marketId))!, new Date()), null);
    assert.deepEqual((await db.markets.get(base.marketId))?.paymentDeadline, deadline, 'payment stops reminders without destroying the stored deadline');
    await recordEvent('deal_closed', { market_id: base.marketId, items: [], totalAmount: 200, manualRevenue: 200, manualCost: 50, manualDealCount: 2, isManualEntry: true, isBackfill: true, dealDate: '2026-10-23', paymentMethod: 'cash' });
    const stats = await db.dailyStats.toArray();
    const financials = await db.markets.get(base.marketId);
    await recordEvent('market_updated', { market_id: base.marketId, updates: { paymentDeadline: null } });
    assert.equal((await db.markets.get(base.marketId))?.paymentDeadline, null);
    const muted = { ...deadline, date: '2026-10-26', time: '10:30', reminderEnabled: false };
    await recordEvent('market_updated', { market_id: base.marketId, updates: { paymentDeadline: muted } });
    assert.deepEqual(await db.dailyStats.toArray(), stats);
    assert.equal((await db.markets.get(base.marketId))?.totalRevenue, financials?.totalRevenue);
    assert.equal((await db.markets.get(base.marketId))?.totalProfit, financials?.totalProfit);
    assert.equal((await db.markets.get(base.marketId))?.totalDeals, financials?.totalDeals);
    await recordEvent('market_created', { ...base, marketId: 'fixed-payment', sessionOrigin: 'schedule' });
    await assert.rejects(recordEvent('market_updated', { market_id: 'fixed-payment', updates: { paymentDeadline: deadline } }), /固定營業/);
    const stored = await db.events.toArray();
    assert.ok(stored.every(row => row.sync_status === 'local_only'));
    const wire = stored.map(row => ({ ...normalizeEventForCloud(row), sync_status: 'synced' } as Event));
    const existingCount = stored.length;
    await db.transaction('rw', [db.events, db.markets, db.dailyStats], async () => {
      await db.events.clear(); await db.markets.clear(); await db.dailyStats.clear();
    });
    process.env.NEXT_PUBLIC_MARKET_PAYMENT_DEADLINE_ENABLED = 'false';
    await replayOwnerEvents(wire);
    assert.deepEqual((await db.markets.get(base.marketId))?.paymentDeadline, muted, 'cloud replay preserves atomic deadline/date/time/opt-out even with writes off');
    assert.equal((await db.markets.get(base.marketId))?.totalRevenue, financials?.totalRevenue);
    assert.equal((await db.markets.get(base.marketId))?.totalProfit, financials?.totalProfit);
    await replayOwnerEvents(wire);
    assert.equal(await db.events.count(), existingCount);
    assert.equal((await db.markets.get('fixed-payment'))?.paymentDeadline, undefined);
  } finally {
    Date.now = originalNow;
    db.close();
  }
}
main().then(() => console.log('PASS optional deadline persistence, state changes, offline replay, financial invariants and scheduled exclusion')).catch(error => { console.error(error); process.exitCode = 1; });
