import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export async function verifyPaymentDeadlineSql(pg, { owner, other, staff, market, legacy, asUser, event, check }) {
  await pg.exec('RESET ROLE');
  const source = readFileSync('supabase/migrations/075_add_market_payment_deadlines.sql', 'utf8');
  const verification = readFileSync('supabase/verification/075_market_payment_deadline_readiness.sql', 'utf8');
  const deadline = { date: '2026-10-24', time: '12:00', timeZone: 'Asia/Taipei', reminderEnabled: true };
  const beforeView = (await pg.query("SELECT pg_get_viewdef('staff_accessible_markets'::regclass) AS body")).rows[0].body;
  const beforeFunction = (await pg.query("SELECT pg_get_functiondef('update_market_read_model()'::regprocedure) AS body")).rows[0].body;
  await pg.exec(source);
  await check('075 grants and schema are ready under Supabase default privileges', () => pg.exec(verification));
  await check('075 appends only deadline metadata and preserves original projector', async () => {
    const view = (await pg.query("SELECT pg_get_viewdef('staff_accessible_markets'::regclass) AS body")).rows[0].body;
    assert.equal(view.replaceAll(',\n    m.payment_deadline', ''), beforeView);
    assert.equal((await pg.query("SELECT pg_get_functiondef('update_market_read_model()'::regprocedure) AS body")).rows[0].body, beforeFunction);
  });
  await asUser(owner);
  const read = async id => (await pg.query('SELECT payment_deadline FROM staff_accessible_markets WHERE id=$1', [id])).rows[0]?.payment_deadline;
  await check('075 legacy data remains unset without backfill', async () => assert.equal(await read(legacy), null));
  await check('075 create, update, reminder opt-out, absent key and clear project', async () => {
    const id = '20000000-0000-0000-0000-000000000075';
    await event('market_created', { name: 'Deadline', location: 'Test', startDate: '2026-10-25', endDate: '2026-10-25', registrationFee: 0, boothCost: 0, paymentDeadline: deadline }, id);
    assert.deepEqual(await read(id), deadline);
    const muted = { ...deadline, reminderEnabled: false };
    await event('market_updated', { updates: { payment_deadline: muted } }, id);
    await event('market_updated', { updates: { notes: 'old client' } }, id);
    assert.deepEqual(await read(id), muted);
    await event('market_updated', { updates: { payment_deadline: null } }, id);
    assert.equal(await read(id), null);
  });
  await check('075 rejects invalid calendar, clock, timezone, types, unknown keys and aliases', async () => {
    for (const invalid of [false, {}, { ...deadline, date: '2026-02-30' }, { ...deadline, date: '2026-2-03' }, { ...deadline, time: '24:00' },
      { ...deadline, time: '' }, { ...deadline, timeZone: 'UTC' }, { ...deadline, reminderEnabled: null }, { ...deadline, amount: 100 }]) {
      await assert.rejects(event('market_updated', { updates: { paymentDeadline: invalid } }, market), error => error.code === '22023');
    }
    await assert.rejects(event('market_updated', { updates: { paymentDeadline: deadline, payment_deadline: null } }, market), error => error.code === '22023');
    assert.equal(await read(market), null);
  });
  await check('075 scheduled operations cannot acquire a registration deadline', async () => {
    await pg.query("UPDATE markets SET session_origin='schedule' WHERE id=$1", [market]);
    await assert.rejects(event('market_updated', { updates: { paymentDeadline: deadline } }, market), error => error.code === '23514');
    await pg.query('UPDATE markets SET session_origin=NULL WHERE id=$1', [market]);
  });
  await check('075 changing deadlines preserves money and status', async () => {
    const before = (await pg.query('SELECT total_revenue,total_profit,booth_cost,status,location FROM markets WHERE id=$1', [legacy])).rows[0];
    await event('market_updated', { updates: { paymentDeadline: deadline } }, legacy);
    assert.deepEqual((await pg.query('SELECT total_revenue,total_profit,booth_cost,status,location FROM markets WHERE id=$1', [legacy])).rows[0], before);
  });
  await asUser(staff);
  await check('075 Staff may read operational deadline with financial redaction but cannot write', async () => {
    const row = (await pg.query('SELECT payment_deadline,total_profit,booth_cost FROM staff_accessible_markets WHERE id=$1', [legacy])).rows[0];
    assert.deepEqual(row, { payment_deadline: deadline, total_profit: null, booth_cost: null });
    await assert.rejects(event('market_updated', { updates: { paymentDeadline: null } }, legacy, staff), error => error.code === '42501');
    await assert.rejects(pg.query('UPDATE markets SET payment_deadline=NULL WHERE id=$1', [legacy]), error => error.code === '42501');
  });
  await asUser(other);
  await check('075 cross-owner events and spoofed attribution fail', async () => {
    assert.equal(await read(legacy), undefined);
    await assert.rejects(event('market_updated', { updates: { paymentDeadline: null } }, legacy, other), error => error.code === '42501');
    await assert.rejects(event('market_updated', { updates: { paymentDeadline: null } }, legacy, owner), error => error.code === '42501');
  });
  await pg.exec('RESET ROLE');
  await check('075 can be reapplied without erasing saved deadlines', async () => {
    await pg.exec(source);
    await pg.exec(verification);
    assert.deepEqual((await pg.query('SELECT payment_deadline FROM markets WHERE id=$1', [legacy])).rows[0].payment_deadline, deadline);
  });
}
