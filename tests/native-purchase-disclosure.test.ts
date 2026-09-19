import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { InAppPurchaseProduct } from '../lib/platform/contracts/in-app-purchase';
import { prepareNativePurchaseDisclosure } from '../lib/subscription/native-purchase-disclosure';

const product: InAppPurchaseProduct = {
  store: 'google_play',
  productId: 'app.feria.pro',
  displayName: 'Feria Pro',
  purchaseOptions: [{
    purchaseOptionId: 'test-only-google-annual-offer-token',
    basePlanId: 'annual',
    offerId: 'launch-offer',
    pricePhases: [{
      displayPrice: '免費',
      currencyCode: null,
      billingPeriod: 'P2W',
      billingCycleCount: 1,
      paymentMode: 'free_trial',
    }, {
      displayPrice: 'NT$1,990',
      currencyCode: 'TWD',
      billingPeriod: 'P1Y',
      billingCycleCount: null,
      paymentMode: 'recurring',
    }],
  }],
};

const readyInput = {
  authenticated: true,
  ownerAuthorized: true,
  accountBindingReady: true,
  verificationRuntimeAvailable: true,
  productCopyReviewed: true,
  billingCopyReviewed: true,
  freePlanAvailable: true,
  subscriptionManagementAvailable: true,
  termsUrl: 'https://feria.example/terms',
  privacyUrl: 'https://feria.example/privacy',
  product,
  option: product.purchaseOptions[0],
} as const;

const ready = prepareNativePurchaseDisclosure(readyInput);
assert.equal(ready.ready, true);
if (!ready.ready) throw new Error('expected ready disclosure');
assert.equal(ready.disclosure.recurringPhase.displayPrice, 'NT$1,990');
assert.equal(ready.disclosure.recurringPhase.billingPeriod, 'P1Y');
assert.equal(ready.disclosure.pricePhases[0].paymentMode, 'free_trial');
assert.equal(ready.disclosure.pricePhases[0].billingPeriod, 'P2W');
assert.match(ready.disclosure.freeAccessNotice, /Free/);
assert.match(ready.disclosure.accountAccessNotice, /帳號.*跨裝置/);

const blockCases = [
  ['authenticated', false, 'authentication_required'],
  ['ownerAuthorized', false, 'owner_required'],
  ['accountBindingReady', false, 'account_binding_required'],
  ['verificationRuntimeAvailable', false, 'verification_runtime_unavailable'],
  ['productCopyReviewed', false, 'product_copy_unreviewed'],
  ['billingCopyReviewed', false, 'billing_copy_unreviewed'],
  ['freePlanAvailable', false, 'free_plan_disclosure_required'],
  ['subscriptionManagementAvailable', false, 'subscription_management_unavailable'],
] as const;
for (const [key, value, reason] of blockCases) {
  assert.deepEqual(prepareNativePurchaseDisclosure({ ...readyInput, [key]: value }), {
    ready: false,
    reason,
  });
}

for (const termsUrl of [null, 'http://feria.example/terms', 'https://user:pass@feria.example/terms']) {
  assert.deepEqual(prepareNativePurchaseDisclosure({ ...readyInput, termsUrl }), {
    ready: false,
    reason: 'legal_url_invalid',
  });
}
assert.deepEqual(prepareNativePurchaseDisclosure({
  ...readyInput,
  option: { ...product.purchaseOptions[0] },
}), {
  ready: false,
  reason: 'purchase_option_mismatch',
});
assert.deepEqual(prepareNativePurchaseDisclosure({
  ...readyInput,
  product: { ...product, displayName: ' ' },
}), {
  ready: false,
  reason: 'product_metadata_invalid',
});

const invalidOption = { ...product.purchaseOptions[0], pricePhases: [] };
const invalidProduct = { ...product, purchaseOptions: [invalidOption] };
assert.deepEqual(prepareNativePurchaseDisclosure({
  ...readyInput,
  product: invalidProduct,
  option: invalidOption,
}), {
  ready: false,
  reason: 'price_phase_invalid',
});

const monthlyOption = {
  purchaseOptionId: 'test-only-google-monthly-option',
  basePlanId: 'monthly',
  offerId: null,
  pricePhases: [{
    displayPrice: 'NT$199',
    currencyCode: 'TWD',
    billingPeriod: 'P1M' as const,
    billingCycleCount: null,
    paymentMode: 'recurring' as const,
  }],
};
const monthlyProduct = { ...product, purchaseOptions: [monthlyOption] };
const monthly = prepareNativePurchaseDisclosure({
  ...readyInput,
  product: monthlyProduct,
  option: monthlyOption,
});
assert.equal(monthly.ready && monthly.disclosure.recurringPhase.billingPeriod, 'P1M');

const root = join(__dirname, '..');
const source = readFileSync(
  join(root, 'lib/subscription/native-purchase-disclosure.ts'),
  'utf8',
);
assert.doesNotMatch(source, /@capacitor|window\.|document\.|navigator\.|localStorage|indexedDB|Dexie|fetch\(/i);
assert.doesNotMatch(source, /1990|65%|折|永久|終身|無限/);

console.log('PASS native purchase disclosure is store-authoritative and fail closed');
