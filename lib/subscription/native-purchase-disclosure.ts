import type {
  InAppPurchaseOption,
  InAppPurchasePricePhase,
  InAppPurchaseProduct,
} from '@/lib/platform/contracts/in-app-purchase';
import { validateInAppPurchaseOptionPricing } from './native-store-catalog';

export type NativePurchaseDisclosureBlockReason =
  | 'authentication_required'
  | 'owner_required'
  | 'account_binding_required'
  | 'verification_runtime_unavailable'
  | 'product_copy_unreviewed'
  | 'billing_copy_unreviewed'
  | 'free_plan_disclosure_required'
  | 'subscription_management_unavailable'
  | 'legal_url_invalid'
  | 'product_metadata_invalid'
  | 'purchase_option_mismatch'
  | 'price_phase_invalid';

export type NativePurchaseDisclosure = Readonly<{
  productId: string;
  purchaseOptionId: string;
  planName: string;
  pricePhases: readonly InAppPurchasePricePhase[];
  recurringPhase: InAppPurchasePricePhase;
  termsUrl: string;
  privacyUrl: string;
  autoRenewalNotice: string;
  cancellationNotice: string;
  freeAccessNotice: string;
  accountAccessNotice: string;
}>;

export type NativePurchaseDisclosureDecision =
  | Readonly<{ ready: true; disclosure: NativePurchaseDisclosure }>
  | Readonly<{ ready: false; reason: NativePurchaseDisclosureBlockReason }>;

function isStableLegalUrl(value: string | null): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:'
      && parsed.username === ''
      && parsed.password === ''
      && parsed.hash === '';
  } catch {
    return false;
  }
}

function blocked(reason: NativePurchaseDisclosureBlockReason): NativePurchaseDisclosureDecision {
  return { ready: false, reason };
}

export function prepareNativePurchaseDisclosure(input: Readonly<{
  authenticated: boolean;
  ownerAuthorized: boolean;
  accountBindingReady: boolean;
  verificationRuntimeAvailable: boolean;
  productCopyReviewed: boolean;
  billingCopyReviewed: boolean;
  freePlanAvailable: boolean;
  subscriptionManagementAvailable: boolean;
  termsUrl: string | null;
  privacyUrl: string | null;
  product: InAppPurchaseProduct;
  option: InAppPurchaseOption;
}>): NativePurchaseDisclosureDecision {
  if (!input.authenticated) return blocked('authentication_required');
  if (!input.ownerAuthorized) return blocked('owner_required');
  if (!input.accountBindingReady) return blocked('account_binding_required');
  if (!input.verificationRuntimeAvailable) return blocked('verification_runtime_unavailable');
  if (!input.productCopyReviewed) return blocked('product_copy_unreviewed');
  if (!input.billingCopyReviewed) return blocked('billing_copy_unreviewed');
  if (!input.freePlanAvailable) return blocked('free_plan_disclosure_required');
  if (!input.subscriptionManagementAvailable) {
    return blocked('subscription_management_unavailable');
  }
  if (!isStableLegalUrl(input.termsUrl) || !isStableLegalUrl(input.privacyUrl)) {
    return blocked('legal_url_invalid');
  }
  if (
    !input.product.productId.trim()
    || input.product.productId.length > 256
    || !input.product.displayName.trim()
    || input.product.displayName.length > 128
    || /[\u0000-\u001f\u007f]/.test(input.product.displayName)
    || !input.option.purchaseOptionId.trim()
    || input.option.purchaseOptionId.length > 2048
  ) {
    return blocked('product_metadata_invalid');
  }
  if (!input.product.purchaseOptions.some(option => option === input.option)) {
    return blocked('purchase_option_mismatch');
  }
  if (validateInAppPurchaseOptionPricing(input.option) !== null) {
    return blocked('price_phase_invalid');
  }

  const recurringPhase = input.option.pricePhases[input.option.pricePhases.length - 1];
  return {
    ready: true,
    disclosure: {
      productId: input.product.productId,
      purchaseOptionId: input.option.purchaseOptionId,
      planName: input.product.displayName,
      pricePhases: input.option.pricePhases,
      recurringPhase,
      termsUrl: input.termsUrl,
      privacyUrl: input.privacyUrl,
      autoRenewalNotice: '除非在續訂日前取消，方案將依商店顯示的週期與價格自動續訂。',
      cancellationNotice: '可前往原購買商店管理或取消訂閱。',
      freeAccessNotice: '不訂閱仍可繼續使用 Free 的核心市集記錄功能。',
      accountAccessNotice: '商店交易通過伺服器驗證後，方案綁定 Féria 帳號並可跨裝置使用。',
    },
  };
}
