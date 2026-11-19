import assert from 'node:assert/strict';
import { buildMonthlySalesRecords } from '../lib/subscription/basic-business-summary';
import type { DailyStats, Market } from '../types/db';
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

const baseMarket = { name: '跨月市集', location: '台灣', status: 'completed', startDate: '2026-10-31',
  endDate: '2026-11-02', registrationFee: 0, boothCost: 0, createdAt: 0, updatedAt: 0 } as const;
const recordMarkets: Market[] = [
  { ...baseMarket, id: 'own', owner_id: 'owner' },
  { ...baseMarket, id: 'foreign', owner_id: 'another-owner' },
  { ...baseMarket, id: 'removed', owner_id: 'owner', isDeleted: true },
];
const day = (marketId: string, date: string, revenue: number, dealCount: number) => ({ marketId, date, revenue, dealCount,
  touchCount: 0, inquiryCount: 0, cost: 0, profit: 0, productsSold: [], updatedAt: 0 } satisfies DailyStats);
const month = buildMonthlySalesRecords(recordMarkets, [
  day('own', '2026-10-31', 1000, 2), day('own', '2026-11-01', 250, 1),
  day('own', '2026-11-02', 0, 1), day('own', '2026-11-03', 500, 3),
  day('foreign', '2026-11-02', 200, 1), day('removed', '2026-11-02', 200, 1),
], 'owner', '2026-11-01', '2026-11-02');
assert.deepEqual(month, { revenue: 250, deals: 2, markets: [
  { id: 'own', name: '跨月市集', revenue: 250, deals: 2, latest: '2026-11-02' },
] });
const gateSource = readFileSync(join(root, 'components/subscription/SubscriptionSurfaceGate.tsx'), 'utf8');
assert.match(gateSource, /basic_summary'\) return <BasicBusinessSummary/);
const lightPage = readFileSync(join(root, 'components/subscription/BasicBusinessSummary.tsx'), 'utf8');
assert.match(lightPage, /<MonthlySalesRecords/);
const monthlySource = readFileSync(join(root, 'components/analytics/MonthlySalesRecords.tsx'), 'utf8');
assert.match(monthlySource, /task: 'performance', returnTo: 'records'/);
assert.doesNotMatch(monthlySource, /\/reports\/settlement/);

console.log('PASS S6A single-market analytics subscription access');
