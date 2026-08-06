import type {
  InAppPurchaseEnvironment,
  InAppPurchaseProduct,
  InAppPurchaseStore,
} from '@/lib/platform/contracts/in-app-purchase';
import {
  SUBSCRIPTION_PRICE_CATALOG,
  type SubscriptionPriceVersionId,
} from './subscription-pricing';

export type NativeStoreCatalogMappingStatus = 'unconfigured' | 'candidate' | 'active';

export type NativeStoreCatalogMapping = Readonly<{
  store: InAppPurchaseStore;
  environment: InAppPurchaseEnvironment;
  priceVersionId: SubscriptionPriceVersionId;
  productId: string | null;
  status: NativeStoreCatalogMappingStatus;
}>;

export type NativeStoreCatalogValidationCode =
  | 'mapping_duplicate'
  | 'product_duplicate'
  | 'product_id_invalid'
  | 'active_mapping_missing_product'
  | 'price_not_commercially_active'
  | 'store_product_missing'
  | 'store_product_mismatch';

export type NativeStoreCatalogValidationResult =
  | Readonly<{
      ok: true;
      products: readonly Readonly<{
        mapping: NativeStoreCatalogMapping;
        product: InAppPurchaseProduct;
      }>[];
    }>
  | Readonly<{
      ok: false;
      code: NativeStoreCatalogValidationCode;
      priceVersionId: SubscriptionPriceVersionId | null;
    }>;

export const NATIVE_STORE_CATALOG_TEMPLATE: readonly NativeStoreCatalogMapping[] = Object.freeze(
  (['apple_app_store', 'google_play'] as const).flatMap(store => (
    (Object.keys(SUBSCRIPTION_PRICE_CATALOG) as SubscriptionPriceVersionId[]).map(priceVersionId => ({
      store,
      environment: 'sandbox' as const,
      priceVersionId,
      productId: null,
      status: 'unconfigured' as const,
    }))
  )),
);

function isValidProductId(value: string): boolean {
  return value.length > 0
    && value.length <= 256
    && value.trim() === value
    && /^[A-Za-z0-9._-]+$/.test(value);
}

export function validateNativeStoreCatalog(input: {
  store: InAppPurchaseStore;
  environment: InAppPurchaseEnvironment;
  mappings: readonly NativeStoreCatalogMapping[];
  storeProducts: readonly InAppPurchaseProduct[];
}): NativeStoreCatalogValidationResult {
  const selectedMappings = input.mappings.filter(mapping => (
    mapping.store === input.store && mapping.environment === input.environment
  ));
  const mappingKeys = new Set<string>();
  const productIds = new Set<string>();

  for (const mapping of selectedMappings) {
    const mappingKey = `${mapping.store}:${mapping.environment}:${mapping.priceVersionId}`;
    if (mappingKeys.has(mappingKey)) {
      return { ok: false, code: 'mapping_duplicate', priceVersionId: mapping.priceVersionId };
    }
    mappingKeys.add(mappingKey);

    if (mapping.productId !== null && !isValidProductId(mapping.productId)) {
      return { ok: false, code: 'product_id_invalid', priceVersionId: mapping.priceVersionId };
    }
    if (mapping.status === 'active' && mapping.productId === null) {
      return { ok: false, code: 'active_mapping_missing_product', priceVersionId: mapping.priceVersionId };
    }
    if (mapping.productId !== null) {
      if (productIds.has(mapping.productId)) {
        return { ok: false, code: 'product_duplicate', priceVersionId: mapping.priceVersionId };
      }
      productIds.add(mapping.productId);
    }
  }

  const activeMappings = selectedMappings.filter(mapping => mapping.status === 'active');
  const resolved: Array<{
    mapping: NativeStoreCatalogMapping;
    product: InAppPurchaseProduct;
  }> = [];

  for (const mapping of activeMappings) {
    const internalPrice = SUBSCRIPTION_PRICE_CATALOG[mapping.priceVersionId];
    if (internalPrice.runtimeStatus !== 'active') {
      return {
        ok: false,
        code: 'price_not_commercially_active',
        priceVersionId: mapping.priceVersionId,
      };
    }
    const product = input.storeProducts.find(candidate => candidate.productId === mapping.productId);
    if (!product) {
      return { ok: false, code: 'store_product_missing', priceVersionId: mapping.priceVersionId };
    }
    if (product.store !== input.store) {
      return { ok: false, code: 'store_product_mismatch', priceVersionId: mapping.priceVersionId };
    }
    resolved.push({ mapping, product });
  }

  return { ok: true, products: resolved };
}
