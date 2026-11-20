import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {SignedDataVerifier,Environment,VerificationException,VerificationStatus} from '@apple/app-store-server-library';
import {createAppleSignedFixture} from './fixtures/apple-signed-fixture';
import {createAppleVerificationAdapter,createAppleSdk} from '../lib/subscription/apple-verification.server';
import {createAppleHandlers} from '../lib/subscription/apple-handlers.server';
import {createApplePostgresRepository} from '../lib/subscription/apple-repository.server';
import {CURRENT_SUBSCRIPTION_PRICE_CATALOG,getSubscriptionPriceVersion,isSubscriptionPriceVersionId} from '../lib/subscription/subscription-pricing';
async function main(){
 const fixture=createAppleSignedFixture(),pool=new Pool({host:'127.0.0.1',port:1,database:'not_used'});
 try{
  const c={authenticatedOwnerId:randomUUID(),expectedAccountBindingToken:randomUUID(),environment:'sandbox' as const};
  const identity={environment:'sandbox' as const,bundleId:'com.stallight.test',subscriptionGroupId:'777'};
  const verifier=new SignedDataVerifier([fixture.root],false,Environment.SANDBOX,identity.bundleId);
  const now=Date.now();const tx={environment:'Sandbox',bundleId:identity.bundleId,subscriptionGroupIdentifier:'777',type:'Auto-Renewable Subscription',inAppOwnershipType:'PURCHASED',quantity:1,productId:'fixture.pro',transactionId:'10001',originalTransactionId:'10000',appAccountToken:c.expectedAccountBindingToken,purchaseDate:now-1000,expiresDate:now+86400000,signedDate:now};
  const price={...CURRENT_SUBSCRIPTION_PRICE_CATALOG.pro_monthly_twd_2026_10_v1,runtimeStatus:'active' as const,effectiveAt:new Date(now-86400000).toISOString()};
  let queries=0;
  const adapter=createAppleVerificationAdapter({...identity,verifier,now:Date.now,mapping:async p=>p===tx.productId?{origin:'apple_app_store',environment:'sandbox',productId:p,basePlanId:null,offerId:null,status:'active',price}:null,
   client:{async getAllSubscriptionStatuses(){queries++;return {bundleId:identity.bundleId,environment:'Sandbox',data:[{subscriptionGroupIdentifier:'777',lastTransactions:[{status:1,originalTransactionId:tx.originalTransactionId,signedTransactionInfo:fixture.sign(tx),signedRenewalInfo:fixture.sign({environment:'Sandbox',originalTransactionId:tx.originalTransactionId,productId:tx.productId,appAccountToken:c.expectedAccountBindingToken,autoRenewStatus:1,signedDate:now})}]}]};}}});
  const proof={schemaVersion:1 as const,store:'apple_app_store' as const,productId:tx.productId,opaqueVerificationPayload:fixture.sign(tx)};
  assert.equal((await adapter.verifyPurchase({context:c,request:proof})).ok,true);assert.equal(queries,0,'proof is not current-state verification');
  assert.equal((await adapter.querySubscription({context:c,origin:'apple_app_store',providerSubscriptionRef:'10000'})).ok,true);assert.equal(queries,1);
  // A trusted renewal that occurs during a query must not be rejected as future-to-observation.
  const causal=createAppleVerificationAdapter({...identity,verifier,mapping:async()=>({origin:'apple_app_store',environment:'sandbox',productId:tx.productId,basePlanId:null,offerId:null,status:'active',price}),now:()=>Date.now(),client:{async getAllSubscriptionStatuses(){const purchase=Date.now();await new Promise(r=>setTimeout(r,4));return {environment:'Sandbox',bundleId:identity.bundleId,data:[{subscriptionGroupIdentifier:'777',lastTransactions:[{status:1,originalTransactionId:'10000',signedTransactionInfo:fixture.sign({...tx,purchaseDate:purchase,expiresDate:purchase+86400000,signedDate:Date.now()}),signedRenewalInfo:fixture.sign({environment:'Sandbox',originalTransactionId:'10000',productId:tx.productId,appAccountToken:c.expectedAccountBindingToken,autoRenewStatus:1,signedDate:Date.now()})}]}]};}}});
  const renewed=await causal.querySubscription({context:c,origin:'apple_app_store',providerSubscriptionRef:'10000'});assert.ok(renewed.ok);assert.ok(renewed.value.storeObservedAt>=renewed.value.currentPeriodStartsAt!);
  for(const altered of [{bundleId:'wrong'},{environment:'Production'},{appAccountToken:randomUUID()},{offerType:1},{signedDate:Date.now()+86400000},{quantity:2}])assert.equal((await adapter.verifyPurchase({context:c,request:{...proof,opaqueVerificationPayload:fixture.sign({...tx,...altered})}})).ok,false);
  assert.throws(()=>createAppleSdk({...identity,roots:[fixture.root],signingKey:'fixture',keyId:'fixture',issuerId:randomUUID()}));
  for(const p of Object.values(CURRENT_SUBSCRIPTION_PRICE_CATALOG)){assert.equal(isSubscriptionPriceVersionId(p.id),true);assert.equal(getSubscriptionPriceVersion(p.id),p);assert.equal(p.runtimeStatus,'candidate');}
  const store=createApplePostgresRepository(pool,'sandbox');let authenticated=0;
  const deps={enabled:false,identity,verifier,store,adapter:()=>adapter,authenticate:async()=>{authenticated++;return c.authenticatedOwnerId;},now:Date.now};
  const disabled=createAppleHandlers(deps);assert.equal((await disabled.purchase(new Request('https://test.invalid',{method:'POST'}))).status,503);assert.equal(authenticated,0);
  const enabled=createAppleHandlers({...deps,enabled:true});
  assert.equal((await enabled.purchase(new Request('https://test.invalid'))).status,405);
  const request=(body:string)=>new Request('https://test.invalid',{method:'POST',headers:{'content-type':'application/json'},body});
  assert.equal((await enabled.purchase(request('x'.repeat(65537)))).status,400);
  assert.equal((await enabled.notification(request('{"signedPayload":"nope","owner":"untrusted"}'))).status,400);
  assert.equal((await enabled.notification(request('{"signedPayload":"nope"}'))).status,400);
  const unavailableVerifier={...verifier,verifyAndDecodeTransaction:verifier.verifyAndDecodeTransaction.bind(verifier),verifyAndDecodeRenewalInfo:verifier.verifyAndDecodeRenewalInfo.bind(verifier),async verifyAndDecodeNotification(){throw new VerificationException(VerificationStatus.RETRYABLE_VERIFICATION_FAILURE);}};
  assert.equal((await createAppleHandlers({...deps,enabled:true,verifier:unavailableVerifier}).notification(request('{"signedPayload":"retryable-ocsp-fixture"}'))).status,503,'transient certificate service failure must trigger provider retry, not permanent invalid-payload handling');
  assert.equal((await createAppleHandlers({...deps,enabled:true,authenticate:async()=>null}).purchase(request('{}'))).status,401);
  const sql=readFileSync('docs/subscription/drafts/APPLE_B04_LOCAL_WRITER.sql','utf8');
  assert.ok(sql.includes("current_database()<>'stallight_b04_test'"));
  assert.ok(sql.includes('REVOKE ALL ON FUNCTION native_billing_private.command(text,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role'));
  assert.ok(sql.includes('SECURITY DEFINER SET search_path=pg_catalog'));
  for(const table of ['billing_customer_links','billing_subscriptions','billing_event_inbox','billing_reconciliation_runs','subscription_accounts'])assert.ok(sql.includes('public.'+table));
  assert.ok(!/ALTER\s+FUNCTION|DISABLE\s+TRIGGER|DISABLE\s+ROW\s+LEVEL|DROP\s+TRIGGER/i.test(sql));
  assert.ok(!existsSync('app/api/subscription/apple/verify/route.ts'),'B04 must not activate a public runtime');
  console.log('PASS Apple B04 SDK signatures / identity / current query / current pricing / body and auth / default-off / SQL boundary');
 }finally{await pool.end();fixture.close();}
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
