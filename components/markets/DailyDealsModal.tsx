'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { DealItem } from './DealItem';
import { getDealEventRevenue } from '@/lib/markets/event-view-utils';
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
  const totalRevenue = deals.reduce((sum, deal) => sum + getDealEventRevenue(deal), 0);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      {/* 彈窗容器 */}
      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6">
        <DialogPanel className="bg-white rounded-t-[2rem] sm:rounded-[1.5rem] w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <DialogTitle className="text-xl font-medium text-foreground flex items-center gap-2">
                <span>🧾</span>
                {formatDate(date)} 成交記錄
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                共 {deals.length} 筆 · 總收入 NT$ {totalRevenue.toLocaleString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-neutral-alt hover:bg-[#ECECEC] transition-colors flex items-center justify-center"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {deals.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl">📭</span>
                <p className="mt-4 text-muted-foreground">此日期尚無成交記錄</p>
                <p className="mt-2 text-sm text-muted-foreground">
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
              className="w-full bg-primary text-white py-3 rounded-2xl hover:bg-primary/85 transition-colors font-medium"
            >
              關閉
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
