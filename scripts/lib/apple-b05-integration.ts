import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createApplePurchasePort, type ApplePurchaseBridge } from '../../lib/platform/capacitor/apple-purchases';
import { createApplePurchaseSession } from '../../lib/subscription/apple-purchase-session';
import { createApplePurchaseServerClient } from '../../lib/subscription/apple-purchase-client';
import type { InAppPurchaseProduct } from '../../lib/platform/contracts/in-app-purchase';

/** Reuse B04 disposable Auth/DB/signature/API setup, without repeating its lifecycle matrix. */
export async function runAppleB05Integration(input: {
  origin: string; ownerId: string; accessToken: string; accountToken: string; productId: string;
  proof(): { opaqueVerificationPayload: string }; account(): { plan_code: string; plan_source: string };
  sql(query: string): string; dropAck(): void;
}) {
  const checks: string[] = []; const pass = (name: string) => { checks.push(name); console.log('PASS B05 LIVE ' + name); };
  let queued = false, purchases = 0, finishes = 0;
  const ids = [input.productId, 'fixture.pro.year', 'fixture.team.month', 'fixture.team.year'];
  const products: InAppPurchaseProduct[] = ids.map((id, i) => ({ store: 'apple_app_store', productId: id, displayName: id,
    purchaseOptions: [{ purchaseOptionId: id, basePlanId: null, offerId: null, pricePhases: [{ displayPrice: ['NT$59','NT$588','NT$249','NT$2,490'][i], currencyCode: 'TWD', billingPeriod: i%2?'P1Y':'P1M', billingCycleCount: null, paymentMode: 'recurring' }] }] }));
  const proof = input.proof();
  const bridge: ApplePurchaseBridge = {
    async products() { return { products }; },
    async purchase() { purchases++; queued = true; return { status: 'success', transaction: tx() }; },
    async transactions(value) { return { transactions: queued || value.sync ? [tx()] : [], accountMismatch: false }; },
    async finish() { finishes++; queued = false; }, async manage() {},
  };
  function tx() { return { productId: input.productId, transactionId: '10001', accountToken: input.accountToken, environment: 'sandbox', jws: proof.opaqueVerificationPayload }; }
  const port = createApplePurchasePort({ enabled: true, environment: 'sandbox', productIds: ids, bridge });
  let owner = input.ownerId;
  const server = createApplePurchaseServerClient({ ownerId: input.ownerId, accessToken: () => input.accessToken, currentOwner: () => owner,
    apiUrl: { configuredBaseUrl: input.origin, buildTarget: 'web', runtimeProtocol: 'http:' },
    refresh: async () => { const account = input.account(); return account.plan_source === 'billing' && account.plan_code === 'pro'; } });
  const create = () => createApplePurchaseSession({ port, server, configuration: { enabled: true, productIds: ids, copyReviewed: true, termsUrl: 'https://example.com/terms', privacyUrl: 'https://example.com/privacy' },
    context: () => ({ ownerId: owner, accountToken: input.accountToken, online: true, ownerAuthorized: true, capabilityFresh: true, billingOrigin: null, hasActiveSubscription: false }), changed() {} });
  const session = create(); await session.initialize(); assert.equal(session.getState().phase, 'ready'); pass('real Auth-bound session / bridge catalog / localized display prices');
  input.dropAck(); await session.purchase(input.productId);
  assert.equal(session.getState().phase, 'retry'); assert.equal(finishes, 0); assert.equal(queued, true);
  assert.equal(input.account().plan_code, 'pro'); pass('client -> HTTP B04 -> official JWS verification -> SQL commit with dropped response');
  session.dispose(); const reopened = create(); await reopened.initialize();
  assert.equal(reopened.getState().phase, 'confirmed'); assert.equal(purchases, 1); assert.equal(finishes, 1);
  assert.equal(input.sql('SELECT count(*) FROM public.billing_subscriptions;'), '1'); pass('reopen reads unfinished / duplicate receipt -> finish / no second purchase');
  await reopened.restore(); assert.equal(purchases, 1); assert.equal(reopened.getState().phase, 'confirmed'); pass('explicit restore -> latest authoritative snapshot -> same owner projection');
  owner = 'wrong-owner'; const before = finishes; await reopened.retry(); assert.equal(finishes, before); pass('account switch cannot reuse authenticated server port or finish');
  assert.equal(input.sql('SELECT count(*) FROM public.markets;'), '1'); assert.equal(input.sql('SELECT count(*) FROM public.billing_transactions;'), '0'); pass('business data retained; list prices do not fabricate payments');
  const paths = ['lib/platform/contracts/in-app-purchase.ts','lib/platform/capacitor/apple-purchases.ts','lib/platform/capacitor/load-apple-purchases.ts',
    'lib/subscription/apple-purchase-session.ts','lib/subscription/apple-purchase-client.ts','lib/subscription/apple-purchase-runtime.ts',
    'components/subscription/ApplePurchaseView.tsx','components/subscription/NativeSubscriptionActions.tsx','scripts/lib/apple-b05-integration.ts','scripts/verify-apple-b04.ts',
    'plugins/stallight-purchases/ios/Sources/StallightPurchasesPlugin/StallightPurchasesPlugin.swift'];
  writeFileSync('docs/evidence/ios-windows-b05-purchase-2026-11-20.json', JSON.stringify({ date:'2026-11-20',environment:'Windows disposable PostgreSQL17 / GoTrue / real SDK signatures with synthetic CA / HTTP B04',checks,passed:checks.length,
    liveStoreKit:false,swiftCompiled:false,productionEnabled:false,sources:paths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path,'utf8').replaceAll('\r\n','\n')).digest('hex')})) },null,2)+'\n');
}
