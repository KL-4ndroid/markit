import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApplePurchasePort, type ApplePurchaseBridge } from '../lib/platform/capacitor/apple-purchases';
import { createApplePurchaseSession, type ApplePurchaseContext, type ApplePurchaseServerPort } from '../lib/subscription/apple-purchase-session';
import { createApplePurchaseServerClient } from '../lib/subscription/apple-purchase-client';
import { getApplePurchaseRuntime, getServerApplePurchaseRuntime, installApplePurchaseRuntime, subscribeApplePurchaseRuntime } from '../lib/subscription/apple-purchase-runtime';
import type { InAppPurchaseProduct } from '../lib/platform/contracts/in-app-purchase';

const token = '11111111-1111-4111-8111-111111111111';
const ids = ['fixture.pro.month', 'fixture.pro.year', 'fixture.team.month', 'fixture.team.year'];
const config = { enabled: true, productIds: ids, copyReviewed: true, termsUrl: 'https://example.com/terms', privacyUrl: 'https://example.com/privacy' };
const products: InAppPurchaseProduct[] = ids.map((id, i) => ({ store: 'apple_app_store', productId: id, displayName: ['輕量版 月繳', '輕量版 年繳', '高階版 月繳', '高階版 年繳'][i],
  purchaseOptions: [{ purchaseOptionId: id, basePlanId: null, offerId: null, pricePhases: [{ displayPrice: ['NT$59', 'NT$588', 'NT$249', 'NT$2,490'][i], currencyCode: 'TWD', billingPeriod: i % 2 ? 'P1Y' : 'P1M', billingCycleCount: null, paymentMode: 'recurring' }] }] }));
