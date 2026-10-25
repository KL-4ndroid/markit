import assert from 'node:assert/strict';
import { normalizePaymentDeadline, readPaymentDeadline, paymentDeadlineCutoff, getMarketPaymentReminder, comparePaymentDeadlines, paymentReminderSummary, assertPaymentDeadlineWriteReady } from '../lib/markets/market-payment-deadline';
import { marketCreatedPayloadToCloud, marketUpdatesToSnake, marketRowToLocal, normalizeEventPayloadForLocal } from '../lib/data-mappers';
import { buildMarketPlanningViewModel } from '../lib/markets/market-planning-view-model';
import { hasMarketFormChanges, validateMarketCoreForm } from '../lib/markets/market-form';
import { assertFreshStaffCapability } from '../lib/permissions/role-freshness';
import type { Market } from '../types/db';

const deadline = { date: '2026-10-24', timeZone: 'Asia/Taipei' as const, reminderEnabled: true };
const market: Market = { id: 'm', name: 'm', location: '台南', startDate: '2026-11-01', endDate: '2026-11-01', status: 'accepted', registrationFee: 0, boothCost: 0, createdAt: 1, updatedAt: 1, paymentDeadline: deadline };
for (const invalid of [false, {}, { ...deadline, date: '2026-02-30' }, { ...deadline, date: '2026-2-03' }, { ...deadline, date: '0099-01-01' }, { ...deadline, time: '' }, { ...deadline, time: '24:00' }, { ...deadline, time: null }, { ...deadline, reminderEnabled: null }, { ...deadline, timeZone: 'UTC' }, { ...deadline, amount: 1 }]) {
  assert.throws(() => normalizePaymentDeadline(invalid));
}
assert.equal(normalizePaymentDeadline(null), null);
assert.equal(normalizePaymentDeadline(undefined), undefined);
assert.deepEqual(normalizePaymentDeadline({ date: deadline.date, timeZone: deadline.timeZone }), deadline);
assert.equal(hasMarketFormChanges({ paymentDeadline: deadline }, { paymentDeadline: { reminderEnabled: true, timeZone: 'Asia/Taipei', date: deadline.date } }), false, 'object key order is not a deadline change');
assert.equal(hasMarketFormChanges({ paymentDeadline: null }, { paymentDeadline: undefined }), false);
assert.equal(paymentDeadlineCutoff(deadline), Date.parse('2026-10-25T00:00:00+08:00'));
assert.equal(paymentDeadlineCutoff({ ...deadline, time: '12:00' }), Date.parse('2026-10-24T12:00:00+08:00'));
assert.equal(getMarketPaymentReminder(market, new Date('2026-10-24T23:59:59+08:00'))?.kind, 'today');
assert.equal(getMarketPaymentReminder(market, new Date('2026-10-25T00:00:00+08:00'))?.kind, 'overdue');
assert.equal(getMarketPaymentReminder({ ...market, paymentDeadline: { ...deadline, time: '12:00' } }, new Date('2026-10-24T12:00:00+08:00'))?.kind, 'overdue');
assert.equal(getMarketPaymentReminder(market, new Date('2026-10-21T10:00:00+08:00'))?.kind, 'soon');
assert.equal(getMarketPaymentReminder(market, new Date('2026-10-20T10:00:00+08:00'))?.kind, 'upcoming');
assert.equal(getMarketPaymentReminder({ ...market, paymentDeadline: null }, new Date())?.kind, 'unknown');
assert.equal(getMarketPaymentReminder({ ...market, paymentDeadline: { ...deadline, reminderEnabled: false } }, new Date('2026-10-30T00:00:00+08:00'))?.kind, 'muted');
for (const status of ['registered', 'paid', 'ongoing', 'completed', 'cancelled', 'postponed'] as const) assert.equal(getMarketPaymentReminder({ ...market, status }, new Date()), null);
assert.equal(getMarketPaymentReminder({ ...market, sessionOrigin: 'schedule' }, new Date()), null);
assert.equal(getMarketPaymentReminder({ ...market, isDeleted: true }, new Date()), null);
const originalZone = process.env.TZ;
for (const zone of ['America/New_York', 'UTC', 'Asia/Taipei']) {
  process.env.TZ = zone;
  assert.equal(getMarketPaymentReminder(market, new Date('2026-10-24T16:00:00Z'))?.kind, 'overdue');
}
if (originalZone === undefined) delete process.env.TZ; else process.env.TZ = originalZone;
const cloud = marketCreatedPayloadToCloud({ ...market, paymentDeadline: { date: deadline.date, timeZone: deadline.timeZone } } as never);
assert.deepEqual(cloud.paymentDeadline, deadline);
assert.deepEqual(cloud.payment_deadline, deadline);
assert.deepEqual((normalizeEventPayloadForLocal(cloud) as Market).paymentDeadline, deadline);
assert.deepEqual(marketUpdatesToSnake({ paymentDeadline: null }), { payment_deadline: null });
assert.deepEqual(marketUpdatesToSnake({ paymentDeadline: null, payment_deadline: undefined }), { payment_deadline: null }, 'undefined alias cannot swallow an explicit clear');
assert.deepEqual(marketUpdatesToSnake({ paymentDeadline: undefined, notes: 'legacy' }), { notes: 'legacy' });
assert.equal(marketRowToLocal({ ...market, paymentDeadline: undefined }).paymentDeadline, undefined);
assert.deepEqual(marketRowToLocal({ ...market, paymentDeadline: undefined, payment_deadline: deadline }).paymentDeadline, deadline);
assert.throws(() => readPaymentDeadline({ paymentDeadline: null, payment_deadline: deadline }));
assert.ok(comparePaymentDeadlines(market, { paymentDeadline: null }) < 0);
assert.equal(comparePaymentDeadlines({ paymentDeadline: null }, { paymentDeadline: undefined }), 0);
const now = new Date('2026-10-24T09:00:00+08:00');
const rows = [
  { ...market, id: 'unknown', paymentDeadline: undefined },
  { ...market, id: 'future', paymentDeadline: { ...deadline, date: '2026-10-30' } },
  { ...market, id: 'today' },
  { ...market, id: 'overdue', paymentDeadline: { ...deadline, date: '2026-10-23' } },
  { ...market, id: 'paid', status: 'paid' as const },
  { ...market, id: 'fixed', sessionOrigin: 'schedule' as const },
];
const snapshot = JSON.stringify(rows);
const planning = buildMarketPlanningViewModel(rows, now);
assert.deepEqual(planning.paymentDue.map(item => item.market.id), ['overdue', 'today', 'future', 'unknown']);
assert.equal(paymentReminderSummary(planning.paymentDue.map(item => item.paymentReminder)), '逾期 1 場 · 今天截止 1 場');
assert.equal(JSON.stringify(rows), snapshot, 'reminders never change status or financial records');
assert.ok(validateMarketCoreForm({ paymentDeadline: { ...deadline, time: 'bad' } }).paymentDeadline);
delete process.env.NEXT_PUBLIC_MARKET_PAYMENT_DEADLINE_ENABLED;
assert.throws(() => assertPaymentDeadlineWriteReady('market_created', { paymentDeadline: deadline }), /尚未開放/);
assert.doesNotThrow(() => assertPaymentDeadlineWriteReady('market_updated', { updates: { notes: 'old' } }));
process.env.NEXT_PUBLIC_MARKET_PAYMENT_DEADLINE_ENABLED = 'true';
assert.doesNotThrow(() => assertPaymentDeadlineWriteReady('market_updated', { updates: { paymentDeadline: null } }));
assert.throws(() => assertPaymentDeadlineWriteReady('market_created', { sessionOrigin: 'schedule', paymentDeadline: deadline }), /固定營業/);
for (const key of ['paymentDeadline','payment_deadline']) assert.throws(() => assertFreshStaffCapability({ userId: 'staff', eventType: 'market_updated', payload: { updates: { [key]: deadline } }, now: 1, rawCache: JSON.stringify({ userId: 'staff', role: { isStaff: true, staffRole: 'manager' }, timestamp: 1 }) }), /Staff write blocked/);
console.log('PASS optional deadlines, Taiwan cutoffs, opt-out, state changes, stable sorting, sync and role boundaries');
