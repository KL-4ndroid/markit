import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PLAN_PREVIEWS,
  SUBSCRIPTION_PRESENTATION,
  getSubscriptionBlockedPresentation,
  resolveSubscriptionPresentationGuard,
} from '../lib/subscription/subscription-presentation';

const root = join(__dirname, '..');
const subscriptionPage = readFileSync(join(root, 'app/subscription/page.tsx'), 'utf8');
const accountPanel = readFileSync(join(root, 'components/settings/AccountSyncPanel.tsx'), 'utf8');
const topNavigation = readFileSync(join(root, 'components/TopNavigation.tsx'), 'utf8');
const upgradePrompt = readFileSync(join(root, 'components/subscription/UpgradePrompt.tsx'), 'utf8');
const featureLimitDialog = readFileSync(join(root, 'components/subscription/FeatureLimitDialog.tsx'), 'utf8');
const productCoverField = readFileSync(join(root, 'components/products/ProductCoverPhotoField.tsx'), 'utf8');
const presentationSource = readFileSync(join(root, 'lib/subscription/subscription-presentation.ts'), 'utf8');

const unavailableOwner = resolveSubscriptionPresentationGuard({
  viewer: 'owner',
  capabilitySource: 'unavailable',
  billingRuntime: 'unavailable',
});
assert.equal(unavailableOwner.canDisplayActivePlan, false);
assert.equal(unavailableOwner.canDisplayBillingControls, false);
assert.equal(unavailableOwner.canDisplayTransactionalState, false);
assert.equal(unavailableOwner.availability, 'preview');

const staffWithAvailableSources = resolveSubscriptionPresentationGuard({
  viewer: 'staff',
  capabilitySource: 'available',
  billingRuntime: 'available',
});
assert.equal(staffWithAvailableSources.canDisplayActivePlan, true);
assert.equal(staffWithAvailableSources.canDisplayBillingControls, false);
assert.equal(staffWithAvailableSources.canDisplayTransactionalState, false);

const ownerWithoutBilling = resolveSubscriptionPresentationGuard({
  viewer: 'owner',
  capabilitySource: 'available',
  billingRuntime: 'unavailable',
});
assert.equal(ownerWithoutBilling.canDisplayActivePlan, true);
assert.equal(ownerWithoutBilling.canDisplayBillingControls, false);
assert.equal(ownerWithoutBilling.canDisplayTransactionalState, false);

const planRequired = getSubscriptionBlockedPresentation('plan_required', 'pro');
assert.equal(planRequired.title, '需要 Pro 方案');
assert.equal(planRequired.showPlanPreviewLink, true);
assert.equal(planRequired.actionLabel, '查看方案預覽');

const roleForbidden = getSubscriptionBlockedPresentation('role_forbidden', 'team');
assert.equal(roleForbidden.showPlanPreviewLink, false);
assert.equal(roleForbidden.actionLabel, null);

const runtimeDisabled = getSubscriptionBlockedPresentation('runtime_disabled', 'pro');
assert.equal(runtimeDisabled.showPlanPreviewLink, false);

assert.equal(SUBSCRIPTION_PRESENTATION.availability, 'preview');
assert.equal(SUBSCRIPTION_PRESENTATION.actionLabel, '尚未開放');
assert.equal(PLAN_PREVIEWS.length, 3);
assert.deepEqual(PLAN_PREVIEWS.map(plan => plan.id), ['free', 'pro', 'team']);
assert.deepEqual(PLAN_PREVIEWS.map(plan => plan.name), ['Free', 'Pro', 'Team']);
assert.match(SUBSCRIPTION_PRESENTATION.notice, /帳號角色/);
assert.ok(PLAN_PREVIEWS.every(plan => plan.availability === 'preview' && !plan.actionEnabled));
assert.equal(
  PLAN_PREVIEWS.find(plan => plan.id === 'free')?.features.some(feature => feature.code === 'analytics.basic'),
  false,
);
assert.equal(
  PLAN_PREVIEWS.find(plan => plan.id === 'pro')?.features.find(feature => feature.code === 'analytics.basic')?.status,
  'included',
);
assert.equal(
  PLAN_PREVIEWS.find(plan => plan.id === 'pro')?.features.find(feature => feature.code === 'report.pdf')?.status,
  'included',
);

assert.match(subscriptionPage, /SUBSCRIPTION_PRESENTATION\.notice/);
assert.doesNotMatch(subscriptionPage, /currentPlan|showCancelDialog|handleCancelSubscription/);
assert.doesNotMatch(subscriptionPage, /CreditCard|next charge|取消訂閱|付款成功/);
assert.match(accountPanel, /SUBSCRIPTION_PRESENTATION\.accountLabel/);
assert.doesNotMatch(accountPanel, />免費版</);
assert.match(topNavigation, /SUBSCRIPTION_PRESENTATION\.accountLabel/);
assert.doesNotMatch(topNavigation, /currentPlan|enterprise|目前方案|取消訂閱|續訂|付款/);
assert.doesNotMatch(`${upgradePrompt}\n${featureLimitDialog}`, /立即升級|無限市集|無限商品|雲端同步備份|員工協作功能/);
assert.match(upgradePrompt, /getSubscriptionBlockedPresentation/);
assert.match(featureLimitDialog, /getSubscriptionBlockedPresentation/);
assert.match(productCoverField, /capability\.reason === 'free_plan'/);
assert.match(productCoverField, /getSubscriptionBlockedPresentation/);
assert.match(productCoverField, /planBlock\.actionLabel/);
assert.match(productCoverField, /subscription_inactive/);
assert.doesNotMatch(productCoverField, /capability\.reason !== 'unavailable'/);
assert.doesNotMatch(presentationSource, /payment card|next charge|取消成功|付款成功|升級成功/i);
assert.doesNotMatch(presentationSource, /enterprise|studio|solo/i);
assert.doesNotMatch(
  PLAN_PREVIEWS.map(plan => plan.id).join('|'),
  /growth|reserve|collaboration_readiness|benchmark/i,
);

console.log('PASS subscription capability preview truthfulness');
