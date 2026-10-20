import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  evaluateAccountCapabilityClientAccess,
  mapAccountCapabilityClientFailure,
} from '../lib/subscription/account-capability-access';
import {
  resolveModelAccountCapabilities,
  resolveUnavailableAccountCapabilities,
  type AccountCapabilities,
} from '../lib/subscription/subscription-capabilities';
import type { AccountCapabilityClientResult } from '../lib/subscription/account-capability-client';

const OWNER_ID = '00000000-0000-4000-8000-000000000001';
const NOW = Date.parse('2026-07-29T12:00:00.000Z');

function capabilities(planCode: 'free' | 'pro' | 'team'): AccountCapabilities {
  return resolveModelAccountCapabilities({
    ownerId: OWNER_ID,
    planCode,
    planSource: planCode === 'free' ? 'free' : 'admin',
    billingStatus: 'none',
    entitlementStatus: 'active',
    capabilityEvaluatedAt: '2026-07-29T11:59:00.000Z',
    capabilityRefreshAfter: '2026-07-29T12:04:00.000Z',
    entitlementEndsAt: null,
  });
}

function available(planCode: 'free' | 'pro' | 'team'): AccountCapabilityClientResult {
  return {
    ok: true,
    status: planCode === 'free' ? 'explicit_free' : 'admin_enabled',
    capabilities: capabilities(planCode),
    freshness: 'fresh',
  };
}

function evaluate(result: AccountCapabilityClientResult | null, dataReady = true) {
  return evaluateAccountCapabilityClientAccess({
    capabilityResult: result,
    authenticated: true,
    ownerWorkspaceAvailable: true,
    workspaceOwnerId: OWNER_ID,
    requestedOwnerId: OWNER_ID,
    actorRole: 'owner',
    rolePermission: true,
    feature: 'basicAnalytics',
    operation: 'execute',
    runtimeEnabled: true,
    dataReady,
    nowMs: NOW,
    network: 'online',
  });
}

const free = evaluate(available('free'));
assert.equal(free.allowed, false);
if (free.allowed) throw new Error('Free single-market analytics must be blocked');
assert.equal(free.reason, 'plan_required');
assert.equal(free.requiredPlan, 'pro');

assert.equal(evaluate(available('pro')).allowed, true);
assert.equal(evaluate(available('team')).allowed, true);

const unavailableResult: AccountCapabilityClientResult = {
  ok: false,
  code: 'network_error',
  retryable: true,
  capabilities: resolveUnavailableAccountCapabilities(OWNER_ID),
};
const unavailable = evaluate(unavailableResult);
assert.equal(unavailable.allowed, false);
if (unavailable.allowed) throw new Error('Unavailable capability must fail closed');
assert.equal(unavailable.reason, 'capability_unavailable');
assert.equal(unavailable.requiredPlan, undefined);

const stale = evaluate({ ...unavailableResult, code: 'stale_capability' });
assert.equal(stale.allowed ? null : stale.reason, 'stale_capability');
assert.equal(mapAccountCapabilityClientFailure('offline_lease_expired'), 'offline_lease_expired');

const insufficient = evaluate(available('pro'), false);
assert.equal(insufficient.allowed ? null : insufficient.reason, 'data_insufficient');

const unauthenticated = evaluateAccountCapabilityClientAccess({
  capabilityResult: unavailableResult,
  authenticated: false,
  ownerWorkspaceAvailable: false,
  actorRole: 'unresolved',
  rolePermission: false,
  feature: 'basicAnalytics',
  operation: 'execute',
  runtimeEnabled: true,
  dataReady: true,
  nowMs: NOW,
  network: 'online',
});
assert.equal(unauthenticated.allowed ? null : unauthenticated.reason, 'authentication_required');

const root = join(__dirname, '..');
const pageSource = readFileSync(join(root, 'app/analytics/page.tsx'), 'utf8');
const hookSource = readFileSync(join(root, 'hooks/useAccountCapabilities.ts'), 'utf8');
const manifestSource = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');

assert.match(pageSource, /dateRange === 'single'/);
assert.match(pageSource, /feature: 'basicAnalytics'/);
assert.match(pageSource, /operation: 'execute'/);
assert.match(pageSource, /resolveAnalyticsSubscriptionView/);
assert.match(pageSource, /analyticsView\.canReadSummaryEvents/);
assert.match(pageSource, /analyticsView\.canComputeMarketRecap \? buildMarketRecapReport/);
assert.match(pageSource, /<UpgradePrompt/);
assert.doesNotMatch(pageSource, /localStorage|sessionStorage|NEXT_PUBLIC_(?:PLAN|TIER)/);

assert.match(hookSource, /readAccountCapabilities/);
assert.match(hookSource, /getNetworkPort/);
assert.doesNotMatch(hookSource, /supabase|localStorage|sessionStorage|window\.|document\.|navigator\./i);
assert.match(manifestSource, /tsx tests\/analytics-subscription-access\.test\.ts/);

console.log('PASS S6A single-market analytics subscription access');
