import assert from 'node:assert/strict';

import {
  NATIVE_STORE_CATALOG_TEMPLATE,
  validateNativeStoreCatalog,
  type NativeStoreCatalogMapping,
} from '../lib/subscription/native-store-catalog';

assert.equal(NATIVE_STORE_CATALOG_TEMPLATE.length, 10);
assert.ok(NATIVE_STORE_CATALOG_TEMPLATE.every(mapping => (
  mapping.status === 'unconfigured' && mapping.productId === null
)));
assert.deepEqual(validateNativeStoreCatalog({
  store: 'apple_app_store',
  environment: 'sandbox',
  mappings: NATIVE_STORE_CATALOG_TEMPLATE,
  storeProducts: [],
}), { ok: true, products: [] });

const candidateMapping: NativeStoreCatalogMapping = {
  store: 'apple_app_store',
  environment: 'sandbox',
  priceVersionId: 'pro_annual_twd_launch_v1',
  productId: 'app.feria.pro.annual',
  status: 'candidate',
};
assert.deepEqual(validateNativeStoreCatalog({
  store: 'apple_app_store',
  environment: 'sandbox',
  mappings: [candidateMapping],
  storeProducts: [{
    store: 'apple_app_store',
    productId: 'app.feria.pro.annual',
    displayName: 'Pro Annual',
    displayPrice: 'NT$1,990',
    currencyCode: 'TWD',
  }],
}), { ok: true, products: [] }, 'candidate mappings must not become purchasable');

assert.deepEqual(validateNativeStoreCatalog({
  store: 'apple_app_store',
  environment: 'sandbox',
  mappings: [{ ...candidateMapping, status: 'active' }],
  storeProducts: [],
}), {
  ok: false,
  code: 'price_not_commercially_active',
  priceVersionId: 'pro_annual_twd_launch_v1',
});
assert.deepEqual(validateNativeStoreCatalog({
  store: 'apple_app_store',
  environment: 'sandbox',
  mappings: [candidateMapping, candidateMapping],
  storeProducts: [],
}), {
  ok: false,
  code: 'mapping_duplicate',
  priceVersionId: 'pro_annual_twd_launch_v1',
});
assert.deepEqual(validateNativeStoreCatalog({
  store: 'google_play',
  environment: 'sandbox',
  mappings: [{
    ...candidateMapping,
    store: 'google_play',
    productId: 'invalid product id',
  }],
  storeProducts: [],
}), {
  ok: false,
  code: 'product_id_invalid',
  priceVersionId: 'pro_annual_twd_launch_v1',
});

console.log('PASS native store catalog is unconfigured and fail closed by default');
