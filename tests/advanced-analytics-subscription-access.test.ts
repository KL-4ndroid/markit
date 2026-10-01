import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { resolveAnalyticsSubscriptionView } from '../lib/analytics/subscription-view';
import { evaluateCapabilityAccess } from '../lib/subscription/subscription-access';
import {
  resolveModelAccountCapabilities,
  type AccountCapabilities,
  type AccountCapabilityFeature,
} from '../lib/subscription/subscription-capabilities';

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

function access(planCode: 'free' | 'pro' | 'team', feature: AccountCapabilityFeature) {
  return evaluateCapabilityAccess({
    authenticated: true,
    ownerWorkspaceAvailable: true,
    workspaceOwnerId: OWNER_ID,
    requestedOwnerId: OWNER_ID,
    actorRole: 'owner',
    rolePermission: true,
    capabilities: capabilities(planCode),
    feature,
    operation: 'execute',
    runtimeEnabled: true,
    dataReady: true,
    nowMs: NOW,
    network: 'online',
  });
}

const freeBasic = access('free', 'basicAnalytics');
const freeAdvanced = access('free', 'advancedAnalytics');

for (const tab of ['summary', 'trends', 'products'] as const) {
  const preview = resolveAnalyticsSubscriptionView({
    range: 'recent3',
    tab,
    basicAccess: freeBasic,
    advancedAccess: freeAdvanced,
  });
  assert.equal(preview.mode, 'free_preview');
  assert.equal(preview.blockDecision, null);
  assert.equal(preview.previewUpgradeDecision?.reason, 'plan_required');
  assert.equal(preview.canBuildRecentMarketPreview, true);
  assert.equal(preview.canReadBasicProductRanking, true);
  assert.equal(preview.canReadSummaryEvents, false);
  assert.equal(preview.canComputeMarketMetrics, false);
  assert.equal(preview.canComputeActionableInsights, false);
  assert.equal(preview.canReadDailyRevenue, false);
  assert.equal(preview.canReadFullProductRanking, false);
  assert.equal(preview.canReadProductAffinity, false);
}

for (const range of ['recent10', 'all'] as const) {
  const blocked = resolveAnalyticsSubscriptionView({
    range,
    tab: 'summary',
    basicAccess: freeBasic,
    advancedAccess: freeAdvanced,
  });
  assert.equal(blocked.mode, 'blocked');
  assert.equal(blocked.blockDecision?.reason, 'plan_required');
}

const freeAdvancedTab = resolveAnalyticsSubscriptionView({
  range: 'recent3',
  tab: 'advanced',
  basicAccess: freeBasic,
  advancedAccess: freeAdvanced,
});
assert.equal(freeAdvancedTab.mode, 'blocked');

const freeSingle = resolveAnalyticsSubscriptionView({
  range: 'single',
  tab: 'summary',
  basicAccess: freeBasic,
  advancedAccess: freeAdvanced,
});
assert.equal(freeSingle.mode, 'blocked');
assert.equal(freeSingle.blockDecision?.reason, 'plan_required');

for (const planCode of ['pro', 'team'] as const) {
  const paid = resolveAnalyticsSubscriptionView({
    range: 'all',
    tab: 'advanced',
    basicAccess: access(planCode, 'basicAnalytics'),
    advancedAccess: access(planCode, 'advancedAnalytics'),
  });
  assert.equal(paid.mode, 'full');
  assert.equal(paid.canReadSummaryEvents, true);
  assert.equal(paid.canComputeMarketMetrics, true);
  assert.equal(paid.canComputeActionableInsights, true);
  assert.equal(paid.canReadDailyRevenue, true);
  assert.equal(paid.canReadFullProductRanking, true);
  assert.equal(paid.canReadProductAffinity, true);
}

const unavailable = { allowed: false, reason: 'capability_unavailable' } as const;
const unavailablePreview = resolveAnalyticsSubscriptionView({
  range: 'recent3',
  tab: 'summary',
  basicAccess: unavailable,
  advancedAccess: unavailable,
});
assert.equal(unavailablePreview.mode, 'blocked');
assert.equal(unavailablePreview.blockDecision?.reason, 'capability_unavailable');

const root = join(__dirname, '..');
const pageSource = readFileSync(join(root, 'app/analytics/page.tsx'), 'utf8');
const policySource = readFileSync(join(root, 'lib/analytics/subscription-view.ts'), 'utf8');
const manifestSource = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');

assert.match(pageSource, /useState<AnalyticsRange>\('recent3'\)/);
assert.match(pageSource, /feature: 'advancedAnalytics'/);
assert.match(pageSource, /resolveAnalyticsSubscriptionView/);
assert.match(pageSource, /analyticsView\.canReadSummaryEvents/);
assert.match(pageSource, /analyticsView\.canReadBasicProductRanking/);
assert.match(pageSource, /analyticsView\.canReadFullProductRanking/);
assert.match(pageSource, /analyticsView\.canReadProductAffinity/);
assert.doesNotMatch(pageSource, /localStorage|sessionStorage|NEXT_PUBLIC_(?:PLAN|TIER)/);
assert.doesNotMatch(policySource, /window\.|document\.|navigator\.|localStorage|sessionStorage/);
assert.match(manifestSource, /tsx tests\/advanced-analytics-subscription-access\.test\.ts/);

console.log('PASS S6B advanced analytics subscription access');
