'use client';

import { ChevronRight } from 'lucide-react';
import { getDealEventDate, getDealEventRevenue, getDealPaymentMethod } from '@/lib/markets/event-view-utils';
import type { Event, DealClosedPayload } from '@/types/db';

interface DealItemProps {
  deal: Event<DealClosedPayload>;
  onClick: () => void;
}

/**
 * 成交項目組件
 * 顯示簡潔的成交資訊：時間 + 金額 + 支付方式
 */
export function DealItem({ deal, onClick }: DealItemProps) {
  const payload = deal.payload as DealClosedPayload;
  const amount = getDealEventRevenue(deal);
  const paymentMethod = getDealPaymentMethod(deal);

  // 格式化時間顯示
  const time = (() => {
    // 檢查是否為補登記錄且不是當日的數據
    if (payload.isBackfill && getDealEventDate(deal)) {
      // ✅ 使用本地日期，避免時區問題
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const dealDate = getDealEventDate(deal);
      
      // 如果是補登非當日的數據，顯示補登日期的 18:00
      if (dealDate !== today) {
        return '18:00';  // 統一顯示 18:00
      }
    }
    
    // 正常情況：顯示事件建立時間
    return new Date(deal.timestamp).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  })();

  // 支付方式對應
  const paymentIcons = {
    cash: '💵',
    card: '💳',
    mobile: '📱',
    other: '💰'
  };

  const paymentLabels = {
    cash: '現金',
    card: '信用卡',
    mobile: '行動支付',
    other: '其他'
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-3 bg-[#FAFAF8] rounded-xl cursor-pointer hover:bg-[#F0F8F6] transition-colors active:scale-[0.98] transform"
    >
      {/* 左側：時間 */}
      <div className="flex items-center gap-2 text-sm text-[#6B6B6B]">
        <span>🕐</span>
        <span className="font-mono font-medium">{time}</span>
      </div>

      {/* 中間：金額 */}
      <div className="flex items-center gap-1">
        <span className="text-lg font-bold text-[#7B9FA6] tabular-nums">
          NT$ {amount.toLocaleString()}
        </span>
      </div>

      {/* 右側：支付方式 + 箭頭 */}
      <div className="flex items-center gap-2">
        <span className="text-sm">{paymentIcons[paymentMethod]}</span>
        <span className="text-xs text-[#6B6B6B] hidden sm:inline">
          {paymentLabels[paymentMethod]}
        </span>
        <ChevronRight className="w-4 h-4 text-[#6B6B6B]" />
      </div>
    </div>
  );
}
