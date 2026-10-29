import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveSubscriptionSurface } from '../lib/subscription/surface-access';
import { nextCapabilityRefreshDelay } from '../lib/subscription/capability-refresh';
import { resolveModelAccountCapabilities } from '../lib/subscription/subscription-capabilities';
import { resolveProductCoverPhotoAccess, resolveProductCoverPhotoOwnerAccess } from '../lib/products/product-cover-photo-server';
import { runAppApiWithCors, createAppApiCorsPreflightResponse } from '../lib/api/server/cors';

const owner = '11111111-1111-4111-8111-111111111111';
const actor = '22222222-2222-4222-8222-222222222222';
const now = Date.now();
const row = (plan='team') => ({ access_allowed: true, account_exists: true, owner_id: owner,
  plan_code: plan, plan_source: plan === 'free' ? 'free' : 'admin', billing_status: 'none',
  entitlement_status: 'active', entitlement_ends_at: null, updated_at: new Date(now).toISOString() });

function fakeClient(options: { role?: string; status?: string; plan?: string; noRelation?: boolean; rpcError?: boolean; account?: Record<string, unknown>; inactiveProduct?: boolean } = {}) {
  let rpcCalls = 0;
  return { get rpcCalls() { return rpcCalls; }, client: {
    from(table: string) {
      return { select() { return this; }, eq() { return this; }, async maybeSingle() {
        return { error: null, data: table === 'products' ? { id: 'product', owner_id: owner, is_active: !options.inactiveProduct }
          : options.noRelation ? null : { role: options.role ?? 'manager', status: options.status ?? 'active' } };
      } };
    },
    async rpc(name: string, args: Record<string, unknown>) {
      rpcCalls++;
      if (name === 'check_subscription_read_for_actor') {
        assert.equal(args.p_owner,owner);
        return {error:options.rpcError?{code:'unavailable'}:null,data:{enabled:true,allowed:options.plan!=='free',reason:options.plan==='free'?'plan_required':'allowed'}};
      }
      assert.equal(name, 'read_subscription_account_for_actor');
      assert.deepEqual(args, { p_actor_id: actor, p_owner_id: owner });
      return { error: options.rpcError ? { code: 'unavailable' } : null, data: [options.account ?? row(options.plan)] };
    },
  } as unknown as SupabaseClient };
}

