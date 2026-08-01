import type { CapabilityAccessBlockReason } from './subscription-access';
import type { AccountCapabilityReadStatus } from './account-capability-contract';
import {
  SUBSCRIPTION_PLAN_DEFINITIONS,
  type AccountPlanCode,
  type SubscriptionPlanFeatureCode,
  type SubscriptionPlanFeatureStatus,
} from './subscription-plans';

export type PlanType = AccountPlanCode;

export type PlanPreviewFeature = {
  code: SubscriptionPlanFeatureCode;
  label: string;
  status: SubscriptionPlanFeatureStatus;
};

export interface PlanPreview {
  id: PlanType;
  name: string;
  priceLabel: string;
  description: string;
  audience: string;
  availability: 'preview';
  features: readonly PlanPreviewFeature[];
  actionLabel: string;
  actionEnabled: false;
}

export type SubscriptionPresentationViewer = 'owner' | 'staff';
export type SubscriptionCapabilitySourceState = 'available' | 'unavailable';
export type SubscriptionBillingRuntimeState = 'available' | 'unavailable';

export type SubscriptionPresentationGuard = {
  canDisplayActivePlan: boolean;
  canDisplayBillingControls: boolean;
  canDisplayTransactionalState: boolean;
  availability: 'preview' | 'available';
};

export type SubscriptionBlockedPresentation = {
  title: string;
  description: string;
  showPlanPreviewLink: boolean;
  actionLabel: string | null;
};

export type AccountCapabilitySourcePresentation = {
  label: string;
  description: string;
  activePaidClaim: boolean;
};

const PLAN_FEATURE_LABELS: Record<SubscriptionPlanFeatureCode, string> = {
  'core.market_operations': '市集、成本與營運資料管理',
  'core.sales_recording': '快速成交與收攤後總額記錄',
  'core.product_catalog': '文字商品目錄與庫存資料',
  'core.cloud_sync': '文字與事件資料同步',
  'analytics.basic': '單場基本分析與復盤',
  'analytics.advanced': '跨市集比較與商品決策建議',
  'report.settlement_preview': '週／月結算報告預覽',
  'report.pdf': '設計版 PDF 報告',
  'report.excel': 'Excel 報表',
  'photo.product_cover': '商品封面照片',
  'photo.sales_evidence': '成交照片證據',
  'team.staff_collaboration': '正式員工協作',
  'team.manager_workflow': 'Manager 分工流程',
};

const PLAN_PREVIEW_FEATURES: Record<AccountPlanCode, readonly SubscriptionPlanFeatureCode[]> = {
  free: [
    'core.market_operations',
    'core.sales_recording',
    'core.product_catalog',
  ],
  pro: [
    'analytics.basic',
    'photo.product_cover',
    'analytics.advanced',
    'report.settlement_preview',
    'report.pdf',
  ],
  team: [
    'team.staff_collaboration',
    'team.manager_workflow',
    'photo.sales_evidence',
    'report.settlement_preview',
  ],
};

const PLAN_PRICE_LABELS: Record<AccountPlanCode, string> = {
  free: '免費核心方向',
  pro: '價格規劃中',
  team: '價格規劃中',
};

function buildPlanPreview(planCode: AccountPlanCode): PlanPreview {
  const definition = SUBSCRIPTION_PLAN_DEFINITIONS[planCode];
  return {
    id: planCode,
    name: definition.displayName,
    priceLabel: PLAN_PRICE_LABELS[planCode],
    description: definition.description,
    audience: definition.audience,
    availability: 'preview',
    features: PLAN_PREVIEW_FEATURES[planCode].map(code => ({
      code,
      label: PLAN_FEATURE_LABELS[code],
      status: definition.features[code],
    })),
    actionLabel: '尚未開放',
    actionEnabled: false,
  };
}

export function resolveSubscriptionPresentationGuard(input: {
  viewer: SubscriptionPresentationViewer;
  capabilitySource: SubscriptionCapabilitySourceState;
  billingRuntime: SubscriptionBillingRuntimeState;
}): SubscriptionPresentationGuard {
  const hasAuthoritativeCapability = input.capabilitySource === 'available';
  const hasBillingRuntime = input.billingRuntime === 'available';
  const isOwner = input.viewer === 'owner';

  return {
    canDisplayActivePlan: hasAuthoritativeCapability,
    canDisplayBillingControls: isOwner && hasAuthoritativeCapability && hasBillingRuntime,
    canDisplayTransactionalState: isOwner && hasAuthoritativeCapability && hasBillingRuntime,
    availability: hasBillingRuntime ? 'available' : 'preview',
  };
}

