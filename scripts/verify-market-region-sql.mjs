/** Disposable PostgreSQL/WASM verification. Never connects to Supabase or writes real data.
 * Install optional runtime outside the app: npm install --prefix .codex-artifacts/region-sql-runtime --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.11
 * Run: node scripts/verify-market-region-sql.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const runtime = resolve('.codex-artifacts/region-sql-runtime/node_modules/@electric-sql/pglite/dist/index.js');
const { PGlite } = await import(pathToFileURL(runtime).href);
const pg = new PGlite();
const migration = name => readFileSync(resolve('supabase/migrations', name), 'utf8');
const owner = '10000000-0000-0000-0000-000000000001';
const other = '10000000-0000-0000-0000-000000000002';
const staff = '10000000-0000-0000-0000-000000000003';
const legacy = '20000000-0000-0000-0000-000000000001';
const market = '20000000-0000-0000-0000-000000000002';
const venue = '30000000-0000-0000-0000-000000000001';
let passed = 0;
const check = (label, fn) => Promise.resolve().then(fn).then(() => { passed++; console.log(`PASS ${label}`); });
const asUser = async id => {
  await pg.exec('RESET ROLE');
  await pg.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id]);
  await pg.exec('SET ROLE authenticated');
};
const event = (type, payload, marketId = null, actor = owner) => pg.query(
  'INSERT INTO events(id,type,payload,market_id,actor_id,timestamp) VALUES($1,$2,$3,$4,$5,NOW())',
  [randomUUID(), type, JSON.stringify(payload), marketId, actor],
);
const region = async id => (await pg.query('SELECT region_code FROM staff_accessible_markets WHERE id=$1', [id])).rows[0]?.region_code;

try {
  await pg.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE TABLE auth.users(id UUID PRIMARY KEY);
    INSERT INTO auth.users VALUES('${owner}'),('${other}'),('${staff}');
    CREATE TABLE profiles(id UUID PRIMARY KEY REFERENCES auth.users);
    INSERT INTO profiles SELECT id FROM auth.users;
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS
      $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID $$;
    CREATE TABLE staff_relationships(owner_id UUID, staff_id UUID, status TEXT, permissions JSONB);
    INSERT INTO staff_relationships VALUES('${owner}','${staff}','active','{"role":"manager"}');
    CREATE TABLE events(id UUID PRIMARY KEY,type TEXT,payload JSONB,actor_id UUID,market_id UUID,timestamp TIMESTAMPTZ);
    ALTER TABLE events ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fixture_event_insert ON events FOR INSERT TO authenticated WITH CHECK(actor_id=auth.uid());
    GRANT SELECT, INSERT ON events TO authenticated;
    CREATE TABLE market_members(market_id UUID,user_id UUID,role TEXT,PRIMARY KEY(market_id,user_id));
  `);
  const marketsDDL = migration('001_uuid_schema.sql').match(/CREATE TABLE IF NOT EXISTS markets \([\s\S]*?\n\);/)[0]
    .replaceAll('uuid_generate_v4()', 'gen_random_uuid()');
  await pg.exec(marketsDDL);
  await pg.exec(`ALTER TABLE markets ADD COLUMN is_collaborative BOOLEAN DEFAULT FALSE,
    ADD COLUMN operation_phase TEXT, ADD COLUMN operation_session_date DATE,
    ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE, ADD COLUMN sync_status TEXT,
    ADD COLUMN sales_photo_evidence_required BOOLEAN DEFAULT FALSE;
    ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fixture_market_owner ON markets TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
    CREATE POLICY fixture_market_staff ON markets TO authenticated USING(EXISTS(
      SELECT 1 FROM staff_relationships sr WHERE sr.owner_id=markets.owner_id AND sr.staff_id=auth.uid() AND sr.status='active'
    ));
    GRANT SELECT,UPDATE,INSERT ON markets TO authenticated;
    GRANT SELECT ON staff_relationships TO authenticated;
  `);
  // Real parent projection functions, recurring policies and view, including time-clear patch.
  await pg.exec(migration('056_wire_sales_photo_evidence_market_projection.sql'));
  await pg.exec(`CREATE TRIGGER trigger_update_market_read_model AFTER INSERT ON events
    FOR EACH ROW EXECUTE FUNCTION update_market_read_model();`);
  await pg.exec(migration('069_add_recurring_hybrid_operations.sql'));
  await pg.exec(migration('070_enforce_recurring_operations_owner_role.sql'));
  await pg.exec(migration('072_preserve_explicit_market_time_clears.sql'));
  await pg.exec(`INSERT INTO markets(id,owner_id,name,location,start_date,end_date,total_revenue,total_profit,booth_cost)
    VALUES('${legacy}','${owner}','Legacy','台南南紡','2026-10-23','2026-10-23',500,300,100);`);
  const before = await pg.query("SELECT pg_get_functiondef('public.update_market_read_model()'::regprocedure) AS body");
  const oldView = await pg.query("SELECT pg_get_viewdef('staff_accessible_markets'::regclass) AS body");
  const source = migration('074_add_market_region_foundation.sql');
  // Mirror Supabase's direct default grants, which differ from vanilla Postgres.
  await pg.exec('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role');
  await pg.exec(source);
  await check('explicit revocations defeat Supabase-style default client grants', async () => {
    const { rows } = await pg.query(`SELECT
      has_function_privilege('anon','public.project_market_region_event()','EXECUTE') AS anon_projector,
      has_function_privilege('authenticated','public.project_market_region_event()','EXECUTE') AS user_projector,
      has_function_privilege('anon','public.guard_market_region_change()','EXECUTE') AS anon_guard,
      has_function_privilege('authenticated','public.guard_market_region_change()','EXECUTE') AS user_guard,
      has_function_privilege('anon','public.market_region_code_is_valid(TEXT)','EXECUTE') AS anon_catalog`);
    assert.ok(Object.values(rows[0]).every(value => value === false));
  });
  await check('migration keeps existing projection function and financial redaction', async () => {
    assert.deepEqual(await pg.query("SELECT pg_get_functiondef('public.update_market_read_model()'::regprocedure) AS body"), before);
    const nextView = (await pg.query("SELECT pg_get_viewdef('staff_accessible_markets'::regclass) AS body")).rows[0].body;
    assert.equal(nextView.replaceAll(',\n    m.region_code', ''), oldView.rows[0].body);
  });
  await pg.exec('GRANT SELECT ON staff_accessible_markets TO authenticated');
  await asUser(owner);
  await check('legacy row remains unclassified, money and location unchanged', async () => {
    assert.equal(await region(legacy), null);
    const row = (await pg.query('SELECT location,total_revenue,total_profit,booth_cost FROM markets WHERE id=$1', [legacy])).rows[0];
    assert.deepEqual(row, { location: '台南南紡', total_revenue: '500.00', total_profit: '300.00', booth_cost: '100.00' });
  });
  await check('market creation projects camel code and old update preserves it', async () => {
    await event('market_created', { name: 'Test', location: '自由地點', startDate: '2026-10-24', endDate: '2026-10-24', boothCost: 100, registrationFee: 0, regionCode: 'tw-tainan-city' }, market);
    assert.equal(await region(market), 'tw-tainan-city');
    await event('market_updated', { updates: { notes: 'old client' } }, market);
    assert.equal(await region(market), 'tw-tainan-city');
  });
  await check('wire snake code and explicit null project correctly', async () => {
    await event('market_updated', { updates: { region_code: 'tw-kaohsiung-city' } }, market);
    assert.equal(await region(market), 'tw-kaohsiung-city');
    await event('market_updated', { updates: { region_code: null } }, market);
    assert.equal(await region(market), null);
  });
  await check('invalid, empty and conflicting values roll back the event', async () => {
    for (const updates of [{ regionCode: '' }, { region_code: 3 }, { region_code: '台南市' }, { regionCode: null, region_code: 'tw-tainan-city' }]) {
      await assert.rejects(event('market_updated', { updates }, market), error => error.code === '22023');
    }
    assert.equal(await region(market), null);
  });
  await check('Venue events project and do not rewrite market snapshots', async () => {
    await event('venue_created', { venueId: venue, name: 'Venue', status: 'active', regionCode: 'tw-tainan-city' });
    await event('venue_updated', { venueId: venue, updates: { regionCode: 'tw-kaohsiung-city' } });
    assert.equal((await pg.query('SELECT region_code FROM venues WHERE id=$1', [venue])).rows[0].region_code, 'tw-kaohsiung-city');
    assert.equal(await region(market), null);
    await event('venue_updated', { venueId: venue, updates: { regionCode: null } });
    assert.equal((await pg.query('SELECT region_code FROM venues WHERE id=$1', [venue])).rows[0].region_code, null);
  });
  await asUser(other);
  await check('cross-owner region event fails and cannot read another owner', async () => {
    assert.equal(await region(market), undefined);
    await assert.rejects(event('market_updated', { updates: { regionCode: 'tw-tainan-city' } }, market, other), error => error.code === '42501');
    await assert.rejects(event('market_updated', { updates: { regionCode: null } }, market, owner), error => error.code === '42501');
  });
  await asUser(staff);
  await check('Staff read metadata with existing finance redaction; cannot classify or manage Venue', async () => {
    const row = (await pg.query('SELECT region_code,total_profit,booth_cost,total_revenue FROM staff_accessible_markets WHERE id=$1', [legacy])).rows[0];
    assert.deepEqual(row, { region_code: null, total_profit: null, booth_cost: null, total_revenue: '500.00' });
    await assert.rejects(event('market_updated', { updates: { regionCode: 'tw-tainan-city' } }, market, staff), error => error.code === '42501');
    await assert.rejects(pg.query('UPDATE markets SET region_code=$1 WHERE id=$2', ['tw-tainan-city', market]), error => error.code === '42501');
    assert.equal((await pg.query('SELECT * FROM venues')).rows.length, 0);
    await assert.rejects(event('venue_updated', { venueId: venue, updates: { regionCode: null } }, null, staff), error => error.code === '42501');
  });
  await asUser(owner);
  await check('direct table writes enforce catalog and owner scope', async () => {
    await assert.rejects(pg.query('UPDATE markets SET region_code=$1 WHERE id=$2', ['invalid', market]), error => error.code === '23514');
    await pg.query('UPDATE markets SET region_code=$1 WHERE id=$2', ['tw-tainan-city', market]);
    assert.equal(await region(market), 'tw-tainan-city');
  });
  await pg.exec('RESET ROLE');
  await check('migration rerun preserves saved code', async () => {
    await pg.exec(source);
    assert.equal((await pg.query('SELECT region_code FROM markets WHERE id=$1', [market])).rows[0].region_code, 'tw-tainan-city');
  });
  await check('unexpected deployed view change aborts instead of replacing it', async () => {
    const definition = (await pg.query("SELECT pg_get_viewdef('staff_accessible_markets'::regclass) AS body")).rows[0].body;
    await pg.exec(`CREATE OR REPLACE VIEW staff_accessible_markets AS ${definition.trim().replace(/;$/, '')} AND false;`);
    await assert.rejects(pg.exec(source), /Unexpected staff view definition/);
    await pg.exec('ROLLBACK');
    const current = (await pg.query("SELECT pg_get_viewdef('staff_accessible_markets'::regclass) AS body")).rows[0].body;
    assert.notEqual(current, definition, 'failed migration must preserve the deployed definition');
    await pg.exec(`CREATE OR REPLACE VIEW staff_accessible_markets AS ${definition}`);
  });
  await check('read-only cloud readiness SQL executes', () => pg.exec(readFileSync('supabase/verification/074_market_region_readiness.sql', 'utf8')));
  await check('repair file removes direct grants left by an earlier apply', async () => {
    await pg.exec('GRANT EXECUTE ON FUNCTION public.project_market_region_event() TO anon, authenticated');
    await assert.rejects(pg.exec(readFileSync('supabase/verification/074_market_region_readiness.sql', 'utf8')), /must not be callable/);
    await pg.exec(readFileSync('supabase/repairs/074_revoke_region_client_execution.sql', 'utf8'));
    await pg.exec(readFileSync('supabase/verification/074_market_region_readiness.sql', 'utf8'));
  });
  if (process.argv.includes('--with-payment-deadline') || process.argv.includes('--with-journals')) {
    const { verifyPaymentDeadlineSql } = await import('../tests/fixtures/market-payment-deadline-sql.mjs');
    await verifyPaymentDeadlineSql(pg, { owner, other, staff, market, legacy, asUser, event, check });
  }
  if (process.argv.includes('--with-journals')) {
    const { verifyJournalSql } = await import('../tests/fixtures/market-journal-sql.mjs');
    await verifyJournalSql(pg, { owner, other, staff, market, legacy, asUser, event, check });
  }
  if(process.argv.includes('--with-backfill')){
    const {verifyRegionBackfillSql}=await import('../tests/fixtures/market-region-backfill-sql.mjs');
    await verifyRegionBackfillSql(pg,{owner,other,staff,asUser,check});
  }
  if(process.argv.includes('--with-owner-followup')){
    const {verifyOwnerFollowupSql}=await import('../tests/fixtures/owner-followup-sql.mjs');
    await verifyOwnerFollowupSql(pg,{owner,other,staff,asUser,check});
  }
  console.log(`${passed} disposable PostgreSQL checks passed; no cloud connection used.`);
} finally {
  await pg.close();
}
