import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { InAppPurchaseProduct } from '../lib/platform/contracts/in-app-purchase';
import {
  NATIVE_STORE_CATALOG_TEMPLATE,
  validateNativeStoreCatalog,
  type NativeStoreCatalogMapping,
} from '../lib/subscription/native-store-catalog';

assert.equal(NATIVE_STORE_CATALOG_TEMPLATE.length, 10);
assert.ok(NATIVE_STORE_CATALOG_TEMPLATE.every(mapping => (
  mapping.status === 'unconfigured'
  && mapping.productId === null
  && mapping.basePlanId === null
  && mapping.offerId === null
)));
assert.deepEqual(validateNativeStoreCatalog({
  store: 'apple_app_store',
  environment: 'sandbox',
  mappings: NATIVE_STORE_CATALOG_TEMPLATE,
  storeProducts: [],
}), { ok: true, products: [] });

const appleCandidate: NativeStoreCatalogMapping = {
  store: 'apple_app_store',
  environment: 'sandbox',
  priceVersionId: 'pro_annual_twd_launch_v1',
  productId: 'app.feria.pro.annual',
  basePlanId: null,
  offerId: null,
  status: 'candidate',
};
const appleProduct: InAppPurchaseProduct = {
  store: 'apple_app_store',
  productId: appleCandidate.productId!,
  displayName: 'Pro Annual',
  purchaseOptions: [{
    purchaseOptionId: 'test-only-apple-standard-option',
    basePlanId: null,
    offerId: null,
    displayPrice: 'NT$1,990',
    currencyCode: 'TWD',
  }],
};
assert.deepEqual(validateNativeStoreCatalog({
  store: 'apple_app_store',
  environment: 'sandbox',
  mappings: [appleCandidate],
  storeProducts: [appleProduct],
}), { ok: true, products: [] }, 'candidate mappings must not become purchasable');

assert.deepEqual(validateNativeStoreCatalog({
  store: 'apple_app_store',
  environment: 'sandbox',
  mappings: [{ ...appleCandidate, status: 'active' }],
  storeProducts: [],
}), {
  ok: false,
  code: 'price_not_commercially_active',
  priceVersionId: 'pro_annual_twd_launch_v1',
});
assert.deepEqual(validateNativeStoreCatalog({
  store: 'apple_app_store',
  environment: 'sandbox',
  mappings: [appleCandidate, appleCandidate],
  storeProducts: [],
}), {
  ok: false,
  code: 'mapping_duplicate',
  priceVersionId: 'pro_annual_twd_launch_v1',
});

const googleMonthly: NativeStoreCatalogMapping = {
  store: 'google_play',
  environment: 'sandbox',
  priceVersionId: 'pro_monthly_twd_launch_v1',
  productId: 'app.feria.pro',
  basePlanId: 'monthly',
  offerId: null,
  status: 'candidate',
};
const googleAnnual: NativeStoreCatalogMapping = {
  ...googleMonthly,
  priceVersionId: 'pro_annual_twd_launch_v1',
  basePlanId: 'annual',
};
const googleProduct: InAppPurchaseProduct = {
  store: 'google_play',
  productId: googleMonthly.productId!,
  displayName: 'Pro',
  purchaseOptions: [
    {
      purchaseOptionId: 'test-only-google-monthly-offer-token',
      basePlanId: 'monthly',
      offerId: null,
      displayPrice: 'NT$199',
      currencyCode: 'TWD',
    },
    {
      purchaseOptionId: 'test-only-google-annual-offer-token',
      basePlanId: 'annual',
      offerId: null,
      displayPrice: 'NT$1,990',
      currencyCode: 'TWD',
    },
  ],
};
assert.deepEqual(validateNativeStoreCatalog({
  store: 'google_play',
  environment: 'sandbox',
  mappings: [googleMonthly, googleAnnual],
  storeProducts: [googleProduct],
}), { ok: true, products: [] }, 'one Google product may expose multiple base plans');

assert.deepEqual(validateNativeStoreCatalog({
  store: 'google_play',
  environment: 'sandbox',
  mappings: [googleMonthly, { ...googleAnnual, basePlanId: 'monthly' }],
  storeProducts: [googleProduct],
}), {
  ok: false,
  code: 'mapping_selector_duplicate',
  priceVersionId: 'pro_annual_twd_launch_v1',
});
assert.deepEqual(validateNativeStoreCatalog({
  store: 'google_play',
  environment: 'sandbox',
  mappings: [{ ...googleMonthly, basePlanId: null }],
  storeProducts: [],
}), {
  ok: false,
  code: 'base_plan_required',
  priceVersionId: 'pro_monthly_twd_launch_v1',
});
assert.deepEqual(validateNativeStoreCatalog({
  store: 'apple_app_store',
  environment: 'sandbox',
  mappings: [{ ...appleCandidate, basePlanId: 'annual' }],
  storeProducts: [],
}), {
  ok: false,
  code: 'base_plan_forbidden',
  priceVersionId: 'pro_annual_twd_launch_v1',
});
assert.deepEqual(validateNativeStoreCatalog({
  store: 'google_play',
  environment: 'sandbox',
  mappings: [{ ...googleMonthly, productId: 'invalid product id' }],
  storeProducts: [],
}), {
  ok: false,
  code: 'product_id_invalid',
  priceVersionId: 'pro_monthly_twd_launch_v1',
});
assert.deepEqual(validateNativeStoreCatalog({
  store: 'google_play',
  environment: 'sandbox',
  mappings: [{ ...googleMonthly, basePlanId: 'Annual' }],
  storeProducts: [],
}), {
  ok: false,
  code: 'base_plan_id_invalid',
  priceVersionId: 'pro_monthly_twd_launch_v1',
});
assert.deepEqual(validateNativeStoreCatalog({
  store: 'google_play',
  environment: 'sandbox',
  mappings: [googleMonthly],
  storeProducts: [{
    ...googleProduct,
    purchaseOptions: [googleProduct.purchaseOptions[0], {
      ...googleProduct.purchaseOptions[1],
      purchaseOptionId: googleProduct.purchaseOptions[0].purchaseOptionId,
    }],
  }],
}), {
  ok: false,
  code: 'purchase_option_duplicate',
  priceVersionId: null,
});

const root = join(__dirname, '..');
const topology = readFileSync(
  join(root, 'docs/subscription/NATIVE_STORE_CATALOG_TOPOLOGY_2026_08_06.md'),
  'utf8',
);
const gates = JSON.parse(readFileSync(
  join(root, 'docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json'),
  'utf8',
)) as { gates: Array<{ id: string; status: string }> };
const catalogSource = readFileSync(
  join(root, 'lib/subscription/native-store-catalog.ts'),
  'utf8',
);
const verificationSource = readFileSync(
  join(root, 'lib/subscription/native-store-verification-contract.ts'),
  'utf8',
);
assert.match(topology, /purchaseOptionId/);
assert.match(topology, /basePlanId/);
assert.match(topology, /offerId/);
assert.match(topology, /Founder.*permanent renewal price/s);
assert.equal(gates.gates.find(gate => gate.id === 'STORE-CATALOG')?.status, 'pending_manual');
assert.doesNotMatch(
  catalogSource,
  /@capacitor|window\.|document\.|navigator\.|localStorage|indexedDB|Dexie|fetch\(/i,
);
assert.doesNotMatch(verificationSource, /purchaseOptionId/);

console.log('PASS native store catalog models product, base plan, offer, and local option');
