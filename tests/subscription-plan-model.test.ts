import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  ACCOUNT_PLAN_CODES,
  SUBSCRIPTION_PLAN_DEFINITIONS,
  getSubscriptionPlanFeatureStatus,
  isAccountPlanCode,
} from '../lib/subscription/subscription-plans';

assert.deepEqual(ACCOUNT_PLAN_CODES, ['free', 'pro', 'team']);
assert.deepEqual(Object.keys(SUBSCRIPTION_PLAN_DEFINITIONS), ['free', 'pro', 'team']);
assert.equal(isAccountPlanCode('free'), true);
assert.equal(isAccountPlanCode('pro'), true);
assert.equal(isAccountPlanCode('team'), true);
assert.equal(isAccountPlanCode('enterprise'), false);
assert.equal(isAccountPlanCode('growth_reserve'), false);

assert.equal(getSubscriptionPlanFeatureStatus('free', 'photo.product_cover'), 'not_available');
assert.equal(getSubscriptionPlanFeatureStatus('free', 'photo.sales_evidence'), 'not_available');
assert.equal(getSubscriptionPlanFeatureStatus('free', 'team.staff_collaboration'), 'not_available');
assert.equal(getSubscriptionPlanFeatureStatus('free', 'analytics.basic'), 'not_available');

assert.equal(getSubscriptionPlanFeatureStatus('pro', 'photo.product_cover'), 'included');
assert.equal(getSubscriptionPlanFeatureStatus('pro', 'analytics.basic'), 'included');
assert.equal(getSubscriptionPlanFeatureStatus('pro', 'analytics.advanced'), 'included');
assert.equal(getSubscriptionPlanFeatureStatus('pro', 'photo.sales_evidence'), 'not_available');
assert.equal(getSubscriptionPlanFeatureStatus('pro', 'team.staff_collaboration'), 'not_available');
assert.equal(getSubscriptionPlanFeatureStatus('pro', 'report.pdf'), 'included');
assert.equal(getSubscriptionPlanFeatureStatus('pro', 'report.excel'), 'coming_soon');

assert.equal(getSubscriptionPlanFeatureStatus('team', 'photo.product_cover'), 'included');
assert.equal(getSubscriptionPlanFeatureStatus('team', 'photo.sales_evidence'), 'included');
assert.equal(getSubscriptionPlanFeatureStatus('team', 'team.staff_collaboration'), 'included');
assert.equal(getSubscriptionPlanFeatureStatus('team', 'team.manager_workflow'), 'included');
assert.equal(getSubscriptionPlanFeatureStatus('team', 'report.pdf'), 'included');

assert.deepEqual(SUBSCRIPTION_PLAN_DEFINITIONS.free.limits.activeProducts, {
  value: 15,
  status: 'experiment_unenforced',
});
assert.deepEqual(SUBSCRIPTION_PLAN_DEFINITIONS.team.limits.staffSeats, {
  value: 3,
  status: 'candidate',
});
assert.equal(SUBSCRIPTION_PLAN_DEFINITIONS.pro.limits.productPhotoStorageBytes.value, null);
assert.equal(SUBSCRIPTION_PLAN_DEFINITIONS.pro.limits.productPhotoStorageBytes.status, 'unapproved');

const source = readFileSync(
  join(__dirname, '../lib/subscription/subscription-plans.ts'),
  'utf8',
);
assert.doesNotMatch(source, /react|next\/|supabase|dexie|window|localStorage|sessionStorage|document\./i);
assert.doesNotMatch(source, /growth_reserve|collaboration_readiness|public_partner_snapshot|anonymous_benchmark/i);

console.log('PASS pure Free Pro Team subscription plan definitions');
