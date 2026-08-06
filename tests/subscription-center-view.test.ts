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
assert.equal(adminView.planLabel, 'Pro');
assert.equal(adminView.sourceLabel, '管理員已啟用');
assert.equal(adminView.canDisplayBillingControls, false);

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

const staffView = buildSubscriptionCenterView({
  viewer: 'staff',
  isAuthenticated: true,
  isLoading: false,
  capabilityResult: null,
});
assert.equal(staffView.state, 'staff_read_only');

console.log('PASS read-only subscription center view never invents billing controls');
