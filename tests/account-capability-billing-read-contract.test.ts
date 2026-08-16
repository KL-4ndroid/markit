import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseAccountCapabilityApiSuccess } from '../lib/subscription/account-capability-client';
import { resolveModelAccountCapabilities } from '../lib/subscription/subscription-capabilities';

const billingCapabilities = resolveModelAccountCapabilities({
  ownerId: 'owner-a',
  planCode: 'team',
  planSource: 'billing',
  billingStatus: 'active',
  entitlementStatus: 'active',
  capabilityEvaluatedAt: '2026-08-06T00:00:00.000Z',
  capabilityRefreshAfter: '2026-08-06T00:05:00.000Z',
  entitlementEndsAt: '2027-08-06T00:00:00.000Z',
});
assert.equal(parseAccountCapabilityApiSuccess({
  ok: true,
  status: 'billing_enabled',
  capabilities: billingCapabilities,
})?.status, 'billing_enabled');
assert.equal(parseAccountCapabilityApiSuccess({
  ok: true,
  status: 'admin_enabled',
  capabilities: billingCapabilities,
}), null, 'billing capability cannot masquerade as an admin assignment');

const promotionCapabilities = resolveModelAccountCapabilities({
  ownerId: 'owner-a',
  planCode: 'pro',
  planSource: 'promotion',
  billingStatus: 'none',
  entitlementStatus: 'active',
  capabilityEvaluatedAt: '2026-08-06T00:00:00.000Z',
  capabilityRefreshAfter: '2026-08-06T00:05:00.000Z',
  entitlementEndsAt: '2026-11-06T00:00:00.000Z',
});
assert.equal(parseAccountCapabilityApiSuccess({
  ok: true,
  status: 'promotion_enabled',
  capabilities: promotionCapabilities,
})?.status, 'promotion_enabled');

const root = join(__dirname, '..');
const serverSource = readFileSync(join(root, 'lib/subscription/account-capability-server.ts'), 'utf8');
assert.match(serverSource, /record\.planSource === 'billing'[\s\S]*billing_not_connected/);
assert.match(serverSource, /record\.planSource === 'promotion'[\s\S]*promotion_not_connected/);
assert.doesNotMatch(serverSource, /status:\s*'billing_enabled'/);
assert.doesNotMatch(serverSource, /status:\s*'promotion_enabled'/);

console.log('PASS client is billing-ready while server billing authority stays disconnected');