function fixture() {
  let ctx: ApplePurchaseContext | null = { ownerId: 'owner', accountToken: token, online: true, ownerAuthorized: true, capabilityFresh: true, billingOrigin: null, hasActiveSubscription: false };
  let unacknowledged = false, pending = false;
  let outcome: Awaited<ReturnType<ApplePurchaseServerPort['verify']>> = 'committed';
  const calls = { purchase: 0, verify: 0, finish: 0, sync: 0, manage: 0, refresh: 0 };
  const tx = { productId: ids[0], transactionId: '1001', environment: 'sandbox', accountToken: token, jws: 'e30.e30.c2ln' };
  const bridge: ApplePurchaseBridge = {
    async products() { return { products }; },
    async purchase() { calls.purchase++; unacknowledged = true; return { status: 'success', transaction: tx }; },
    async transactions(input) { if (input.sync) calls.sync++; return { transactions: unacknowledged || input.sync ? [tx] : [], accountMismatch: false, pending }; },
    async finish() { calls.finish++; unacknowledged = false; }, async manage() { calls.manage++; },
  };
  const port = createApplePurchasePort({ enabled: true, environment: 'sandbox', productIds: ids, bridge });
  const server: ApplePurchaseServerPort = { async verify() { calls.verify++; return outcome; }, async refresh() { calls.refresh++; return true; } };
  const session = () => createApplePurchaseSession({ port, server, configuration: config, context: () => ctx, changed() {} });
  return { bridge, port, server, session, calls, tx, setContext: (value: Partial<ApplePurchaseContext>) => { ctx = { ...ctx!, ...value }; },
    outcome: (value: typeof outcome) => { outcome = value; }, unacknowledged: () => unacknowledged, setPending: () => { pending = true; } };
}
async function main() {
  assert.equal(getApplePurchaseRuntime(), null);
  const checks: string[] = []; const pass = (name: string) => { checks.push(name); console.log('PASS B05 ' + name); };
  {
    const f = fixture(), s = f.session(); await s.initialize(); assert.equal(s.getState().phase, 'ready');
    await Promise.all([s.purchase(ids[0]), s.purchase(ids[0])]); assert.equal(f.calls.purchase, 1); assert.equal(f.calls.verify, 1); assert.equal(f.calls.finish, 1); assert.equal(s.getState().phase, 'confirmed');
    pass('double tap -> single purchase -> verified commit -> finish -> refreshed UI');
  }
  {
    const f = fixture(), s = f.session(); await s.initialize(); f.outcome('retry'); await s.purchase(ids[0]);
    assert.equal(f.calls.finish, 0); assert.equal(f.unacknowledged(), true); s.dispose();
    f.outcome('committed'); const reopened = f.session(); await reopened.initialize();
    assert.equal(f.calls.purchase, 1); assert.equal(f.calls.verify, 2); assert.equal(f.calls.finish, 1); assert.equal(reopened.getState().phase, 'confirmed');
    pass('lost commit response / process reopen recovers without re-purchasing');
  }
  for (const outcome of ['review', 'rejected'] as const) {
    const f = fixture(), s = f.session(); await s.initialize(); f.outcome(outcome); await s.purchase(ids[0]);
    assert.equal(f.calls.finish, 0); assert.equal(s.getState().phase, 'review'); await s.purchase(ids[0]); assert.equal(f.calls.purchase, 1);
    pass(outcome + ' never grants or finishes');
  }
  for (const context of [{ online: false }, { capabilityFresh: false }, { ownerAuthorized: false }]) {
    const f = fixture(); f.setContext(context); const s = f.session(); await s.initialize(); await s.restore(); await s.purchase(ids[0]); assert.equal(f.calls.purchase + f.calls.verify + f.calls.sync, 0);
  }
  pass('offline / stale capability / employee blocks store and verification operations');
  {
    const f = fixture(), s = f.session(); await s.initialize(); let release!: () => void;
    f.server.verify = async () => { await new Promise<void>(resolve => { release = resolve; }); return 'committed'; };
    const work = s.purchase(ids[0]); while (!release) await new Promise(resolve => setTimeout(resolve, 0));
    f.setContext({ ownerId: 'another' }); release(); await work;
    assert.equal(f.calls.finish + f.calls.refresh, 0); assert.notEqual(s.getState().phase, 'confirmed');
    pass('account switch while verifying suppresses old UI / finish / refresh');
  }
  {
    const f = fixture(), s = f.session(); f.bridge.purchase = async () => ({ status: 'cancelled' }); await s.initialize(); await s.purchase(ids[0]);
    assert.equal(s.getState().phase, 'cancelled'); assert.equal(f.calls.verify, 0); pass('cancelled is neutral and never sent as payment success');
  }
  {
    const f = fixture(), s = f.session(); f.bridge.purchase = async () => { f.setPending(); return { status: 'pending' }; }; await s.initialize(); await s.purchase(ids[0]);
    assert.equal(s.getState().phase, 'pending'); s.dispose(); const reopened = f.session(); await reopened.initialize(); await reopened.purchase(ids[0]);
    assert.equal(reopened.getState().phase, 'pending'); assert.equal(f.calls.verify, 0); pass('pending survives reopen through native uncertainty marker');
  }
  {
    const f = fixture(), s = f.session(); await s.initialize(); f.bridge.finish = async () => { throw Error('locked'); }; await s.purchase(ids[0]);
    assert.equal(s.getState().phase, 'retry'); assert.equal(f.unacknowledged(), true); f.bridge.finish = async () => {}; await s.retry(); assert.equal(s.getState().phase, 'confirmed'); assert.equal(f.calls.purchase, 1);
    pass('finish failure safely repeats verification, not payment');
  }
  {
    const f = fixture(), s = f.session(); await s.restore(); assert.equal(f.calls.sync, 1); assert.equal(f.calls.purchase, 0); assert.equal(s.getState().phase, 'confirmed');
    const other = fixture(); other.bridge.transactions = async () => ({ transactions: [], accountMismatch: true }); const r = other.session(); await r.restore(); assert.equal(r.getState().phase, 'review'); assert.equal(other.calls.verify, 0);
    pass('explicit restore works without paid tier; wrong binding is not empty success');
  }
  {
    const f = fixture(); f.setContext({ hasActiveSubscription: true, billingOrigin: 'google_play' }); const s = f.session(); await s.initialize(); await s.purchase(ids[0]); await s.manage(); assert.equal(f.calls.purchase + f.calls.manage, 0);
    f.setContext({ billingOrigin: 'apple_app_store' }); await s.manage(); assert.equal(f.calls.manage, 1); assert.equal(s.getState().phase, 'management_returned'); assert.doesNotMatch(s.getState().message, /交易已保存/); pass('existing subscription blocks duplicate / management follows original store');
  }
  {
    const f = fixture(); f.bridge.products = async () => ({ products: products.slice(0, 3) }); const s = f.session(); await s.initialize(); await s.purchase(ids[0]); assert.equal(f.calls.purchase, 0);
    f.bridge.products = async () => ({ products }); await s.retry(); assert.equal(s.getState().phase, 'ready');
    f.bridge.products = async () => ({ products: products.map(p => ({ ...p, purchaseOptions: [{ ...p.purchaseOptions[0], pricePhases: [{ ...p.purchaseOptions[0].pricePhases[0], displayPrice: '' }] }] })) });
    await s.initialize(); assert.equal(s.getState().phase, 'retry'); pass('missing product / invalid store price cannot purchase; catalog retry recovers');
  }
  {
    const f = fixture(); f.server.refresh = async () => false; const s = f.session(); await s.initialize(); await s.purchase(ids[0]); assert.equal(s.getState().phase, 'refresh_required'); assert.equal(f.calls.finish, 1);
    pass('committed purchase with unreadable capability does not claim unlocked access');
  }
  {
    const f = fixture(), s = f.session(); await s.initialize();
    f.server.verify = async () => { f.setContext({ online: false }); return 'committed'; };
    await s.purchase(ids[0]); assert.equal(s.getState().phase, 'retry'); assert.equal(f.calls.finish, 0);
    f.setContext({ online: true }); f.server.verify = async () => 'committed'; await s.retry(); assert.equal(s.getState().phase, 'confirmed'); assert.equal(f.calls.purchase, 1);
    pass('network loss during verification leaves an operable retry, never a stuck spinner');
  }
  {
    const f = fixture(), s = f.session(); await s.initialize();
    f.bridge.transactions = async () => ({ transactions: [], accountMismatch: false }); await s.restore(); assert.equal(s.getState().phase, 'empty');
    await s.purchase(ids[0]); assert.equal(s.getState().phase, 'confirmed');
    pass('empty restore does not trap a new customer outside available purchase options');
  }
  {
    const f = fixture(), s = f.session(); await s.initialize(); let release!: () => void;
    f.server.verify = async () => { await new Promise<void>(resolve => { release = resolve; }); return 'committed'; };
    const work = s.purchase(ids[0]); while (!release) await new Promise(resolve => setTimeout(resolve, 0));
    await s.retry(); release(); await work; await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(f.calls.purchase, 1); assert.equal(s.getState().phase, 'confirmed');
    pass('transaction update during in-flight work queues recovery without another purchase');
  }
  {
    const f = fixture(); let calls = 0; let owner = 'owner';
    const client = createApplePurchaseServerClient({ ownerId: 'owner', currentOwner: () => owner, accessToken: () => 'fixture-token', refresh: async () => true,
      apiUrl: { configuredBaseUrl: 'https://api.example.invalid', buildTarget: 'mobile' },
      fetchImpl: async (url, init) => { calls++; assert.equal(url, 'https://api.example.invalid/api/subscription/apple/verify'); assert.equal(init?.method, 'POST');
        const body = JSON.parse(String(init?.body)); assert.deepEqual(Object.keys(body).sort(), ['opaqueVerificationPayload', 'productId', 'schemaVersion', 'store']);
        return Response.json({ code: 'policy_review_required' }); } });
    const proof = { store: 'apple_app_store' as const, environment: 'sandbox' as const, productId: ids[0], opaqueVerificationPayload: f.tx.jws };
    assert.equal(await client.verify('owner', proof), 'review'); owner = 'other'; assert.equal(await client.verify('owner', proof), 'rejected'); assert.equal(calls, 1);
    pass('mobile API contract never sends owner/price/environment; 200 hold is not delivery');
  }
  const native = readFileSync('plugins/stallight-purchases/ios/Sources/StallightPurchasesPlugin/StallightPurchasesPlugin.swift', 'utf8');
  assert.match(native, /Transaction\.unfinished/); assert.match(native, /Transaction\.updates/); assert.match(native, /appAccountToken\(token\)/);
  assert.match(native, /getBoolean\("enabled", false\)/);
  assert.doesNotMatch(native.slice(native.indexOf('@objc public func purchase'), native.indexOf('@objc public func transactions')), /await tx\.finish/);
  assert.doesNotMatch(readFileSync('lib/subscription/apple-purchase-session.ts', 'utf8'), /@capacitor|window\.|localStorage|Dexie|indexedDB/);
  const f = fixture(); let updates = 0; const unsubscribe = subscribeApplePurchaseRuntime(() => { updates++; });
  const uninstall = installApplePurchaseRuntime({ configuration: config, port: f.port, async connect() {
    return { accountToken: token, billingOrigin: null, hasActiveSubscription: false, server: f.server };
  } });
  assert.notEqual(getApplePurchaseRuntime(), null); assert.equal(getServerApplePurchaseRuntime(), null);
  uninstall(); unsubscribe(); assert.equal(getApplePurchaseRuntime(), null); assert.equal(updates, 2);
  pass('source boundary and native queue acknowledgement guard');
  console.log('B05 groups: ' + checks.length);
}
void main();
