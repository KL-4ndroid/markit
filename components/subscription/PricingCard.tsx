/**
 * 訂閱方案卡片組件
 * 
 * 顯示不同訂閱方案的價格和功能
 */

'use client';

import { Check, Sparkles, Crown, Building2 } from 'lucide-react';

export type PlanType = 'free' | 'pro' | 'enterprise';

interface PricingCardProps {
  plan: PlanType;
  isCurrentPlan?: boolean;
  onSelect?: () => void;
}

const planConfig = {
  free: {
    name: '免費版',
    price: 0,
    period: '',
    icon: Sparkles,
    color: 'from-[#6B6B6B] to-[#8B8B8B]',
    features: [
      '單一市集管理',
      '基礎商品管理（最多 20 個）',
      '本地數據存儲',
      '基礎統計報表',
      '離線使用',
    ],
    limitations: [
      '無雲端同步',
      '無員工協作',
      '無進階分析',
    ],
  },
  pro: {
    name: '專業版',
    price: 199,
    period: '/月',
    icon: Crown,
    color: 'from-[#7B9FA6] to-[#D4A574]',
    badge: '最受歡迎',
    badgeColor: 'bg-[#D4A574]',
    features: [
      '無限市集數量',
      '無限商品管理',
      '雲端同步備份',
      '進階統計分析',
      '多日期市集支援',
      '員工協作（最多 3 人）',
      '數據匯出功能',
      '優先客服支援',
    ],
  },
  enterprise: {
    name: '企業版',
    price: 499,
    period: '/月',
    icon: Building2,
    color: 'from-[#8B7BA6] to-[#A6B4D4]',
    badge: '完整功能',
    badgeColor: 'bg-[#8B7BA6]',
    features: [
      '專業版所有功能',
      '無限員工協作',
      '自訂報表匯出',
      'API 存取權限',
      '專屬客戶經理',
      '優先技術支援',
      '客製化功能開發',
      '數據遷移協助',
    ],
  },
};

export function PricingCard({ plan, isCurrentPlan = false, onSelect }: PricingCardProps) {
  const config = planConfig[plan];
  const Icon = config.icon;

  return (
    <div
      className={`relative bg-white rounded-[1.5rem] p-6 shadow-lg transition-all ${
        isCurrentPlan
          ? 'ring-2 ring-[#7B9FA6] shadow-[#7B9FA6]/20'
          : 'hover:shadow-xl hover:-translate-y-1'
      }`}
    >
      {/* 徽章 */}
      {config.badge && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${config.badgeColor} text-white text-xs font-medium px-4 py-1 rounded-full shadow-md`}>
          {config.badge}
        </div>
      )}

      {/* 當前方案標記 */}
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4 bg-[#7B9FA6] text-white text-xs font-medium px-3 py-1 rounded-full shadow-md">
          目前方案
        </div>
      )}

      {/* 圖示 */}
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${config.color} flex items-center justify-center mb-4`}>
        <Icon className="w-8 h-8 text-white" />
      </div>

      {/* 方案名稱 */}
      <h3 className="text-xl font-bold text-[#3A3A3A] mb-2">{config.name}</h3>

      {/* 價格 */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-[#3A3A3A] tabular-nums">
            NT$ {config.price}
          </span>
          {config.period && (
            <span className="text-[#6B6B6B] text-sm">{config.period}</span>
          )}
        </div>
        {plan === 'free' && (
          <p className="text-[#6B6B6B] text-sm mt-1">永久免費</p>
        )}
      </div>

      {/* 功能列表 */}
      <div className="space-y-3 mb-6">
        {config.features.map((feature, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#E8F3E8] flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-[#7B9FA6]" />
            </div>
            <span className="text-sm text-[#3A3A3A]">{feature}</span>
          </div>
        ))}

        {/* 限制項目（僅免費版） */}
        {config.limitations && (
          <div className="pt-3 border-t border-[#7B9FA6]/10">
            {config.limitations.map((limitation, index) => (
              <div key={index} className="flex items-start gap-3 opacity-50">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#F5E6E8] flex items-center justify-center mt-0.5">
                  <span className="text-xs text-[#6B6B6B]">✕</span>
                </div>
                <span className="text-sm text-[#6B6B6B]">{limitation}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 按鈕 */}
      {isCurrentPlan ? (
        <button
          disabled
          className="w-full py-3 rounded-xl bg-[#E8F3E8] text-[#7B9FA6] font-medium text-sm cursor-not-allowed"
        >
          目前使用中
        </button>
      ) : (
        <button
          onClick={onSelect}
          className={`w-full py-3 rounded-xl font-medium text-sm transition-all ${
            plan === 'free'
              ? 'bg-[#F5E6E8] text-[#3A3A3A] hover:bg-[#E8D8DA]'
              : `bg-gradient-to-r ${config.color} text-white hover:shadow-lg hover:scale-[1.02]`
          }`}
        >
          {plan === 'free' ? '降級至免費版' : '選擇此方案'}
        </button>
      )}
    </div>
  );
}
