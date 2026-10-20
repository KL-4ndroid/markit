import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  NATIVE_STORE_VERIFICATION_PAYLOAD_MAX_LENGTH,
  isValidNativeStoreVerificationContext,
  parseNativeStoreVerificationRequest,
  type VerifiedNativeStoreSubscription,
} from '../lib/subscription/native-store-verification-contract';
import {
  TEST_APPLE_VERIFICATION_REQUEST,
  TEST_GOOGLE_VERIFICATION_REQUEST,
} from './fixtures/native-store-verification';

for (const fixture of [TEST_APPLE_VERIFICATION_REQUEST, TEST_GOOGLE_VERIFICATION_REQUEST]) {
  assert.deepEqual(parseNativeStoreVerificationRequest(fixture), {
    ok: true,
    value: fixture,
  });
}

for (const invalid of [
  null,
  {},
  { ...TEST_APPLE_VERIFICATION_REQUEST, schemaVersion: 2 },
  { ...TEST_APPLE_VERIFICATION_REQUEST, store: 'ecpay_web' },
  { ...TEST_APPLE_VERIFICATION_REQUEST, productId: ' ' },
  { ...TEST_APPLE_VERIFICATION_REQUEST, opaqueVerificationPayload: '' },
  {
    ...TEST_APPLE_VERIFICATION_REQUEST,
    opaqueVerificationPayload: 'x'.repeat(NATIVE_STORE_VERIFICATION_PAYLOAD_MAX_LENGTH + 1),
  },
  { ...TEST_APPLE_VERIFICATION_REQUEST, ownerId: 'client-must-not-choose-owner' },
  { ...TEST_APPLE_VERIFICATION_REQUEST, planCode: 'team' },
  { ...TEST_APPLE_VERIFICATION_REQUEST, environment: 'production' },
]) {
  assert.deepEqual(parseNativeStoreVerificationRequest(invalid), {
    ok: false,
    error: 'invalid_request',
  });
}

assert.equal(isValidNativeStoreVerificationContext({
  authenticatedOwnerId: 'server-derived-owner',
  expectedAccountBindingToken: 'server-derived-opaque-binding',
  environment: 'sandbox',
}), true);
assert.equal(isValidNativeStoreVerificationContext({
  authenticatedOwnerId: '',
  expectedAccountBindingToken: 'server-derived-opaque-binding',
  environment: 'sandbox',
}), false);

const verifiedGoogleSnapshot: VerifiedNativeStoreSubscription = Object.freeze({
  verification: 'verified',
  accountBinding: 'matched',
  ownerId: 'server-derived-owner',
  origin: 'google_play',
  environment: 'sandbox',
  providerSubscriptionRef: 'test-only-subscription-reference',
  providerTransactionRef: 'test-only-transaction-reference',
  productId: 'test.feria.pro',
  basePlanId: 'annual',
  offerId: 'founder-annual',
  mappedPriceVersionId: 'pro_founder_annual_twd_launch_v1',
  mappedPlanCode: 'pro',
  mappedCadence: 'annual',
  status: 'active',
  autoRenewEnabled: true,
  currentPeriodStartsAt: '2026-08-01T00:00:00.000Z',
  currentPeriodEndsAt: '2027-08-01T00:00:00.000Z',
  storeObservedAt: '2026-08-01T00:00:01.000Z',
  verifiedAt: '2026-08-01T00:00:02.000Z',
  snapshotHash: 'test-only-snapshot-hash',
});
assert.equal(verifiedGoogleSnapshot.basePlanId, 'annual');
assert.equal(
  verifiedGoogleSnapshot.mappedPriceVersionId,
  'pro_founder_annual_twd_launch_v1',
);

const root = join(__dirname, '..');
const contract = readFileSync(
  join(root, 'lib/subscription/native-store-verification-contract.ts'),
  'utf8',
);
const documentation = readFileSync(
  join(root, 'docs/subscription/NATIVE_STORE_VERIFICATION_CONTRACT_2026_08_06.md'),
  'utf8',
);
for (const source of [contract, documentation]) {
  assert.doesNotMatch(source, /@capacitor|window\.|document\.|navigator\.|Dexie/i);
}
assert.doesNotMatch(contract, /subscription_accounts|update\(|insert\(|upsert\(/i);
assert.match(documentation, /does not add an API route/);
assert.match(documentation, /STORE-VERIFICATION.*remains incomplete/s);
assert.match(documentation, /productId.*basePlanId.*offerId.*mappedPriceVersionId/s);

console.log('PASS bounded native store verification request and trusted server context');
