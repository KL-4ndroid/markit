import type { RecoverablePurchasePort, InAppPurchaseProduct, InAppPurchaseResult, StoreAccountBinding, StorePurchaseEvidence } from '../contracts/in-app-purchase';

export interface ApplePurchaseBridge {
  products(input: { productIds: string[] }): Promise<{ products: InAppPurchaseProduct[] }>;
  purchase(input: { productId: string; accountToken: string }): Promise<{ status: 'success' | 'pending' | 'cancelled'; transaction?: AppleBridgeTransaction }>;
  transactions(input: { accountToken: string; sync: boolean }): Promise<{ transactions: AppleBridgeTransaction[]; accountMismatch: boolean; pending?: boolean }>;
  finish(input: { transactionId: string; accountToken: string }): Promise<void>;
  manage(): Promise<void>;
  addListener?(event: 'transactionsChanged', listener: () => void): Promise<{ remove(): Promise<void> }>;
}
export type AppleBridgeTransaction = { transactionId: string; productId: string; accountToken: string; environment: string; jws: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const failure = <T>(code: 'unavailable' | 'invalid_account_binding' | 'product_not_found' | 'store_unavailable' | 'purchase_pending' | 'user_cancelled', retryable = false): InAppPurchaseResult<T> => ({ ok: false, error: { code, retryable } });

/** Native capability only. B04 re-verifies every JWS; this adapter never grants access. */
export function createApplePurchasePort(input: {
  bridge: ApplePurchaseBridge;
  enabled: boolean;
  environment: 'sandbox' | 'production';
  productIds: readonly string[];
}): RecoverablePurchasePort {
  const ids = new Set(input.productIds);
  const usable = input.enabled && ids.size === 4 && input.productIds.length === 4
    && input.productIds.every(id => /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/.test(id));
  const remembered = new Map<string, AppleBridgeTransaction>();
  const products = new Map<string, InAppPurchaseProduct>();
  function evidence(tx: AppleBridgeTransaction, binding: StoreAccountBinding): StorePurchaseEvidence {
    if (!uuid.test(binding.opaqueAccountToken) || tx.accountToken.toLowerCase() !== binding.opaqueAccountToken.toLowerCase()
      || !ids.has(tx.productId) || tx.environment !== input.environment || !/^\d{1,30}$/.test(tx.transactionId)
      || typeof tx.jws !== 'string' || tx.jws.length > 60000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(tx.jws)) throw new Error('binding');
    remembered.set(tx.jws, tx);
    return { store: 'apple_app_store', productId: tx.productId, environment: input.environment, opaqueVerificationPayload: tx.jws };
  }
  async function read(binding: StoreAccountBinding, sync: boolean): Promise<InAppPurchaseResult<readonly StorePurchaseEvidence[]>> {
    if (!usable) return failure('unavailable');
    if (!uuid.test(binding.opaqueAccountToken)) return failure('invalid_account_binding');
    try {
      const result = await input.bridge.transactions({ accountToken: binding.opaqueAccountToken, sync });
      if (result.transactions.length > 100) return failure('store_unavailable', true);
      const values = result.transactions.map(tx => evidence(tx, binding));
      if (result.accountMismatch && values.length === 0) return failure('invalid_account_binding');
      if (result.pending && values.length === 0) return failure('purchase_pending');
      return { ok: true, value: values };
    } catch { return failure('store_unavailable', true); }
  }
  return {
    async getAvailability() { return { available: usable, store: 'apple_app_store', reason: usable ? 'available' : 'store_unavailable' }; },
    async listProducts(productIds) {
      if (!usable) return failure('unavailable');
      products.clear();
      try {
        const result = await input.bridge.products({ productIds: productIds.filter(id => ids.has(id)) });
        const seen = new Set<string>();
        for (const product of result.products) {
          const option = product.purchaseOptions?.[0]; const phase = option?.pricePhases?.[0];
          if (!ids.has(product.productId) || !productIds.includes(product.productId) || seen.has(product.productId)
            || product.store !== 'apple_app_store' || !product.displayName?.trim() || product.displayName.length > 128
            || product.purchaseOptions.length !== 1 || option.purchaseOptionId !== product.productId
            || option.basePlanId !== null || option.offerId !== null || option.pricePhases.length !== 1
            || !phase.displayPrice?.trim() || phase.displayPrice.length > 80 || !/^[A-Z]{3}$/.test(phase.currencyCode ?? '')
            || !['P1M', 'P1Y'].includes(phase.billingPeriod) || phase.paymentMode !== 'recurring' || phase.billingCycleCount !== null) return failure('product_not_found');
          seen.add(product.productId); products.set(product.productId, product);
        }
        return { ok: true, value: [...products.values()] };
      } catch { return failure('store_unavailable', true); }
    },
    async purchase(request) {
      if (!usable) return failure('unavailable');
      if (!uuid.test(request.accountBinding.opaqueAccountToken)) return failure('invalid_account_binding');
      if (!products.has(request.productId) || request.purchaseOptionId !== request.productId) return failure('product_not_found');
      try {
        const result = await input.bridge.purchase({ productId: request.productId, accountToken: request.accountBinding.opaqueAccountToken });
        if (result.status === 'pending') return failure('purchase_pending');
        if (result.status === 'cancelled') return failure('user_cancelled');
        if (result.status !== 'success' || !result.transaction || result.transaction.productId !== request.productId) return failure('store_unavailable', true);
        return { ok: true, value: evidence(result.transaction, request.accountBinding) };
      } catch { return failure('store_unavailable', true); }
    },
    restore(request) { return read(request.accountBinding, true); },
    recover(binding) { return read(binding, false); },
    async finish(value, binding) {
      const tx = remembered.get(value.opaqueVerificationPayload);
      if (!usable || !tx || value.store !== 'apple_app_store' || value.productId !== tx.productId || value.environment !== input.environment
        || tx.accountToken.toLowerCase() !== binding.opaqueAccountToken.toLowerCase()) return failure('invalid_account_binding');
      try { await input.bridge.finish({ transactionId: tx.transactionId, accountToken: binding.opaqueAccountToken }); remembered.delete(tx.jws); return { ok: true, value: true }; }
      catch { return failure('store_unavailable', true); }
    },
    async openSubscriptionManagement() {
      if (!usable) return failure('unavailable');
      try { await input.bridge.manage(); return { ok: true, value: true }; } catch { return failure('store_unavailable', true); }
    },
    async subscribeTransactions(listener) {
      if (!usable || !input.bridge.addListener) return () => {};
      const handle = await input.bridge.addListener('transactionsChanged', listener);
      return () => { void handle.remove().catch(() => {}); };
    },
  };
}