export function getAccountCapabilitySourcePresentation(
  status: AccountCapabilityReadStatus | 'unavailable',
): AccountCapabilitySourcePresentation {
  switch (status) {
    case 'default_free':
      return {
        label: 'Free（預設）',
        description: '伺服器未找到方案指派，付費能力維持關閉。',
        activePaidClaim: false,
      };
    case 'explicit_free':
      return {
        label: 'Free',
        description: '伺服器已確認此帳號使用 Free 方案。',
        activePaidClaim: false,
      };
    case 'admin_enabled':
      return {
        label: '管理員已啟用',
        description: '方案能力來自伺服器端管理員指派，不代表已付款。',
        activePaidClaim: true,
      };
    case 'admin_inactive':
      return {
        label: '管理員指派已停用',
        description: '保留指派紀錄，但不開放新的付費能力操作。',
        activePaidClaim: false,
      };
    case 'simulation_enabled':
      return {
        label: '本機模擬方案',
        description: '目前能力來自本機測試工具，不代表付款、正式訂閱或雲端寫入授權。',
        activePaidClaim: false,
      };
    case 'billing_not_connected':
      return {
        label: '付款尚未連接',
        description: '系統不會在付款來源尚未完成驗證時授予付費能力。',
        activePaidClaim: false,
      };
    case 'promotion_not_connected':
      return {
        label: '推廣獎勵尚未連接',
        description: '系統不會在推廣資格與獎勵流程尚未完成時授予 Pro。',
        activePaidClaim: false,
      };
    case 'unavailable':
      return {
        label: '方案狀態無法確認',
        description: '系統不會在來源不可用時推測付費狀態。',
        activePaidClaim: false,
      };
  }
}

export function getSubscriptionBlockedPresentation(
  reason: CapabilityAccessBlockReason,
  requiredPlan?: AccountPlanCode,
): SubscriptionBlockedPresentation {
  const requiredPlanName = requiredPlan
    ? SUBSCRIPTION_PLAN_DEFINITIONS[requiredPlan].displayName
    : '付費';

  switch (reason) {
    case 'plan_required':
    case 'entitlement_inactive':
    case 'promotion_reward_expired':
      return {
        title: `需要 ${requiredPlanName} 方案`,
        description: '目前只能查看方案規劃；訂閱與付款尚未開放。',
        showPlanPreviewLink: true,
        actionLabel: '查看方案預覽',
      };
    case 'role_forbidden':
      return {
        title: '目前身分沒有此操作權限',
        description: '方案不會覆蓋 owner、manager、operator 或 viewer 的角色限制。',
        showPlanPreviewLink: false,
        actionLabel: null,
      };
    case 'runtime_disabled':
      return {
        title: '功能目前尚未開放',
        description: '功能仍受獨立的安全與部署檢查控制。',
        showPlanPreviewLink: false,
        actionLabel: null,
      };
    case 'data_insufficient':
      return {
        title: '目前資料還不足',
        description: '繼續累積真實市集與商品資料後再查看此分析。',
        showPlanPreviewLink: false,
        actionLabel: null,
      };
    case 'authentication_required':
      return {
        title: '請先登入',
        description: '登入後才能確認帳號範圍與功能權限。',
        showPlanPreviewLink: false,
        actionLabel: null,
      };
    case 'owner_workspace_unavailable':
      return {
        title: '目前無法確認品牌工作區',
        description: '重新整理帳號與團隊狀態後再試一次。',
        showPlanPreviewLink: false,
        actionLabel: null,
      };
    case 'stale_capability':
    case 'offline_lease_expired':
    case 'capability_unavailable':
      return {
        title: '目前無法確認方案權限',
        description: '系統不會在權限資料過期或不可用時推測付費狀態。',
        showPlanPreviewLink: false,
        actionLabel: null,
      };
  }
}

export const SUBSCRIPTION_PRESENTATION = {
  availability: 'preview' as const,
  capabilitySource: 'unavailable' as const,
  billingRuntime: 'unavailable' as const,
  accountLabel: '方案功能預覽',
  title: 'Free、Pro 與 Team',
  description: '以下是方案功能方向。訂閱、付款、續訂與方案切換尚未開放。',
  notice: '目前實際可使用的功能仍依帳號角色、資料完整度與各功能 runtime gate 決定，不以此預覽授權。',
  actionLabel: '尚未開放',
};

export const PLAN_PREVIEWS: readonly PlanPreview[] = [
  buildPlanPreview('free'),
  buildPlanPreview('pro'),
  buildPlanPreview('team'),
];
