import type { NativeStoreVerificationRequest } from '../../lib/subscription/native-store-verification-contract';

export const TEST_APPLE_VERIFICATION_REQUEST: NativeStoreVerificationRequest = Object.freeze({
  schemaVersion: 1,
  store: 'apple_app_store',
  productId: 'test.feria.pro.annual',
  opaqueVerificationPayload: 'test-only-apple-signed-transaction-placeholder',
});

export const TEST_GOOGLE_VERIFICATION_REQUEST: NativeStoreVerificationRequest = Object.freeze({
  schemaVersion: 1,
  store: 'google_play',
  productId: 'test.feria.team.monthly',
  opaqueVerificationPayload: 'test-only-google-purchase-token-placeholder',
});
