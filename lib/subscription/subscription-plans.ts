export const ACCOUNT_PLAN_CODES = ['free', 'pro', 'team'] as const;

export type AccountPlanCode = typeof ACCOUNT_PLAN_CODES[number];

export type SubscriptionPlanFeatureCode =
  | 'core.market_operations'
  | 'core.sales_recording'
  | 'core.product_catalog'
  | 'core.cloud_sync'
  | 'analytics.basic'
  | 'analytics.advanced'
  | 'report.settlement_preview'
  | 'report.pdf'
  | 'report.excel'
  | 'photo.product_cover'
  | 'photo.sales_evidence'
  | 'team.staff_collaboration'
  | 'team.manager_workflow';

export type SubscriptionPlanFeatureStatus =
  | 'included'
  | 'limited'
  | 'coming_soon'
  | 'not_available';

export type SubscriptionPlanLimitStatus =
  | 'not_applicable'
  | 'candidate'
  | 'experiment_unenforced'
  | 'unapproved';

export type SubscriptionPlanLimit = {
  value: number | null;
  status: SubscriptionPlanLimitStatus;
};

export type SubscriptionPlanDefinition = {
  code: AccountPlanCode;
  displayName: string;
  audience: string;
  promise: string;
  description: string;
  availability: 'preview';
  features: Readonly<Record<SubscriptionPlanFeatureCode, SubscriptionPlanFeatureStatus>>;
  limits: {
    activeProducts: SubscriptionPlanLimit;
    staffSeats: SubscriptionPlanLimit;
    productPhotoStorageBytes: SubscriptionPlanLimit;
    salesEvidenceStorageBytes: SubscriptionPlanLimit;
  };
};

const FREE_FEATURES: Readonly<Record<SubscriptionPlanFeatureCode, SubscriptionPlanFeatureStatus>> = {
  'core.market_operations': 'included',
  'core.sales_recording': 'included',
  'core.product_catalog': 'included',
  'core.cloud_sync': 'included',
  'analytics.basic': 'not_available',
  'analytics.advanced': 'limited',
  'report.settlement_preview': 'limited',
  'report.pdf': 'not_available',
  'report.excel': 'not_available',
  'photo.product_cover': 'not_available',
  'photo.sales_evidence': 'not_available',
  'team.staff_collaboration': 'not_available',
  'team.manager_workflow': 'not_available',
};

const PRO_FEATURES: Readonly<Record<SubscriptionPlanFeatureCode, SubscriptionPlanFeatureStatus>> = {
  ...FREE_FEATURES,
  'analytics.basic': 'included',
  'analytics.advanced': 'included',
  'report.settlement_preview': 'included',
  'report.pdf': 'coming_soon',
  'report.excel': 'coming_soon',
  'photo.product_cover': 'included',
};

const TEAM_FEATURES: Readonly<Record<SubscriptionPlanFeatureCode, SubscriptionPlanFeatureStatus>> = {
  ...PRO_FEATURES,
  'photo.sales_evidence': 'included',
  'team.staff_collaboration': 'included',
  'team.manager_workflow': 'included',
};

export const SUBSCRIPTION_PLAN_DEFINITIONS: Readonly<Record<AccountPlanCode, SubscriptionPlanDefinition>> = {
  free: {
    code: 'free',
    displayName: 'Free',
    audience: '剛開始建立市集營運紀錄的小品牌',
    promise: '完成每一場市集最重要的營運記錄。',
    description: '保留市集、商品、成交、成本與互動記錄，不把日常營運流程鎖在付費牆後。',
    availability: 'preview',
    features: FREE_FEATURES,
    limits: {
      activeProducts: { value: 15, status: 'experiment_unenforced' },
      staffSeats: { value: 0, status: 'not_applicable' },
      productPhotoStorageBytes: { value: 0, status: 'not_applicable' },
      salesEvidenceStorageBytes: { value: 0, status: 'not_applicable' },
    },
  },
  pro: {
    code: 'pro',
    displayName: 'Pro',
    audience: '想看懂市集與商品決策的品牌主',
    promise: '知道哪些市集與商品值得投入更多力氣。',
    description: '加入單場復盤、進階比較、商品建議、結算報告預覽與商品封面照片能力，正式協作仍不在 Pro。',
    availability: 'preview',
    features: PRO_FEATURES,
    limits: {
      activeProducts: { value: null, status: 'unapproved' },
      staffSeats: { value: 0, status: 'not_applicable' },
      productPhotoStorageBytes: { value: null, status: 'unapproved' },
      salesEvidenceStorageBytes: { value: 0, status: 'not_applicable' },
    },
  },
  team: {
    code: 'team',
    displayName: 'Team',
    audience: '有員工、manager 或重複分工需求的品牌',
    promise: '一起營運，同時保護品牌主敏感資料。',
    description: '包含 Pro，並加入正式員工協作、manager 流程與成交照片證據能力。',
    availability: 'preview',
    features: TEAM_FEATURES,
    limits: {
      activeProducts: { value: null, status: 'unapproved' },
      staffSeats: { value: 3, status: 'candidate' },
      productPhotoStorageBytes: { value: null, status: 'unapproved' },
      salesEvidenceStorageBytes: { value: null, status: 'unapproved' },
    },
  },
};

export function isAccountPlanCode(value: unknown): value is AccountPlanCode {
  return typeof value === 'string' && ACCOUNT_PLAN_CODES.includes(value as AccountPlanCode);
}

export function getSubscriptionPlanDefinition(planCode: AccountPlanCode): SubscriptionPlanDefinition {
  return SUBSCRIPTION_PLAN_DEFINITIONS[planCode];
}

export function getSubscriptionPlanFeatureStatus(
  planCode: AccountPlanCode,
  featureCode: SubscriptionPlanFeatureCode,
): SubscriptionPlanFeatureStatus {
  return SUBSCRIPTION_PLAN_DEFINITIONS[planCode].features[featureCode];
}
