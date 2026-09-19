import type {
  InAppPurchaseAvailability,
  InAppPurchasePort,
  InAppPurchaseProduct,
  InAppPurchaseResult,
  StorePurchaseEvidence,
} from '@/lib/platform/contracts/in-app-purchase';

const unavailable = <T>(): InAppPurchaseResult<T> => ({
  ok: false,
  error: { code: 'unavailable', retryable: false },
});

export const webInAppPurchase: InAppPurchasePort = Object.freeze({
  async getAvailability(): Promise<InAppPurchaseAvailability> {
    return {
      available: false,
      store: null,
      reason: 'web_checkout_deferred',
    };
  },
  async listProducts(): Promise<InAppPurchaseResult<readonly InAppPurchaseProduct[]>> {
    return unavailable<readonly InAppPurchaseProduct[]>();
  },
  async purchase(): Promise<InAppPurchaseResult<StorePurchaseEvidence>> {
    return unavailable<StorePurchaseEvidence>();
  },
  async restore(): Promise<InAppPurchaseResult<readonly StorePurchaseEvidence[]>> {
    return unavailable<readonly StorePurchaseEvidence[]>();
  },
  async openSubscriptionManagement(): Promise<InAppPurchaseResult<true>> {
    return unavailable<true>();
  },
});