async function main() {
  for (const suffix of ['', '/']) {
    for (const path of ['/products', '/products/detail', '/products/legacy-id', '/recovery']) {
      assert.equal(resolveSubscriptionSurface(path+suffix, 'free'), 'light_notice');
      assert.equal(resolveSubscriptionSurface(path+suffix, 'unavailable'), 'light_notice');
      assert.equal(resolveSubscriptionSurface(path+suffix, 'light'), 'content');
    }
    for (const path of ['/analytics', '/analytics/regions']) {
      assert.equal(resolveSubscriptionSurface(path+suffix, 'free'), 'advanced_notice');
      assert.equal(resolveSubscriptionSurface(path+suffix, 'light'), 'basic_summary');
      assert.equal(resolveSubscriptionSurface(path+suffix, 'advanced'), 'content');
    }
    for (const path of ['/reports', '/reports/settlement', '/settings/team', '/settings/team/member', '/staff']) {
      assert.equal(resolveSubscriptionSurface(path+suffix, 'light'), 'advanced_notice');
      assert.equal(resolveSubscriptionSurface(path+suffix, 'advanced'), 'content');
    }
  }
  for (const path of ['/', '/markets', '/markets/detail', '/markets/journals', '/markets/regions', '/markets/schedules', '/settings', '/settings/account', '/settings/app', '/settings/sales', '/settings/data', '/subscription', '/join']) {
    assert.equal(resolveSubscriptionSurface(path, 'free'), 'content', `Free base workflow ${path}`);
  }
  assert.equal(resolveSubscriptionSurface('/products-other', 'free'), 'content');
  assert.equal(resolveSubscriptionSurface('/analytics', 'unavailable', true), 'content', 'Staff keeps its independent role gate');

  const caps = resolveModelAccountCapabilities({ ownerId: owner, planCode: 'team', planSource: 'admin', billingStatus: 'none', entitlementStatus: 'active',
    capabilityEvaluatedAt: new Date(now).toISOString(), capabilityRefreshAfter: new Date(now+300_000).toISOString(), entitlementEndsAt: new Date(now+8_000).toISOString() });
  assert.equal(nextCapabilityRefreshDelay(caps, now), 8_001, 'An imminent expiry precedes the regular refresh');
  assert.equal(nextCapabilityRefreshDelay(caps, now+8_001), 262_000, 'Expired deadlines never poll repeatedly');
  assert.equal(nextCapabilityRefreshDelay(caps, now+270_001), 30_000, 'A failed early refresh still has a freshness boundary');
  assert.equal(nextCapabilityRefreshDelay(caps, now+300_001), null);
  assert.equal(nextCapabilityRefreshDelay(caps, NaN), null);

  const own = fakeClient({ noRelation: true, plan: 'free' });
  assert.equal(await resolveProductCoverPhotoOwnerAccess(own.client, owner, owner), null, 'Free retains photos but cannot read or edit them');
  assert.equal(own.rpcCalls, 1);
  assert.deepEqual(await resolveProductCoverPhotoOwnerAccess(fakeClient({plan:'pro'}).client,owner,owner),{ownerId:owner,canEdit:true});
  for (const role of ['manager', 'operator', 'viewer']) {
    const fake = fakeClient({ role });
    assert.deepEqual(await resolveProductCoverPhotoAccess(fake.client, actor, 'product'), { ownerId: owner, canEdit: role==='manager' });
    assert.equal(fake.rpcCalls, 2);
  }
  await assert.rejects(resolveProductCoverPhotoAccess(fakeClient({rpcError:true}).client,actor,'product'),/unavailable/,'Authority outages are read errors, never authoritative empty photos');
  for (const options of [{ noRelation: true }, { status: 'revoked' }, { role: 'unknown' }, { plan: 'pro' }, { plan: 'free' },
    { account: { ...row(), owner_id: actor } }, { account: { ...row(), entitlement_status: 'inactive' } },
    { account: { ...row(), entitlement_ends_at: new Date(now-1_000).toISOString() } }, { inactiveProduct: true }]) {
    assert.equal(await resolveProductCoverPhotoAccess(fakeClient(options).client, actor, 'product'), null, JSON.stringify(options));
  }

  let calls = 0;
  const options = { configuredAllowedOrigins: 'capacitor://localhost', allowedMethods: ['POST', 'OPTIONS'] };
  const denied = await runAppApiWithCors(new Request('https://api.test/api/product-cover-photo/upload', { method: 'POST', headers: { Origin: 'https://foreign.test' } }),
    async () => { calls++; return new Response('mutation'); }, options);
  assert.equal(denied.status, 403); assert.equal(calls, 0);
  const allowed = await runAppApiWithCors(new Request('https://api.test/api/product-cover-photo/upload', { method: 'POST', headers: { Origin: 'capacitor://localhost' } }),
    async () => { calls++; return new Response('denied', { status: 403 }); }, options);
  assert.equal(allowed.status, 403); assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'capacitor://localhost'); assert.equal(calls, 1);
  const preflight = createAppApiCorsPreflightResponse(new Request('https://api.test/api/product-cover-photo/upload', { method: 'OPTIONS', headers: {
    Origin: 'capacitor://localhost', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Authorization,Content-Type',
  } }), options);
  assert.equal(preflight.status, 204);
  for (const path of ['capability/route.ts','metadata/route.ts','image/route.ts','upload/route.ts','route.ts']) {
    const source=readFileSync('app/api/product-cover-photo/'+path,'utf8');
    assert.match(source,/runAppApiWithCors/); assert.match(source,/export const OPTIONS/);
  }
  assert.match(readFileSync('app/api/product-cover-photo/capability/route.ts','utf8'),/checkServerSubscriptionWrite/);
  assert.match(readFileSync('app/api/product-cover-photo/metadata/route.ts','utf8'),/resolveProductCoverPhotoOwnerAccess/);
  assert.match(readFileSync('lib/products/product-cover-photo-client.ts','utf8'),/buildAppApiUrl/);
  console.log('PASS route/slash tier matrix, Free workflows, entitlement boundaries, photo workspace/role scope and cross-platform CORS');
}
void main();
