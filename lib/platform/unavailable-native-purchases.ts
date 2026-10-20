import type { InAppPurchasePort } from './contracts/in-app-purchase';

/** Explicit disabled capability. No store SDK, transaction or verification is active. */
export const unavailableNativePurchases = Object.freeze<InAppPurchasePort>({
  async getAvailability() { return { available: false, store: null, reason: 'native_adapter_not_installed' }; },
  async listProducts() { return { ok: false, error: { code: 'unavailable', retryable: false } }; },
  async purchase() { return { ok: false, error: { code: 'unavailable', retryable: false } }; },
  async restore() { return { ok: false, error: { code: 'unavailable', retryable: false } }; },
  async openSubscriptionManagement() { return { ok: false, error: { code: 'unavailable', retryable: false } }; },
});
