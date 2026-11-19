// Extends the existing disposable migration fixture; no second DB harness.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { buildRegistrationCompatibility, REGISTRATION_SOURCE } from './account-deletion-registration-compat';
import { migrationCatalogSql } from './account-deletion-migration';

type Fixture = {
  sql(source: string): string; reject(source: string, code: string): void; pass(message: string): void;
  insert(table: string, row: Record<string, unknown>): void;
  owner: string; other: string; market: string; otherMarket: string;
};

export function verifyRegistrationCompatibility(f: Fixture) {
  const { sql, reject, pass, owner, other, market, otherMarket } = f;
  const candidate = buildRegistrationCompatibility();
  const ack = `SET deletion.registration_environment='isolated';${candidate.ack}`;
  const strip = (source: string) => source.replace(/\nBEGIN;\n/, '\n').replace(/COMMIT;\s*$/, '');
  const catalog = () => sql(migrationCatalogSql());
  const readback = readFileSync('docs/subscription/candidate/097_deletion_compat_production_readback.sql', 'utf8');
  const hashData = () => sql("SELECT md5(coalesce(jsonb_agg(to_jsonb(m) ORDER BY id),'[]')::text) FROM public.markets m;");
  const before096 = catalog();
  reject(candidate.sql, 'registration_compat_target_ack_required');
  const testTarget = buildRegistrationCompatibility('test_prg');
  assert.equal(sql(`BEGIN;UPDATE deletion_release_private.installation SET project_ref='${testTarget.projectRef}';
    SET deletion.registration_environment='isolated';${testTarget.ack}${strip(testTarget.sql)}
    SELECT i.schema_hash=(${migrationCatalogSql()}) AND NOT c.runtime_enabled
    FROM deletion_release_private.installation i CROSS JOIN deletion_release_private.controls c;ROLLBACK;`), 't');
  assert.equal(catalog(), before096);
  pass('modeled test_prg accepts its own target, atomically adds absent 097 and compatibility, and transaction rollback removes both changes');
  reject(ack + candidate.sql.replace('-- Only the reviewed', "RAISE EXCEPTION 'compat_late_failure';\n -- Only the reviewed"), 'compat_late_failure');
  assert.equal(catalog(), before096, 'atomic 097+compat failure restores the pre-097 catalog');
  sql(readFileSync(REGISTRATION_SOURCE, 'utf8'));
  sql(`UPDATE public.markets SET registration_conditions='{"tableFree":"rental","chairFree":"free","umbrellaFree":"self"}' WHERE id='${market}';
       UPDATE public.markets SET registration_conditions='{"tableFree":"unknown"}' WHERE id='${otherMarket}';`);
  const raw097 = catalog(), data = hashData();
  reject('SELECT deletion_engine_private.assert_catalog();', 'engine_unreviewed_catalog');
  pass('097 reproduces the installed 096 drift; synthetic registration data is retained for upgrade/rollback tests');
  const drift = (ddl: string, code = 'registration_compat_unreviewed_drift') => {
    reject(`BEGIN;${ddl}${ack}${strip(candidate.sql)}ROLLBACK;`, code);
    assert.equal(catalog(), raw097);
    assert.equal(hashData(), data);
  };
  drift('CREATE TABLE public.registration_unreviewed(id uuid);');
  drift('ALTER TABLE public.markets ADD COLUMN registration_extra text;', 'registration_compat_097_view');
  drift('ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;');
  drift('GRANT EXECUTE ON FUNCTION public.project_market_registration_conditions() TO authenticated;', 'registration_compat_097_routine');
  drift('ALTER FUNCTION public.project_market_registration_conditions() SET statement_timeout=\'1s\';', 'registration_compat_097_routine');
  drift('ALTER TABLE public.events DISABLE TRIGGER zz_project_market_registration_conditions;', 'registration_compat_097_trigger');
  drift('ALTER TABLE public.markets ALTER COLUMN registration_conditions SET DEFAULT \'{}\';', 'registration_compat_097_column');
  drift('CREATE OR REPLACE VIEW public.owner_accessible_markets WITH(security_barrier=true) AS SELECT * FROM public.markets;', 'registration_compat_097_view');
  drift("UPDATE deletion_release_private.installation SET project_ref='wrong';", 'registration_compat_096_required');
  const wrongTarget = buildRegistrationCompatibility('test_prg');
  reject(`SET deletion.registration_environment='isolated';${wrongTarget.ack}${wrongTarget.sql}`, 'registration_compat_096_required');
  assert.notEqual(wrongTarget.projectRef, candidate.projectRef);
  pass('097 compatibility rejects unknown schema, RLS/ACL/routine/view/trigger/default drift and wrong project before approving any catalog');
  reject(ack + candidate.sql.replace('-- Only the reviewed', "RAISE EXCEPTION 'compat_late_failure';\n -- Only the reviewed"), 'compat_late_failure');
  assert.equal(catalog(), raw097);assert.equal(hashData(), data);
  sql(ack + candidate.sql);
  const after = catalog();
  assert.equal(hashData(), data);
  assert.equal(sql('SELECT schema_hash FROM deletion_release_private.installation;'), after);
  assert.equal(sql('SELECT runtime_enabled FROM deletion_release_private.controls;'), 'f');
  sql('SELECT deletion_engine_private.assert_catalog();');
  sql(ack + candidate.sql);assert.equal(catalog(), after);assert.equal(hashData(), data);
  assert.equal(sql(readback), `${candidate.projectRef}|096-account-deletion-candidate-v2|t|${candidate.version}`);
  reject(`BEGIN;UPDATE deletion_release_private.installation SET version='unreviewed';
    ${readback.replace('BEGIN READ ONLY;', '').replace(/ROLLBACK;\s*$/, '')}ROLLBACK;`, 'registration_compat_readback_failed');
  reject(`BEGIN;CREATE TABLE public.compat_installed_drift(id uuid);${ack}${strip(candidate.sql)}ROLLBACK;`, 'registration_compat_installed_drift');
  assert.equal(catalog(), after);
  pass('097 upgrade commits atomically, adds the column to the reviewed catalog, preserves data and verifies idempotent replay while disabled');
  const asOwner = (who: string, statement: string, prefix = '') => sql(`BEGIN;${prefix}
    SET LOCAL request.jwt.claim.sub='${who}';SET LOCAL request.jwt.claim.role='authenticated';SET LOCAL ROLE authenticated;
    ${statement};ROLLBACK;`);
  assert.equal(asOwner(owner, `SELECT registration_conditions->>'tableFree' FROM public.owner_accessible_markets WHERE id='${market}'`), 'rental');
  assert.equal(asOwner(other, `SELECT count(*) FROM public.owner_accessible_markets WHERE id='${market}'`), '0');
  assert.equal(asOwner(owner, `SELECT registration_conditions->>'tableFree'='rental' AND total_revenue IS NULL AND total_profit IS NULL
    FROM public.owner_accessible_markets WHERE id='${market}'`,
    `INSERT INTO public.subscription_read_guard_settings(singleton,enforce_all)VALUES(true,true)
       ON CONFLICT(singleton)DO UPDATE SET enforce_all=true;
     UPDATE public.subscription_accounts SET plan_code='free',plan_source='free' WHERE owner_id='${owner}';`), 't');
  const freeze = `INSERT INTO deletion_engine_private.frozen VALUES(encode(extensions.digest('${owner}','sha256'),'hex'),'${randomUUID()}');`;
  assert.equal(asOwner(owner, `SELECT count(*) FROM public.owner_accessible_markets WHERE id='${market}'`, freeze), '0');
  for (const role of ['anon', 'authenticated', 'service_role']) {
    reject(`BEGIN;SET LOCAL ROLE ${role};SELECT public.project_market_registration_conditions();ROLLBACK;`, 'permission denied');
  }
  reject(`BEGIN;${freeze}${ack}${strip(candidate.rollbackSql)}ROLLBACK;`, 'registration_compat_inactive_required');
  pass('097 owner view preserves Free equipment visibility and financial masks, cross-brand isolation and frozen-owner exclusion; projector and active rollback remain protected');
  sql(`BEGIN;DO $cancel$
    DECLARE request_id uuid;
    BEGIN
      SELECT r.request_id INTO request_id FROM public.bff_create_account_deletion_request('${owner}',repeat('1',64),repeat('2',64),'2026-08-17','clean')r;
      PERFORM public.bff_confirm_account_deletion_request('${owner}',request_id,'requested');
      PERFORM public.bff_cancel_account_deletion_request('${owner}',request_id,'identity_confirmed');
      IF (SELECT status FROM public.account_deletion_requests WHERE id=request_id)<>'cancelled'
        OR (SELECT registration_conditions->>'tableFree' FROM public.markets WHERE id='${market}')<>'rental'
      THEN RAISE EXCEPTION 'registration_cancellation_did_not_preserve_data'; END IF;
    END;$cancel$;ROLLBACK;`);
  assert.equal(hashData(), data);
  pass('request, identity confirmation and cancellation preserve 097 equipment data and leave no freeze');
  sql(ack + candidate.rollbackSql);
  assert.equal(catalog(), raw097);assert.equal(hashData(), data);
  assert.equal(sql('SELECT schema_hash FROM deletion_release_private.installation;'), before096);
  reject('SELECT deletion_engine_private.assert_catalog();', 'engine_unreviewed_catalog');
  reject(readback, 'registration_compat_readback_failed');
  sql(ack + candidate.sql);assert.equal(catalog(), after);assert.equal(hashData(), data);
  pass('compatibility rollback restores exact pre-upgrade 097 schema/data and old disabled 096 receipt; reapply succeeds without dropping the field');
}
