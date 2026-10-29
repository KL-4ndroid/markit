import type { BillingOrigin } from './billing-provider-contract';
import type { AccountCapabilityClientResult } from './account-capability-client';
import { getAccountCapabilitySourcePresentation } from './subscription-presentation';
import { SUBSCRIPTION_PLAN_DEFINITIONS, type AccountPlanCode } from './subscription-plans';
import { hasEffectiveEntitlement } from './subscription-capabilities';

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
  lifecycleNotice: { title: string; description: string } | null;
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
    lifecycleNotice: null,
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
  nowMs?: number;
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
  const effectivePaid = capabilities.planCode !== 'free' && hasEffectiveEntitlement(capabilities, input.nowMs ?? Date.now());
  const effectivePlan = effectivePaid ? capabilities.planCode : 'free';
  // Only describe a lifecycle state supplied by the authoritative capability
  // response. Never infer a past subscription from an ordinary free account.
  const lifecycleNotice = (capabilities.planCode !== 'free' && !effectivePaid)
    || ['admin_inactive', 'billing_inactive', 'promotion_inactive'].includes(input.capabilityResult.status)
    ? {
        title: '付費功能目前未開放',
        description: '已儲存的紀錄會保留；市集安排仍可使用，銷售與商品功能依目前方案開放。',
      }
    : capabilities.entitlementStatus === 'grace'
      ? { title: '目前處於寬限期', description: '請以訂閱來源確認的權益狀態與有效期限為準。' }
      : capabilities.billingStatus === 'cancel_at_period_end'
        ? { title: '已排定停止續訂', description: '可用功能會依訂閱來源確認的權益狀態與期限更新。' }
        : null;
  return {
    state: 'available',
    planCode: effectivePlan,
    planLabel: SUBSCRIPTION_PLAN_DEFINITIONS[effectivePlan].displayName,
    sourceLabel: source.label,
    sourceDescription: source.description,
    entitlementLabel: entitlementLabel(capabilities.entitlementStatus),
    billingLabel: billingLabel(capabilities.billingStatus),
    entitlementEndsAt: capabilities.entitlementEndsAt,
    billingOrigin: origin,
    billingOriginLabel: origin ? BILLING_ORIGIN_LABELS[origin] : null,
    lifecycleNotice,
    canRetry: false,
    canDisplayBillingControls: capabilities.planSource === 'billing' && origin !== null,
  };
}
