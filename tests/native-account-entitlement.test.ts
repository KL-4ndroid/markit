import assert from 'node:assert/strict';

import {
  evaluateNativePurchaseEligibility,
  evaluateVerifiedAccountEntitlementAccess,
  type VerifiedPaidAccountEntitlement,
} from '../lib/subscription/native-account-entitlement';

const NOW = Date.parse('2026-08-06T12:00:00.000Z');

const appleEntitlement: VerifiedPaidAccountEntitlement = {
  ownerId: 'owner-a',
  planCode: 'pro',
  origin: 'apple_app_store',
  billingStatus: 'active',
  entitlementStatus: 'active',
  verifiedAt: '2026-08-06T11:55:00.000Z',
  refreshAfter: '2026-08-06T12:05:00.000Z',
  entitlementEndsAt: '2027-08-06T12:00:00.000Z',
};

for (const surface of ['ios', 'android', 'web'] as const) {
  assert.deepEqual(
    evaluateVerifiedAccountEntitlementAccess({
      authenticatedOwnerId: 'owner-a',
      entitlement: appleEntitlement,
      surface,
      nowMs: NOW,
    }),
    {
      allowed: true,
      planCode: 'pro',
      origin: 'apple_app_store',
      surface,
    },
    `Apple entitlement must follow the account onto ${surface}`,
  );
}

assert.deepEqual(
  evaluateVerifiedAccountEntitlementAccess({
    authenticatedOwnerId: 'owner-b',
    entitlement: appleEntitlement,
    surface: 'android',
    nowMs: NOW,
  }),
  { allowed: false, reason: 'owner_mismatch', surface: 'android' },
);
assert.deepEqual(
  evaluateVerifiedAccountEntitlementAccess({
    authenticatedOwnerId: 'owner-a',
    entitlement: { ...appleEntitlement, entitlementStatus: 'unknown' },
    surface: 'web',
    nowMs: NOW,
  }),
  { allowed: false, reason: 'entitlement_unknown', surface: 'web' },
);
assert.deepEqual(
  evaluateVerifiedAccountEntitlementAccess({
    authenticatedOwnerId: 'owner-a',
    entitlement: { ...appleEntitlement, refreshAfter: '2026-08-06T11:59:59.000Z' },
    surface: 'ios',
    nowMs: NOW,
  }),
  { allowed: false, reason: 'entitlement_stale', surface: 'ios' },
);
assert.deepEqual(
  evaluateVerifiedAccountEntitlementAccess({
    authenticatedOwnerId: 'owner-a',
    entitlement: { ...appleEntitlement, entitlementEndsAt: '2026-08-06T11:59:59.000Z' },
    surface: 'ios',
    nowMs: NOW,
  }),
  { allowed: false, reason: 'entitlement_expired', surface: 'ios' },
);

assert.deepEqual(
  evaluateNativePurchaseEligibility({
    authenticatedOwnerId: 'owner-a',
    requestedOrigin: 'google_play',
    verifiedEntitlements: [],
    nowMs: NOW,
  }),
  { allowed: true, origin: 'google_play' },
);
assert.deepEqual(
  evaluateNativePurchaseEligibility({
    authenticatedOwnerId: 'owner-a',
    requestedOrigin: 'apple_app_store',
    verifiedEntitlements: [appleEntitlement],
    nowMs: NOW,
  }),
  {
    allowed: false,
    reason: 'manage_existing_subscription',
    existingOrigin: 'apple_app_store',
  },
);
assert.deepEqual(
  evaluateNativePurchaseEligibility({
    authenticatedOwnerId: 'owner-a',
    requestedOrigin: 'google_play',
    verifiedEntitlements: [appleEntitlement],
    nowMs: NOW,
  }),
  {
    allowed: false,
    reason: 'active_origin_conflict',
    existingOrigin: 'apple_app_store',
  },
);
assert.deepEqual(
  evaluateNativePurchaseEligibility({
    authenticatedOwnerId: 'owner-a',
    requestedOrigin: 'google_play',
    verifiedEntitlements: [
      appleEntitlement,
      { ...appleEntitlement, origin: 'ecpay_web', planCode: 'team' },
    ],
    nowMs: NOW,
  }),
  { allowed: false, reason: 'multiple_active_origins', existingOrigin: null },
);

console.log('PASS account-bound cross-platform entitlement and duplicate-origin rules');
