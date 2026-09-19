import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { deriveRoleCapabilities } from '../lib/permissions/role-capabilities';
import { buildSettlementFreePreview } from '../lib/reporting/settlement-free-preview';
import {
  resolveSettlementReportSubscriptionView,
  SETTLEMENT_PDF_RUNTIME_ENABLED,
} from '../lib/reporting/settlement-subscription-view';
import { evaluateCapabilityAccess } from '../lib/subscription/subscription-access';
import {
  resolveModelAccountCapabilities,
  type AccountCapabilities,
  type AccountCapabilityFeature,
} from '../lib/subscription/subscription-capabilities';
import type { DailyStats, Market } from '../types/db';

const OWNER_ID = '00000000-0000-4000-8000-000000000001';
const NOW = Date.parse('2026-07-29T12:00:00.000Z');
const ownerRole = deriveRoleCapabilities({ isOwner: true });

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

const freeView = resolveSettlementReportSubscriptionView({
  reportAccess: access('free', 'settlementReportPreview'),
  pdfAccess: access('free', 'settlementPdf'),
});
assert.equal(freeView.mode, 'free_preview');
assert.equal(freeView.previewUpgradeDecision?.reason, 'plan_required');
assert.equal(freeView.canReadMarkets, true);
assert.equal(freeView.canReadDailyStats, true);
assert.equal(freeView.canReadProducts, false);
assert.equal(freeView.canBuildFreePreview, true);
assert.equal(freeView.canBuildFullReport, false);
assert.equal(freeView.canBuildPdfViewModel, false);
assert.equal(freeView.pdfDecision.allowed ? null : freeView.pdfDecision.reason, 'plan_required');

for (const planCode of ['pro', 'team'] as const) {
  const paidView = resolveSettlementReportSubscriptionView({
    reportAccess: access(planCode, 'settlementReportPreview'),
    pdfAccess: access(planCode, 'settlementPdf'),
  });
  assert.equal(paidView.mode, 'full');
  assert.equal(paidView.canReadProducts, true);
  assert.equal(paidView.canBuildFullReport, true);
  assert.equal(paidView.canBuildPdfViewModel, true);
  assert.equal(paidView.pdfDecision.allowed, true);
}

assert.equal(SETTLEMENT_PDF_RUNTIME_ENABLED, true);

const rollbackView = resolveSettlementReportSubscriptionView({
  reportAccess: access('pro', 'settlementReportPreview'),
  pdfAccess: access('pro', 'settlementPdf'),
  pdfRuntimeEnabled: false,
});
assert.equal(rollbackView.canBuildFullReport, true);
assert.equal(rollbackView.canBuildPdfViewModel, false);
assert.equal(rollbackView.pdfDecision.allowed ? null : rollbackView.pdfDecision.reason, 'runtime_disabled');

const unavailable = { allowed: false, reason: 'capability_unavailable' } as const;
const unavailableView = resolveSettlementReportSubscriptionView({
  reportAccess: unavailable,
  pdfAccess: unavailable,
});
assert.equal(unavailableView.mode, 'blocked');
assert.equal(unavailableView.blockDecision?.reason, 'capability_unavailable');
assert.equal(unavailableView.canReadMarkets, false);
assert.equal(unavailableView.canReadDailyStats, false);
assert.equal(unavailableView.canReadProducts, false);

const market: Market = {
  id: 'market-1',
  name: '週末市集',
  location: '台北',
  startDate: '2026-07-01',
  endDate: '2026-07-02',
  status: 'completed',
  owner_id: OWNER_ID,
  registrationFee: 0,
  boothCost: 0,
  createdAt: NOW,
  updatedAt: NOW,
};
const stats: DailyStats = {
  date: '2026-07-01',
  marketId: market.id,
  touchCount: 0,
  inquiryCount: 0,
  dealCount: 3,
  revenue: 3600,
  cost: 0,
  profit: 0,
  productsSold: [],
  updatedAt: NOW,
};
const preview = buildSettlementFreePreview({
  capabilities: ownerRole,
  period: {
    kind: 'monthly',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    label: '2026/07/01 - 2026/07/31',
  },
  brandName: '測試品牌',
  markets: [market],
  dailyStats: [stats],
});
assert.equal(preview.totalRevenue, 3600);
assert.equal(preview.totalDeals, 3);
assert.equal(preview.includedMarketCount, 1);
assert.equal(preview.marketsWithStatsCount, 1);
assert.equal(preview.readiness, 'needs_attention');
assert.match(preview.dataGuidance.join('\n'), /商品成本/);
assert.match(preview.dataGuidance.join('\n'), /商品明細/);
for (const paidField of ['netProfit', 'averageOrderValue', 'score', 'recommendation', 'productRows']) {
  assert.equal(paidField in preview, false);
}

assert.throws(() => buildSettlementFreePreview({
  capabilities: deriveRoleCapabilities({ isOwner: false, staffRole: 'manager' }),
  period: preview.period,
  markets: [market],
  dailyStats: [stats],
}), /owner-only/);

const root = join(__dirname, '..');
const pageSource = readFileSync(join(root, 'app/reports/settlement/page.tsx'), 'utf8');
const policySource = readFileSync(join(root, 'lib/reporting/settlement-subscription-view.ts'), 'utf8');
const manifestSource = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');

assert.match(pageSource, /useAccountCapabilities/);
assert.match(pageSource, /feature: 'settlementReportPreview'/);
assert.match(pageSource, /feature: 'settlementPdf'/);
assert.match(pageSource, /settlementView\.canReadProducts/);
assert.match(pageSource, /settlementView\.canBuildFreePreview/);
assert.match(pageSource, /settlementView\.canBuildFullReport/);
assert.match(pageSource, /settlementView\.canBuildPdfViewModel/);
assert.match(pageSource, /buildSettlementReportPdfViewModel/);
assert.match(pageSource, /<SettlementReportPdfPreviewButton/);
assert.doesNotMatch(pageSource, /localStorage|sessionStorage|NEXT_PUBLIC_(?:PLAN|TIER)/);
assert.doesNotMatch(policySource, /window\.|document\.|navigator\.|localStorage|sessionStorage/);
assert.match(manifestSource, /tsx tests\/settlement-report-subscription-access\.test\.ts/);

console.log('PASS S6C settlement report subscription access');
