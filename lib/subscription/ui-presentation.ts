import { getMarketBoothFee } from '@/lib/markets/market-booth-fee';
import type { RoleRefreshStage } from '@/lib/permissions/role-refresh-state';
import type { SubscriptionExperience } from './experience';

export function salesSettingsPresentation(tier: SubscriptionExperience) {
  if (tier === 'advanced') return { title: '銷售與照片', description: '管理品牌顯示、成交照片與現場互動記錄方式。' };
  if (tier === 'light') return { title: '品牌與互動設定', description: '管理品牌名稱與現場互動按鈕。' };
  return { title: '品牌設定', description: '管理應用程式中的品牌名稱。' };
}

export function isCurrentPlan(planId: string, tier: SubscriptionExperience): boolean {
  return ({ free: 'free', light: 'pro', advanced: 'team', unavailable: '' } as const)[tier] === planId;
}

/** One booth fee with a legacy fallback; deposit remains refundable and separate. */
export function marketFeeDisplayRows(market: { registrationFee?: number; boothCost?: number; deposit?: number }) {
  return [
    { label: '攤位費', value: getMarketBoothFee(market) },
    { label: '保證金', value: market.deposit ?? 0 },
  ];
}

/** A blocked role or a failed completed query is an error, not an endless spinner. */
export function subscriptionExperienceIsLoading(input: {
  roleStage: RoleRefreshStage;
  capabilityEnabled: boolean;
  capabilityLoading: boolean;
  hasCapabilityResult: boolean;
}): boolean {
  return input.roleStage === 'initial_loading' || input.roleStage === 'background_refreshing'
    || (input.capabilityEnabled && (input.capabilityLoading || !input.hasCapabilityResult));
}
