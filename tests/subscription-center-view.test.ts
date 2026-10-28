import assert from 'node:assert/strict';

import { buildSubscriptionCenterView } from '../lib/subscription/subscription-center-view';
import { resolveModelAccountCapabilities } from '../lib/subscription/subscription-capabilities';

const capabilities = resolveModelAccountCapabilities({
  ownerId: 'owner-a',
  planCode: 'pro',
  planSource: 'admin',
  billingStatus: 'none',
  entitlementStatus: 'active',
  capabilityEvaluatedAt: '2026-08-06T00:00:00.000Z',
  capabilityRefreshAfter: '2026-08-06T00:05:00.000Z',
  entitlementEndsAt: null,
});

assert.equal(buildSubscriptionCenterView({
  viewer: 'owner',
  isAuthenticated: true,
  isLoading: true,
  capabilityResult: null,
}).state, 'loading');
assert.equal(buildSubscriptionCenterView({
  viewer: 'owner',
  isAuthenticated: false,
  isLoading: false,
  capabilityResult: {
    ok: false,
    code: 'authentication_required',
    retryable: false,
    capabilities,
  },
}).state, 'authentication_required');

const adminView = buildSubscriptionCenterView({
  viewer: 'owner',
  isAuthenticated: true,
  isLoading: false,
  capabilityResult: {
    ok: true,
    status: 'admin_enabled',
    capabilities,
    freshness: 'fresh',
  },
});
assert.equal(adminView.planLabel, '輕量版');
assert.equal(adminView.sourceLabel, '管理員已啟用');
assert.equal(adminView.canDisplayBillingControls, false);
assert.equal(adminView.lifecycleNotice, null);

const inactiveView = buildSubscriptionCenterView({
  viewer: 'owner', isAuthenticated: true, isLoading: false,
  capabilityResult: { ok: true, status: 'admin_inactive', freshness: 'fresh',
    capabilities: { ...capabilities, entitlementStatus: 'inactive' } },
});
assert.equal(inactiveView.lifecycleNotice?.title, '付費功能目前未開放');
assert.match(inactiveView.lifecycleNotice?.description ?? '', /紀錄會保留/);
assert.match(inactiveView.lifecycleNotice?.description ?? '', /銷售與商品功能依目前方案/);
const graceView = buildSubscriptionCenterView({
  viewer: 'owner', isAuthenticated: true, isLoading: false,
  capabilityResult: { ok: true, status: 'admin_enabled', freshness: 'fresh',
    capabilities: { ...capabilities, entitlementStatus: 'grace' } },
});
assert.equal(graceView.lifecycleNotice?.title, '目前處於寬限期');
assert.doesNotMatch(graceView.lifecycleNotice?.description ?? '', /7 天|七天/);

const billingCapabilities = resolveModelAccountCapabilities({
  ownerId: 'owner-a',
  planCode: 'pro',
  planSource: 'billing',
  billingStatus: 'cancel_at_period_end',
  entitlementStatus: 'active',
  capabilityEvaluatedAt: '2026-08-06T00:00:00.000Z',
  capabilityRefreshAfter: '2026-08-06T00:05:00.000Z',
  entitlementEndsAt: '2027-08-06T00:00:00.000Z',
});
const billingView = buildSubscriptionCenterView({
  viewer: 'owner',
  isAuthenticated: true,
  isLoading: false,
  capabilityResult: {
    ok: true,
    status: 'billing_enabled',
    capabilities: billingCapabilities,
    freshness: 'fresh',
  },
  billingOrigin: 'apple_app_store',
});
assert.equal(billingView.billingOriginLabel, 'Apple App Store');
assert.equal(billingView.billingLabel, '已排定取消');
assert.equal(billingView.canDisplayBillingControls, true);
assert.equal(billingView.lifecycleNotice?.title, '已排定停止續訂');

const staffView = buildSubscriptionCenterView({
  viewer: 'staff',
  isAuthenticated: true,
  isLoading: false,
  capabilityResult: null,
});
assert.equal(staffView.state, 'staff_read_only');
assert.equal(staffView.lifecycleNotice, null);

const freeCapabilities = resolveModelAccountCapabilities({ ...capabilities, planCode: 'free', planSource: 'free' });
const freeView = buildSubscriptionCenterView({ viewer: 'owner', isAuthenticated: true, isLoading: false,
  capabilityResult: { ok: true, status: 'default_free', freshness: 'fresh', capabilities: freeCapabilities } });
assert.equal(freeView.lifecycleNotice, null, 'a free account alone does not prove a prior downgrade');

console.log('PASS read-only subscription center view never invents billing controls');
