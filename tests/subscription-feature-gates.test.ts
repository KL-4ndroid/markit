import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ACCOUNT_CAPABILITY_PLAN_FEATURE,
  resolveCapabilityFreshness,
  resolveModelAccountCapabilities,
} from '../lib/subscription/subscription-capabilities';
import { evaluateCapabilityAccess } from '../lib/subscription/subscription-access';

const NOW = Date.parse('2026-07-29T12:00:00.000Z');
const FRESH_AT = '2026-07-29T11:55:00.000Z';
const REFRESH_AFTER = '2026-07-29T12:05:00.000Z';
const ENTITLEMENT_END = '2026-08-29T12:00:00.000Z';

function capabilities(
  planCode: 'free' | 'pro' | 'team',
  overrides: Partial<Parameters<typeof resolveModelAccountCapabilities>[0]> = {},
) {
  return resolveModelAccountCapabilities({
    ownerId: 'owner-1',
    planCode,
    planSource: planCode === 'free' ? 'free' : 'admin',
    billingStatus: planCode === 'free' ? 'none' : 'active',
    entitlementStatus: 'active',
    capabilityEvaluatedAt: FRESH_AT,
    capabilityRefreshAfter: REFRESH_AFTER,
    entitlementEndsAt: planCode === 'free' ? null : ENTITLEMENT_END,
    ...overrides,
  });
}

function access(overrides: Partial<Parameters<typeof evaluateCapabilityAccess>[0]> = {}) {
  return evaluateCapabilityAccess({
    authenticated: true,
    ownerWorkspaceAvailable: true,
    workspaceOwnerId: 'owner-1',
    requestedOwnerId: 'owner-1',
    actorRole: 'owner',
    rolePermission: true,
    capabilities: capabilities('pro'),
    feature: 'productCoverPhoto',
    operation: 'create',
    runtimeEnabled: true,
    dataReady: true,
    nowMs: NOW,
    network: 'online',
    ...overrides,
  });
}

assert.deepEqual(access(), { allowed: true, reason: 'allowed', accessMode: 'entitled' });
assert.equal(access({ authenticated: false }).reason, 'authentication_required');
assert.equal(access({ ownerWorkspaceAvailable: false }).reason, 'owner_workspace_unavailable');
assert.equal(access({ requestedOwnerId: 'other-owner' }).reason, 'owner_workspace_unavailable');
assert.equal(access({ capabilities: null }).reason, 'capability_unavailable');

const roleBeforePlan = access({
  actorRole: 'viewer',
  rolePermission: false,
  capabilities: capabilities('free'),
});
assert.equal(roleBeforePlan.reason, 'role_forbidden');

const freeProductPhoto = access({ capabilities: capabilities('free') });
assert.equal(freeProductPhoto.reason, 'plan_required');
assert.equal(freeProductPhoto.allowed ? undefined : freeProductPhoto.requiredPlan, 'pro');

assert.equal(ACCOUNT_CAPABILITY_PLAN_FEATURE.basicAnalytics, 'analytics.basic');
assert.equal(capabilities('free').features.basicAnalytics, false);
assert.equal(capabilities('pro').features.basicAnalytics, true);
const freeBasicAnalytics = access({
  capabilities: capabilities('free'),
  feature: 'basicAnalytics',
  operation: 'execute',
});
assert.equal(freeBasicAnalytics.reason, 'plan_required');
assert.equal(freeBasicAnalytics.allowed ? undefined : freeBasicAnalytics.requiredPlan, 'pro');
assert.deepEqual(access({
  capabilities: capabilities('pro'),
  feature: 'basicAnalytics',
  operation: 'execute',
}), { allowed: true, reason: 'allowed', accessMode: 'entitled' });

const proSalesEvidence = access({
  capabilities: capabilities('pro'),
  feature: 'salesPhotoEvidence',
});
assert.equal(proSalesEvidence.reason, 'plan_required');
assert.equal(proSalesEvidence.allowed ? undefined : proSalesEvidence.requiredPlan, 'team');

