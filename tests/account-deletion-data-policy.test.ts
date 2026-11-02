import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID,randomBytes } from 'node:crypto';
import { evaluateDeletionCatalogCoverage,ACCOUNT_DELETION_RELATION_POLICIES } from '../lib/subscription/account-deletion-data-policy';
import { buildDetachedBillingEvidence } from '../lib/subscription/account-deletion-billing-retention';
import { createBillingRetentionFingerprint } from '../lib/subscription/account-deletion-billing-retention.server';
import { createCanonicalSyncedEvent } from '../lib/sync/synced-event-factory';
import { capturedGuardDefinitions } from '../scripts/lib/account-deletion-catalog-fixture';

const snapshot=JSON.parse(readFileSync('docs/subscription/evidence/account-deletion-catalog-2026-11-02.json','utf8'));
const names=snapshot.rows.filter((r:{category:string})=>r.category==='relation').map((r:{identity:string})=>r.identity);
assert.equal(names.length,45);assert.deepEqual(evaluateDeletionCatalogCoverage(names),{unclassified:[],missing:[],duplicate:[],productionReady:false});
assert.deepEqual(evaluateDeletionCatalogCoverage([...names,'public.new_identity_table']).unclassified,['new_identity_table']);
assert.equal(ACCOUNT_DELETION_RELATION_POLICIES.billing_transactions.retentionYears,5);
assert.equal(ACCOUNT_DELETION_RELATION_POLICIES.billing_event_inbox.owner,'classify_subject_before_detach_never_guess_from_raw_payload');
assert.equal(capturedGuardDefinitions().rows.filter(r=>r.category==='routine').length,13);
const actor=randomUUID(),subject=randomUUID(),transaction=randomUUID(),subscription=randomUUID();
const fingerprint=createBillingRetentionFingerprint(randomBytes(32),'test-v1');
const input={table:'billing_transactions' as const,actorId:actor,billingSubjectId:subject,keyVersion:'test-v1',fingerprint,
  detachedAt:'2026-11-02T00:00:00.000Z',retainUntil:'2031-11-02T00:00:00.000Z',row:{
    id:transaction,owner_id:actor,billing_subscription_id:subscription,billing_origin:'apple_app_store',provider_environment:'sandbox',
    provider_transaction_ref:'private-purchase-token@example.test',provider_parent_transaction_ref:'private-parent@example.test',
    transaction_kind:'refund',transaction_status:'settled',currency:'TWD',amount_minor:'58800',
    provider_effective_at:'2026-11-01T00:00:00Z',provider_observed_at:'2026-11-01T01:00:00Z',settled_at:'2026-11-01T01:00:00Z',
    email:'private-customer@example.test',raw_payload_ciphertext_ref:'secret-raw-ref',support_notes:'private-customer',
  }};
const output=buildDetachedBillingEvidence(input),serialized=JSON.stringify(output);
assert.equal(output.facts.amount_minor,58800);assert.equal(output.facts.transaction_kind,'refund');
for(const secret of [actor,transaction,subscription,'@example.test','secret-raw-ref','private-customer'])assert.ok(!serialized.includes(secret));
assert.equal(output.refs.billing_subscription_id,fingerprint('record:billing_subscriptions',subscription));
assert.notEqual(fingerprint('provider:apple_app_store:sandbox:transaction','same'),fingerprint('provider:apple_app_store:production:transaction','same'));
assert.equal(buildDetachedBillingEvidence(input).recordRef,output.recordRef);
assert.equal(buildDetachedBillingEvidence({...input,row:{...input.row,amount_minor:0}}).facts.amount_minor,0);
const common={id:randomUUID(),owner_id:actor,billing_origin:'apple_app_store',provider_environment:'sandbox'};
for(const [table,row] of [
  ['billing_customer_links',{...common,provider_customer_ref:'private-customer@example.test',created_at:input.detachedAt}],
  ['billing_subscriptions',{...common,billing_customer_link_id:randomUUID(),provider_subscription_ref:'private-subscription@example.test',normalized_plan_code:'team',normalized_cadence:'annual',normalized_billing_status:'refunded',cancel_at_period_end:false,provider_observed_at:input.detachedAt}],
  ['billing_reconciliation_runs',{...common,trigger_kind:'support',status:'succeeded',started_at:input.detachedAt,provider_snapshot_ref:'private-payload-reference'}],
  ['subscription_price_assignments',{...common,assigned_plan_code:'pro',assigned_cadence:'annual',assigned_currency:'TWD',assigned_amount_minor:58800,price_policy:'standard',assigned_at:input.detachedAt,continuity_started_at:input.detachedAt,source_reference:'private-source@example.test'}],
] as const){
  const record=buildDetachedBillingEvidence({...input,table,row});
  assert.ok(!JSON.stringify(record).includes('@example.test'));assert.ok(!JSON.stringify(record).includes('private-payload-reference'));
}
for(const altered of [
  {...input,actorId:randomUUID()}, {...input,table:'billing_event_inbox' as never},
  {...input,row:{...input.row,amount_minor:'9007199254740992'}},
  {...input,row:{...input.row,currency:'private-email@example.test'}},
  {...input,row:{...input.row,provider_effective_at:null}},
  {...input,retainUntil:'2020-01-01T00:00:00Z'}, {...input,keyVersion:'wrong-version'},
  {...input,fingerprint:Object.assign(()=> 'raw-reference',{keyVersion:'test-v1'})},
])assert.throws(()=>buildDetachedBillingEvidence(altered));
const event=createCanonicalSyncedEvent({id:randomUUID(),type:'deal_closed',actor_id:null,market_id:randomUUID(),timestamp:'2026-11-01T00:00:00Z',payload:{totalPrice:99},metadata:{deletedActor:true}});
assert.equal(event.actor_id,undefined);assert.equal(event.sync_status,'synced');assert.equal(event.payload.totalPrice,99);assert.equal(event.metadata?.deletedActor,true);
console.log('PASS 45-relation coverage, minimized billing evidence, cross-owner/unknown inbox rejection and deleted-actor synced reads');
