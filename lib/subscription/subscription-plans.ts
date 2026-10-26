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
  'core.sales_recording': 'not_available',
  'core.product_catalog': 'not_available',
  'core.cloud_sync': 'included',
  'analytics.basic': 'not_available',
  'analytics.advanced': 'not_available',
  'report.settlement_preview': 'not_available',
  'report.pdf': 'not_available',
  'report.excel': 'not_available',
  'photo.product_cover': 'not_available',
  'photo.sales_evidence': 'not_available',
  'team.staff_collaboration': 'not_available',
  'team.manager_workflow': 'not_available',
};

const PRO_FEATURES: Readonly<Record<SubscriptionPlanFeatureCode, SubscriptionPlanFeatureStatus>> = {
  ...FREE_FEATURES,
  'core.sales_recording': 'included',
  'core.product_catalog': 'included',
  'analytics.basic': 'included',
  'photo.product_cover': 'included',
};

const TEAM_FEATURES: Readonly<Record<SubscriptionPlanFeatureCode, SubscriptionPlanFeatureStatus>> = {
  ...PRO_FEATURES,
  'analytics.advanced': 'included',
  'report.settlement_preview': 'included',
  'report.pdf': 'included',
  'report.excel': 'coming_soon',
  'photo.sales_evidence': 'included',
  'team.staff_collaboration': 'included',
  'team.manager_workflow': 'included',
};

export const SUBSCRIPTION_PLAN_DEFINITIONS: Readonly<Record<AccountPlanCode, SubscriptionPlanDefinition>> = {
  free: {
    code: 'free',
    displayName: '免費版',
    audience: '剛開始建立市集營運紀錄的小品牌',
    promise: '完成每一場市集最重要的營運記錄。',
    description: '管理市集安排、報名、錄取、繳費、準備與私人心得。',
    availability: 'preview',
    features: FREE_FEATURES,
    limits: {
      activeProducts: { value: null, status: 'unapproved' },
      staffSeats: { value: 0, status: 'not_applicable' },
      productPhotoStorageBytes: { value: 0, status: 'not_applicable' },
      salesEvidenceStorageBytes: { value: 0, status: 'not_applicable' },
    },
  },
  pro: {
    code: 'pro',
    displayName: '輕量版',
    audience: '獨自記錄生意與核對成果的品牌主',
    promise: '完整記錄一場生意，知道賣了多少與現金是否相符。',
    description: '包含免費版，提供銷售、互動、商品庫存、單場成果、基本月摘要與選填現金對帳。',
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
    displayName: '高階版',
    audience: '有員工、manager 或重複分工需求的品牌',
    promise: '一起營運，同時保護品牌主敏感資料。',
    description: '包含輕量版，加入深入分析、跨場比較、完整報告、成交照片與團隊協作。',
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