assert.deepEqual(access({
  capabilities: capabilities('team'),
  feature: 'salesPhotoEvidence',
  actorRole: 'operator',
  rolePermission: true,
}), { allowed: true, reason: 'allowed', accessMode: 'entitled' });

assert.equal(ACCOUNT_CAPABILITY_PLAN_FEATURE.managerWorkflow, 'team.manager_workflow');
assert.equal(capabilities('pro').features.managerWorkflow, false);
assert.equal(capabilities('team').features.managerWorkflow, true);
assert.equal(access({
  capabilities: capabilities('pro'),
  feature: 'managerWorkflow',
}).reason, 'plan_required');
assert.deepEqual(access({
  capabilities: capabilities('team'),
  feature: 'managerWorkflow',
  actorRole: 'manager',
  rolePermission: true,
}), { allowed: true, reason: 'allowed', accessMode: 'entitled' });

assert.equal(access({ runtimeEnabled: false }).reason, 'runtime_disabled');
assert.equal(access({ dataReady: false }).reason, 'data_insufficient');
assert.equal(access({
  capabilities: capabilities('pro', { entitlementStatus: 'inactive' }),
}).reason, 'entitlement_inactive');

const pastDueGrace = capabilities('pro', {
  billingStatus: 'past_due',
  entitlementStatus: 'grace',
});
assert.deepEqual(access({ capabilities: pastDueGrace }), {
  allowed: true,
  reason: 'allowed',
  accessMode: 'entitled',
});

const stale = capabilities('pro', {
  capabilityEvaluatedAt: '2026-07-29T10:55:00.000Z',
  capabilityRefreshAfter: '2026-07-29T11:00:00.000Z',
});
assert.equal(resolveCapabilityFreshness({
  capabilities: stale,
  nowMs: NOW,
  network: 'online',
}), 'stale');
assert.equal(access({ capabilities: stale }).reason, 'stale_capability');

assert.equal(resolveCapabilityFreshness({
  capabilities: stale,
  nowMs: NOW,
  network: 'offline',
  offlineLeaseEndsAt: '2026-07-29T13:00:00.000Z',
}), 'offline_lease');
assert.deepEqual(access({
  capabilities: stale,
  network: 'offline',
  offlineLeaseEndsAt: '2026-07-29T13:00:00.000Z',
}), { allowed: true, reason: 'allowed', accessMode: 'entitled' });
assert.equal(access({
  capabilities: stale,
  network: 'offline',
  offlineLeaseEndsAt: '2026-07-29T11:30:00.000Z',
}).reason, 'offline_lease_expired');

const downgraded = capabilities('free', { entitlementStatus: 'inactive' });
assert.deepEqual(access({
  capabilities: downgraded,
  operation: 'read_existing',
}), { allowed: true, reason: 'allowed', accessMode: 'retained' });
assert.deepEqual(access({
  capabilities: downgraded,
  operation: 'delete_existing',
}), { allowed: true, reason: 'allowed', accessMode: 'retained' });
assert.equal(access({
  capabilities: downgraded,
  operation: 'replace',
}).reason, 'plan_required');

const promotion = capabilities('pro', {
  planSource: 'promotion',
  billingStatus: 'none',
  entitlementEndsAt: '2026-07-30T12:00:00.000Z',
});
assert.deepEqual(access({ capabilities: promotion }), {
  allowed: true,
  reason: 'allowed',
  accessMode: 'entitled',
});
assert.equal(access({
  capabilities: capabilities('pro', {
    planSource: 'promotion',
    billingStatus: 'none',
    entitlementEndsAt: '2026-07-28T12:00:00.000Z',
  }),
}).reason, 'promotion_reward_expired');
assert.throws(() => capabilities('team', { planSource: 'promotion' }), /promotion_source_requires_pro_plan/);

for (const path of [
  'lib/subscription/subscription-capabilities.ts',
  'lib/subscription/subscription-access.ts',
]) {
  const source = readFileSync(join(__dirname, '..', path), 'utf8');
  assert.doesNotMatch(source, /react|next\/|supabase|dexie|window|localStorage|sessionStorage|document\.|navigator\./i, path);
}

console.log('PASS subscription capability lifecycle and access gates');
