import type {
  InAppPurchaseEnvironment,
  InAppPurchaseOption,
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
  basePlanId: string | null;
  offerId: string | null;
  status: NativeStoreCatalogMappingStatus;
}>;

export type NativeStoreCatalogValidationCode =
  | 'mapping_duplicate'
  | 'mapping_selector_duplicate'
  | 'product_duplicate'
  | 'store_option_duplicate'
  | 'purchase_option_duplicate'
  | 'product_id_invalid'
  | 'base_plan_id_invalid'
  | 'base_plan_required'
  | 'base_plan_forbidden'
  | 'offer_id_invalid'
  | 'purchase_option_id_invalid'
  | 'candidate_mapping_missing_product'
  | 'active_mapping_missing_product'
  | 'unconfigured_mapping_has_selector'
  | 'price_not_commercially_active'
  | 'store_product_missing'
  | 'store_product_mismatch'
  | 'store_option_missing';

export type NativeStoreCatalogValidationResult =
  | Readonly<{
      ok: true;
      products: readonly Readonly<{
        mapping: NativeStoreCatalogMapping;
        product: InAppPurchaseProduct;
        option: InAppPurchaseOption;
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
      basePlanId: null,
      offerId: null,
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

function isValidAppleOfferId(value: string): boolean {
  return value.length > 0
    && value.length <= 256
    && value.trim() === value
    && /^[A-Za-z0-9._-]+$/.test(value);
}

function isValidGoogleBasePlanOrOfferId(value: string): boolean {
  return value.length > 0
    && value.length <= 256
    && value.trim() === value
    && /^[a-z0-9][a-z0-9-]*$/.test(value);
}

function selectorKey(value: Readonly<{
  productId: string;
  basePlanId: string | null;
  offerId: string | null;
}>): string {
  return `${value.productId}:${value.basePlanId ?? ''}:${value.offerId ?? ''}`;
}

function validateStoreSelector(input: Readonly<{
  store: InAppPurchaseStore;
  productId: string;
  basePlanId: string | null;
  offerId: string | null;
}>): NativeStoreCatalogValidationCode | null {
  if (!isValidProductId(input.productId)) return 'product_id_invalid';
  if (input.store === 'apple_app_store') {
    if (input.basePlanId !== null) return 'base_plan_forbidden';
    if (input.offerId !== null && !isValidAppleOfferId(input.offerId)) {
      return 'offer_id_invalid';
    }
    return null;
  }
  if (input.basePlanId === null) return 'base_plan_required';
  if (!isValidGoogleBasePlanOrOfferId(input.basePlanId)) {
    return 'base_plan_id_invalid';
  }
  if (input.offerId !== null && !isValidGoogleBasePlanOrOfferId(input.offerId)) {
    return 'offer_id_invalid';
  }
  return null;
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
  const mappingSelectors = new Set<string>();

  for (const mapping of selectedMappings) {
    const mappingKey = `${mapping.store}:${mapping.environment}:${mapping.priceVersionId}`;
    if (mappingKeys.has(mappingKey)) {
      return { ok: false, code: 'mapping_duplicate', priceVersionId: mapping.priceVersionId };
    }
    mappingKeys.add(mappingKey);

    if (mapping.status === 'unconfigured') {
      if (mapping.productId !== null || mapping.basePlanId !== null || mapping.offerId !== null) {
        return {
          ok: false,
          code: 'unconfigured_mapping_has_selector',
          priceVersionId: mapping.priceVersionId,
        };
      }
      continue;
    }
    if (mapping.productId === null) {
      return {
        ok: false,
        code: mapping.status === 'active'
          ? 'active_mapping_missing_product'
          : 'candidate_mapping_missing_product',
        priceVersionId: mapping.priceVersionId,
      };
    }
    const selectorError = validateStoreSelector({
      store: mapping.store,
      productId: mapping.productId,
      basePlanId: mapping.basePlanId,
      offerId: mapping.offerId,
    });
    if (selectorError) {
      return { ok: false, code: selectorError, priceVersionId: mapping.priceVersionId };
    }
    const selectedKey = selectorKey({
      productId: mapping.productId,
      basePlanId: mapping.basePlanId,
      offerId: mapping.offerId,
    });
    if (mappingSelectors.has(selectedKey)) {
      return {
        ok: false,
        code: 'mapping_selector_duplicate',
        priceVersionId: mapping.priceVersionId,
      };
    }
    mappingSelectors.add(selectedKey);
  }

  const productIds = new Set<string>();
  const purchaseOptionIds = new Set<string>();
  for (const product of input.storeProducts) {
    if (product.store !== input.store) {
      return { ok: false, code: 'store_product_mismatch', priceVersionId: null };
    }
    if (!isValidProductId(product.productId)) {
      return { ok: false, code: 'product_id_invalid', priceVersionId: null };
    }
    if (productIds.has(product.productId)) {
      return { ok: false, code: 'product_duplicate', priceVersionId: null };
    }
    productIds.add(product.productId);

    const optionSelectors = new Set<string>();
    for (const option of product.purchaseOptions) {
      if (
        !option.purchaseOptionId.trim()
        || option.purchaseOptionId.length > 2048
        || option.purchaseOptionId.trim() !== option.purchaseOptionId
      ) {
        return { ok: false, code: 'purchase_option_id_invalid', priceVersionId: null };
      }
      if (purchaseOptionIds.has(option.purchaseOptionId)) {
        return { ok: false, code: 'purchase_option_duplicate', priceVersionId: null };
      }
      purchaseOptionIds.add(option.purchaseOptionId);
      const selectorError = validateStoreSelector({
        store: product.store,
        productId: product.productId,
        basePlanId: option.basePlanId,
        offerId: option.offerId,
      });
      if (selectorError) return { ok: false, code: selectorError, priceVersionId: null };
      const selectedKey = selectorKey({ productId: product.productId, ...option });
      if (optionSelectors.has(selectedKey)) {
        return { ok: false, code: 'store_option_duplicate', priceVersionId: null };
      }
      optionSelectors.add(selectedKey);
    }
  }

  const activeMappings = selectedMappings.filter(mapping => mapping.status === 'active');
  const resolved: Array<{
    mapping: NativeStoreCatalogMapping;
    product: InAppPurchaseProduct;
    option: InAppPurchaseOption;
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
    const option = product.purchaseOptions.find(candidate => (
      candidate.basePlanId === mapping.basePlanId && candidate.offerId === mapping.offerId
    ));
    if (!option) {
      return { ok: false, code: 'store_option_missing', priceVersionId: mapping.priceVersionId };
    }
    resolved.push({ mapping, product, option });
  }

  return { ok: true, products: resolved };
}
