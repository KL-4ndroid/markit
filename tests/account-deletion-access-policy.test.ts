import assert from 'node:assert/strict';
import {capturedAccessDefinitions,frozenRoutineDefinition,frozenPublicSurfaceDdl,accessCatalogManifestDdl} from '../scripts/lib/account-deletion-access-fixture';
import {deletionArgumentReference,deletionRoutineMode} from '../lib/subscription/account-deletion-access-policy';

const capture=capturedAccessDefinitions();
assert.equal(capture.routines.length,134);
assert.equal(capture.relations.filter(r=>r.detail.kind==='v').length,5);
// Every captured input is classified, including uuid[] nested-template identifiers.
for(const r of capture.routines)assert.doesNotThrow(()=>frozenRoutineDefinition(r.detail,r.detail.definition),r.identity);
assert.throws(()=>deletionArgumentReference('new_writer','unreviewed_target','uuid'),/Unclassified UUID/);
assert.equal(deletionArgumentReference('apply_preparation_template','p_item_ids','uuid[]'),'none');
assert.throws(()=>deletionArgumentReference('unreviewed_writer','p_item_ids','uuid[]'),/Unclassified UUID/);
assert.equal(deletionRoutineMode('subscription_read_guard_active','boolean'),'guarded');
assert.equal(deletionRoutineMode('subscription_read_paid','boolean'),'false_on_denial');
assert.equal(deletionRoutineMode('delete_current_user_app_data','jsonb'),'disabled_legacy');
// Guard runs before DECLARE expressions, including security-definer defaults.
const snapshot=capture.routines.find(r=>r.detail.name==='cleanup_old_snapshots')!.detail;
const wrapped=frozenRoutineDefinition(snapshot,snapshot.definition)!;
assert.ok(wrapped.indexOf('assert_rpc')<wrapped.indexOf('DECLARE'));
assert.ok(wrapped.indexOf('snapshot_owner_scope')<wrapped.indexOf('DELETE FROM public.snapshots'));
assert.match(wrapped,/GET DIAGNOSTICS n=ROW_COUNT/);
for(const r of capture.routines.filter(r=>r.detail.volatility==='i')){
 assert.equal(deletionRoutineMode(r.detail.name,r.detail.returnType),'pure');
 assert.equal(frozenRoutineDefinition(r.detail,r.detail.definition),null);
}
// Default-declared variables in the deployed event guard must stay behind the outer gate.
const trigger=capture.routines.find(r=>r.detail.name==='enforce_subscription_row_write')!.detail;
const triggerSql=frozenRoutineDefinition(trigger,trigger.definition)!;
assert.ok(triggerSql.indexOf('assert_rpc')<triggerSql.indexOf('DECLARE'));
assert.match(triggerSql,/worker_row/);
const manifest=accessCatalogManifestDdl();
assert.match(manifest,/Unreviewed public routine/);
assert.match(manifest,/t\.tgenabled/);
assert.match(manifest,/p\.proacl/);
assert.match(manifest,/p\.polroles/);
const current=Object.fromEntries(capture.routines.map(r=>[`${r.detail.name}(${r.detail.argumentTypes})`,r.detail.definition]));
const all=frozenPublicSurfaceDdl(current);
for(const r of capture.routines){const rewritten=frozenRoutineDefinition(r.detail,r.detail.definition);if(rewritten)assert.ok(all.includes(rewritten));}
assert.match(all,/REVOKE TRUNCATE ON ALL TABLES/);
assert.throws(()=>frozenPublicSurfaceDdl({...current,'subscription_read_paid(uuid)':''}),/Captured runtime routine missing/);
console.log('PASS captured access classification, unknown UUID rejection, pre-DECLARE guards and immutable routine safety');
