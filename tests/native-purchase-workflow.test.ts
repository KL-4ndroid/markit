import assert from 'node:assert/strict';

import { createFakeInAppPurchasePort } from '../lib/platform/testing/fake-in-app-purchase';
import {
  loadNativePurchaseProducts,
  openNativeSubscriptionManagement,
  runNativePurchase,
  runNativePurchaseRestore,
} from '../lib/subscription/native-purchase-workflow';
import { prepareNativePurchaseDisclosure } from '../lib/subscription/native-purchase-disclosure';

async function main(): Promise<void> {
  const binding = { opaqueAccountToken: 'test-only-opaque-account-binding' };
  const evidence = {
    store: 'apple_app_store' as const,
    environment: 'sandbox' as const,
    productId: 'app.feria.pro.annual',
    opaqueVerificationPayload: 'test-only-unverified-evidence',
  };
  const product = {
    store: 'apple_app_store' as const,
    productId: evidence.productId,
    displayName: 'Pro Annual',
    purchaseOptions: [{
      purchaseOptionId: 'test-only-apple-standard-option',
      basePlanId: null,
      offerId: null,
      pricePhases: [{
        displayPrice: 'NT$1,990',
        currencyCode: 'TWD',
        billingPeriod: 'P1Y' as const,
        billingCycleCount: null,
        paymentMode: 'recurring' as const,
      }],
    }],
  };
  const disclosure = prepareNativePurchaseDisclosure({
    authenticated: true,
    ownerAuthorized: true,
    accountBindingReady: true,
    verificationRuntimeAvailable: true,
    productCopyReviewed: true,
    billingCopyReviewed: true,
    freePlanAvailable: true,
    subscriptionManagementAvailable: true,
    termsUrl: 'https://example.com/terms',
    privacyUrl: 'https://example.com/privacy',
    product,
    option: product.purchaseOptions[0],
  });
  assert.equal(disclosure.ready, true);
  const successful = createFakeInAppPurchasePort({
    availability: { available: true, store: 'apple_app_store', reason: 'available' },
    products: [product],
    purchaseResult: { ok: true, value: evidence },
    restoreResult: { ok: true, value: [evidence] },
    managementResult: { ok: true, value: true },
  });

  assert.deepEqual(await loadNativePurchaseProducts({
    port: successful.port,
    productIds: [product.productId],
  }), {
    phase: 'ready',
    products: [product],
    evidence: [],
    errorCode: null,
    retryable: false,
  });
  assert.equal((await runNativePurchase({
    port: successful.port,
    request: {
      productId: product.productId,
      purchaseOptionId: product.purchaseOptions[0].purchaseOptionId,
      accountBinding: binding,
    },
    disclosure,
  })).phase, 'awaiting_server_verification');
  assert.equal((await runNativePurchaseRestore({
    port: successful.port,
    request: { accountBinding: binding },
  })).phase, 'awaiting_server_verification');
  assert.equal((await openNativeSubscriptionManagement(successful.port)).phase, 'idle');

  const pending = createFakeInAppPurchasePort({
    availability: { available: true, store: 'google_play', reason: 'available' },
    purchaseResult: {
      ok: false,
      error: { code: 'purchase_pending', retryable: false },
    },
  });
  assert.equal((await runNativePurchase({
    port: pending.port,
    request: {
      productId: product.productId,
      purchaseOptionId: product.purchaseOptions[0].purchaseOptionId,
      accountBinding: binding,
    },
    disclosure,
  })).phase, 'pending');

  const cancelled = createFakeInAppPurchasePort({
    availability: { available: true, store: 'apple_app_store', reason: 'available' },
    purchaseResult: {
      ok: false,
      error: { code: 'user_cancelled', retryable: false },
    },
  });
  assert.equal((await runNativePurchase({
    port: cancelled.port,
    request: {
      productId: product.productId,
      purchaseOptionId: product.purchaseOptions[0].purchaseOptionId,
      accountBinding: binding,
    },
    disclosure,
  })).phase, 'cancelled');

  const blocked = createFakeInAppPurchasePort({
    availability: { available: true, store: 'apple_app_store', reason: 'available' },
    purchaseResult: { ok: true, value: evidence },
  });
  const blockedState = await runNativePurchase({
    port: blocked.port,
    request: {
      productId: product.productId,
      purchaseOptionId: product.purchaseOptions[0].purchaseOptionId,
      accountBinding: binding,
    },
    disclosure: { ready: false, reason: 'billing_copy_unreviewed' },
  });
  assert.equal(blockedState.errorCode, 'purchase_disclosure_required');
  assert.equal(blocked.calls.length, 0, 'blocked disclosure must not call the store adapter');

  const mismatched = createFakeInAppPurchasePort({
    availability: { available: true, store: 'apple_app_store', reason: 'available' },
    purchaseResult: { ok: true, value: evidence },
  });
  const mismatchedState = await runNativePurchase({
    port: mismatched.port,
    request: {
      productId: 'app.feria.team.annual',
      purchaseOptionId: product.purchaseOptions[0].purchaseOptionId,
      accountBinding: binding,
    },
    disclosure,
  });
  assert.equal(mismatchedState.errorCode, 'purchase_disclosure_mismatch');
  assert.equal(mismatched.calls.length, 0, 'mismatched disclosure must not call the store adapter');

  const web = createFakeInAppPurchasePort({
    availability: { available: false, store: null, reason: 'web_checkout_deferred' },
  });
  const webState = await loadNativePurchaseProducts({ port: web.port, productIds: [] });
  assert.equal(webState.phase, 'failed');
  assert.equal(webState.errorCode, 'web_checkout_deferred');

  console.log('PASS native purchase workflow never treats store evidence as verified entitlement');
}

void main();
