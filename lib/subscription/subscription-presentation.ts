export type PlanType = 'free' | 'pro' | 'enterprise';

export interface PlanPreview {
  id: PlanType;
  name: string;
  priceLabel: string;
  description: string;
  features: string[];
}

export const SUBSCRIPTION_PRESENTATION = {
  availability: 'preview' as const,
  accountLabel: '方案功能預覽',
  title: '方案功能預覽',
  description: '以下內容是未來方案方向，尚未開放訂閱、付款或方案切換。',
  notice: '目前可使用的功能依帳號角色與團隊權限決定，不受以下預覽方案限制。',
  actionLabel: '尚未開放',
};

export const PLAN_PREVIEWS: readonly PlanPreview[] = [
  {
    id: 'free',
    name: '個人版',
    priceLabel: '價格規劃中',
    description: '適合個人攤主記錄市集、商品與每日營運資料。',
    features: ['市集與商品管理', '每日營運記錄', '基礎回顧與資料查看'],
  },
  {
    id: 'pro',
    name: '協作版',
    priceLabel: '價格規劃中',
    description: '規劃提供需要團隊協作與進階回顧的工作室。',
    features: ['包含個人版規劃', '團隊協作能力', '進階分析與報表'],
  },
  {
    id: 'enterprise',
    name: '品牌版',
    priceLabel: '價格規劃中',
    description: '規劃提供多團隊、整合與管理需求較高的品牌。',
    features: ['包含協作版規劃', '多團隊管理', '整合與支援服務'],
  },
];
