export const IN_APP_PURCHASE_STORES = ['apple_app_store', 'google_play'] as const;
export type InAppPurchaseStore = typeof IN_APP_PURCHASE_STORES[number];

export type InAppPurchaseEnvironment = 'sandbox' | 'production';

export type InAppPurchaseErrorCode =
  | 'unavailable'
  | 'authentication_required'
  | 'invalid_account_binding'
  | 'product_not_found'
  | 'purchase_pending'
  | 'user_cancelled'
  | 'store_unavailable'
  | 'verification_required'
  | 'unknown';

export type InAppPurchaseResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{
      ok: false;
      error: Readonly<{
        code: InAppPurchaseErrorCode;
        retryable: boolean;
      }>;
    }>;

export type InAppPurchaseAvailability = Readonly<{
  available: boolean;
  store: InAppPurchaseStore | null;
  reason: 'available' | 'web_checkout_deferred' | 'native_adapter_not_installed' | 'store_unavailable';
}>;

export type InAppPurchaseProduct = Readonly<{
  store: InAppPurchaseStore;
  productId: string;
  displayName: string;
  displayPrice: string;
  currencyCode: string | null;
}>;

export type StoreAccountBinding = Readonly<{
  opaqueAccountToken: string;
}>;

export type StorePurchaseEvidence = Readonly<{
  store: InAppPurchaseStore;
  environment: InAppPurchaseEnvironment;
  productId: string;
  opaqueVerificationPayload: string;
}>;

export type InAppPurchaseRequest = Readonly<{
  productId: string;
  accountBinding: StoreAccountBinding;
}>;

export type InAppPurchaseRestoreRequest = Readonly<{
  accountBinding: StoreAccountBinding;
}>;

export interface InAppPurchasePort {
  getAvailability(): Promise<InAppPurchaseAvailability>;
  listProducts(productIds: readonly string[]): Promise<InAppPurchaseResult<readonly InAppPurchaseProduct[]>>;
  purchase(input: InAppPurchaseRequest): Promise<InAppPurchaseResult<StorePurchaseEvidence>>;
  restore(input: InAppPurchaseRestoreRequest): Promise<InAppPurchaseResult<readonly StorePurchaseEvidence[]>>;
  openSubscriptionManagement(): Promise<InAppPurchaseResult<true>>;
}
