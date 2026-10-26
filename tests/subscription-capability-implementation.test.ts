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
  enforcement: 'pilot_authoritative_server',
  releaseState: 'pilot_verified_global_pending',
  protectedWrites: true,
  nextGate: 'Pilot Team write guards exist; approve global enforcement and retained-read policy before paid launch.',
});
assert.equal(
  getSubscriptionCapabilityImplementation('productCoverPhoto').releaseState,
  'pilot_verified_global_pending',
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
assert.match(salesUploadRoute, /checkServerSubscriptionWrite/);
assert.ok(listSubscriptionCapabilityLaunchBlockers().some(entry => entry.feature === 'salesPhotoEvidence'));
assert.ok(listSubscriptionCapabilityLaunchBlockers().some(entry => entry.feature === 'productCoverPhoto'));

console.log('PASS subscription capability implementation status stays explicit and fail closed');
