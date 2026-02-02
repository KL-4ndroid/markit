'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { DealItem } from './DealItem';
import type { Event, DealClosedPayload } from '@/types/db';

interface DailyDealsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  deals: Event<DealClosedPayload>[];
  onDealClick: (deal: Event<DealClosedPayload>) => void;
}

/**
 * 日期成交記錄彈窗
 * 
 * 顯示指定日期的所有成交記錄
 */
export function DailyDealsModal({
  isOpen,
  onClose,
  date,
  deals,
  onDealClick,
}: DailyDealsModalProps) {
  if (!isOpen) return null;

  // 格式化日期顯示
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[d.getDay()];
    return `${month}/${day} (${weekday})`;
  };

  // 計算總收入
  const totalRevenue = deals.reduce((sum, deal) => sum + deal.payload.totalAmount, 0);

  return createPortal(
    <>
      {/* 背景遮罩 - 確保覆蓋全螢幕 */}
      <div
        className="fixed inset-0 bg-black/50 z-[999] transition-opacity"
        onClick={onClose}
      />

      {/* 彈窗容器 - 強制鎖定螢幕正中央 */}
      <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center pointer-events-none p-0 sm:p-6">
        <div
          className="bg-white rounded-t-[2rem] sm:rounded-[1.5rem] w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl animate-slide-up pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-medium text-[#3A3A3A] flex items-center gap-2">
                <span>🧾</span>
                {formatDate(date)} 成交記錄
              </h2>
              <p className="text-sm text-[#6B6B6B] mt-1">
                共 {deals.length} 筆 · 總收入 NT$ {totalRevenue.toLocaleString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#F5F5F0] hover:bg-[#ECECEC] transition-colors flex items-center justify-center"
            >
              <X className="w-5 h-5 text-[#6B6B6B]" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {deals.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl">📭</span>
                <p className="mt-4 text-[#6B6B6B]">此日期尚無成交記錄</p>
                <p className="mt-2 text-sm text-[#6B6B6B]">
                  可以使用「補登」功能新增記錄
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {deals
                  .sort((a, b) => b.timestamp - a.timestamp) // 最新成交優先
                  .map((deal) => (
                    <DealItem
                      key={deal.id}
                      deal={deal}
                      onClick={() => onDealClick(deal)}
                    />
                  ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100">
            <button
              onClick={onClose}
              className="w-full bg-[#7B9FA6] text-white py-3 rounded-2xl hover:bg-[#6A8E95] transition-colors font-medium"
            >
              關閉
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>,
    document.body // 將元件掛載到 body，確保不受父層影響
  );
}
