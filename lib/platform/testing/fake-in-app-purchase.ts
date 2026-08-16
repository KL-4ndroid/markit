import type {
  InAppPurchaseAvailability,
  InAppPurchasePort,
  InAppPurchaseProduct,
  InAppPurchaseRequest,
  InAppPurchaseRestoreRequest,
  InAppPurchaseResult,
  StorePurchaseEvidence,
} from '@/lib/platform/contracts/in-app-purchase';

export type FakeInAppPurchaseCall =
  | Readonly<{ operation: 'listProducts'; productIds: readonly string[] }>
  | Readonly<{ operation: 'purchase'; input: InAppPurchaseRequest }>
  | Readonly<{ operation: 'restore'; input: InAppPurchaseRestoreRequest }>
  | Readonly<{ operation: 'openSubscriptionManagement' }>;

export type FakeInAppPurchaseOptions = Readonly<{
  availability: InAppPurchaseAvailability;
  products?: readonly InAppPurchaseProduct[];
  purchaseResult?: InAppPurchaseResult<StorePurchaseEvidence>;
  restoreResult?: InAppPurchaseResult<readonly StorePurchaseEvidence[]>;
  managementResult?: InAppPurchaseResult<true>;
}>;

const unavailable = <T>(): InAppPurchaseResult<T> => ({
  ok: false,
  error: { code: 'unavailable', retryable: false },
});

export function createFakeInAppPurchasePort(options: FakeInAppPurchaseOptions): {
  port: InAppPurchasePort;
  calls: FakeInAppPurchaseCall[];
} {
  const calls: FakeInAppPurchaseCall[] = [];
  const products = options.products ?? [];

  return {
    calls,
    port: {
      async getAvailability() {
        return options.availability;
      },
      async listProducts(productIds) {
        calls.push({ operation: 'listProducts', productIds: [...productIds] });
        return {
          ok: true,
          value: products.filter(product => productIds.includes(product.productId)),
        };
      },
      async purchase(input) {
        calls.push({ operation: 'purchase', input });
        return options.purchaseResult ?? unavailable();
      },
      async restore(input) {
        calls.push({ operation: 'restore', input });
        return options.restoreResult ?? unavailable();
      },
      async openSubscriptionManagement() {
        calls.push({ operation: 'openSubscriptionManagement' });
        return options.managementResult ?? unavailable();
      },
    },
  };
}
