import type { BillingOrigin } from './billing-provider-contract';
import type { AccountCapabilityClientResult } from './account-capability-client';
import { getAccountCapabilitySourcePresentation } from './subscription-presentation';
import { SUBSCRIPTION_PLAN_DEFINITIONS, type AccountPlanCode } from './subscription-plans';

export type SubscriptionCenterViewer = 'owner' | 'staff' | 'unknown';

export type SubscriptionCenterView = Readonly<{
  state: 'loading' | 'authentication_required' | 'staff_read_only' | 'unavailable' | 'available';
  planCode: AccountPlanCode | null;
  planLabel: string;
  sourceLabel: string;
  sourceDescription: string;
  entitlementLabel: string;
  billingLabel: string | null;
  entitlementEndsAt: string | null;
  billingOrigin: BillingOrigin | null;
  billingOriginLabel: string | null;
  canRetry: boolean;
  canDisplayBillingControls: boolean;
}>;

const BILLING_ORIGIN_LABELS: Record<BillingOrigin, string> = {
  newebpay_web: '藍新（歷史來源）',
  ecpay_web: '綠界',
  apple_app_store: 'Apple App Store',
  google_play: 'Google Play',
  revenuecat_aggregate: '原生商店聚合',
};

function emptyView(
  state: SubscriptionCenterView['state'],
  input: Partial<SubscriptionCenterView> = {},
): SubscriptionCenterView {
  return {
    state,
    planCode: null,
    planLabel: '無法確認',
    sourceLabel: '尚無可信方案來源',
    sourceDescription: '系統不會在方案資料不可用時推測付費權限。',
    entitlementLabel: '無法確認',
    billingLabel: null,
    entitlementEndsAt: null,
    billingOrigin: null,
    billingOriginLabel: null,
    canRetry: false,
    canDisplayBillingControls: false,
    ...input,
  };
}

function entitlementLabel(value: string): string {
  switch (value) {
    case 'active': return '使用中';
    case 'grace': return '寬限期';
    case 'inactive': return '未啟用';
    default: return '無法確認';
  }
}

function billingLabel(value: string): string | null {
  switch (value) {
    case 'trialing': return '試用中';
    case 'active': return '續訂中';
    case 'past_due': return '付款待處理';
    case 'cancel_at_period_end': return '已排定取消';
    case 'cancelled': return '已取消';
    case 'refunded': return '已退款';
    case 'disputed': return '交易爭議處理中';
    case 'unknown': return '付款狀態無法確認';
    default: return null;
  }
}

export function buildSubscriptionCenterView(input: {
  viewer: SubscriptionCenterViewer;
  isAuthenticated: boolean;
  isLoading: boolean;
  capabilityResult: AccountCapabilityClientResult | null;
  billingOrigin?: BillingOrigin | null;
}): SubscriptionCenterView {
  if (input.viewer === 'staff') {
    return emptyView('staff_read_only', {
      planLabel: '由品牌主管理',
      sourceLabel: '團隊成員',
      sourceDescription: '訂閱購買、恢復與方案管理只由品牌主操作。',
      entitlementLabel: '依品牌方案與角色決定',
    });
  }
  if (!input.isLoading && !input.isAuthenticated) {
    return emptyView('authentication_required', {
      planLabel: '尚未登入',
      sourceLabel: '需要登入',
      sourceDescription: '登入後才能確認品牌帳號的方案與功能權限。',
      entitlementLabel: '未檢查',
    });
  }
  if (input.isLoading || input.capabilityResult === null) return emptyView('loading');
  if (!input.capabilityResult.ok) {
    if (input.capabilityResult.code === 'authentication_required') {
      return emptyView('authentication_required', {
        planLabel: '尚未登入',
        sourceLabel: '需要登入',
        sourceDescription: '登入後才能確認品牌帳號的方案與功能權限。',
        entitlementLabel: '未檢查',
      });
    }
    return emptyView('unavailable', { canRetry: input.capabilityResult.retryable });
  }

  const capabilities = input.capabilityResult.capabilities;
  const source = getAccountCapabilitySourcePresentation(input.capabilityResult.status);
  const origin = input.billingOrigin ?? null;
  return {
    state: 'available',
    planCode: capabilities.planCode,
    planLabel: SUBSCRIPTION_PLAN_DEFINITIONS[capabilities.planCode].displayName,
    sourceLabel: source.label,
    sourceDescription: source.description,
    entitlementLabel: entitlementLabel(capabilities.entitlementStatus),
    billingLabel: billingLabel(capabilities.billingStatus),
    entitlementEndsAt: capabilities.entitlementEndsAt,
    billingOrigin: origin,
    billingOriginLabel: origin ? BILLING_ORIGIN_LABELS[origin] : null,
    canRetry: false,
    canDisplayBillingControls: capabilities.planSource === 'billing' && origin !== null,
  };
}
