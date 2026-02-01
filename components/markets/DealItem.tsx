'use client';

import { ChevronRight } from 'lucide-react';
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

  // 格式化時間顯示
  const time = new Date(deal.timestamp).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit'
  });

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
          NT$ {payload.totalAmount.toLocaleString()}
        </span>
      </div>

      {/* 右側：支付方式 + 箭頭 */}
      <div className="flex items-center gap-2">
        <span className="text-sm">{paymentIcons[payload.paymentMethod]}</span>
        <span className="text-xs text-[#6B6B6B] hidden sm:inline">
          {paymentLabels[payload.paymentMethod]}
        </span>
        <ChevronRight className="w-4 h-4 text-[#6B6B6B]" />
      </div>
    </div>
  );
}