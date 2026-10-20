import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { AccountCapabilityFeature } from '../lib/subscription/subscription-capabilities';
import {
  getSubscriptionCapabilityImplementation,
  listSubscriptionCapabilityLaunchBlockers,
  SUBSCRIPTION_CAPABILITY_IMPLEMENTATION,
} from '../lib/subscription/subscription-capability-implementation';

const expectedFeatures: readonly AccountCapabilityFeature[] = [
  'productCoverPhoto',
  'salesPhotoEvidence',
  'basicAnalytics',
  'advancedAnalytics',
  'settlementReportPreview',
  'settlementPdf',
  'excelExport',
  'staffCollaboration',
  'managerWorkflow',
];

assert.equal(SUBSCRIPTION_CAPABILITY_IMPLEMENTATION.length, expectedFeatures.length);
assert.deepEqual(
  [...new Set(SUBSCRIPTION_CAPABILITY_IMPLEMENTATION.map((entry) => entry.feature))].sort(),
  [...expectedFeatures].sort(),
);

assert.deepEqual(getSubscriptionCapabilityImplementation('salesPhotoEvidence'), {
  feature: 'salesPhotoEvidence',
  enforcement: 'role_and_rollout_only',
  releaseState: 'entitlement_enforcement_missing',
  protectedWrites: true,
  nextGate: 'Add authoritative Team capability enforcement before paid launch.',
});
assert.equal(
  getSubscriptionCapabilityImplementation('productCoverPhoto').releaseState,
  'open_pre_subscription',
);
assert.equal(
  getSubscriptionCapabilityImplementation('staffCollaboration').enforcement,
  'authoritative_server',
);
assert.ok(listSubscriptionCapabilityLaunchBlockers().some((entry) => entry.feature === 'excelExport'));

const salesUploadRoute = readFileSync(
  join(__dirname, '..', 'app/api/sales-photo-evidence/upload/route.ts'),
  'utf8',
);
assert.doesNotMatch(salesUploadRoute, /resolveServerAccountCapabilities|evaluateCapabilityAccess/);

console.log('PASS subscription capability implementation status stays explicit and fail closed');
